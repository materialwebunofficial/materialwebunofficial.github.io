/** Walk the rendered ancestry, including slots and shadow hosts. */
export function themeParent(node) {
  return node?.assignedSlot || node?.parentElement || node?.getRootNode?.().host || null;
}

export function themeSetting(element, name, fallback = null) {
  for (let node = element; node; node = themeParent(node)) {
    if (node.hasAttribute?.(name)) return node.getAttribute(name);
  }
  return fallback;
}

/** Observe only this scope's ancestors. Batch token writes before canvas reads. */
export function observeThemeContext(element, callback, { includeSelf = true } = {}) {
  let disposed = false, queued = false;
  let ancestors = [];
  const schedule = () => {
    if (queued || disposed) return;
    queued = true;
    queueMicrotask(() => { queued = false; if (!disposed && element.isConnected) callback(); });
  };
  const observer = new MutationObserver(schedule);
  const onSlotChange = () => { watchAncestors(); schedule(); };
  const watchAncestors = () => {
    observer.disconnect();
    for (const node of ancestors) node.removeEventListener('slotchange',onSlotChange);
    ancestors = [];
    for (let node = includeSelf ? element : themeParent(element); node; node = themeParent(node)) ancestors.push(node);
    for (const node of ancestors) {
      observer.observe(node, { attributes: true,
        attributeFilter: ['style','class','dir','lang','data-theme','data-theme-scheme','data-contrast','data-motion-scheme','data-seed-color'] });
      if (node.localName === 'slot') node.addEventListener('slotchange',onSlotChange);
    }
  };
  watchAncestors();
  const onTheme = event => {
    const origin = event.detail?.target || event.composedPath()[0];
    if (origin === window || ancestors.includes(origin)) schedule();
  };
  window.addEventListener('theme-color-change',onTheme);
  window.addEventListener('theme-change',onTheme);
  return () => {
    disposed = true;
    observer.disconnect();
    for (const node of ancestors) node.removeEventListener('slotchange',onSlotChange);
    window.removeEventListener('theme-color-change',onTheme);
    window.removeEventListener('theme-change',onTheme);
  };
}

// Property-level ownership preserves pre-existing inline styles, priorities and
// attributes, even when multiple global providers are removed out of order.
const scopes = new WeakMap();
function read(target, kind, key) {
  return kind === 'styles' ? [target.style.getPropertyValue(key), target.style.getPropertyPriority(key)] : target.getAttribute(key);
}
function write(target, kind, key, value) {
  if (kind === 'styles') {
    if (value[0]) target.style.setProperty(key,...value);
    else target.style.removeProperty(key);
  } else if (value === null) target.removeAttribute(key);
  else target.setAttribute(key,value);
}
function update(target, state) {
  for (const kind of ['styles','attributes']) {
    const base = state[kind], last = state.last[kind];
    for (const layer of state.layers.values()) for (const key of Object.keys(layer[kind])) {
      if (!base.has(key)) base.set(key,read(target,kind,key));
    }
    for (const [key,initial] of base) {
      const current = read(target,kind,key);
      if (last.has(key) && JSON.stringify(current) !== JSON.stringify(last.get(key))) base.set(key,current);
      let value = base.get(key) ?? initial;
      for (const layer of state.layers.values()) {
        if (key in layer[kind]) value = kind === 'styles' ? [layer[kind][key],''] : layer[kind][key];
      }
      if (JSON.stringify(current) !== JSON.stringify(value)) write(target,kind,key,value);
      last.set(key,value);
    }
  }
}
export function setThemeLayer(target, owner, layer) {
  let state = scopes.get(target);
  if (!state) {
    state = { layers: new Map(), styles: new Map(), attributes: new Map(), last: { styles: new Map(), attributes: new Map() } };
    scopes.set(target,state);
  }
  state.layers.set(owner,layer);
  update(target,state);
}
export function removeThemeLayer(target, owner) {
  const state = scopes.get(target);
  if (!state) return;
  state.layers.delete(owner);
  update(target,state);
  if (!state.layers.size) scopes.delete(target);
}
