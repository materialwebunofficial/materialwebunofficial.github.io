/**
 * ARIA written on a component host belongs to the component's inner control.
 *
 * A custom element host has no role, and ARIA states, properties and names on
 * a role-less element are ignored by assistive technology and reported as
 * prohibited (aria-label, aria-labelledby) or not allowed (aria-expanded,
 * aria-controls, aria-haspopup, ...). Each component already applies these
 * values to its native control or semantic container. This keeps them as the
 * component's own state instead of host attributes: getAttribute, hasAttribute,
 * setAttribute, removeAttribute, toggleAttribute and the ARIAMixin string
 * properties keep working on the host, and attributeChangedCallback still runs
 * for observed names, but the host element itself carries no ARIA. aria-hidden
 * is valid on any element and stays a real attribute.
 */
const native = {
  get: Element.prototype.getAttribute,
  has: Element.prototype.hasAttribute,
  set: Element.prototype.setAttribute,
  remove: Element.prototype.removeAttribute,
};
const KEPT = new Set(['aria-hidden']);
const isDelegated = name => typeof name === 'string' && /^aria-/i.test(name) && !KEPT.has(name.toLowerCase());
const REFLECTED = {
  ariaLabel: 'aria-label', ariaDescription: 'aria-description', ariaExpanded: 'aria-expanded',
  ariaHasPopup: 'aria-haspopup', ariaPressed: 'aria-pressed', ariaChecked: 'aria-checked',
  ariaSelected: 'aria-selected', ariaDisabled: 'aria-disabled', ariaCurrent: 'aria-current',
  ariaRoleDescription: 'aria-roledescription', ariaKeyShortcuts: 'aria-keyshortcuts',
};

// Per-element state lives beside the element rather than on it.
const stores = new WeakMap(), adopted = new WeakSet(), adopting = new WeakSet(), described = new WeakSet();
function store(element) {
  let map = stores.get(element);
  if (!map) stores.set(element, map = new Map());
  return map;
}

/** Moves any real host ARIA attribute (parsed markup, raw writes) into the component state. */
function adopt(element, force = false) {
  if (adopting.has(element) || (!force && adopted.has(element))) return;
  adopted.add(element);
  if (!element.hasAttributes()) return;
  // Collected first: removing attributes while walking the live map skips some.
  let names = null;
  const attributes = element.attributes;
  for (let i = 0; i < attributes.length; i++) if (isDelegated(attributes[i].name)) (names ||= []).push(attributes[i].name);
  if (!names) return;
  for (const name of names) {
    store(element).set(name, native.get.call(element, name));
    adopting.add(element);
    try { native.remove.call(element, name); } finally { adopting.delete(element); }
  }
}

/**
 * aria-describedby names elements in the host's tree (a tooltip, a supporting
 * text), which an ID reference inside the shadow root cannot reach. The inner
 * control refers to them by element reflection, or carries their text as its
 * description where reflection is unavailable.
 */
function syncDescription(element) {
  // Nothing to apply or to clear for a component that never had a description.
  const value = store(element).get('aria-describedby') || '';
  if (!value && !described.has(element)) return;
  const control = element.shadowRoot?.querySelector('button:not([hidden]),[role="button"],[role="slider"],[role="switch"],[role="checkbox"],[role="radio"],input,textarea,[tabindex="0"]');
  if (!control) return;
  if (value) described.add(element); else described.delete(element);
  const root = element.getRootNode();
  const targets = value.split(/\s+/).filter(Boolean).map(id => root.getElementById?.(id) || element.ownerDocument.getElementById(id)).filter(Boolean);
  if ('ariaDescribedByElements' in control) control.ariaDescribedByElements = targets.length ? targets : null;
  else if (targets.length) control.setAttribute('aria-description', targets.map(target => target.textContent.trim()).join(' '));
  else control.removeAttribute('aria-description');
}

export function delegateHostAria(Class) {
  const proto = Class.prototype;
  if (Object.prototype.hasOwnProperty.call(proto, '__hostAriaDelegated')) return Class;
  Object.defineProperty(proto, '__hostAriaDelegated', { value: true });
  const connected = proto.connectedCallback, changed = proto.attributeChangedCallback;
  // Changes kept as component state reach the component's own callback.
  const notify = (element, name, previous, value) => {
    if (previous !== value && (Class.observedAttributes || []).includes(name)) changed?.call(element, name, previous, value);
  };
  Object.defineProperties(proto, {
    connectedCallback: { configurable: true, writable: true, value(...args) { adopt(this, true); const result = connected?.apply(this, args); syncDescription(this); return result; } },
    attributeChangedCallback: {
      configurable: true, writable: true,
      value(name, previous, value) {
        if (isDelegated(name)) {
          // The browser reports a real attribute (markup at upgrade, reflection,
          // raw writes): adopt it, then report the change from component state.
          if (adopting.has(this)) return;
          if (value !== null && native.has.call(this, name)) {
            const before = store(this).has(name) ? store(this).get(name) : null;
            adopt(this, true);
            if (name === 'aria-describedby') syncDescription(this);
            if (before !== value) changed?.call(this, name, before, value);
            return;
          }
          return;
        }
        return changed?.call(this, name, previous, value);
      },
    },
    getAttribute: { configurable: true, writable: true, value(name) {
      if (!isDelegated(name)) return native.get.call(this, name);
      adopt(this); const key = name.toLowerCase(); return store(this).has(key) ? store(this).get(key) : null;
    } },
    hasAttribute: { configurable: true, writable: true, value(name) {
      if (!isDelegated(name)) return native.has.call(this, name);
      adopt(this); return store(this).has(name.toLowerCase());
    } },
    setAttribute: { configurable: true, writable: true, value(name, value) {
      if (!isDelegated(name)) return native.set.call(this, name, value);
      adopt(this); const key = name.toLowerCase(), previous = store(this).has(key) ? store(this).get(key) : null, next = String(value);
      store(this).set(key, next); if (key === 'aria-describedby') syncDescription(this); notify(this, key, previous, next);
    } },
    removeAttribute: { configurable: true, writable: true, value(name) {
      if (!isDelegated(name)) return native.remove.call(this, name);
      adopt(this); const key = name.toLowerCase();
      if (!store(this).has(key)) return;
      const previous = store(this).get(key); store(this).delete(key); if (key === 'aria-describedby') syncDescription(this); notify(this, key, previous, null);
    } },
    toggleAttribute: { configurable: true, writable: true, value(name, force) {
      if (!isDelegated(name)) return Element.prototype.toggleAttribute.call(this, name, force);
      const present = this.hasAttribute(name), next = force === undefined ? !present : !!force;
      if (next && !present) this.setAttribute(name, ''); else if (!next && present) this.removeAttribute(name);
      return next;
    } },
  });
  for (const [property, name] of Object.entries(REFLECTED)) {
    Object.defineProperty(proto, property, { configurable: true,
      get() { return this.getAttribute(name); },
      set(value) { if (value === null || value === undefined) this.removeAttribute(name); else this.setAttribute(name, value); } });
  }
  return Class;
}

/**
 * Applies the popup/expansion ARIA an author or owner gives a component host to
 * its native control. aria-controls names elements in the host's tree, which an
 * ID reference inside the shadow root cannot reach: the control refers to them
 * by element reflection instead.
 */
export function forwardControlAria(host, control) {
  for (const name of ['aria-expanded', 'aria-haspopup']) {
    if (host.hasAttribute(name)) control.setAttribute(name, host.getAttribute(name));
  }
  const ids = (host.getAttribute('aria-controls') || '').split(/\s+/).filter(Boolean);
  control.removeAttribute('aria-controls');
  if (!('ariaControlsElements' in control)) return;
  const root = host.getRootNode();
  const targets = ids.map(id => root.getElementById?.(id) || host.ownerDocument.getElementById(id)).filter(Boolean);
  control.ariaControlsElements = targets.length ? targets : null;
}

/**
 * Text of the elements an aria-labelledby value names, resolved in the host's
 * tree: an ID reference cannot cross into the component's shadow root.
 */
export function labelledByText(host, value) {
  if (!value) return '';
  const root = host.getRootNode();
  return value.split(/\s+/).map(id => (root.getElementById?.(id) || host.ownerDocument.getElementById(id))?.textContent?.trim() || '').filter(Boolean).join(' ');
}
