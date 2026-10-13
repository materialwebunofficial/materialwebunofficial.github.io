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
 *
 * thickness="0" (or "hairline") is Dp.Hairline: the divider takes no layout
 * space and its Canvas draws a hairline stroke, one device pixel wide, at its
 * edge. The pixel follows page zoom and the display's density.
 */

import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import { observeDensity } from '../utils/density.js';

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
  /* Dp.Hairline: no layout size; one device pixel drawn over the edge. */
  .line.hairline { position: relative; overflow: visible; background-color: transparent; }
  .line.hairline::before { content: ''; position: absolute; inset: 0 0 auto 0; height: var(--_hairline, 1px); background-color: var(--_line-color); }
  .line.hairline.vertical::before { inset: 0 auto 0 0; height: auto; width: var(--_hairline, 1px); }
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

  disconnectedCallback() {
    this._stopDensity?.();
    this._stopDensity = null;
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

  /** In CSS pixels; 0 is Dp.Hairline. */
  get thickness() {
    const raw = this.getAttribute('thickness');
    if (raw === 'hairline') return 0;
    const t = parseFloat(raw);
    return isNaN(t) || t < 0 ? 1.0 : t;
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
    const hairline = this.thickness === 0;
    line.className = `line${inset ? ' inset' : ''}${inset && this.getAttribute('inset') === 'middle' ? ' middle' : ''}${this.vertical ? ' vertical' : ''}${hairline ? ' hairline' : ''}`;

    if (!this.vertical) {
      line.style.height = `${this.thickness}px`;
      line.style.width = '';
    } else {
      line.style.width = `${this.thickness}px`;
      line.style.height = '';
    }

    const color = this.color || 'var(--md-sys-color-outline-variant, #CAC4D0)';
    line.style.backgroundColor = this.color && !hairline ? this.color : '';
    line.style.setProperty('--_line-color', color);
    if (hairline && this.isConnected) {
      const draw = () => line.style.setProperty('--_hairline', `${1 / devicePixelRatio}px`);
      draw();
      this._stopDensity ||= observeDensity(draw);
    } else {
      this._stopDensity?.();
      this._stopDensity = null;
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
