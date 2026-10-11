/**
 * Material Design 3 Expressive (MD3E) Web Component: <md-badge>
 *
 * Port of AndroidX a095da93 Badge, BadgedBox and BadgeTokens (a Material 3
 * component Expressive left unchanged).
 *
 * - Badge. Without content: a 6dp CornerFull dot. With content (label): at
 *   least 16dp, 4dp horizontal padding, Label Small. Container Error, content
 *   OnError (contentColorFor); container-color and content-color override them.
 * - BadgedBox. When md-badge wraps an anchor (its children, usually an icon),
 *   the anchor is laid out centered and the badge is placed from its top end
 *   corner: a dot 6dp in from the end edge and overlapping 6dp, a badge with
 *   content 12dp in and overlapping 14dp (placeRelative, mirrored in RTL). The
 *   badge does not change the anchor's size. Inside an icon button the icon is
 *   the anchor: <md-icon-button><md-badge label="4">mail</md-badge></md-icon-button>.
 *
 * Web additions: max shows "max+" for larger counts; the badge is a status
 * region announcing its count.
 */

import { escapeHtml } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    display: inline-flex;
    outline: none;
    vertical-align: middle;
    position: relative;
    pointer-events: none;
  }
  /* BadgedBox: the anchor keeps its own size and input. */
  :host([data-anchored]) { pointer-events: auto; }
  .anchor { display: none; }
  :host([data-anchored]) .anchor { display: inline-flex; align-items: center; justify-content: center; }

  .badge {
    box-sizing: border-box;
    background-color: var(--md-sys-color-error, #B3261E);
    color: var(--md-sys-color-on-error, #FFFFFF);
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 6px;
    min-height: 6px;
    padding: 0;
    pointer-events: none;
    user-select: none;
    /* An icon anchor's variation axes (wght 400) must not reach the label. */
    font-variation-settings: normal;
  }

  .badge.numeric {
    min-width: 16px;
    min-height: 16px;
    padding: 0 4px;
    font: var(--md-sys-typescale-label-small-weight, 500) var(--md-sys-typescale-label-small-size, 11px)/var(--md-sys-typescale-label-small-line-height, 16px) var(--md-sys-typescale-label-small-font, Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-small-tracking, 0.5px);
    white-space: nowrap;
  }

  /* BadgeOffset 6dp: x = anchor width - 6dp, y = -6dp + 6dp. */
  :host([data-anchored]) .badge { position: absolute; top: 0; inset-inline-start: calc(100% - 6px); }
  /* BadgeWithContent offsets: x = anchor width - 12dp, y = -16dp + 14dp. */
  :host([data-anchored]) .badge.numeric { top: -2px; inset-inline-start: calc(100% - 12px); }
`;

const badgeSheet = createComponentSheet(defaultStyle);

export class MdBadge extends HTMLElement {
  static get observedAttributes() {
    return ['label', 'max', 'container-color', 'content-color'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, badgeSheet);
    this._rendered = false;
  }

  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
    }
    this._sync();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    this._sync();
  }

  get label() { return this.getAttribute('label') || ''; }
  set label(val) {
    if (val === null || val === undefined) this.removeAttribute('label');
    else this.setAttribute('label', val);
  }

  get max() {
    const m = parseInt(this.getAttribute('max'), 10);
    return isNaN(m) ? 99 : m;
  }
  set max(val) {
    if (val === null || val === undefined) this.removeAttribute('max');
    else this.setAttribute('max', String(val));
  }

  get containerColor() { return this.getAttribute('container-color') || ''; }
  set containerColor(val) {
    if (val === null || val === undefined) this.removeAttribute('container-color');
    else this.setAttribute('container-color', val);
  }

  get contentColor() { return this.getAttribute('content-color') || ''; }
  set contentColor(val) {
    if (val === null || val === undefined) this.removeAttribute('content-color');
    else this.setAttribute('content-color', val);
  }

  _displayText() {
    if (!this.label) return '';
    const num = parseInt(this.label, 10);
    if (!isNaN(num) && num > this.max) {
      return `${this.max}+`;
    }
    return this.label;
  }

  _sync() {
    const b = this.shadowRoot.querySelector('.badge');
    const t = this.shadowRoot.querySelector('.txt');
    if (!b || !t) return;

    const isNumeric = Boolean(this.label);
    b.className = `badge ${isNumeric ? 'numeric' : 'dot'}`;
    t.textContent = this._displayText();
    b.setAttribute('aria-label', isNumeric ? `${this.label} notifications` : 'New notification');

    if (this.containerColor) b.style.backgroundColor = this.containerColor;
    else b.style.backgroundColor = '';

    if (this.contentColor) b.style.color = this.contentColor;
    else b.style.color = '';
  }

  render() {
    const isNumeric = Boolean(this.label);
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <span class="anchor" part="anchor"><slot></slot></span>
      <span class="badge ${isNumeric ? 'numeric' : 'dot'}" part="badge" role="status" aria-label="${escapeHtml(isNumeric ? this.label + ' notifications' : 'New notification')}">
        <span class="txt">${escapeHtml(this._displayText())}</span>
      </span>
    `;
    const slot = this.shadowRoot.querySelector('slot');
    const anchored = () => this.toggleAttribute('data-anchored', slot.assignedNodes().some(node => node.nodeType === Node.ELEMENT_NODE || node.textContent.trim()));
    slot.addEventListener('slotchange', anchored);
    anchored();
  }
}

if (!customElements.get('md-badge')) {
  customElements.define('md-badge', MdBadge);
}
