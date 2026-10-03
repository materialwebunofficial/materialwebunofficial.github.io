// HTML form behavior for the web adaptation, separate from Material styling.
const messages = new WeakMap();

export function setSelectionValidity(control, anchor, valueMissing) {
  if (!control._internals) return;
  const customError = Boolean(control._customValidity);
  let message = control._customValidity || '';
  if (valueMissing && !message) {
    let byType = messages.get(control.ownerDocument);
    if (!byType) messages.set(control.ownerDocument, byType = new Map());
    if (!byType.has(control.type)) {
      const input = control.ownerDocument.createElement('input');
      input.type = control.type;
      input.name = 'selection-validation';
      input.required = true;
      byType.set(control.type, input.validationMessage);
    }
    message = byType.get(control.type);
  }
  control._internals.setValidity({ valueMissing, customError }, message, anchor || undefined);
  anchor?.setAttribute('aria-invalid', String(Boolean(control.error) ||
    (control._internals.willValidate && !control._internals.validity.valid)));
}
