/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-checkbox>
 *
 * Spec: research/MD3E-actions-inputs-research.md §8 (Checkbox)
 *   Standart M3 (indeterminate + error state), 20×20dp default Compose canvas, 2dp corner radius,
 *   40×40dp state layer, 48×48dp min touch target.
 *
 * Contract: docs/AGENT-INTERACTION-CONTRACT.md & docs/SECURITY-AND-A11Y-SPEC.md
 *   - Form-Associated Custom Element (FACE) support
 *   - Hover = CSS state-layer only. Press uses the component state layer and ripple.
 *   - Single release via setPointerCapture; keyboard Space/Enter parity; focus-visible.
 *   - Memory safety via AbortSignal.
 */

import { bindPress, createRipple } from '../motion/interactions.js';
import { escapeHtml } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import { SelectionMotion, checkboxPath } from '../motion/selection-motion.js';
import { setSelectionValidity } from '../utils/selection-validity.js';

const defaultStyle = `
  .ripple { position: absolute; width: 40px; height: 40px; border-radius: 50%; pointer-events: none; color: var(--md-sys-color-on-surface); }
  .md-ripple-effect { position: absolute; background: currentColor; border-radius: 50%; opacity: .1; transform: scale(0); animation: selection-ripple 450ms ease-out forwards; }
  @keyframes selection-ripple { to { transform: scale(1); opacity: 0; } }

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
    width: max(24px, var(--md-minimum-interactive-component-size, 48px));
    height: max(24px, var(--md-minimum-interactive-component-size, 48px));
    box-sizing: border-box;
    border-radius: 9999px;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    outline: none;
  }
  .chk-root::after {
    content: ''; position: absolute; width: 48px; height: 48px;
    left: 50%; top: 50%; transform: translate(-50%, -50%);
  }
  .chk-root:focus { outline: none; }
  .chk-root:focus-visible .box {
    outline: 3px solid var(--md-sys-color-secondary, #625B71);
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
    color: var(--md-sys-color-on-surface, #1D1B20);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--md-sys-motion-effect-medium-duration) var(--md-sys-motion-effect-medium-easing);
  }
  .chk-root:hover:not(.disabled)::before {
    opacity: var(--md-sys-state-hover-state-layer-opacity, 0.08);
  }
  .chk-root:focus-visible:not(.disabled)::before {
    opacity: var(--md-sys-state-focus-state-layer-opacity, 0.10);
  }
  .chk-root.pressed:not(.disabled)::before {
    opacity: var(--md-sys-state-pressed-state-layer-opacity, 0.10);
  }

  /* Default public Compose Checkbox (styling-fix flag off): 20px canvas. */
  .box {
    position: relative;
    width: 20px;
    height: 20px;
    box-sizing: border-box;
    border-radius: 2px;
    border: 2px solid var(--md-sys-color-on-surface-variant, #49454F);
    background-color: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      background-color var(--md-sys-motion-effect-fast-duration) var(--md-sys-motion-effect-fast-easing),
      border-color var(--md-sys-motion-effect-fast-duration) var(--md-sys-motion-effect-fast-easing);
    outline: none;
  }

  .box.checked,
  .box.indeterminate {
    background-color: var(--md-sys-color-primary, #6750A4);
    border-color: var(--md-sys-color-primary, #6750A4);
    transition-duration: var(--md-sys-motion-effect-medium-duration);
    transition-timing-function: var(--md-sys-motion-effect-medium-easing);
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
    border-color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
    transition: none;
  }
  .chk-root.disabled .box.checked,
  .chk-root.disabled .box.indeterminate {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
    border-color: transparent;
    background-clip: border-box;
  }

  /* One continuously drawn/morphed path, as in Compose drawCheck. */
  svg {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 20px;
    height: 20px;
    pointer-events: none;
  }

  .mark-check {
    fill: none;
    stroke: var(--md-sys-color-on-primary, #FFFFFF);
    stroke-width: 2;
    stroke-linecap: square;
    stroke-linejoin: miter;
  }

  .box.error .mark-check {
    stroke: var(--md-sys-color-on-error, #FFFFFF);
  }
`;

const checkboxSheet = createComponentSheet(defaultStyle);

export class MdCheckbox extends HTMLElement {
  static formAssociated = true;

  static get observedAttributes() {
    return ['checked', 'disabled', 'required', 'label', 'aria-label', 'indeterminate', 'error', 'name', 'value', 'checkmark-stroke', 'outline-stroke'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, checkboxSheet);
    this._internals = this.attachInternals ? this.attachInternals() : null;
    this._rendered = false;
    this._abortController = null;
  }

  focus(options) { this.shadowRoot.querySelector('.chk-root')?.focus(options); }

  get form() { return this._internals?.form ?? null; }
  get type() { return 'checkbox'; }
  get labels() { return this._internals?.labels; }
  get validity() { return this._internals?.validity; }
  get validationMessage() { return this.willValidate ? this._internals.validationMessage : ''; }
  get willValidate() { return this._internals?.willValidate ?? false; }
  checkValidity() { return this._internals?.checkValidity() ?? true; }
  reportValidity() { return this._internals?.reportValidity() ?? true; }
  setCustomValidity(message) { this._customValidity = String(message); this._syncValidity(); }
  get required() { return this.hasAttribute('required'); }
  set required(value) { this.toggleAttribute('required', Boolean(value)); }

  _syncValidity() {
    setSelectionValidity(this, this.shadowRoot.querySelector('.chk-root'), this.required && !this.checked);
  }

  formResetCallback() {
    this.checked = this._defaultChecked;
    this.indeterminate = this._defaultIndeterminate;
  }

  formStateRestoreCallback(state) {
    try {
      const restored = JSON.parse(state);
      this.checked = typeof restored === 'boolean' ? restored : !!restored.checked;
      this.indeterminate = !!restored.indeterminate;
    } catch { this.checked = state === 'true' || state === true; this.indeterminate = false; }
  }

  formDisabledCallback(disabled) {
    this._formDisabled = disabled;
    this._sync();
  }

  connectedCallback() {
    if (this._defaultChecked === undefined) this._defaultChecked = this.checked;
    if (this._defaultIndeterminate === undefined) this._defaultIndeterminate = this.indeterminate;
    if (!this._rendered) {
      this.render();
      this._rendered = true;
    }
    this._setup();
    this._sync();
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
    this._markMotion?.dispose();
    this._markMotion = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if ((name === 'checked' || name === 'selected') && !this._reflectingChecked) this._defaultChecked = newVal !== null;
    if (!this._rendered) { this._syncValidity(); return; }
    this._sync();
  }

  get checked() { return this.hasAttribute('checked'); }
  set checked(val) {
    this._reflectingChecked = true;
    this.toggleAttribute('checked', Boolean(val));
    this._reflectingChecked = false;
  }

  get disabled() { return this.hasAttribute('disabled') || !!this._formDisabled; }
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
    return isNaN(s) || s <= 0 ? 2 : s;
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

  get value() { return this.getAttribute('value') ?? 'on'; }
  set value(val) { this.setAttribute('value', val); }
  get name() { return this.getAttribute('name') || ''; }
  set name(val) { this.setAttribute('name', val); }

  _sync() {
    const root = this.shadowRoot.querySelector('.chk-root');
    const box = this.shadowRoot.querySelector('.box');
    if (!root || !box) return;

    this._internals?.setFormValue(this.checked ? this.value : null, JSON.stringify({ checked: this.checked, indeterminate: this.indeterminate }));

    root.className = `chk-root${this.disabled ? ' disabled' : ''}`;
    box.className = `box${this.checked && !this.indeterminate ? ' checked' : ''}${this.indeterminate ? ' indeterminate' : ''}${this.error ? ' error' : ''}`;

    box.style.borderWidth = `${this.outlineStroke}px`;
    this.shadowRoot.querySelector('.mark-check').style.strokeWidth = `${this.checkmarkStroke}px`;
    this._syncMark();

    root.setAttribute('tabindex', this.disabled ? '-1' : '0');
    root.setAttribute('aria-disabled', this.disabled ? 'true' : 'false');
    root.setAttribute('aria-required', String(this.required));
    this._syncValidity();
    if (this.indeterminate) {
      root.setAttribute('aria-checked', 'mixed');
    } else {
      root.setAttribute('aria-checked', this.checked ? 'true' : 'false');
    }
    root.setAttribute('aria-label', this.getAttribute('aria-label') || this.getAttribute('label') || this._internals?.labels?.[0]?.textContent.trim() || 'Checkbox');
  }

  _syncMark() {
    if (!this.isConnected) return;
    const state = () => this.indeterminate ? 'mixed' : this.checked ? 'on' : 'off';
    if (!this._markMotion) {
      this._markTarget = state();
      const selected = this._markTarget !== 'off' ? 1 : 0;
      this._markMotion = new SelectionMotion(this, { fraction: selected,
        gravitation: this.indeterminate ? 1 : 0, opacity: selected }, values => {
        const mark = this.shadowRoot.querySelector('.mark-check');
        mark.setAttribute('d', checkboxPath(values.fraction, values.gravitation));
        mark.style.opacity = String(Math.max(0, Math.min(1, values.opacity)));
      });
      return;
    }
    if (this._markQueued) return;
    this._markQueued = true;
    // Coalesce checked + indeterminate setters, like a Compose recomposition.
    queueMicrotask(() => {
      this._markQueued = false;
      if (!this.isConnected || !this._markMotion) return;
      const target = state(), previous = this._markTarget;
      if (target === previous) return;
      this._markTarget = target;
      const selected = target !== 'off';
      this._markMotion.set({
        fraction: { value: selected ? 1 : 0, snap: !selected, delay: 100, transition: true },
        gravitation: { value: target === 'mixed' ? 1 : 0,
          snap: previous === 'off' || !selected, delay: previous === 'off' ? 0 : 100, transition: true },
        opacity: { value: selected ? 1 : 0, role: selected ? 'expressiveEffectMedium' : 'expressiveEffectFast' }
      });
    });
  }

  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const root = this.shadowRoot.querySelector('.chk-root');
    if (!root) return;

    this.addEventListener('click', event => {
      if (event.composedPath()[0] === this && !this.disabled) root.click();
    }, { signal });

    const press = event => { root.classList.add('pressed'); createRipple(event, root.querySelector('.ripple')); };
    const release = () => root.classList.remove('pressed');

    const activate = () => {
      if (this.disabled) return;
      if (this.indeterminate) {
        this.indeterminate = false;
        this.checked = true;
      } else {
        this.checked = !this.checked;
      }
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new CustomEvent('change', {
        detail: { checked: this.checked, indeterminate: this.indeterminate, value: this.value },
        bubbles: true,
        composed: true
      }));
    };

    bindPress(root, {
      disabled: () => this.disabled,
      ignoreEvent: event => event.type.startsWith('key') && event.key === 'Enter',
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
      <div class="chk-root" role="checkbox" tabindex="0" aria-checked="false" aria-label="${escapeHtml(this.getAttribute('aria-label') || this.getAttribute('label') || this._internals?.labels?.[0]?.textContent.trim() || 'Checkbox')}">
        <span class="ripple" aria-hidden="true"></span>
        <div class="box">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path class="mark-check" d=""></path>
          </svg>
        </div>
      </div>
    `;
  }
}

if (!customElements.get('md-checkbox')) {
  customElements.define('md-checkbox', MdCheckbox);
}
