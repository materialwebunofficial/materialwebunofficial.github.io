/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-radio-button>
 *
 * Spec: research/MD3E-actions-inputs-research.md §9 (Radio Button)
 *   Standart M3, 20×20dp icon (outer ring + 10dp inner dot), 40×40dp state layer,
 *   48×48dp min touch target.
 *
 * Contract: docs/AGENT-INTERACTION-CONTRACT.md & docs/SECURITY-AND-A11Y-SPEC.md
 *   - Form-Associated Custom Element (FACE) support
 *   - Hover = CSS state layer only. Press = JS spring scale (0.92).
 *   - Single release via setPointerCapture; keyboard Space/Enter parity; focus-visible.
 *   - Memory safety via AbortSignal.
 */

import { bindPress, pressScale, releaseScale } from '../motion/interactions.js';
import { escapeHtml } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    display: inline-flex;
    align-items: center;
    outline: none;
    vertical-align: middle;
  }

  .radio-root {
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
  .radio-root:focus { outline: none; }
  .radio-root:focus-visible .ring {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 3px;
  }

  /* 40x40 State layer */
  .radio-root::before {
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
  .radio-root:hover:not(.disabled)::before {
    opacity: var(--md-sys-state-hover-state-layer-opacity, 0.08);
  }
  .radio-root:focus-visible:not(.disabled)::before {
    opacity: var(--md-sys-state-focus-state-layer-opacity, 0.12);
  }
  .radio-root.pressed:not(.disabled)::before {
    opacity: var(--md-sys-state-pressed-state-layer-opacity, 0.12);
  }

  /* 20x20 Outer Ring */
  .ring {
    position: relative;
    width: 20px;
    height: 20px;
    box-sizing: border-box;
    border-radius: 9999px;
    border: 2px solid var(--md-sys-color-on-surface-variant, #49454F);
    background-color: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
    outline: none;
  }

  .ring.checked {
    border-color: var(--md-sys-color-primary, #6750A4);
  }

  /* 10x10 Inner Dot */
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 9999px;
    background-color: var(--md-sys-color-primary, #6750A4);
    transform: scale(0);
    transition: transform var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.34, 1.56, 0.64, 1));
  }
  .ring.checked .dot {
    transform: scale(1);
  }

  .radio-root.disabled {
    cursor: not-allowed;
  }
  .radio-root.disabled .ring {
    opacity: 0.38;
    border-color: var(--md-sys-color-on-surface, #1D1B20);
  }
  .radio-root.disabled .ring .dot {
    background-color: var(--md-sys-color-on-surface, #1D1B20);
  }
`;

const radioSheet = createComponentSheet(defaultStyle);

export class MdRadioButton extends HTMLElement {
  static formAssociated = true;

  static get observedAttributes() {
    return ['checked', 'selected', 'disabled', 'name', 'value'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, radioSheet);
    this._internals = this.attachInternals ? this.attachInternals() : null;
    this._rendered = false;
    this._abortController = null;
  }

  get form() { return this._internals?.form; }
  get type() { return 'radio'; }

  formResetCallback() {
    this.checked = this.hasAttribute('checked') || this.hasAttribute('selected');
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
    if (name === 'selected') {
      if (this.hasAttribute('selected') && !this.hasAttribute('checked')) {
        this.setAttribute('checked', '');
      } else if (!this.hasAttribute('selected') && this.hasAttribute('checked')) {
        this.removeAttribute('checked');
      }
    }
    this._sync();
  }

  get checked() { return this.hasAttribute('checked') || this.hasAttribute('selected'); }
  set checked(val) {
    if (val) {
      this.setAttribute('checked', '');
      this.setAttribute('selected', '');
    } else {
      this.removeAttribute('checked');
      this.removeAttribute('selected');
    }
    this._sync();
  }

  get selected() { return this.checked; }
  set selected(val) { this.checked = val; }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(val) {
    if (val) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
    this._sync();
  }

  get name() { return this.getAttribute('name') || ''; }
  set name(val) { this.setAttribute('name', val); }
  get value() { return this.getAttribute('value') || 'on'; }
  set value(val) { this.setAttribute('value', val); }

  _sync() {
    const isChecked = this.checked;
    const isDisabled = this.disabled;

    const root = this.shadowRoot.querySelector('.radio-root');
    const ring = this.shadowRoot.querySelector('.ring');
    if (!root || !ring) return;

    root.setAttribute('aria-checked', isChecked ? 'true' : 'false');
    root.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
    root.setAttribute('aria-label', this.getAttribute('aria-label') || this.getAttribute('label') || this.getAttribute('value') || 'Radio button');
    root.tabIndex = isDisabled ? -1 : 0;

    if (isDisabled) root.classList.add('disabled');
    else root.classList.remove('disabled');

    if (isChecked) ring.classList.add('checked');
    else ring.classList.remove('checked');

    if (this._internals && this._internals.setFormValue) {
      this._internals.setFormValue(isChecked ? this.value : null);
    }
  }

  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const root = this.shadowRoot.querySelector('.radio-root');
    if (!root) return;

    const press = () => {
      if (this.disabled) return;
      pressScale(root, 0.92, 'expressiveSpatialFast');
    };

    const release = () => {
      if (this.disabled) return;
      releaseScale(root);
    };

    const activate = () => {
      if (this.disabled || this.checked) return;
      this._uncheckOthersInGroup();
      this.checked = true;
      this.dispatchEvent(new CustomEvent('change', {
        detail: { checked: true, value: this.value },
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

  _uncheckOthersInGroup() {
    const name = this.name;
    if (!name) return;
    const root = this.getRootNode();
    if (!root) return;
    const radios = root.querySelectorAll ? root.querySelectorAll(`md-radio-button[name="${CSS.escape(name)}"]`) : [];
    radios.forEach((r) => {
      if (r !== this) {
        r.checked = false;
      }
    });
  }

  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="radio-root" role="radio" tabindex="0" aria-checked="false" aria-label="${escapeHtml(this.getAttribute('aria-label') || this.getAttribute('label') || this.getAttribute('value') || 'Radio button')}">
        <div class="ring">
          <div class="dot"></div>
        </div>
      </div>
    `;
  }
}

if (!customElements.get('md-radio-button')) {
  customElements.define('md-radio-button', MdRadioButton);
}
