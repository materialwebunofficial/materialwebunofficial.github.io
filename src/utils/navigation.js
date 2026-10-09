/**
 * Link activation for buttons rendered as links (href/target attributes).
 * Only http(s), mailto, tel and same-document relative URLs are followed.
 */
export function safeHref(value, base) {
  if (!value) return '';
  try {
    const url = new URL(value, base);
    if (['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) return value;
  } catch {}
  return '';
}

/**
 * Follows `href` after a committed activation. A cancelable `navigate` event
 * lets the caller handle in-app routing. Modifier keys and target="_blank"
 * open a new browsing context, as a native anchor would.
 */
export function followHref(host, event, href, target) {
  const view = host.ownerDocument.defaultView;
  const url = safeHref(href, host.ownerDocument.baseURI);
  if (!url || !view) return false;
  const navigate = new CustomEvent('navigate', { detail: { href: url, target: target || '' }, bubbles: true, composed: true, cancelable: true });
  if (!host.dispatchEvent(navigate)) return true;
  if (target === '_blank' || event?.ctrlKey || event?.metaKey || event?.shiftKey) {
    view.open(url, '_blank', 'noopener');
  } else if (target && target !== '_self') {
    view.open(url, target, 'noopener');
  } else {
    view.location.assign(url);
  }
  return true;
}
