/**
 * AndroidX BottomAppBar (80dp) and Expressive FlexibleBottomAppBar (64dp).
 * Source defaults/Surface/Row: test/fixtures/androidx/app-bars/AppBar.kt.
 * Actions and optional FAB are caller content, as in the public composables.
 */
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import { observeThemeContext } from '../theme/theme-context.js';
import { resolveSurfaceColors } from '../theme/surface-color.js';
import { normalizeToolbarPadding, resolveToolbarPadding, serializeToolbarPadding } from './toolbar-padding.js';

const defaultStyle = `
  :host { display: block; width: 100%; min-width: 0; -webkit-tap-highlight-color: transparent; }
  .bar {
    box-sizing: border-box; width: 100%; border: 0; border-radius: 0;
    background: var(--md-sys-color-surface-container); color: var(--md-sys-color-on-surface);
    box-shadow: none; overflow: clip;
    /* Browser equivalent of horizontal/bottom system-bar insets. */
    padding: 0 env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
  }
  .content {
    position: relative; box-sizing: border-box; display: flex; align-items: center;
    width: 100%; height: 80px; padding: 4px 4px 0; gap: 0;
  }
  .actions { display: flex; align-items: center; flex: 1 1 0; min-width: 0; gap: 0; }
  .fab { display: flex; align-self: stretch; align-items: flex-start; flex: none; padding-top: 8px; padding-inline-end: 12px; }
  .fab[hidden] { display: none; }
  slot { display: contents; }
  ::slotted(*) { flex-shrink: 0; }
  .content.flexible .actions, .content.flexible .fab:not([hidden]) { display: contents; }
  .color-probe { position: absolute; visibility: hidden; pointer-events: none; }
`;
const sheet = createComponentSheet(defaultStyle);
const arrangements = {
  start: 'flex-start', end: 'flex-end', center: 'center',
  'space-between': 'space-between', 'space-around': 'space-around', 'space-evenly': 'space-evenly', fixed: 'center'
};

export class MdBottomAppBar extends HTMLElement {
  static get observedAttributes() {
    return ['variant', 'container-color', 'content-color', 'horizontal-arrangement', 'expanded-height', 'tonal-elevation', 'content-padding', 'aria-label'];
  }
  constructor() {
    super(); this.attachShadow({mode: 'open'}); adoptSheet(this.shadowRoot, sheet);
    this._rendered = false; this._abortController = null;
  }
  get variant() { return this.getAttribute('variant') === 'flexible' ? 'flexible' : 'standard'; }
  set variant(v) { this._set('variant', v); }
  get containerColor() { return this.getAttribute('container-color') || ''; }
  set containerColor(v) { this._set('container-color', v); }
  get contentColor() { return this.getAttribute('content-color') || ''; }
  set contentColor(v) { this._set('content-color', v); }
  get horizontalArrangement() { return this.getAttribute('horizontal-arrangement') || (this.variant === 'flexible' ? 'space-between' : 'start'); }
  set horizontalArrangement(v) { this._set('horizontal-arrangement', v); }
  get expandedHeight() {
    if (this.variant !== 'flexible') return 80;
    const n = Math.fround(Number(this.getAttribute('expanded-height')));
    return Number.isFinite(n) && n > 0 ? n : 64;
  }
  set expandedHeight(v) { this._set('expanded-height', v); }
  get tonalElevation() {
    if (this.variant === 'flexible') return 0;
    const n = Math.fround(Number(this.getAttribute('tonal-elevation')));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  set tonalElevation(v) { this._set('tonal-elevation', v); }
  get contentPadding() {
    const fallback = this.variant === 'flexible' ? {start: 16, top: 0, end: 16, bottom: 0} : {start: 4, top: 4, end: 4, bottom: 0};
    const value = this.getAttribute('content-padding');
    if (value == null) return fallback;
    try { return normalizeToolbarPadding(value); } catch { return fallback; }
  }
  set contentPadding(v) { this._set('content-padding', v == null ? null : serializeToolbarPadding(normalizeToolbarPadding(v))); }
  _set(name, value) { if (value == null) this.removeAttribute(name); else this.setAttribute(name, String(value)); }
  connectedCallback() {
    if (!this._rendered) this.render();
    this.setupInteractions(); this._sync();
  }
  disconnectedCallback() { this._abortController?.abort(); this._abortController = null; }
  attributeChangedCallback(name, oldValue, value) { if (this._rendered && this.isConnected && oldValue !== value) this._sync(); }
  render() {
    const adopted = !!this.shadowRoot.adoptedStyleSheets?.length;
    this.shadowRoot.innerHTML = `${adopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="bar" part="bar" role="group">
        <div class="content" part="content">
          <div class="actions" part="actions"><slot></slot></div>
          <div class="fab" part="fab"><slot name="fab"></slot></div>
        </div>
      </div><span class="color-probe" aria-hidden="true"></span>`;
    this._rendered = true;
  }
  _sync() {
    const bar = this.shadowRoot.querySelector('.bar'), row = this.shadowRoot.querySelector('.content');
    const flexible = this.variant === 'flexible', rtl = getComputedStyle(this).direction === 'rtl';
    const padding = resolveToolbarPadding(this.contentPadding, rtl);
    row.classList.toggle('flexible', flexible);
    row.style.height = `${Math.round(this.expandedHeight)}px`;
    for (const edge of ['left', 'top', 'right', 'bottom']) row.style['padding' + edge[0].toUpperCase() + edge.slice(1)] = `${padding[edge]}px`;
    const arrangement = arrangements[this.horizontalArrangement] || (flexible ? 'space-between' : 'flex-start');
    row.style.justifyContent = flexible ? arrangement : 'flex-start';
    row.style.gap = flexible && this.horizontalArrangement === 'fixed' ? '32px' : '0px';
    this.shadowRoot.querySelector('.actions').style.justifyContent = flexible ? '' : arrangement;
    this.shadowRoot.querySelector('.fab').hidden = this.shadowRoot.querySelector('slot[name="fab"]').assignedElements().length === 0;
    const valid = (value, fallback) => value && CSS.supports('color', value) ? value : fallback;
    const colors = resolveSurfaceColors(this, this.shadowRoot.querySelector('.color-probe'), {
      container: valid(this.containerColor, 'var(--md-sys-color-surface-container)'),
      content: valid(this.contentColor, ''), elevation: this.tonalElevation
    });
    bar.style.backgroundColor = colors.container; bar.style.color = colors.content;
    bar.style.setProperty('--md-icon-button-content-color', colors.content);
    bar.style.setProperty('--md-absolute-tonal-elevation', String(colors.total));
    bar.setAttribute('aria-label', this.getAttribute('aria-label') || 'Bottom app bar');
  }
  setupInteractions() {
    this._abortController?.abort(); this._abortController = new AbortController();
    const {signal} = this._abortController;
    for (const slot of this.shadowRoot.querySelectorAll('slot')) slot.addEventListener('slotchange', () => this._sync(), {signal});
    this.shadowRoot.querySelector('.bar').addEventListener('click', event => {
      if (event.defaultPrevented) return;
      const path = event.composedPath();
      const node = path.find(n => n?.assignedSlot?.getRootNode() === this.shadowRoot);
      if (!node || node.disabled || node.hasAttribute('disabled')) return;
      if (!path.some(n => n?.matches?.('button, a[href], md-icon-button, md-fab, [role="button"]'))) return;
      if (node.slot === 'fab') this.dispatchEvent(new CustomEvent('fab-click', {bubbles: true, composed: true}));
      else this.dispatchEvent(new CustomEvent('action', {
        detail: {action: node.getAttribute('data-action') || node.getAttribute('aria-label') || node.textContent.trim()}, bubbles: true, composed: true
      }));
    }, {signal});
    const stopTheme = observeThemeContext(this, () => this._sync());
    signal.addEventListener('abort', stopTheme, {once: true});
  }
}
if (!customElements.get('md-bottom-app-bar')) customElements.define('md-bottom-app-bar', MdBottomAppBar);
