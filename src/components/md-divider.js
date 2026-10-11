/**
 * Material Design 3 Expressive (MD3E) Web Component: <md-divider>
 *
 * Port of AndroidX a095da93 HorizontalDivider, VerticalDivider and
 * DividerTokens (a Material 3 component Expressive left unchanged): a line of
 * DividerDefaults.Thickness (1dp) in OutlineVariant, filling the width
 * (horizontal) or the height (vertical, fillMaxHeight). Dividers carry no
 * semantics.
 *
 * Insets come from the M3 divider specs, where Compose applies them as
 * padding: inset is 16dp at the start, inset="middle" 16dp at both ends.
 */

import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    display: block;
    outline: none;
  }
  :host([vertical]) {
    display: inline-block;
    height: 100%;
    align-self: stretch;
  }

  .line {
    height: 1px;
    width: 100%;
    border: 0;
    background-color: var(--md-sys-color-outline-variant, #CAC4D0);
    margin: 0;
    box-sizing: border-box;
  }

  /* Divider inset: 16dp start margin, 0dp end margin. */
  .line.inset {
    margin-inline-start: 16px;
    width: auto;
  }
  /* Divider middle inset: 16dp at both ends. */
  .line.inset.middle { margin-inline-end: 16px; }

  .line.vertical {
    width: 1px;
    height: 100%;
    margin: 0;
  }
`;

const dividerSheet = createComponentSheet(defaultStyle);

export class MdDivider extends HTMLElement {
  static get observedAttributes() {
    return ['inset', 'vertical', 'thickness', 'color'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, dividerSheet);
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

  get inset() { return this.hasAttribute('inset'); }
  set inset(val) {
    if (val) this.setAttribute('inset', '');
    else this.removeAttribute('inset');
  }

  get vertical() { return this.hasAttribute('vertical'); }
  set vertical(val) {
    if (val) this.setAttribute('vertical', '');
    else this.removeAttribute('vertical');
  }

  get thickness() {
    const t = parseFloat(this.getAttribute('thickness'));
    return isNaN(t) || t <= 0 ? 1.0 : t;
  }
  set thickness(val) {
    if (val === null || val === undefined) this.removeAttribute('thickness');
    else this.setAttribute('thickness', String(val));
  }

  get color() { return this.getAttribute('color') || ''; }
  set color(val) {
    if (val === null || val === undefined) this.removeAttribute('color');
    else this.setAttribute('color', val);
  }

  _sync() {
    const line = this.shadowRoot.querySelector('.line');
    if (!line) return;
    const inset = this.inset && !this.vertical;
    line.className = `line${inset ? ' inset' : ''}${inset && this.getAttribute('inset') === 'middle' ? ' middle' : ''}${this.vertical ? ' vertical' : ''}`;

    if (!this.vertical) {
      line.style.height = `${this.thickness}px`;
      line.style.width = '';
    } else {
      line.style.width = `${this.thickness}px`;
      line.style.height = '';
    }

    if (this.color) {
      line.style.backgroundColor = this.color;
    } else {
      line.style.backgroundColor = '';
    }
  }

  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <hr class="line${this.inset ? ' inset' : ''}${this.vertical ? ' vertical' : ''}" aria-hidden="true">
    `;
  }
}

if (!customElements.get('md-divider')) {
  customElements.define('md-divider', MdDivider);
}
