/** Public host attributes stay in the DOM; semantics are forwarded to the control. */
const ARIA = ['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-description',
  'aria-expanded', 'aria-haspopup', 'aria-controls'];
const bindings = new WeakMap();
const forwarded = new WeakMap();
const names = new WeakMap();
const descriptions = new WeakMap();
const selector = 'button:not([hidden]),[role="button"],[role="slider"],[role="switch"],[role="checkbox"],[role="radio"],input:not([hidden]),textarea:not([hidden]),[tabindex="0"]';

function references(host, value) {
  const root = host.getRootNode();
  return (value || '').split(/\s+/).filter(Boolean)
    .map(id => root.getElementById?.(id)).filter(Boolean);
}

export function labelledByText(host, value) {
  return references(host, value).map(node => node.textContent.trim()).filter(Boolean).join(' ');
}

/** Name precedence follows HTML: labelledby, aria-label, external labels, component label. */
export function syncControlName(host, control, fallback = '') {
  if (!control) return;
  const targets = references(host, host.getAttribute('aria-labelledby'));
  const labels = [...(host._internals?.labels || [])];
  const text = targets.map(node => node.textContent.trim()).join(' ').trim()
    || host.getAttribute('aria-label') || labels.map(node => node.textContent.trim()).join(' ').trim()
    || host.getAttribute('label') || fallback;
  if (text) control.setAttribute('aria-label', text); else control.removeAttribute('aria-label');
  control.removeAttribute('aria-labelledby');
  if ('ariaLabelledByElements' in control) control.ariaLabelledByElements = targets.length ? targets : null;
}

function syncDescription(host, control) {
  if (!control) return;
  const active = host.hasAttribute('aria-describedby') || host.hasAttribute('aria-description');
  let saved = descriptions.get(control);
  if (!active) {
    if (saved) {
      if ('ariaDescribedByElements' in control) control.ariaDescribedByElements = null;
      for (const [name, value] of saved) {
        if (value === null) control.removeAttribute(name); else control.setAttribute(name, value);
      }
      descriptions.delete(control);
    }
    return;
  }
  if (!saved) descriptions.set(control, saved = new Map(['aria-description','aria-describedby'].map(name => [name, control.getAttribute(name)])));
  const targets = references(host, host.getAttribute('aria-describedby'));
  const text = targets.map(node => node.textContent.trim()).join(' ') || host.getAttribute('aria-description');
  if (text) control.setAttribute('aria-description', text); else control.removeAttribute('aria-description');
  if (host.hasAttribute('aria-describedby')) control.removeAttribute('aria-describedby');
  if ('ariaDescribedByElements' in control) {
    control.ariaDescribedByElements = targets.length ? targets : null;
  }
}

/** Observe relevant label/reference changes with one observer per host tree. */
const trees = new WeakMap();
export function observeControlLabels(host, refresh) {
  const root = host.getRootNode();
  let tree = trees.get(root);
  if (!tree) {
    const clients = new Map();
    const observer = new MutationObserver(records => {
      // What the records changed, worked out once for every client.
      const targets = records.map(record => record.target.nodeType === 1 ? record.target : record.target.parentElement);
      let structure = null;
      const inserted = () => structure ??= records.reduce((found, record) => {
        for (const node of [...record.addedNodes, ...record.removedNodes]) {
          if (node.nodeType !== 1) continue;
          found.id ||= node.matches('[id]') || !!node.querySelector('[id]');
          found.label ||= node.matches('label') || !!node.querySelector('label');
        }
        return found;
      }, { id: false, label: false });
      for (const [element, update] of clients) {
        const ids = [element.getAttribute('aria-labelledby'), element.getAttribute('aria-describedby')]
          .filter(Boolean).join(' ').split(/\s+/).filter(Boolean);
        const labels = [...(element._internals?.labels || [])];
        // Only a form-associated element with an id can gain a <label for>.
        const labelable = !!element.id && !!element._internals && element.constructor.formAssociated === true;
        if (records.some((record, index) => {
          const target = targets[index];
          if (!target) return false;
          // Components with slotted names also need text-node edits, which do
          // not dispatch slotchange. Share the existing tree observer.
          if (element._syncAccessibleName && record.type !== 'attributes' && element.contains(record.target)) return true;
          if (target === element) return record.type === 'attributes' && (ARIA.includes(record.attributeName) || record.attributeName === 'id');
          if (labels.some(label => label.contains(target)) || ids.some(id => root.getElementById?.(id)?.contains(target))) return true;
          // Elsewhere, ids and labels matter only to names built from references.
          if (record.type === 'attributes') {
            return (record.attributeName === 'id' && (ids.length > 0 || labelable)) || (record.attributeName === 'for' && labelable);
          }
          if (!ids.length && !labelable) return false;
          const { id, label } = inserted();
          return (id && ids.length > 0) || (label && labelable);
        })) update();
      }
    });
    observer.observe(root, {subtree:true, childList:true, characterData:true, attributes:true,
      attributeFilter:[...ARIA, 'id', 'for']});
    tree = {clients, observer}; trees.set(root, tree);
  }
  tree.clients.set(host, refresh);
  return () => {
    tree.clients.delete(host);
    if (!tree.clients.size) { tree.observer.disconnect(); trees.delete(root); }
  };
}

export function delegateHostAria(Class, targetSelector = selector) {
  const proto = Class.prototype;
  if (Object.hasOwn(proto, '__hostAriaDelegated')) return Class;
  Object.defineProperty(proto, '__hostAriaDelegated', {value:true});
  const connected = proto.connectedCallback, disconnected = proto.disconnectedCallback;
  const changed = proto.attributeChangedCallback, observed = Class.observedAttributes || [];
  Object.defineProperty(Class, 'observedAttributes', {configurable:true, get:()=>[...new Set([...observed, ...ARIA])]});
  const sync = host => {
    const control = host.shadowRoot?.querySelector(targetSelector);
    if (!control) return;
    const role=control.getAttribute('role');
    let saved = names.get(control);
    const current = control.getAttribute('aria-label');
    if (!saved) {
      saved = {base:current === host.getAttribute('aria-label') ? null : current, last:undefined};
      names.set(control, saved);
    } else if (current !== saved.last) saved.base = current;
    if (host._syncAccessibleName) host._syncAccessibleName();
    else {
      const fallback=host.getAttribute('icon') || ({checkbox:'Checkbox',switch:'Switch',radio:'Radio',slider:'Slider'})[role] || saved.base || '';
      syncControlName(host, control, fallback);
    }
    saved.last = control.getAttribute('aria-label');
    forwardControlAria(host, control);
    syncDescription(host, control);
  };
  proto.connectedCallback = function(...args) {
    const result = connected?.apply(this, args);
    bindings.get(this)?.();
    bindings.set(this, observeControlLabels(this, () => sync(this)));
    sync(this); return result;
  };
  proto.disconnectedCallback = function(...args) {
    bindings.get(this)?.(); bindings.delete(this);
    return disconnected?.apply(this, args);
  };
  proto.attributeChangedCallback = function(name, oldValue, value) {
    const result = changed?.call(this, name, oldValue, value);
    if (this.isConnected && oldValue !== value) sync(this);
    return result;
  };
  // State/form updates can write the component's default name without a host
  // attribute change. Reapply author relationships after that synchronization.
  const componentSync = proto._sync;
  if (componentSync) proto._sync = function(...args) {
    const result = componentSync.apply(this, args);
    if (this.isConnected) sync(this);
    return result;
  };
  return Class;
}

export function forwardControlAria(host, control) {
  let owned = forwarded.get(control);
  if (!owned) { owned = new Map(); forwarded.set(control, owned); }
  for (const name of ['aria-expanded', 'aria-haspopup']) {
    let saved = owned.get(name);
    const current = control.getAttribute(name);
    if (saved && current !== saved.last) saved.base = current;
    if (host.hasAttribute(name)) {
      if (!saved) owned.set(name, saved = {base:current});
      control.setAttribute(name, host.getAttribute(name)); saved.last = control.getAttribute(name);
    } else if (saved) {
      if (saved.base === null) control.removeAttribute(name); else control.setAttribute(name, saved.base);
      owned.delete(name);
    }
  }
  const targets = references(host, host.getAttribute('aria-controls'));
  if (host.hasAttribute('aria-controls') || owned.has('aria-controls')) {
    let saved = owned.get('aria-controls');
    const current = control.getAttribute('aria-controls');
    if (!saved) owned.set('aria-controls', saved = {base:current});
    else if (current !== saved.last) saved.base = current;
    control.removeAttribute('aria-controls');
    if ('ariaControlsElements' in control) control.ariaControlsElements = targets.length ? targets : null;
    saved.last = control.getAttribute('aria-controls');
    if (!host.hasAttribute('aria-controls')) {
      if (saved.base !== null) control.setAttribute('aria-controls', saved.base);
      owned.delete('aria-controls');
    }
  }
}
