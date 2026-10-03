/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-radio-button>
 *
 * Spec: research/MD3E-actions-inputs-research.md §9 (Radio Button)
 *   Standart M3, 20×20dp icon (outer ring + 10dp inner dot), 40×40dp state layer,
 *   48×48dp min touch target.
 *
 * Contract: docs/AGENT-INTERACTION-CONTRACT.md & docs/SECURITY-AND-A11Y-SPEC.md
 *   - Form-Associated Custom Element (FACE) support
 *   - Hover = CSS state layer only. Press uses the component state layer and ripple.
 *   - Single release via setPointerCapture; keyboard Space/Enter parity; focus-visible.
 *   - Memory safety via AbortSignal.
 */

import { bindPress, createRipple } from '../motion/interactions.js';
import { escapeHtml } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import { SelectionMotion } from '../motion/selection-motion.js';
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

  .radio-root {
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
  .radio-root::after {
    content: ''; position: absolute; width: 48px; height: 48px;
    left: 50%; top: 50%; transform: translate(-50%, -50%);
  }
  .radio-root:focus { outline: none; }
  .radio-root:focus-visible .ring {
    outline: 3px solid var(--md-sys-color-secondary, #625B71);
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
    color: var(--md-sys-color-on-surface, #1D1B20);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--md-sys-motion-effect-medium-duration) var(--md-sys-motion-effect-medium-easing);
  }
  .radio-root:hover:not(.disabled)::before {
    opacity: var(--md-sys-state-hover-state-layer-opacity, 0.08);
  }
  .radio-root:focus-visible:not(.disabled)::before {
    opacity: var(--md-sys-state-focus-state-layer-opacity, 0.10);
  }
  .radio-root.pressed:not(.disabled)::before {
    opacity: var(--md-sys-state-pressed-state-layer-opacity, 0.10);
  }

  /* 20x20 Outer Ring */
  .ring {
    position: relative;
    width: 20px;
    height: 20px;
    box-sizing: border-box;
    border-radius: 9999px;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    border: 2px solid currentColor;
    background-color: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color var(--md-sys-motion-effect-medium-duration) var(--md-sys-motion-effect-medium-easing);
    outline: none;
  }

  .ring.checked {
    color: var(--md-sys-color-primary, #6750A4);
  }

  /* Radius animates 0..6dp, then half the 2dp stroke is subtracted. */
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 9999px;
    background-color: currentColor;
    transform: scale(0);
  }

  .radio-root.disabled {
    cursor: not-allowed;
  }
  .radio-root.disabled .ring {
    color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
    transition: none;
  }
`;

const radioSheet = createComponentSheet(defaultStyle);

export class MdRadioButton extends HTMLElement {
  static formAssociated = true;

  static get observedAttributes() {
    return ['checked', 'selected', 'disabled', 'required', 'label', 'aria-label', 'name', 'value'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, radioSheet);
    this._internals = this.attachInternals ? this.attachInternals() : null;
    this._rendered = false;
    this._abortController = null;
  }

  focus(options) { this.shadowRoot.querySelector('.radio-root')?.focus(options); }

  get form() { return this._internals?.form ?? null; }
  get type() { return 'radio'; }
  get labels() { return this._internals?.labels; }
  get validity() { return this._internals?.validity; }
  get validationMessage() { return this.willValidate ? this._internals.validationMessage : ''; }
  get willValidate() { return this._internals?.willValidate ?? false; }
  checkValidity() { return this._internals?.checkValidity() ?? true; }
  reportValidity() { return this._internals?.reportValidity() ?? true; }
  setCustomValidity(message) { this._customValidity = String(message); this._syncValidity(); }
  get required() { return this.hasAttribute('required'); }
  set required(value) { this.toggleAttribute('required', Boolean(value)); }

  formAssociatedCallback() {
    if (this._rendered) this._regroup();
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
    this._regroup();
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
    this._dotMotion?.dispose();
    this._dotMotion = null;
    for (const peer of this._lastGroup || []) if (peer !== this && peer.isConnected) peer._syncGroupFocus();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if ((name === 'checked' || name === 'selected') && !this._reflectingChecked) this._defaultChecked = newVal !== null;
    if (!this._rendered) { this._syncValidity(); return; }
    if (name === 'name') { this._regroup(); return; }
    if ((name === 'selected' || name === 'checked') && !this._reflectingChecked) {
      this.checked = newVal !== null;
      return;
    }
    this._sync();
  }

  get checked() { return this.hasAttribute('checked') || this.hasAttribute('selected'); }
  set checked(val) {
    if (val && this.isConnected) this._uncheckOthersInGroup();
    this._reflectingChecked = true;
    this.toggleAttribute('checked', Boolean(val));
    this.toggleAttribute('selected', Boolean(val));
    this._reflectingChecked = false;
    this._sync();
  }

  get selected() { return this.checked; }
  set selected(val) { this.checked = val; }

  get disabled() { return this.hasAttribute('disabled') || !!this._formDisabled; }
  set disabled(val) {
    if (val) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
    this._sync();
  }

  get name() { return this.getAttribute('name') || ''; }
  set name(val) { this.setAttribute('name', val); }
  get value() { return this.getAttribute('value') ?? 'on'; }
  set value(val) { this.setAttribute('value', val); }

  _sync() {
    const isChecked = this.checked;
    const isDisabled = this.disabled;

    const root = this.shadowRoot.querySelector('.radio-root');
    const ring = this.shadowRoot.querySelector('.ring');
    if (!root || !ring) return;

    root.setAttribute('aria-checked', isChecked ? 'true' : 'false');
    root.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
    root.setAttribute('aria-label', this.getAttribute('aria-label') || this.getAttribute('label') || this._internals?.labels?.[0]?.textContent.trim() || this.getAttribute('value') || 'Radio button');
    root.tabIndex = isDisabled ? -1 : 0;

    if (isDisabled) root.classList.add('disabled');
    else root.classList.remove('disabled');

    if (isChecked) ring.classList.add('checked');
    else ring.classList.remove('checked');

    if (this.isConnected) {
      const radius = isChecked ? 6 : 0;
      if (!this._dotMotion) {
        this._dotMotion = new SelectionMotion(this, { radius }, values => {
          ring.querySelector('.dot').style.transform = `scale(${Math.max(0, values.radius - 1) / 5})`;
        });
      } else this._dotMotion.set({ radius: { value: radius, role: 'expressiveSpatialFast' } });
    }

    if (this._internals && this._internals.setFormValue) {
      this._internals.setFormValue(isChecked ? this.value : null, String(isChecked));
    }
    this._syncGroupFocus();
  }

  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const root = this.shadowRoot.querySelector('.radio-root');
    if (!root) return;

    this.addEventListener('click', event => {
      if (event.composedPath()[0] === this && !this.disabled) root.click();
    }, { signal });

    const press = event => { root.classList.add('pressed'); createRipple(event, root.querySelector('.ripple')); };
    const release = () => root.classList.remove('pressed');

    const activate = () => {
      if (this.disabled || this.checked) return;
      this._uncheckOthersInGroup();
      this.checked = true;
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new CustomEvent('change', {
        detail: { checked: true, value: this.value },
        bubbles: true,
        composed: true
      }));
    };

    root.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key) || this.disabled) return;
      event.preventDefault();
      const group = this._group().filter(radio => !radio.disabled);
      if (!group.length) return;
      let direction = ['ArrowRight','ArrowDown'].includes(event.key) ? 1 : -1;
      if (['ArrowRight','ArrowLeft'].includes(event.key) && getComputedStyle(this).direction === 'rtl') direction *= -1;
      const next = group[(group.indexOf(this) + direction + group.length) % group.length];
      next.shadowRoot.querySelector('.radio-root').focus();
      next.shadowRoot.querySelector('.radio-root').click();
    }, { signal });

    bindPress(root, {
      disabled: () => this.disabled,
      ignoreEvent: event => event.type.startsWith('key') && event.key === 'Enter',
      onPress: press,
      onRelease: release,
      onActivate: activate,
      signal
    });
  }

  _group() {
    if (!this.isConnected || !this.name) return [this];
    return [...(this.getRootNode().querySelectorAll?.('md-radio-button') || [])]
      .filter(radio => radio.name === this.name && radio.form === this.form);
  }

  _syncGroupFocus() {
    const group = this._group();
    this._lastGroup = group;
    const enabled = group.filter(radio => !radio.disabled);
    const entry = enabled.find(radio => radio.checked) || enabled[0];
    for (const radio of group) {
      const control = radio.shadowRoot?.querySelector('.radio-root');
      if (control) control.tabIndex = radio === entry ? 0 : -1;
      radio._syncValidity(group);
    }
  }

  _syncValidity(group = this._group()) {
    const valueMissing = Boolean(this.name) && group.some(radio => radio.required) && !group.some(radio => radio.checked);
    setSelectionValidity(this, this.shadowRoot.querySelector('.radio-root'), valueMissing);
  }

  _regroup() {
    const previous = this._lastGroup || [];
    // A checked radio entering a group wins, as when a native radio changes
    // its name, form owner or tree. Refresh the group it has left as well.
    if (this.checked && this.isConnected) this._uncheckOthersInGroup();
    this._sync();
    for (const peer of previous) {
      if (peer !== this && peer.isConnected) peer._syncGroupFocus();
    }
  }

  _uncheckOthersInGroup() {
    for (const radio of this._group()) if (radio !== this && radio.checked) radio.checked = false;
  }

  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="radio-root" role="radio" tabindex="0" aria-checked="false" aria-label="${escapeHtml(this.getAttribute('aria-label') || this.getAttribute('label') || this._internals?.labels?.[0]?.textContent.trim() || this.getAttribute('value') || 'Radio button')}">
        <span class="ripple" aria-hidden="true"></span>
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
