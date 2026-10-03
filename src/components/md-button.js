/**
 * Material Design 3 Expressive (MD3E) Web Component: <md-button>
 *
 * Spec: MD3E-DESIGN-FOUNDATIONS-AND-COMPONENT-ANATOMY.md §6 & §11
 *   - 5 variants: filled, elevated, tonal, outlined, text
 *   - AndroidX Expressive sizes: xs (32dp), s (40dp), m (56dp), l (96dp), xl (136dp)
 *   - Shape morphing on press: CornerFull (9999px) -> CornerSmall (8px)
 *   - Focus ring: 3px solid with 2px offset
 *   - State layer: hover (0.08), focus (0.10), press (0.10)
 *   - Dynamic ripple effect
 *   - Form association (attachInternals), toggle mode, single-click guarantee
 */

import { bindPress, morphShape, createRipple } from '../motion/interactions.js';
import { escapeHtml, sanitizeAttribute } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    display: inline-flex;
    vertical-align: middle;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }

  .btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    border: none;
    outline: none;
    user-select: none;
    cursor: pointer;
    font-family: var(--md-sys-typescale-font-family, 'Roboto', system-ui, sans-serif);
    letter-spacing: 0.1px;
    overflow: visible;
    will-change: transform, border-radius;
    transition:
      background-color var(--md-sys-motion-duration-short-2, 100ms) var(--md-sys-motion-easing-emphasized, ease),
      color var(--md-sys-motion-duration-short-2, 100ms) var(--md-sys-motion-easing-emphasized, ease),
      box-shadow var(--md-sys-motion-duration-short-2, 100ms) var(--md-sys-motion-easing-emphasized, ease),
      border-color var(--md-sys-motion-duration-short-2, 100ms) var(--md-sys-motion-easing-emphasized, ease);
  }

  /* Focus Ring (§5.3) */
  .btn:focus-visible {
    outline: 3px solid var(--md-sys-color-secondary, #625b71);
    outline-offset: 2px;
  }

  /* Touch Target expand for small sizes (§4.2 - 48dp min) */
  .btn.xs::before,
  .btn.s::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    min-width: 48px;
    min-height: 48px;
    width: 100%;
    height: 100%;
    pointer-events: auto;
  }

  /* State Layer (§5.1 & §5.2) */
  .state-layer {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    background-color: currentColor;
    opacity: 0;
    transition: opacity var(--md-sys-motion-duration-short-2, 100ms) ease;
  }

  .btn:hover:not([disabled]) .state-layer {
    opacity: var(--md-sys-state-hover-opacity, 0.08);
  }
  .btn:focus-visible:not([disabled]) .state-layer {
    opacity: var(--md-sys-state-focus-opacity, 0.10);
  }
  .btn:active:not([disabled]) .state-layer {
    opacity: var(--md-sys-state-pressed-opacity, 0.10);
  }

  /* Ripple Effect */
  .md-ripple-effect {
    position: absolute;
    border-radius: 50%;
    background-color: currentColor;
    opacity: 0.15;
    transform: scale(0);
    animation: ripple-anim 400ms var(--md-sys-motion-easing-emphasized-decelerate, cubic-bezier(0.05, 0.7, 0.1, 1)) forwards;
    pointer-events: none;
  }

  @keyframes ripple-anim {
    to {
      transform: scale(2.5);
      opacity: 0;
    }
  }

  /* Varyant: Filled */
  .btn.filled {
    background-color: var(--md-sys-color-primary, #6750a4);
    color: var(--md-sys-color-on-primary, #ffffff);
    box-shadow: var(--md-sys-elevation-level0, none);
  }
  .btn.filled:hover:not([disabled]) {
    box-shadow: var(--md-sys-elevation-level1, 0px 1px 2px rgba(0,0,0,0.3));
  }
  .btn.filled:active:not([disabled]) {
    box-shadow: var(--md-sys-elevation-level0, none);
  }

  /* Varyant: Elevated */
  .btn.elevated {
    background-color: var(--md-sys-color-surface-container-low, #f7f2fa);
    color: var(--md-sys-color-primary, #6750a4);
    box-shadow: var(--md-sys-elevation-level1, 0px 1px 2px rgba(0,0,0,0.3));
  }
  .btn.elevated:hover:not([disabled]) {
    box-shadow: var(--md-sys-elevation-level2, 0px 1px 2px rgba(0,0,0,0.3));
  }
  .btn.elevated:active:not([disabled]) {
    box-shadow: var(--md-sys-elevation-level1, 0px 1px 2px rgba(0,0,0,0.3));
  }

  /* Varyant: Tonal */
  .btn.tonal {
    background-color: var(--md-sys-color-secondary-container, #e8def8);
    color: var(--md-sys-color-on-secondary-container, #1d192b);
    box-shadow: var(--md-sys-elevation-level0, none);
  }
  .btn.tonal:hover:not([disabled]) {
    box-shadow: var(--md-sys-elevation-level1, 0px 1px 2px rgba(0,0,0,0.3));
  }

  /* Varyant: Outlined */
  .btn.outlined {
    background-color: transparent;
    color: var(--md-sys-color-on-surface-variant, #49454f);
    border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
    box-shadow: var(--md-sys-elevation-level0, none);
  }
  .btn.outlined:active:not([disabled]) {
    border-color: var(--md-sys-color-outline-variant, #cac4d0);
  }

  /* Varyant: Text */
  .btn.text {
    background-color: transparent;
    color: var(--md-sys-color-on-surface-variant, #49454f);
    box-shadow: var(--md-sys-elevation-level0, none);
  }

  /* MDC DockedToolbar's theme overlay for ordinary/text buttons. */
  .btn.text {
    background-color: var(--md-toolbar-button-container, transparent);
    color: var(--md-toolbar-button-content, var(--md-sys-color-on-surface-variant));
  }
  :host(:not([variant])) .btn.filled {
    background-color: var(--md-toolbar-button-container, var(--md-sys-color-primary));
    color: var(--md-toolbar-button-content, var(--md-sys-color-on-primary));
  }
  .btn.text.togglable.selected:not(:disabled) {
    background-color: var(--md-toolbar-button-selected-container, transparent);
    color: var(--md-toolbar-button-selected-content, var(--md-sys-color-on-surface-variant));
  }
  :host(:not([variant])) .btn.filled.togglable.selected:not(:disabled) {
    background-color: var(--md-toolbar-button-selected-container, var(--md-sys-color-primary));
    color: var(--md-toolbar-button-selected-content, var(--md-sys-color-on-primary));
  }
  .btn.text.togglable.selected:is(:hover,:focus-visible,:active):not(:disabled) {
    color: var(--md-toolbar-button-interacting-content, var(--md-toolbar-button-selected-content, var(--md-sys-color-on-surface-variant)));
  }
  :host(:not([variant])) .btn.filled.togglable.selected:is(:hover,:focus-visible,:active):not(:disabled) {
    color: var(--md-toolbar-button-interacting-content, var(--md-toolbar-button-selected-content, var(--md-sys-color-on-primary)));
  }
  :host(:not([variant])) .btn.filled:disabled {
    background-color: var(--md-toolbar-button-container, color-mix(in srgb, var(--md-sys-color-on-surface) 10%, transparent));
    color: var(--md-toolbar-button-disabled-content, color-mix(in srgb, var(--md-sys-color-on-surface-variant) 38%, transparent));
  }
  :host(:not([variant])) .btn.filled.togglable:not(.selected):not(:disabled) {
    background-color: var(--md-toolbar-button-container, var(--md-sys-color-surface-container));
    color: var(--md-toolbar-button-content, var(--md-sys-color-on-surface-variant));
  }
  .btn { transition-duration: var(--md-toolbar-icon-transition, var(--md-sys-motion-duration-short-2, 100ms)); }
  .state-layer, .md-ripple-effect { background-color: var(--md-toolbar-button-state-color, currentColor); }

  /* Toggle Selected States */
  .btn.togglable:not(.selected).filled:not(:disabled) {
    background-color: var(--md-sys-color-surface-container);
    color: var(--md-sys-color-on-surface-variant);
  }
  .btn.togglable.selected.filled:not(:disabled) {
    background-color: var(--md-sys-color-primary, #6750a4);
    color: var(--md-sys-color-on-primary, #ffffff);
  }
  .btn.togglable.selected.tonal:not(:disabled) {
    background-color: var(--md-sys-color-secondary, #625b71);
    color: var(--md-sys-color-on-secondary, #ffffff);
  }
  .btn.togglable.selected.outlined:not(:disabled) {
    background-color: var(--md-sys-color-inverse-surface, #313033);
    color: var(--md-sys-color-inverse-on-surface, #f4eff4);
    border-color: var(--md-sys-color-inverse-surface, #313033);
  }

  /* Disabled State */
  .btn:disabled, .btn[disabled] {
    cursor: not-allowed;
    box-shadow: none !important;
    pointer-events: none;
  }
  .btn.filled:disabled, .btn.elevated:disabled {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface) 10%, transparent);
    color: color-mix(in srgb, var(--md-sys-color-on-surface-variant) 38%, transparent);
  }
  .btn.tonal:disabled {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 12%, transparent);
    color: color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 38%, transparent);
  }
  .btn.outlined:disabled {
    border-color: var(--md-sys-color-outline-variant);
    color: color-mix(in srgb, var(--md-sys-color-on-surface-variant) 38%, transparent);
    background-color: transparent;
  }
  .btn.text:disabled {
    color: var(--md-toolbar-button-disabled-content, color-mix(in srgb, var(--md-sys-color-on-surface-variant) 38%, transparent));
    background-color: var(--md-toolbar-button-container, transparent);
  }

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: 'Material Symbols Rounded', 'Material Symbols Outlined', 'Google Symbols', sans-serif;
    line-height: 1;
    pointer-events: none;
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }

  .lbl {
    display: inline-block;
    pointer-events: none;
  }
`;

const buttonSheet = createComponentSheet(defaultStyle);

const SIZES = {
  xs: { height: 32, pad: 16, iconSize: 20, iconGap: 8,  round: 16, square: 12, press: 8, fontSize: 14, lineHeight: 20, fontWeight: 500 },
  s:  { height: 40, pad: 16, iconSize: 20, iconGap: 8,  round: 20, square: 12, press: 8,  fontSize: 14, lineHeight: 20, fontWeight: 500 },
  m:  { height: 56, pad: 24, iconSize: 24, iconGap: 8,  round: 28, square: 16, press: 12, fontSize: 16, lineHeight: 24, fontWeight: 500 },
  l:  { height: 96, pad: 48, iconSize: 32, iconGap: 12, round: 48, square: 28, press: 16, fontSize: 24, lineHeight: 32, fontWeight: 400 },
  xl: { height: 136, pad: 64, iconSize: 40, iconGap: 16, round: 68, square: 28, press: 16, fontSize: 32, lineHeight: 40, fontWeight: 400 }
};

export class MdButton extends HTMLElement {
  static formAssociated = true;

  static get observedAttributes() {
    return ['variant', 'size', 'shape', 'disabled', 'toggle', 'selected', 'icon', 'trailing-icon', 'label', 'type'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, buttonSheet);
    this._internals = this.attachInternals ? this.attachInternals() : null;
    this._rendered = false;
    this._abortController = null;
  }

  connectedCallback() {
    if (!this._rendered) {
      this._render();
      this._rendered = true;
    }
    this._bindEvents();
    this._sync();
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    this._sync();
    if (name === 'selected') morphShape(this.shadowRoot.querySelector('.btn'), SIZES[this.size].press, this._getBaseRadius(), 'expressiveSpatialFast');
  }

  get variant() { return sanitizeAttribute(this.getAttribute('variant') || 'filled'); }
  get size() { return SIZES[this.getAttribute('size')] ? this.getAttribute('size') : 's'; }
  get shape() { return this.getAttribute('shape') || 'round'; }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { v ? this.setAttribute('disabled', '') : this.removeAttribute('disabled'); }
  get toggle() { return this.hasAttribute('toggle'); }
  get selected() { return this.hasAttribute('selected'); }
  set selected(v) { v ? this.setAttribute('selected', '') : this.removeAttribute('selected'); }
  get icon() { return this.getAttribute('icon') || ''; }
  get trailingIcon() { return this.getAttribute('trailing-icon') || ''; }
  get labelText() { return this.getAttribute('label') || ''; }
  get type() { return this.getAttribute('type') || 'button'; }
  get form() { return this._internals?.form; }

  _getBaseRadius() {
    const s = SIZES[this.size];
    if ((this.shape === 'square') !== (this.toggle && this.selected)) return s.square;
    return s.round;
  }

  _render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <button class="btn" type="button" part="button">
        <span class="state-layer"></span>
        <span class="icon lead-ico" style="display: none;"></span>
        <span class="lbl-wrapper"><slot></slot></span>
        <span class="icon trail-ico" style="display: none;"></span>
      </button>
    `;
  }

  _bindEvents() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const btn = this.shadowRoot.querySelector('.btn');
    if (!btn) return;

    bindPress(btn, {
      disabled: () => this.disabled,
      onPress: (e) => {
        const s = SIZES[this.size];
        const baseR = this._getBaseRadius();
        morphShape(btn, baseR, s.press, 'expressiveSpatialFast');
        createRipple(e, btn);
      },
      onRelease: () => {
        const s = SIZES[this.size];
        const baseR = this._getBaseRadius();
        morphShape(btn, s.press, baseR, 'expressiveSpatialMedium');
      },
      onActivate: () => {
        if (this.disabled) return;
        if (this.toggle) {
          this.selected = !this.selected;
          this.dispatchEvent(new CustomEvent('change', { detail: { selected: this.selected }, bubbles: true, composed: true }));
        }
        if (this.type === 'submit' && this._internals?.form) {
          this._internals.form.requestSubmit();
        } else if (this.type === 'reset' && this._internals?.form) {
          this._internals.form.reset();
        }
      },
      signal
    });
  }

  _sync() {
    const btn = this.shadowRoot.querySelector('.btn');
    if (!btn) return;

    const s = SIZES[this.size];
    const baseR = this._getBaseRadius();

    btn.className = `btn ${this.variant} ${this.size}${this.selected ? ' selected' : ''}${this.toggle ? ' togglable' : ''}`;
    btn.disabled = this.disabled;
    btn.setAttribute('aria-disabled', this.disabled ? 'true' : 'false');
    btn.setAttribute('tabindex', this.disabled ? '-1' : '0');
    btn.setAttribute('role', 'button');
    if (this.toggle) btn.setAttribute('aria-pressed', this.selected ? 'true' : 'false');
    else btn.removeAttribute('aria-pressed');

    btn.style.height = `${s.height}px`;
    btn.style.minHeight = `${s.height}px`;
    btn.style.padding = `0 ${s.pad}px`;
    btn.style.gap = `${s.iconGap}px`;
    const typeRole = s.height >= 136 ? 'headline-large' : s.height >= 96 ? 'headline-small' : s.height >= 56 ? 'title-medium' : 'label-large';
    btn.style.font = `var(--md-sys-typescale-${typeRole}, ${s.fontWeight} ${s.fontSize}px/${s.lineHeight}px Roboto, sans-serif)`;
    btn.style.letterSpacing = `var(--md-sys-typescale-${typeRole}-tracking, ${s.height >= 96 ? 0 : s.height >= 56 ? 0.2 : 0.1}px)`;
    btn.style.borderRadius = `${baseR}px`;
    btn.style.borderWidth = this.variant === 'outlined' ? `${this.size === 'xl' ? 3 : this.size === 'l' ? 2 : 1}px` : '0';

    const leadIcon = this.shadowRoot.querySelector('.lead-ico');
    const leadVal = this.icon;
    if (leadIcon) {
      leadIcon.textContent = leadVal || '';
      leadIcon.style.display = leadVal ? 'inline-flex' : 'none';
      leadIcon.style.fontSize = `${s.iconSize}px`;
    }

    const trailIcon = this.shadowRoot.querySelector('.trail-ico');
    const trailVal = this.trailingIcon;
    if (trailIcon) {
      trailIcon.textContent = trailVal || '';
      trailIcon.style.display = trailVal ? 'inline-flex' : 'none';
      trailIcon.style.fontSize = `${s.iconSize}px`;
    }

    const lblWrapper = this.shadowRoot.querySelector('.lbl-wrapper');
    if (lblWrapper) {
      if (this.labelText) {
        lblWrapper.innerHTML = `<span class="lbl">${escapeHtml(this.labelText)}</span>`;
      } else {
        lblWrapper.innerHTML = '<slot></slot>';
      }
    }
  }
}

if (!customElements.get('md-button')) {
  customElements.define('md-button', MdButton);
}
