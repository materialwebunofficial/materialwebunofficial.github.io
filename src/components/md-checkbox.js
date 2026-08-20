/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-checkbox>
 *
 * Spec: research/MD3E-actions-inputs-research.md §8 (Checkbox)
 *   Standart M3 (indeterminate + error state), 18×18dp container, 2dp corner radius,
 *   40×40dp state layer, 48×48dp min touch target.
 *
 * Contract: docs/AGENT-INTERACTION-CONTRACT.md & docs/SECURITY-AND-A11Y-SPEC.md
 *   - Form-Associated Custom Element (FACE) support
 *   - Hover = CSS state-layer only. Press = JS spring scale (0.92).
 *   - Single release via setPointerCapture; keyboard Space/Enter parity; focus-visible.
 *   - Memory safety via AbortSignal.
 */

import { bindPress, pressScale, releaseScale } from '../motion/interactions.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    display: inline-flex;
    align-items: center;
    outline: none;
    vertical-align: middle;
  }

  .chk-root {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    box-sizing: border-box;
    border-radius: 9999px;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    outline: none;
    will-change: transform;
  }
  .chk-root:focus { outline: none; }
  .chk-root:focus-visible .box {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 3px;
  }

  /* 40x40 State layer */
  .chk-root::before {
    content: '';
    position: absolute;
    width: 40px;
    height: 40px;
    border-radius: 9999px;
    background: currentColor;
    color: var(--md-sys-color-primary, #6750A4);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
  }
  .chk-root:hover:not(.disabled)::before {
    opacity: var(--md-sys-state-hover-state-layer-opacity, 0.08);
  }
  .chk-root:focus-visible:not(.disabled)::before {
    opacity: var(--md-sys-state-focus-state-layer-opacity, 0.12);
  }
  .chk-root.pressed:not(.disabled)::before {
    opacity: var(--md-sys-state-pressed-state-layer-opacity, 0.12);
  }

  /* 18x18 Box container */
  .box {
    position: relative;
    width: 18px;
    height: 18px;
    box-sizing: border-box;
    border-radius: 2px;
    border: 2px solid var(--md-sys-color-on-surface-variant, #49454F);
    background-color: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      background-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
      border-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
    outline: none;
  }

  .box.checked,
  .box.indeterminate {
    background-color: var(--md-sys-color-primary, #6750A4);
    border-color: var(--md-sys-color-primary, #6750A4);
  }

  .box.error {
    border-color: var(--md-sys-color-error, #B3261E);
  }
  .box.error.checked,
  .box.error.indeterminate {
    background-color: var(--md-sys-color-error, #B3261E);
    border-color: var(--md-sys-color-error, #B3261E);
  }

  .chk-root.disabled {
    cursor: not-allowed;
  }
  .chk-root.disabled .box {
    opacity: 0.38;
    border-color: var(--md-sys-color-on-surface, #1D1B20);
  }
  .chk-root.disabled .box.checked,
  .chk-root.disabled .box.indeterminate {
    background-color: var(--md-sys-color-on-surface, #1D1B20);
    border-color: transparent;
  }

  /* SVG Marks (Checkmark & Indeterminate Dash) */
  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .mark-check,
  .mark-dash {
    fill: none;
    stroke: var(--md-sys-color-on-primary, #FFFFFF);
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: stroke-dashoffset var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
                opacity var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
  }

  .mark-check {
    stroke-dasharray: 20;
    stroke-dashoffset: 20;
    opacity: 0;
  }
  .box.checked .mark-check {
    stroke-dashoffset: 0;
    opacity: 1;
  }

  .mark-dash {
    stroke-dasharray: 10;
    stroke-dashoffset: 10;
    opacity: 0;
  }
  .box.indeterminate .mark-dash {
    stroke-dashoffset: 0;
    opacity: 1;
  }

  .box.error .mark-check,
  .box.error .mark-dash {
    stroke: var(--md-sys-color-on-error, #FFFFFF);
  }
`;

const checkboxSheet = createComponentSheet(defaultStyle);

export class MdCheckbox extends HTMLElement {
  static formAssociated = true;

  static get observedAttributes() {
    return ['checked', 'disabled', 'indeterminate', 'error', 'name', 'value', 'checkmark-stroke', 'outline-stroke'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, checkboxSheet);
    this._internals = this.attachInternals ? this.attachInternals() : null;
    this._rendered = false;
    this._abortController = null;
  }

  get form() { return this._internals?.form; }
  get type() { return 'checkbox'; }

  formResetCallback() {
    this.checked = this.hasAttribute('checked');
  }

  formStateRestoreCallback(state) {
    this.checked = state === 'true' || state === true;
  }

  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._setup();
      this._rendered = true;
    }
    this._sync();
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    this._sync();
  }

  get checked() { return this.hasAttribute('checked'); }
  set checked(val) {
    if (val) this.setAttribute('checked', '');
    else this.removeAttribute('checked');
  }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(val) {
    if (val) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  get indeterminate() { return this.hasAttribute('indeterminate'); }
  set indeterminate(val) {
    if (val) this.setAttribute('indeterminate', '');
    else this.removeAttribute('indeterminate');
  }

  get error() { return this.hasAttribute('error'); }
  set error(val) {
    if (val) this.setAttribute('error', '');
    else this.removeAttribute('error');
  }

  get checkmarkStroke() {
    const s = parseFloat(this.getAttribute('checkmark-stroke'));
    return isNaN(s) || s <= 0 ? 2.2 : s;
  }
  set checkmarkStroke(val) {
    if (val === null || val === undefined) this.removeAttribute('checkmark-stroke');
    else this.setAttribute('checkmark-stroke', String(val));
  }

  get outlineStroke() {
    const s = parseFloat(this.getAttribute('outline-stroke'));
    return isNaN(s) || s <= 0 ? 2.0 : s;
  }
  set outlineStroke(val) {
    if (val === null || val === undefined) this.removeAttribute('outline-stroke');
    else this.setAttribute('outline-stroke', String(val));
  }

  get value() { return this.getAttribute('value') || 'on'; }
  set value(val) { this.setAttribute('value', val); }
  get name() { return this.getAttribute('name') || ''; }
  set name(val) { this.setAttribute('name', val); }

  _sync() {
    const root = this.shadowRoot.querySelector('.chk-root');
    const box = this.shadowRoot.querySelector('.box');
    if (!root || !box) return;

    this._internals?.setFormValue(this.checked ? this.value : null);

    root.className = `chk-root${this.disabled ? ' disabled' : ''}`;
    box.className = `box${this.checked ? ' checked' : ''}${this.indeterminate ? ' indeterminate' : ''}${this.error ? ' error' : ''}`;

    box.style.borderWidth = `${this.outlineStroke}px`;
    const marks = this.shadowRoot.querySelectorAll('.mark-check, .mark-dash');
    marks.forEach(m => { m.style.strokeWidth = `${this.checkmarkStroke}px`; });

    root.setAttribute('tabindex', this.disabled ? '-1' : '0');
    root.setAttribute('aria-disabled', this.disabled ? 'true' : 'false');
    if (this.indeterminate) {
      root.setAttribute('aria-checked', 'mixed');
    } else {
      root.setAttribute('aria-checked', this.checked ? 'true' : 'false');
    }
  }

  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const root = this.shadowRoot.querySelector('.chk-root');
    if (!root) return;

    const press = () => {
      pressScale(root, 0.92, 'expressiveSpatialFast');
    };

    const release = () => {
      releaseScale(root, 0.92, 'expressiveSpatialMedium');
    };

    const activate = () => {
      if (this.disabled) return;
      if (this.indeterminate) {
        this.indeterminate = false;
        this.checked = true;
      } else {
        this.checked = !this.checked;
      }
      this.dispatchEvent(new CustomEvent('change', {
        detail: { checked: this.checked, indeterminate: this.indeterminate, value: this.value },
        bubbles: true,
        composed: true
      }));
    };

    bindPress(root, {
      disabled: () => this.disabled,
      onPress: press,
      onRelease: release,
      onActivate: activate,
      signal
    });
  }

  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="chk-root" role="checkbox" tabindex="0" aria-checked="false">
        <div class="box">
          <svg viewBox="0 0 18 18" aria-hidden="true">
            <path class="mark-check" d="M 4 9.5 L 7.5 13 L 14 5"></path>
            <path class="mark-dash" d="M 4 9 L 14 9"></path>
          </svg>
        </div>
      </div>
    `;
  }
}

customElements.define('md-checkbox', MdCheckbox);
