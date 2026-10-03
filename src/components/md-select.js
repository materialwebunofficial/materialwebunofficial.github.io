/**
 * Material Design 3 Expressive (MD3E) Web Component: <md-select> & <md-option>
 *
 * Spec: MD3E-OFFICIAL-RESEARCH-AND-INTEGRATION-PLAN.md §4.7.5
 *
 * Features:
 *  - Floating label with animated notch ($T_y = -8px, S = 0.75$).
 *  - Single-select and Multi-select (`multiple` attribute) modes.
 *  - Supports `headline`, `label`, and slot text content for human-readable display.
 *  - Material Symbols `check` selection indicator.
 *  - Native Form Associated Custom Element (FACE) via `attachInternals`.
 *  - Keyboard navigation: ArrowDown / ArrowUp / Enter / Space / Escape / Tab.
 */

import { escapeHtml, sanitizeAttribute } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

/* --- MD-OPTION --- */
const optionStyle = `
  :host {
    display: block;
    box-sizing: border-box;
    outline: none;
  }
  .opt-root {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 48px;
    padding: 0 16px;
    cursor: pointer;
    user-select: none;
    font: var(--md-sys-typescale-body-large, 400 16px/24px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface, #1D1B20);
    border-radius: var(--md-sys-shape-corner-extra-small, 4px);
    transition: background-color var(--md-sys-motion-duration-short2, 100ms) ease,
                color var(--md-sys-motion-duration-short2, 100ms) ease;
  }
  .opt-root:hover,
  .opt-root.highlighted {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent);
  }
  .opt-root:active {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 14%, transparent);
  }
  .opt-root.selected {
    background-color: var(--md-sys-color-secondary-container, #E8DEF8);
    color: var(--md-sys-color-on-secondary-container, #1D192B);
    font-weight: 500;
  }
  .opt-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .material-symbols-outlined,
  .check-icon {
    font-family: 'Material Symbols Outlined', 'Material Symbols Rounded', sans-serif !important;
    font-weight: normal !important;
    font-style: normal !important;
    font-size: 20px;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--md-sys-color-primary, #6750A4);
    font-feature-settings: 'liga' 1;
    -webkit-font-smoothing: antialiased;
    user-select: none;
    pointer-events: none;
    margin-left: 12px;
    flex-shrink: 0;
  }
  :host([disabled]) .opt-root {
    opacity: 0.38;
    cursor: not-allowed;
    pointer-events: none;
  }
`;

const optionSheet = createComponentSheet(optionStyle);

export class MdOption extends HTMLElement {
  static get observedAttributes() {
    return ['value', 'selected', 'disabled', 'headline', 'label'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, optionSheet);
  }

  get value() { return this.getAttribute('value') || ''; }
  set value(v) { this.setAttribute('value', v); }

  get selected() { return this.hasAttribute('selected'); }
  set selected(v) { v ? this.setAttribute('selected', '') : this.removeAttribute('selected'); }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { v ? this.setAttribute('disabled', '') : this.removeAttribute('disabled'); }

  get displayText() {
    return this.getAttribute('headline') ||
           this.getAttribute('label') ||
           this.textContent.trim() ||
           this.value;
  }

  connectedCallback() {
    this.setAttribute('role', 'option');
    this.#render();
  }

  attributeChangedCallback() {
    this.#render();
  }

  #render() {
    const isSel = this.selected;
    const headline = this.getAttribute('headline') || this.getAttribute('label') || '';
    this.shadowRoot.innerHTML = `
      <div class="opt-root ${isSel ? 'selected' : ''}">
        <span class="opt-label">${headline ? escapeHtml(headline) : '<slot></slot>'}</span>
        ${isSel ? '<span class="check-icon material-symbols-outlined">check</span>' : ''}
      </div>
    `;
  }
}

if (!customElements.get('md-option')) {
  customElements.define('md-option', MdOption);
}


/* --- MD-SELECT --- */
const selectStyle = `
  :host {
    display: inline-block;
    width: 100%;
    position: relative;
    font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
    box-sizing: border-box;
    vertical-align: middle;
  }

  .select-box {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 56px;
    padding: 0 16px;
    box-sizing: border-box;
    cursor: pointer;
    user-select: none;
    border-radius: var(--md-sys-shape-corner-extra-small, 8px);
    border: 1px solid var(--md-sys-color-outline, #79747E);
    background-color: var(--md-sys-color-surface-container, #211F26);
    color: var(--md-sys-color-on-surface, #E6E0E9);
    transition: border-color var(--md-sys-motion-duration-short2, 200ms) ease,
                background-color var(--md-sys-motion-duration-short2, 200ms) ease;
  }
  .select-box:hover:not(.disabled) {
    border-color: var(--md-sys-color-on-surface, #1D1B20);
  }
  .select-box.focused,
  :host([open]) .select-box {
    border-color: var(--md-sys-color-primary, #6750A4);
    border-width: 2px;
    padding: 0 15px;
  }

  .label {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    transform-origin: left top;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    font: var(--md-sys-typescale-body-large, 400 16px/24px Roboto, sans-serif);
    pointer-events: none;
    transition: transform var(--md-sys-motion-duration-short2, 150ms) var(--md-sys-motion-easing-expressive-spatial, ease),
                color var(--md-sys-motion-duration-short2, 150ms) ease,
                font-size var(--md-sys-motion-duration-short2, 150ms) ease;
    padding: 0 4px;
    background-color: var(--md-sys-color-surface-container, #211F26);
    border-radius: 2px;
  }

  .select-box.floating .label {
    top: 0;
    transform: translateY(-50%) scale(0.75);
    color: var(--md-sys-color-primary, #6750A4);
    font-weight: 500;
  }

  .value-display {
    flex: 1;
    font: var(--md-sys-typescale-body-large, 400 16px/24px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface, #1D1B20);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-right: 8px;
    padding-top: 2px;
  }

  .material-symbols-outlined,
  .arrow-icon {
    font-family: 'Material Symbols Outlined', 'Material Symbols Rounded', sans-serif !important;
    font-weight: normal !important;
    font-style: normal !important;
    font-size: 24px;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none !important;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    font-feature-settings: 'liga' 1;
    -webkit-font-smoothing: antialiased;
    pointer-events: none;
    transition: transform var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-spatial, ease);
    flex-shrink: 0;
  }
  :host([open]) .arrow-icon {
    transform: rotate(180deg);
    color: var(--md-sys-color-primary, #6750A4);
  }

  .options-panel {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    width: 100%;
    min-width: 180px;
    max-height: 260px;
    overflow-y: auto;
    background-color: var(--md-sys-color-surface-container, #211F26);
    color: var(--md-sys-color-on-surface, #E6E0E9);
    border-radius: var(--md-sys-shape-corner-small, 8px);
    box-shadow: var(--md-sys-elevation-level-3, 0 4px 8px 3px rgba(0,0,0,0.25));
    border: 1px solid var(--md-sys-color-outline-variant, rgba(255,255,255,0.12));
    padding: 4px;
    z-index: 1000;
    box-sizing: border-box;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: scale(0.92, 0.85) translateY(-6px);
    transform-origin: top center;
    transition:
      opacity 180ms ease,
      transform 220ms var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.2, 0, 0, 1.2)),
      visibility 180ms ease;
  }
  :host([open]) .options-panel {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: scale(1, 1) translateY(0);
  }

  .required-marker {
    color: var(--md-sys-color-error, #B3261E);
    margin-left: 2px;
  }
  .required-marker.hidden { display: none; }

  :host([disabled]) {
    opacity: 0.38;
    pointer-events: none;
    cursor: not-allowed;
  }
`;

const selectSheet = createComponentSheet(selectStyle);

export class MdSelect extends HTMLElement {
  static formAssociated = true;

  static get observedAttributes() {
    return ['value', 'label', 'disabled', 'required', 'hide-required-marker', 'float-label', 'multiple', 'open'];
  }

  #internals = null;
  #abortController = null;
  #rendered = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, selectSheet);
    if (this.attachInternals) {
      this.#internals = this.attachInternals();
    }
    this._onDocClick = this._onDocClick.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  get value() { return this.getAttribute('value') || ''; }
  set value(v) {
    this.setAttribute('value', v);
    this.#updateSelectedOption();
  }

  get open() { return this.hasAttribute('open'); }
  set open(v) { v ? this.setAttribute('open', '') : this.removeAttribute('open'); }

  get multiple() { return this.hasAttribute('multiple'); }
  set multiple(v) { v ? this.setAttribute('multiple', '') : this.removeAttribute('multiple'); }

  get label() { return this.getAttribute('label') || ''; }
  set label(v) { this.setAttribute('label', v); }

  get required() { return this.hasAttribute('required'); }
  set required(v) { v ? this.setAttribute('required', '') : this.removeAttribute('required'); }

  get hideRequiredMarker() { return this.hasAttribute('hide-required-marker'); }
  set hideRequiredMarker(v) { v ? this.setAttribute('hide-required-marker', '') : this.removeAttribute('hide-required-marker'); }

  get floatLabel() { return this.getAttribute('float-label') || 'auto'; }
  set floatLabel(v) { this.setAttribute('float-label', v); }

  connectedCallback() {
    this.#abortController = new AbortController();
    this.setAttribute('tabindex', '0');
    if (!this.#rendered) {
      this.#render();
      this.#setupEvents();
      this.#rendered = true;
    }
    // Defer update to allow children to mount
    requestAnimationFrame(() => {
      this.#updateSelectedOption();
    });
  }

  disconnectedCallback() {
    this.#abortController?.abort();
    this.#abortController = null;
    document.removeEventListener('click', this._onDocClick);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if (name === 'open') {
      if (this.open) {
        setTimeout(() => {
          if (this.open) document.addEventListener('click', this._onDocClick);
        }, 10);
      } else {
        document.removeEventListener('click', this._onDocClick);
      }
    }
    this.#updateSelectedOption();
  }

  #render() {
    const label = this.label;
    const isRequired = this.required;
    const showMarker = isRequired && !this.hideRequiredMarker;

    this.shadowRoot.innerHTML = `
      <div class="select-box" part="box">
        <label class="label">
          <span>${escapeHtml(label)}</span>
          <span class="required-marker ${showMarker ? '' : 'hidden'}">*</span>
        </label>
        <span class="value-display"></span>
        <span class="arrow-icon material-symbols-outlined">arrow_drop_down</span>
      </div>
      <div class="options-panel" role="listbox">
        <slot></slot>
      </div>
    `;
  }

  #getOptions() {
    return Array.from(this.querySelectorAll('md-option'));
  }

  #updateSelectedOption() {
    if (!this.shadowRoot) return;
    const box = this.shadowRoot.querySelector('.select-box');
    const valDisplay = this.shadowRoot.querySelector('.value-display');
    if (!box || !valDisplay) return;

    const currentVal = this.value;
    const options = this.#getOptions();
    let displayTexts = [];

    if (this.multiple) {
      const selectedVals = currentVal ? currentVal.split(',').map(s => s.trim()) : [];
      options.forEach(opt => {
        const isSel = selectedVals.includes(opt.value);
        opt.selected = isSel;
        if (isSel) {
          const t = opt.displayText || opt.getAttribute('headline') || opt.getAttribute('label') || opt.textContent.trim() || opt.value;
          displayTexts.push(t);
        }
      });
    } else {
      options.forEach(opt => {
        const isSel = opt.value === currentVal;
        opt.selected = isSel;
        if (isSel) {
          const t = opt.displayText || opt.getAttribute('headline') || opt.getAttribute('label') || opt.textContent.trim() || opt.value;
          displayTexts.push(t);
        }
      });
    }

    // If options aren't slotted yet or text is empty, check if we can display formatted value
    let text = displayTexts.join(', ');
    if (!text && currentVal) {
      // Find matching option or capitalize
      const match = options.find(o => o.value === currentVal);
      text = match ? (match.displayText || match.getAttribute('headline') || match.textContent.trim() || currentVal) : currentVal;
    }

    valDisplay.textContent = text;

    const alwaysFloat = this.floatLabel === 'always';
    const isFloating = !!text || alwaysFloat || this.open;
    box.classList.toggle('floating', isFloating);

    if (this.#internals) {
      this.#internals.setFormValue(currentVal);
      if (this.required && !currentVal) {
        this.#internals.setValidity({ valueMissing: true }, 'Please select an option');
      } else {
        this.#internals.setValidity({});
      }
    }
  }

  _onDocClick(e) {
    if (!this.open) return;
    if (!e.composedPath().includes(this)) {
      this.open = false;
    }
  }

  _onKeyDown(e) {
    if (this.disabled) return;
    const options = this.#getOptions().filter(o => !o.disabled);
    if (!options.length) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.open = !this.open;
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.open = false;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!this.open) {
        this.open = true;
        return;
      }
      const currentIdx = options.findIndex(o => o.value === this.value);
      const nextIdx = (currentIdx + 1) % options.length;
      this.value = options[nextIdx].value;
      this.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!this.open) {
        this.open = true;
        return;
      }
      const currentIdx = options.findIndex(o => o.value === this.value);
      const prevIdx = (currentIdx - 1 + options.length) % options.length;
      this.value = options[prevIdx].value;
      this.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true }));
    }
  }

  #setupEvents() {
    const { signal } = this.#abortController;
    const box = this.shadowRoot.querySelector('.select-box');

    box.addEventListener('click', (e) => {
      e.stopPropagation();
      this.open = !this.open;
    }, { signal });

    this.addEventListener('click', (e) => {
      const opt = e.composedPath().find(el => el.tagName === 'MD-OPTION');
      if (opt && !opt.disabled) {
        if (this.multiple) {
          const currentVals = this.value ? this.value.split(',').map(s => s.trim()).filter(Boolean) : [];
          const idx = currentVals.indexOf(opt.value);
          if (idx >= 0) currentVals.splice(idx, 1);
          else currentVals.push(opt.value);
          this.value = currentVals.join(',');
        } else {
          this.value = opt.value;
          this.open = false;
        }
        this.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true }));
      }
    }, { signal });

    this.addEventListener('keydown', this._onKeyDown, { signal });

    // Listen to slotchange so when options are injected dynamically, we update text immediately
    const slot = this.shadowRoot.querySelector('slot');
    slot?.addEventListener('slotchange', () => {
      this.#updateSelectedOption();
    }, { signal });
  }
}

if (!customElements.get('md-select')) {
  customElements.define('md-select', MdSelect);
}
