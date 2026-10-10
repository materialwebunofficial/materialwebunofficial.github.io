/**
 * Page scroll lock for modal surfaces (dialogs, sheets, pickers).
 *
 * The document stops scrolling while any owner holds the lock. When the page
 * shows a classic scrollbar, its gutter stays reserved during the lock, so
 * the content keeps its width instead of jumping when the scrollbar goes away
 * and again when it returns. Owners are layered: nested modals release in any
 * order and earlier inline styles are restored.
 */
import { setThemeLayer, removeThemeLayer } from '../theme/theme-context.js';

const owners = new Set();

export function lockPageScroll(owner) {
  if (owners.has(owner) || typeof document === 'undefined') return;
  const root = document.documentElement, view = document.defaultView;
  const gutter = view ? view.innerWidth - root.clientWidth > 0 : false;
  owners.add(owner);
  if (gutter) setThemeLayer(root, owner, { styles: { 'scrollbar-gutter': 'stable' }, attributes: {} });
  setThemeLayer(document.body, owner, { styles: { overflow: 'hidden' }, attributes: {} });
}

export function unlockPageScroll(owner) {
  if (!owners.delete(owner) || typeof document === 'undefined') return;
  removeThemeLayer(document.body, owner);
  removeThemeLayer(document.documentElement, owner);
}
