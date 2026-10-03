/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-switch>
 *
 * Spec: research/MD3E-actions-inputs-research.md §7 (Switch)
 *   Standart M3 + Expressive spring motion.
 *   Track 52×32dp CornerFull, handle 16dp unselected -> 24dp selected -> 28dp pressed.
 *   Min 48×48dp touch target.
 *
 * Contract: docs/AGENT-INTERACTION-CONTRACT.md & docs/SECURITY-AND-A11Y-SPEC.md
 *   - Form-Associated Custom Element (FACE) support
 *   - Hover = CSS state layer. Press changes the thumb size.
 *   - Single release via setPointerCapture; keyboard Space/Enter parity; focus-visible.
 *   - Memory safety via AbortSignal.
 */

import { bindPress } from '../motion/interactions.js';
import { escapeHtml } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import { setSelectionValidity } from '../utils/selection-validity.js';
import { SelectionMotion } from '../motion/selection-motion.js';

const defaultStyle = `
  :host {
    display: inline-flex;
    align-items: center;
    outline: none;
    vertical-align: middle;
  }

  .switch-root {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    min-width: 52px;
    height: max(32px, var(--md-minimum-interactive-component-size, 48px));
    box-sizing: border-box;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    outline: none;
  }
  .switch-root:focus { outline: none; }
  .switch-root:focus-visible .track {
    outline: 3px solid var(--md-sys-color-secondary, #625B71);
    outline-offset: 2px;
  }

  /* 52x32dp Track */
  .track {
    position: relative;
    width: 52px;
    height: 32px;
    border-radius: 9999px;
    box-sizing: border-box;
    border: 2px solid var(--md-sys-color-outline, #79747E);
    background-color: var(--md-sys-color-surface-container-highest, #E6E0E9);
    outline: none;
  }

  .track.checked {
    background-color: var(--md-sys-color-primary, #6750A4);
    border-color: transparent;
  }

  /* Handle: 16x16dp unselected -> 24x24dp selected -> 28x28dp pressed */
  .handle-container {
    position: absolute;
    top: 50%;
    inset-inline-start: 6px;
    width: 16px;
    height: 16px;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .handle {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 9999px;
    background-color: var(--md-sys-color-outline, #79747E);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: none;
  }

  .track.checked .handle {
    background-color: var(--md-sys-color-on-primary, #FFFFFF);
  }
  .switch-root.has-icon .icon { opacity: 1; }

  /* Handle icon */
  .icon {
    font-family: 'Material Symbols Rounded', 'Material Symbols Outlined';
    font-size: 16px;
    line-height: 1;
    color: var(--md-sys-color-surface-container-highest, #E6E0E9);
    opacity: 0;
    font-variation-settings: 'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 24;
  }
  .track.checked .icon {
    color: var(--md-sys-color-on-primary-container);
    opacity: 1;
  }

  /* 40x40 State layer overlay on handle */
  .state-layer {
    position: absolute;
    width: 40px;
    height: 40px;
    border-radius: 9999px;
    background: currentColor;
    color: var(--md-sys-color-on-surface, #1D1B20);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
  }
  .track.checked .state-layer {
    color: var(--md-sys-color-primary, #6750A4);
  }
  .switch-root:hover:not(.disabled) .state-layer {
    opacity: var(--md-sys-state-hover-state-layer-opacity, 0.08);
  }
  .switch-root:focus-visible:not(.disabled) .state-layer {
    opacity: var(--md-sys-state-focus-opacity, 0.1);
  }
  .switch-root.pressed:not(.disabled) .state-layer {
    opacity: var(--md-sys-state-pressed-opacity, 0.1);
  }

  .switch-root.disabled .icon { color: color-mix(in srgb, var(--md-sys-color-surface-container-highest) 38%, var(--md-sys-color-surface)); }
  .switch-root.disabled .track.checked .icon { color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, var(--md-sys-color-surface)); }
  /* Disabled */
  .switch-root.disabled {
    cursor: not-allowed;
  }
  .switch-root.disabled .track {
    border-color: color-mix(in srgb, var(--md-sys-color-on-surface) 12%, var(--md-sys-color-surface));
    background-color: color-mix(in srgb, var(--md-sys-color-surface-container-highest) 12%, var(--md-sys-color-surface));
  }
  .switch-root.disabled .track.checked {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface) 12%, var(--md-sys-color-surface));
    border-color: transparent;
  }
  .switch-root.disabled .handle {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, var(--md-sys-color-surface));
  }
  .switch-root.disabled .track.checked .handle { background-color: var(--md-sys-color-surface); }
`;

const switchSheet = createComponentSheet(defaultStyle);

export class MdSwitch extends HTMLElement {
  static formAssociated = true;

  static get observedAttributes() {
    return ['checked', 'disabled', 'required', 'label', 'aria-label', 'icon', 'value', 'name'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, switchSheet);
    this._internals = this.attachInternals ? this.attachInternals() : null;
    this._rendered = false;
    this._abortController = null;
  }

  focus(options) { this.shadowRoot.querySelector('.switch-root')?.focus(options); }

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
    setSelectionValidity(this, this.shadowRoot.querySelector('.switch-root'), this.required && !this.checked);
  }

  formResetCallback() {
    this.checked = this._defaultChecked;
  }

  formStateRestoreCallback(state) {
    this.checked = state === 'true' || state === true;
  }

  formDisabledCallback(disabled) {
    this._formDisabled = disabled;
    this._sync();
  }

  connectedCallback() {
    if (this._defaultChecked === undefined) this._defaultChecked = this.checked;
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
    this._thumbMotion?.dispose();
    this._thumbMotion = null;
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
    this._sync();
  }

  get disabled() { return this.hasAttribute('disabled') || !!this._formDisabled; }
  set disabled(val) {
    if (val) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
    this._sync();
  }

  get icon() { return this.getAttribute('icon') || ''; }
  set icon(val) { this.setAttribute('icon', val); }
  get value() { return this.getAttribute('value') ?? 'on'; }
  set value(val) { this.setAttribute('value', val); }
  get name() { return this.getAttribute('name') || ''; }
  set name(val) { this.setAttribute('name', val); }

  _sync() {
    const isChecked = this.checked;
    const isDisabled = this.disabled;

    const root = this.shadowRoot.querySelector('.switch-root');
    const track = this.shadowRoot.querySelector('.track');
    if (!root || !track) return;

    root.setAttribute('aria-checked', isChecked ? 'true' : 'false');
    root.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
    root.setAttribute('aria-required', String(this.required));
    this._syncValidity();
    root.setAttribute('aria-label', this.getAttribute('aria-label') || this.getAttribute('label') || this._internals?.labels?.[0]?.textContent.trim() || 'Switch');
    root.tabIndex = isDisabled ? -1 : 0;

    root.classList.toggle('has-icon', Boolean(this.icon));
    root.querySelector('.icon').textContent = this.icon;
    if (isDisabled) root.classList.remove('pressed');
    if (isDisabled) root.classList.add('disabled');
    else root.classList.remove('disabled');

    if (isChecked) track.classList.add('checked');
    else track.classList.remove('checked');
    this._syncThumb();

    if (this._internals && this._internals.setFormValue) {
      this._internals.setFormValue(isChecked ? this.value : null, String(isChecked));
    }
  }

  _syncThumb() {
    if (!this.isConnected) return;
    const root = this.shadowRoot.querySelector('.switch-root');
    if (!root) return;
    const pressed = root.classList.contains('pressed') && !this.disabled;
    const size = pressed ? 28 : this.checked || this.icon ? 24 : 16;
    // AndroidX ThumbNode measures size and places the thumb independently.
    // Off: (32-size)/2; On:52-24-4. Press snaps to the inner track edge.
    const offset = pressed ? this.checked ? 22 : 2 : this.checked ? 24 : (32 - size) / 2;
    if (!this._thumbMotion) {
      this._thumbMotion = new SelectionMotion(this, { size, offset }, values => {
        const container = root.querySelector('.handle-container');
        // Compose constraints and placeRelative truncate to integer pixels at
        // the web adaptation's1dp=1CSSpx density. Logical placement handles RTL.
        const actualSize = Math.max(0, Math.trunc(values.size));
        container.style.width = container.style.height = `${actualSize}px`;
        container.style.insetInlineStart = `${Math.trunc(values.offset) - 2}px`;
      });
    } else this._thumbMotion.set({
      size: { value: size, role: 'expressiveSpatialFast', snap: pressed },
      offset: { value: offset, role: 'expressiveSpatialFast', snap: pressed }
    });
  }

  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const root = this.shadowRoot.querySelector('.switch-root');
    if (!root) return;

    this.addEventListener('click', event => {
      if (event.composedPath()[0] === this && !this.disabled) root.click();
    }, { signal });

    const press = () => {
      if (this.disabled) return;
      root.classList.add('pressed');
      this._syncThumb();
    };

    const release = () => {
      root.classList.remove('pressed');
      this._syncThumb();
    };

    const activate = () => {
      if (this.disabled) return;
      this.checked = !this.checked;
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new CustomEvent('change', {
        detail: { checked: this.checked, value: this.value },
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
      <div class="switch-root" role="switch" tabindex="0" aria-checked="false" aria-label="${escapeHtml(this.getAttribute('aria-label') || this.getAttribute('label') || this._internals?.labels?.[0]?.textContent.trim() || 'Switch')}">
        <div class="track">
          <div class="handle-container">
            <div class="state-layer"></div>
            <div class="handle">
              <span class="icon" aria-hidden="true">${escapeHtml(this.icon)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

if (!customElements.get('md-switch')) {
  customElements.define('md-switch', MdSwitch);
}
