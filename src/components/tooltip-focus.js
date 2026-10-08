/** DOM adapter for BasicTooltip's focusable Popup window, AndroidX a095da93. */
const owners = new WeakMap();

export function composedContains(parent, node) {
  for (let current = node; current; current = current.assignedSlot ?? current.parentNode ?? current.host) {
    if (current === parent) return true;
  }
  return false;
}

export function deepActiveElement(document) {
  let element = document.activeElement;
  while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;
  return element;
}

// Visit the rendered order, including nested open shadow roots and slot content.
// Closed roots remain platform-owned focus stops; no inspection can enter them.
export function tooltipFocusStops(root) {
  const stops = [], seen = new Set();
  const visit = node => {
    if (!node || seen.has(node)) return;
    seen.add(node);
    if (node.nodeType !== 1) { for (const child of node.children ?? []) visit(child); return; }
    if (node.hidden || node.inert || node.disabled || node.matches(':disabled')) return;
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return;
    if (node.tabIndex >= 0 && node.getClientRects().length) stops.push(node);
    if (node.localName === 'slot') {
      const assigned = node.assignedElements({flatten:true});
      for (const child of assigned.length ? assigned : node.children) visit(child);
    } else {
      for (const child of node.shadowRoot?.children ?? node.children) visit(child);
    }
  };
  visit(root);
  return stops.filter(node => !node.shadowRoot?.delegatesFocus || !stops.some(child => child !== node && composedContains(node,child)))
    .filter(node => {
      if (node.localName !== 'input' || node.type !== 'radio' || !node.name || node.checked) return true;
      return !stops.some(other => other !== node && other.localName === 'input' && other.type === 'radio' && other.name === node.name && other.form === node.form && other.getRootNode() === node.getRootNode() && other.checked);
    }).sort((a,b) => (a.tabIndex > 0 ? a.tabIndex : Infinity) - (b.tabIndex > 0 ? b.tabIndex : Infinity));
}

export class TooltipFocusScope {
  constructor(popup, restore) { this.popup = popup; this.restore = restore; }
  get isTop() {
    if (!this.active || owners.get(this.popup.ownerDocument)?.at(-1) !== this) return false;
    for (let node = deepActiveElement(this.popup.ownerDocument); node; node = node.assignedSlot ?? node.parentNode ?? node.host) {
      // A later modal owns its own browser window. An underlying tooltip must
      // not intercept its focus/keys; a tooltip inside that modal may own focus.
      if (node.localName === 'dialog' && node.matches(':modal') && !composedContains(node,this.popup)) return false;
    }
    return true;
  }
  contains(node) { return composedContains(this.popup,node); }
  activate() {
    if (this.active) return;
    const document = this.popup.ownerDocument, stack = owners.get(document) ?? [];
    this.returnTo = deepActiveElement(document);
    this.active = true; stack.push(this); owners.set(document,stack);
    this.focusFirst();
  }
  deactivate() {
    if (!this.active) return;
    const document = this.popup.ownerDocument, stack = owners.get(document), top = this.isTop;
    const focused = deepActiveElement(document), restore = top && (this.contains(focused) || !this.popup.isConnected && focused === document.body && this.lastFocused);
    this.active = false;
    // An outgoing popup can retire underneath its replacement. Its replacement
    // must return to the original anchor, never to the now-retired popup.
    for (const owner of stack) if (owner !== this && this.contains(owner.returnTo)) owner.returnTo = this.returnTo;
    stack.splice(stack.indexOf(this),1);
    if (!stack.length) owners.delete(document);
    if (restore) {
      const previous = stack.at(-1), target = this.returnTo;
      this.restore(() => {
        if (previous) previous.focusFirst();
        else if (target?.isConnected && !target.inert && !target.disabled) target.focus({preventScroll:true});
      });
    }
    this.returnTo = null;
  }
  focusFirst() {
    if (!this.isTop) return;
    (tooltipFocusStops(this.popup)[0] ?? this.popup).focus({preventScroll:true});
    this.lastFocused = this.contains(deepActiveElement(this.popup.ownerDocument));
  }
  ensureFocus() {
    if (!this.isTop) return;
    const active = deepActiveElement(this.popup.ownerDocument);
    if (active !== this.popup && !tooltipFocusStops(this.popup).includes(active)) this.focusFirst();
    else this.lastFocused = true;
  }
  tab(backwards) {
    if (!this.isTop) return;
    const stops = tooltipFocusStops(this.popup), active = deepActiveElement(this.popup.ownerDocument), index = stops.indexOf(active);
    const next = index < 0 ? (backwards ? stops.length-1 : 0) : (index + (backwards ? -1 : 1) + stops.length) % stops.length;
    (stops[next] ?? this.popup).focus({preventScroll:true});
  }
}

/** Keep a consumed outside pointer sequence consumed even after popup removal. */
export function consumeTooltipOutsidePointer(event) {
  event.preventDefault(); event.stopImmediatePropagation();
  const document = event.target.ownerDocument ?? event.target, id = event.pointerId, controller = new AbortController();
  let timer;
  const stop = () => { clearTimeout(timer); controller.abort(); };
  const consume = e => { e.preventDefault(); e.stopImmediatePropagation(); };
  const options = {capture:true,signal:controller.signal};
  document.addEventListener('pointerdown',e => { if (e !== event && e.pointerId === id) stop(); },options);
  document.addEventListener('pointerup',e => { if (e.pointerId === id) { consume(e); timer = setTimeout(stop,1000); } },options);
  document.addEventListener('pointercancel',e => { if (e.pointerId === id) stop(); },options);
  document.defaultView.addEventListener('blur',stop,{signal:controller.signal});
  document.addEventListener('visibilitychange',() => { if (document.hidden) stop(); },{signal:controller.signal});
  document.addEventListener('click',e => {
    if (e.detail > 0 && (e.pointerId == null || e.pointerId === id)) { consume(e); stop(); }
  },options);
}
