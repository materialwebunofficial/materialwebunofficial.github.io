/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-radio-button>
 *
 * Spec: research/MD3E-actions-inputs-research.md §9 (Radio Button)
 *   Standart M3, 20×20dp icon (outer ring + 10dp inner dot), 40×40dp state layer,
 *   48×48dp min touch target.
 *
 * Contract: docs/AGENT-INTERACTION-CONTRACT.md & docs/SECURITY-AND-A11Y-SPEC.md
 *   - Form-Associated Custom Element (FACE) support
 *   - Native opacity hover/focus and a separate unbounded press ripple.
 *   - Single release via setPointerCapture; keyboard Space/Enter parity; focus-visible.
 *   - Memory safety via AbortSignal.
 */

import { bindPress, createRipple } from '../motion/interactions.js';
import { escapeHtml } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import { SelectionMotion } from '../motion/selection-motion.js';
import { setSelectionValidity } from '../utils/selection-validity.js';
import { bindStateLayer } from '../motion/state-layer.js';
import { bindSelectionColors } from '../motion/selection-color.js';
import { SelectionDOMLayout } from './selection-dom-layout.js';

const defaultStyle = `
  /* Default Compose canvas plus its 2dp padding, inside the minimum target. */
  .ripple { position: absolute; width: 24px; height: 24px; pointer-events: none; }

  :host {
    display: inline-block;
    position: relative;
    box-sizing: border-box;
    width: var(--_md-selection-width, max(24px, var(--md-minimum-interactive-component-size, 48px)));
    height: var(--_md-selection-height, max(24px, var(--md-minimum-interactive-component-size, 48px)));
    max-width: 100%;
    max-height: 100%;
    outline: none;
    vertical-align: middle;
  }

  .radio-root {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
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

  /* 40x40 State layer */
  .state-layer {
    position: absolute;
    width: 40px;
    height: 40px;
    border-radius: 9999px;
    background: rgb(from var(--md-ripple-color, currentColor) r g b / 1);
    opacity: var(--md-selection-state-alpha, 0);
    pointer-events: none;
    transition: none;
  }

  /* 20x20 Outer Ring */
  .ring {
    position: relative;
    width: 20px;
    height: 20px;
    box-sizing: border-box;
    border-radius: 9999px;
    --_md-radio-color: var(--md-sys-color-on-surface-variant);
    color: var(--_md-radio-color);
    border: 2px solid currentColor;
    background-color: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: none;
    outline: none;
  }

  .ring.checked {
    --_md-radio-color: var(--md-sys-color-primary);
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
    --_md-radio-color: rgb(from var(--md-sys-color-on-surface) r g b / .38);
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
    this._layout?.measure();
    this._pressBinding?.refresh();
    this._stateLayer?.refresh();
    this._colorBinding?.refresh();

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

    const ring=root.querySelector('.ring');
    this._layout=new SelectionDOMLayout(this,{kind:'radio',control:root,canvas:ring,ripple:root.querySelector('.ripple'),signal});
    this._colorBinding=bindSelectionColors(this,[{
      key:'ring',scope:ring,node:ring,property:'color',token:'--_md-radio-color',snapDisabled:true,
      disabledColor:disabled=>disabled?{color:'var(--md-sys-color-on-surface)',alpha:.38}:null
    }],{disabled:()=>this.disabled,signal});

    this.addEventListener('click', event => {
      if (event.composedPath()[0] === this && !this.disabled) root.click();
    }, { signal });

    this._stateLayer=bindStateLayer(root,{disabled:()=>this.disabled,hitTest:event=>this._layout.hoverHitTest(event),property:'--md-selection-state-alpha',signal});
    const press = event => { root.classList.add('pressed'); createRipple(event, root.querySelector('.ripple'),{bounded:false,radius:20}); };
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

    this._pressBinding=bindPress(root, {
      disabled: () => this.disabled,
      pointerPolicy:{input:event=>({...this._layout.pointerInput(event),clipping:false}),hitTest:event=>this._layout.hitTest(event),outOfBounds:event=>this._layout.outOfBounds(event)},
      keyboardActivation: true,
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
        <div class="ring">
          <div class="dot"></div>
        </div>
        <span class="ripple" aria-hidden="true"></span>
        <span class="state-layer" aria-hidden="true"></span>
      </div>
    `;
  }
}

if (!customElements.get('md-radio-button')) {
  customElements.define('md-radio-button', MdRadioButton);
}
