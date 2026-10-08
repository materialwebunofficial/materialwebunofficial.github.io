// Browser focus acquisition stays with the user agent. Material's web focus
// indication uses :focus-visible and retires on pointer down, even when the user
// agent keeps :focus-visible on a repeated click of the same focused element.
const documents = new WeakMap();

function focusDocument(document) {
  let registry = documents.get(document);
  if (registry) return registry;
  const bindings = new Set(), controller = new AbortController();
  const window = document.defaultView;
  let frame = null;
  const refresh = () => { for (const binding of bindings) binding.refresh(); };
  const deferred = () => {
    if (frame !== null) return;
    frame = window.requestAnimationFrame(() => { frame = null; refresh(); });
  };
  document.addEventListener('keydown', event => {
    if (!event.isTrusted || ['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
    // Chromium may change :focus-visible before dispatch. A later check also
    // covers engines which apply their input-mode heuristic after dispatch.
    for (const binding of bindings) binding.keyboard();
    deferred();
  }, {capture: true, signal: controller.signal});
  document.addEventListener('pointerdown', event => {
    if (!event.isTrusted) return;
    const path = new Set(event.composedPath());
    for (const binding of bindings) {
      if (path.has(binding.element)) binding.pointer();
    }
    deferred();
  }, {capture: true, signal: controller.signal});
  registry = {bindings, pointer(element) {
    for (const binding of bindings) if (binding.element === element) binding.pointer();
  }, retire() {
    if (bindings.size) return;
    controller.abort();
    if (frame !== null) window.cancelAnimationFrame(frame);
    documents.delete(document);
  }};
  documents.set(document, registry);
  return registry;
}

export function bindFocusIndication(element, {onFocus, signal} = {}) {
  if (signal?.aborted) return {dispose() {}};
  const registry = focusDocument(element.ownerDocument);
  let pointerHidden = false, disposed = false;
  const set = value => {
    if (!disposed) onFocus(value);
  };
  const refresh = () => set(!pointerHidden && element.matches(':focus-visible'));
  // Explicitly authored FocusEvents remain an interaction injection boundary
  // for the source indication model; trusted DOM focus uses browser policy.
  const focus = event => { if (event.isTrusted) refresh(); else set(true); };
  const blur = () => { pointerHidden = false; set(false); };
  const binding = {element, refresh,
    pointer() { pointerHidden = true; set(false); },
    keyboard() { pointerHidden = false; refresh(); }
  };
  registry.bindings.add(binding);
  element.addEventListener('focus', focus);
  element.addEventListener('blur', blur);
  function dispose() {
    if (disposed) return;
    set(false); disposed = true;
    element.removeEventListener('focus', focus);
    element.removeEventListener('blur', blur);
    signal?.removeEventListener('abort', dispose);
    registry.bindings.delete(binding); registry.retire();
  }
  signal?.addEventListener('abort', dispose, {once: true});
  refresh();
  return {dispose, refresh};
}

// A precise Material hit may differ from the DOM pseudo-element target. Keep
// semantic browser focus on the selected owner with the same pointer policy.
export function focusPointerTarget(element, options = {preventScroll:true}) {
  documents.get(element.ownerDocument)?.pointer(element);
  element.focus(options);
}
