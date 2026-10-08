/** AndroidX Material3 a095da93 strings; callers can supply localized labels. */
const strings = {
  en: {snackbarDismiss: 'Dismiss', tooltip: 'Tooltip', showTooltip: 'Show tooltip'},
  tr: {snackbarDismiss: 'Kapat', tooltip: 'İpucu', showTooltip: 'Araç ipucunu göster'},
};
export function materialString(element, name) {
  let node = element, language;
  while (node) {
    language = node.getAttribute?.('lang'); if (language) break;
    node = node.assignedSlot || node.parentElement || node.getRootNode?.().host;
  }
  const tag = (language || element.ownerDocument?.documentElement.lang || 'en').toLowerCase().split('-')[0];
  return (strings[tag] || strings.en)[name];
}
