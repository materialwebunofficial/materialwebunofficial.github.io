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

/*
 * One shared observer per ancestor node, which forwards only changes that can
 * reach a component's theme: token and color declarations in a style
 * attribute, a class change that alters the computed theme values, and the
 * theme attributes themselves. Layout-only writes (scroll locking, offsets,
 * display toggles of a view) no longer restyle every component on the page.
 */
const THEME_ATTRIBUTES = ['style','class','dir','lang','data-theme','data-theme-scheme','data-palette-variant','data-contrast','data-motion-scheme','data-seed-color'];
const THEMED_DECLARATION = /^(--[\w-]+|color|color-scheme|font|font-family|direction|writing-mode)$/i;
const SIGNATURE = ['color','direction','color-scheme','font-family','--md-sys-color-primary','--md-sys-color-on-primary','--md-sys-color-surface','--md-sys-color-on-surface','--md-sys-color-surface-container','--md-sys-color-outline','--md-sys-shape-corner-full','--md-sys-shape-corner-medium','--md-sys-typescale-body-large-font'];
const watchers = new WeakMap();
function themedDeclarations(text) {
  const result = [];
  for (const part of (text || '').split(';')) {
    const colon = part.indexOf(':'); if (colon < 0) continue;
    const name = part.slice(0, colon).trim();
    if (THEMED_DECLARATION.test(name)) result.push(name.toLowerCase() + ':' + part.slice(colon + 1).trim());
  }
  return result.sort().join(';');
}
function themeSignature(node) {
  if (!(node instanceof Element)) return '';
  const css = getComputedStyle(node);
  return SIGNATURE.map(name => css.getPropertyValue(name)).join('|');
}
function relevant(node, watcher, records) {
  let themed = false;
  for (const record of records) {
    if (record.attributeName === 'style') {
      if (themedDeclarations(record.oldValue) !== themedDeclarations(node.getAttribute('style'))) themed = true;
    } else if (record.attributeName === 'class') {
      const next = themeSignature(node);
      if (next !== watcher.signature) themed = true;
      watcher.signature = next;
    } else themed = true;
  }
  return themed;
}
function watchNode(node, listener) {
  let watcher = watchers.get(node);
  if (!watcher) {
    watcher = { listeners: new Set(), signature: null };
    watcher.observer = new MutationObserver(records => {
      if (!relevant(node, watcher, records)) return;
      for (const notify of [...watcher.listeners]) notify();
    });
    watcher.observer.observe(node, { attributes: true, attributeOldValue: true, attributeFilter: THEME_ATTRIBUTES });
    watchers.set(node, watcher);
  }
  // A class change is compared with the theme values the node had before it.
  if (watcher.signature === null && node.hasAttribute?.('class')) watcher.signature = themeSignature(node);
  watcher.listeners.add(listener);
  return () => {
    watcher.listeners.delete(listener);
    if (!watcher.listeners.size) { watcher.observer.disconnect(); watchers.delete(node); }
  };
}

/*
 * A theme change reaches a component when it is drawn. Components that are not
 * rendered (inside display:none or skipped by content-visibility) update when
 * their content is drawn again instead of measuring a layout that does not
 * exist. Waiting components are grouped under the element that hides them: a
 * content-visibility:auto container reports its own skipped state, and a
 * hidden subtree is watched once for all the components inside it, so waiting
 * adds no per-frame intersection work for each component.
 */
const waiting = new Map(), rootObservers = {};
function intersections(margin) {
  return rootObservers[margin] ??= new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) wake(entry.target);
  }, { rootMargin: margin });
}
function release(root, group) {
  waiting.delete(root);
  root.removeEventListener('contentvisibilityautostatechange', group.onState);
  group.observer?.unobserve(root);
}
function wake(root) {
  const group = waiting.get(root);
  if (!group) return;
  release(root, group);
  for (const [element, run] of group.runs) if (element.isConnected) run();
}
function skipRoot(element) {
  // Hidden only because a content-visibility:auto container skips its
  // content: that drawn container reports when it draws it again.
  if (element.checkVisibility()) {
    for (let node = themeParent(element); node; node = themeParent(node)) {
      if (node.checkVisibility({ contentVisibilityAuto: true }) && getComputedStyle(node).contentVisibility === 'auto') {
        // Without the state event, the container is drawn once it is on screen.
        return { root: node, margin: 'oncontentvisibilityautostatechange' in node ? null : '0px' };
      }
    }
    return { root: element, margin: '0px' };
  }
  // Otherwise the outermost display:none element around it (a closed dialog,
  // an inactive view) is watched until it is displayed.
  let hidden = element;
  for (let node = element; node; node = themeParent(node)) if (getComputedStyle(node).display === 'none') hidden = node;
  return { root: hidden, margin: '50% 0px' };
}
function whenRendered(element, callback) {
  const { root, margin } = skipRoot(element);
  let group = waiting.get(root);
  if (!group) {
    group = { runs: new Map(), observer: margin ? intersections(margin) : null, onState: event => { if (!event.skipped) wake(root); } };
    waiting.set(root, group);
    if (group.observer) group.observer.observe(root);
    else root.addEventListener('contentvisibilityautostatechange', group.onState);
  }
  group.runs.set(element, callback);
  return () => {
    if (group.runs.delete(element) && !group.runs.size && waiting.get(root) === group) release(root, group);
  };
}
function rendered(element) {
  if (!element.checkVisibility || element.checkVisibility({ contentVisibilityAuto: true })) return true;
  // A display:contents host has no box of its own; its content is what renders.
  return getComputedStyle(element).display === 'contents';
}

/*
 * Theme updates scheduled in one task run together: every component's
 * visibility is read first, before any callback writes styles, so a page-wide
 * theme change restyles the page once for the checks instead of once per
 * component. A component already waiting to be drawn keeps waiting; it
 * updates with the latest theme when it is drawn.
 */
const pendingUpdates = new Set();
let flushQueued = false;
function flushUpdates() {
  flushQueued = false;
  const batch = [...pendingUpdates];
  pendingUpdates.clear();
  const drawn = batch.map(update => update.check());
  batch.forEach((update, index) => update.run(drawn[index]));
}

/** Observe only this scope's ancestors. Batch token writes before canvas reads. */
export function observeThemeContext(element, callback, { includeSelf = true } = {}) {
  let disposed = false, queued = false, stopWaiting = null;
  let ancestors = [], unwatch = [];
  const update = {
    check: () => !disposed && element.isConnected && !stopWaiting && rendered(element),
    run: drawn => {
      queued = false;
      if (disposed || !element.isConnected) return;
      if (drawn) callback();
      // Woken with its hiding container; a component still hidden by an inner
      // container waits for that one.
      else if (!stopWaiting) stopWaiting = whenRendered(element, () => { stopWaiting = null; schedule(); });
    },
  };
  const schedule = () => {
    if (queued || disposed) return;
    queued = true;
    pendingUpdates.add(update);
    if (!flushQueued) { flushQueued = true; queueMicrotask(flushUpdates); }
  };
  // A slot change can move the component out of the container it waits on.
  const onSlotChange = () => { stopWaiting?.(); stopWaiting = null; watchAncestors(); schedule(); };
  const watchAncestors = () => {
    for (const stop of unwatch) stop();
    for (const node of ancestors) node.removeEventListener('slotchange',onSlotChange);
    ancestors = [];
    for (let node = includeSelf ? element : themeParent(element); node; node = themeParent(node)) ancestors.push(node);
    unwatch = ancestors.map(node => watchNode(node, schedule));
    for (const node of ancestors) if (node.localName === 'slot') node.addEventListener('slotchange',onSlotChange);
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
    stopWaiting?.(); stopWaiting = null;
    pendingUpdates.delete(update);
    for (const stop of unwatch) stop();
    unwatch = [];
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
