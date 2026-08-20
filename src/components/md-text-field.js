/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-text-field>
 *
 * Spec: M3 Official Outlined & Filled Text Fields
 *   56dp container height, floating label animation, leading/trailing icons,
 *   supporting/error text, prefix/suffix, character counter.
 *
 * Contract: docs/AGENT-INTERACTION-CONTRACT.md & docs/SECURITY-AND-A11Y-SPEC.md
 *   - Form-Associated Custom Element (attachInternals)
 *   - Zero-XSS sanitization
 *   - Unconditional DOM rendering for dynamic attribute parity
 *   - Memory safety via AbortSignal
 *   - Zero attribute-thrashing on keystroke
 */

import { escapeHtml, sanitizeAttribute } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    display: inline-block;
    width: 100%;
    outline: none;
    vertical-align: top;
    font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
  }

  .tf-root {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
  }

  .field-box {
    position: relative;
    display: flex;
    align-items: center;
    height: 56px;
    min-height: 56px;
    padding: 0 16px;
    box-sizing: border-box;
    cursor: text;
    transition:
      background-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
      border-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
      box-shadow var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-spatial, ease);
  }

  /* Outlined Variant */
  .field-box.outlined {
    border-radius: var(--md-sys-shape-corner-extra-small, 4px);
    border: 1px solid var(--md-sys-color-outline, #79747E);
    background-color: transparent;
  }
  .field-box.outlined:hover:not(.disabled) {
    border-color: var(--md-sys-color-on-surface, #1D1B20);
  }
  .field-box.outlined:focus-within {
    border-color: var(--md-sys-color-primary, #6750A4);
    border-width: 2px;
    padding: 0 15px;
  }

  /* Filled Variant */
  .field-box.filled {
    border-radius: var(--md-sys-shape-corner-extra-small, 4px) var(--md-sys-shape-corner-extra-small, 4px) 0 0;
    background-color: var(--md-sys-color-surface-container-highest, #E6E0E9);
    border: none;
    border-bottom: 1px solid var(--md-sys-color-on-surface-variant, #49454F);
    padding-top: 8px;
    padding-bottom: 8px;
  }
  .field-box.filled:hover:not(.disabled) {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 4%, var(--md-sys-color-surface-container-highest, #E6E0E9));
    border-bottom-color: var(--md-sys-color-on-surface, #1D1B20);
  }
  .field-box.filled:focus-within {
    border-bottom: 2px solid var(--md-sys-color-primary, #6750A4);
  }

  /* Error States */
  .field-box.error {
    border-color: var(--md-sys-color-error, #B3261E) !important;
  }
  .field-box.error .label {
    color: var(--md-sys-color-error, #B3261E) !important;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex: 1;
    height: 100%;
    min-width: 0;
  }

  .field-box.filled .input-wrapper {
    justify-content: flex-end;
    padding-bottom: 2px;
  }

  /* Floating Label */
  .label {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    transform-origin: left top;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    font-size: var(--md-sys-typescale-body-large-size, 16px);
    line-height: var(--md-sys-typescale-body-large-line-height, 24px);
    letter-spacing: var(--md-sys-typescale-body-large-tracking, 0.5px);
    pointer-events: none;
    white-space: nowrap;
    transition:
      transform var(--md-sys-motion-duration-short2, 150ms) cubic-bezier(0.2, 0, 0, 1),
      color var(--md-sys-motion-duration-short2, 150ms) ease,
      top var(--md-sys-motion-duration-short2, 150ms) cubic-bezier(0.2, 0, 0, 1);
  }

  /* Floating label for Outlined */
  .field-box.outlined.floating .label {
    top: -9px;
    transform: scale(0.75);
    color: var(--md-sys-color-primary, #6750A4);
    background-color: var(--md-sys-color-surface-container-high, #2B2930);
    padding: 0 4px;
    margin-left: -4px;
    border-radius: 2px;
    line-height: var(--md-sys-typescale-body-small-line-height, 16px);
    z-index: 1;
  }

  /* Floating label for Filled */
  .field-box.filled.floating .label {
    top: 4px;
    transform: scale(0.75);
    color: var(--md-sys-color-primary, #6750A4);
    line-height: var(--md-sys-typescale-body-small-line-height, 16px);
  }

  .input-row {
    display: flex;
    align-items: center;
    width: 100%;
    height: 24px;
  }

  .field-box.filled.floating .input-row {
    margin-top: 14px;
  }

  input {
    width: 100%;
    height: 24px;
    border: none;
    background: transparent;
    color: var(--md-sys-color-on-surface, #1D1B20);
    font-family: inherit;
    font-size: var(--md-sys-typescale-body-large-size, 16px);
    line-height: var(--md-sys-typescale-body-large-line-height, 24px);
    letter-spacing: var(--md-sys-typescale-body-large-tracking, 0.5px);
    padding: 0;
    margin: 0;
    outline: none;
    box-sizing: border-box;
  }

  .affix {
    color: var(--md-sys-color-on-surface-variant, #49454F);
    font-size: var(--md-sys-typescale-body-large-size, 16px);
    line-height: var(--md-sys-typescale-body-large-line-height, 24px);
    user-select: none;
    white-space: nowrap;
  }
  .affix.prefix { margin-right: 4px; }
  .affix.suffix { margin-left: 4px; }

  .ico {
    font-family: 'Material Symbols Outlined';
    font-size: 24px;
    line-height: 1;
    width: 24px;
    height: 24px;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    flex-shrink: 0;
    user-select: none;
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }
  .ico.leading { margin-right: 12px; }
  .ico.trailing { margin-left: 12px; }
  .field-box:focus-within .ico.leading { color: var(--md-sys-color-primary, #6750A4); }
  .field-box.error .ico { color: var(--md-sys-color-error, #B3261E); }

  .helper-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 16px 0 16px;
    font-size: var(--md-sys-typescale-body-small-size, 12px);
    line-height: var(--md-sys-typescale-body-small-line-height, 16px);
    letter-spacing: var(--md-sys-typescale-body-small-tracking, 0.4px);
    color: var(--md-sys-color-on-surface-variant, #49454F);
    min-height: 20px;
  }
  .tf-root.error .helper-text { color: var(--md-sys-color-error, #B3261E); }
  .tf-root.disabled { cursor: not-allowed; opacity: 0.38; }
  .tf-root.disabled .field-box { pointer-events: none; }
`;

const textFieldSheet = createComponentSheet(defaultStyle);

export class MdTextField extends HTMLElement {
  static formAssociated = true;

  static get observedAttributes() {
    return [
      'label', 'value', 'placeholder', 'variant', 'type', 'disabled',
      'error', 'error-text', 'supporting-text', 'icon', 'leading-icon',
      'trailing-icon', 'prefix-text', 'suffix-text', 'maxlength', 'name', 'required',
      'single-line', 'min-lines', 'max-lines', 'read-only', 'readonly', 'is-error', 'label-position'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, textFieldSheet);
    this._internals = this.attachInternals ? this.attachInternals() : null;
    this._value = '';
    this._rendered = false;
    this._abortController = null;
  }

  connectedCallback() {
    if (!this._rendered) {
      this._value = this.getAttribute('value') || '';
      this.render();
      this._rendered = true;
    }
    this._setup();
    this._sync();
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === 'value') {
      this._value = newVal || '';
    } else if (name === 'is-error') {
      if (this.hasAttribute('is-error') && !this.hasAttribute('error')) {
        this.setAttribute('error', '');
      } else if (!this.hasAttribute('is-error') && this.hasAttribute('error')) {
        this.removeAttribute('error');
      }
    }
    this._sync();
  }

  get form() { return this._internals?.form; }
  get name() { return this.getAttribute('name'); }
  get type() { return sanitizeAttribute(this.getAttribute('type') || 'text'); }
  get label() { return this.getAttribute('label') || ''; }
  get placeholder() { return this.getAttribute('placeholder') || ''; }
  get variant() { return sanitizeAttribute(this.getAttribute('variant') || 'outlined'); }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(val) {
    if (val) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  get error() { return this.hasAttribute('error') || this.hasAttribute('is-error'); }
  set error(val) {
    if (val) {
      this.setAttribute('error', '');
    } else {
      this.removeAttribute('error');
      this.removeAttribute('is-error');
    }
  }

  get isError() { return this.error; }
  set isError(val) { this.error = val; }

  get readOnly() { return this.hasAttribute('read-only') || this.hasAttribute('readonly'); }
  set readOnly(val) {
    if (val) this.setAttribute('read-only', '');
    else {
      this.removeAttribute('read-only');
      this.removeAttribute('readonly');
    }
  }

  get singleLine() { return this.hasAttribute('single-line'); }
  set singleLine(val) {
    if (val) this.setAttribute('single-line', '');
    else this.removeAttribute('single-line');
  }

  get minLines() {
    const m = parseInt(this.getAttribute('min-lines'), 10);
    return isNaN(m) ? 1 : m;
  }
  set minLines(val) {
    if (val === null || val === undefined) this.removeAttribute('min-lines');
    else this.setAttribute('min-lines', String(val));
  }

  get maxLines() {
    const m = parseInt(this.getAttribute('max-lines'), 10);
    return isNaN(m) ? null : m;
  }
  set maxLines(val) {
    if (val === null || val === undefined) this.removeAttribute('max-lines');
    else this.setAttribute('max-lines', String(val));
  }

  get labelPosition() { return this.getAttribute('label-position') || 'floating'; }
  set labelPosition(val) {
    if (val === null || val === undefined) this.removeAttribute('label-position');
    else this.setAttribute('label-position', val);
  }

  get errorText() { return this.getAttribute('error-text') || ''; }
  get supportingText() { return this.getAttribute('supporting-text') || ''; }
  get icon() { return this.getAttribute('icon') || this.getAttribute('leading-icon') || ''; }
  get trailingIcon() { return this.getAttribute('trailing-icon') || ''; }
  get prefixText() { return this.getAttribute('prefix-text') || ''; }
  get suffixText() { return this.getAttribute('suffix-text') || ''; }
  get maxlength() {
    const m = parseInt(this.getAttribute('maxlength'), 10);
    return isNaN(m) ? null : m;
  }

  get value() { return this._value; }
  set value(val) {
    this._value = val != null ? String(val) : '';
    const input = this.shadowRoot.querySelector('input');
    if (input && input.value !== this._value) input.value = this._value;
    this._internals?.setFormValue(this._value);
    this._syncFloating();
  }

  formResetCallback() {
    this.value = this.getAttribute('value') || '';
  }

  formStateRestoreCallback(state) {
    this.value = state || '';
  }

  _syncFloating() {
    const fieldBox = this.shadowRoot.querySelector('.field-box');
    const input = this.shadowRoot.querySelector('input');
    if (!fieldBox || !input) return;

    const isFocused = this.shadowRoot.activeElement === input;
    const hasVal = Boolean(input.value && input.value.length > 0) || Boolean(this.placeholder);

    if (isFocused || hasVal) {
      fieldBox.classList.add('floating');
    } else {
      fieldBox.classList.remove('floating');
    }
  }

  _sync() {
    const root = this.shadowRoot.querySelector('.tf-root');
    const fieldBox = this.shadowRoot.querySelector('.field-box');
    const input = this.shadowRoot.querySelector('input');
    const helper = this.shadowRoot.querySelector('.helper-text');
    const counter = this.shadowRoot.querySelector('.counter');
    const labelEl = this.shadowRoot.querySelector('.label');
    const leadingIco = this.shadowRoot.querySelector('.ico.leading');
    const trailingIco = this.shadowRoot.querySelector('.ico.trailing');
    const prefixEl = this.shadowRoot.querySelector('.affix.prefix');
    const suffixEl = this.shadowRoot.querySelector('.affix.suffix');

    if (!root || !fieldBox || !input) return;

    root.className = `tf-root ${this.variant}${this.disabled ? ' disabled' : ''}${this.error ? ' error' : ''}`;
    fieldBox.className = `field-box ${this.variant}${this.error ? ' error' : ''}${this.disabled ? ' disabled' : ''}`;

    input.disabled = this.disabled;
    input.type = this.type;
    input.placeholder = this.placeholder;
    input.setAttribute('aria-label', this.label || this.getAttribute('aria-label') || 'Text field');
    if (input.value !== this._value) input.value = this._value;

    if (labelEl) {
      labelEl.textContent = this.label;
      labelEl.style.display = this.label ? 'block' : 'none';
    }

    if (leadingIco) {
      leadingIco.textContent = this.icon;
      leadingIco.style.display = this.icon ? 'inline-flex' : 'none';
    }

    if (trailingIco) {
      trailingIco.textContent = this.trailingIcon;
      trailingIco.style.display = this.trailingIcon ? 'inline-flex' : 'none';
    }

    if (prefixEl) {
      prefixEl.textContent = this.prefixText;
      prefixEl.style.display = this.prefixText ? 'inline' : 'none';
    }

    if (suffixEl) {
      suffixEl.textContent = this.suffixText;
      suffixEl.style.display = this.suffixText ? 'inline' : 'none';
    }

    if (helper) {
      const txt = this.error && this.errorText ? this.errorText : this.supportingText;
      helper.textContent = txt;
      helper.style.display = txt ? 'inline' : 'none';
    }

    if (counter) {
      if (this.maxlength) {
        counter.textContent = `${this._value.length}/${this.maxlength}`;
        counter.style.display = 'inline';
      } else {
        counter.style.display = 'none';
      }
    }

    this._internals?.setFormValue(this._value);
    this._syncFloating();
  }

  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const input = this.shadowRoot.querySelector('input');
    const fieldBox = this.shadowRoot.querySelector('.field-box');
    if (!input) return;

    if (fieldBox) {
      fieldBox.addEventListener('click', () => input.focus(), { signal });
    }

    input.addEventListener('focus', () => {
      this._syncFloating();
      this.dispatchEvent(new CustomEvent('focus', { bubbles: true, composed: true }));
    }, { signal });

    input.addEventListener('blur', () => {
      this._syncFloating();
      this.dispatchEvent(new CustomEvent('blur', { bubbles: true, composed: true }));
    }, { signal });

    input.addEventListener('input', (e) => {
      this._value = e.target.value;
      const counter = this.shadowRoot.querySelector('.counter');
      if (counter && this.maxlength) {
        counter.textContent = `${this._value.length}/${this.maxlength}`;
      }
      this._internals?.setFormValue(this._value);
      this.dispatchEvent(new CustomEvent('input', {
        detail: { value: this._value },
        bubbles: true,
        composed: true
      }));
    }, { signal });

    input.addEventListener('change', (e) => {
      this._value = e.target.value;
      this.dispatchEvent(new CustomEvent('change', {
        detail: { value: this._value },
        bubbles: true,
        composed: true
      }));
    }, { signal });
  }

  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="tf-root ${escapeHtml(this.variant)}">
        <div class="field-box ${escapeHtml(this.variant)}">
          <span class="ico leading" aria-hidden="true" style="display: none;"></span>

          <div class="input-wrapper">
            <label class="label" style="display: none;"></label>
            <div class="input-row">
              <span class="affix prefix" style="display: none;"></span>
              <input type="${escapeHtml(this.type)}" value="${escapeHtml(this._value)}" placeholder="${escapeHtml(this.placeholder)}" aria-label="${escapeHtml(this.label || this.getAttribute('aria-label') || 'Text field')}">
              <span class="affix suffix" style="display: none;"></span>
            </div>
          </div>

          <span class="ico trailing" aria-hidden="true" style="display: none;"></span>
        </div>

        <div class="helper-row">
          <span class="helper-text" style="display: none;"></span>
          <span class="counter" style="display: none;"></span>
        </div>
      </div>
    `;
  }
}

if (!customElements.get('md-text-field')) {
  customElements.define('md-text-field', MdTextField);
}
