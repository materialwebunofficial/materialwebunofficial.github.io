/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-badge>
 *
 * Spec: research/MD3E-content-selection-research.md §4 (Badges)
 *   Standart M3 (dot 6dp / numeric 16dp), CornerFull, error color, LabelSmall.
 *
 * Contract: docs/AGENT-INTERACTION-CONTRACT.md
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

  .badge {
    box-sizing: border-box;
    background-color: var(--md-sys-color-error, #B3261E);
    color: var(--md-sys-color-on-error, #FFFFFF);
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 6px;
    height: 6px;
    padding: 0;
    pointer-events: none;
    font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
    font-size: var(--md-sys-typescale-label-small-size, 11px);
    font-weight: var(--md-sys-typescale-label-small-weight, 500);
    line-height: 1;
    user-select: none;
  }

  .badge.numeric {
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
  }
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
      <span class="badge ${isNumeric ? 'numeric' : 'dot'}" role="status" aria-label="${escapeHtml(isNumeric ? this.label + ' notifications' : 'New notification')}">
        <span class="txt">${escapeHtml(this._displayText())}</span>
      </span>
    `;
  }
}

customElements.define('md-badge', MdBadge);
