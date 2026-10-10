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
 *   - Native opacity hover/focus and unbounded ripple over the moving thumb.
 *   - Single release via setPointerCapture; keyboard Space/Enter parity; focus-visible.
 *   - Memory safety via AbortSignal.
 */

import { delegateHostAria } from '../utils/host-aria.js';
import { bindPress, createRipple } from '../motion/interactions.js';
import { bindStateLayer } from '../motion/state-layer.js';
import { escapeHtml } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import { setSelectionValidity } from '../utils/selection-validity.js';
import { SelectionMotion } from '../motion/selection-motion.js';
import { bindSelectionColors } from '../motion/selection-color.js';
import { SelectionDOMLayout } from './selection-dom-layout.js';

const defaultStyle = `
  :host {
    display: inline-block;
    position: relative;
    box-sizing: border-box;
    width: var(--_md-selection-width, max(52px, var(--md-minimum-interactive-component-size, 48px)));
    height: var(--_md-selection-height, max(32px, var(--md-minimum-interactive-component-size, 48px)));
    max-width: 100%;
    max-height: 100%;
    outline: none;
    vertical-align: middle;
  }

  .switch-root {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 32px;
    box-sizing: border-box;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    outline: none;
  }
  .switch-root:focus { outline: none; }
  .switch-root::after {
    content: ''; position: absolute; width: max(100%, 48px); height: max(100%, 48px);
    left: 50%; top: 50%; transform: translate(-50%, -50%);
  }

  /* 52x32dp Track */
  .track {
    position: relative;
    width: 52px;
    height: 32px;
    border-radius: 9999px;
    box-sizing: border-box;
    --_md-switch-border: var(--md-sys-color-outline);
    --_md-switch-track: var(--md-sys-color-surface-container-highest);
    border: 2px solid var(--_md-switch-border);
    background-color: var(--_md-switch-track);
    outline: none;
  }

  .track.checked {
    --_md-switch-track: var(--md-sys-color-primary);
    --_md-switch-border: transparent;
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
    --_md-switch-handle: var(--md-sys-color-outline);
    --_md-switch-icon: var(--md-switch-icon-color, var(--md-sys-color-surface-container-highest));
    background-color: var(--_md-switch-handle);
    color: var(--_md-switch-icon);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: none;
  }

  .track.checked .handle {
    --_md-switch-handle: var(--md-switch-selected-handle-color, var(--md-sys-color-on-primary));
    /* ColorSpec2025 can make OnPrimary and OnPrimaryContainer equally dark.
       An OnPrimary thumb uses its paired Primary content in the resting state. */
    --_md-switch-icon: var(--md-switch-selected-icon-color, var(--md-sys-color-primary));
  }
  .switch-root:is(.interacting, .pressed):not(.disabled) .handle {
    --_md-switch-handle: var(--md-sys-color-on-surface-variant);
  }
  .switch-root:is(.interacting, .pressed):not(.disabled) .track.checked .handle {
    --_md-switch-handle: var(--md-switch-selected-interactive-handle-color, var(--md-sys-color-primary-container));
    --_md-switch-icon: var(--md-switch-selected-interactive-icon-color, var(--md-sys-color-on-primary-container));
  }
  .switch-root.has-icon .icon { opacity: 1; }

  /* Handle icon */
  .icon {
    font-family: var(--md-icon-font-family, 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif);
    font-size: 16px;
    line-height: 1;
    color: inherit;
    opacity: 0;
    font-variation-settings: 'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 24;
  }
  .track.checked .icon {
    opacity: 1;
  }

  /* 40x40 State layer overlay on handle */
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

  /* Disabled */
  .switch-root.disabled {
    cursor: not-allowed;
  }
  .switch-root.disabled .track {
    --_md-switch-border: color-mix(in srgb, rgb(from var(--md-sys-color-on-surface) r g b / 1) 12%, var(--md-sys-color-surface));
    --_md-switch-track: color-mix(in srgb, rgb(from var(--md-sys-color-surface-container-highest) r g b / 1) 12%, var(--md-sys-color-surface));
  }
  .switch-root.disabled .track.checked {
    --_md-switch-track: color-mix(in srgb, rgb(from var(--md-sys-color-on-surface) r g b / 1) 12%, var(--md-sys-color-surface));
    --_md-switch-border: transparent;
  }
  .switch-root.disabled .handle {
    --_md-switch-handle: color-mix(in srgb, rgb(from var(--md-sys-color-on-surface) r g b / 1) 38%, var(--md-sys-color-surface));
    --_md-switch-icon: color-mix(in srgb, rgb(from var(--md-sys-color-surface-container-highest) r g b / 1) 38%, var(--md-sys-color-surface));
  }
  .switch-root.disabled .track.checked .handle {
    --_md-switch-handle: rgb(from var(--md-sys-color-surface) r g b / 1);
    --_md-switch-icon: color-mix(in srgb, rgb(from var(--md-sys-color-on-surface) r g b / 1) 38%, var(--md-sys-color-surface));
  }
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
  }

  get disabled() { return this.hasAttribute('disabled') || !!this._formDisabled; }
  set disabled(val) {
    if (val) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
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
    this._layout?.measure();
    this._pressBinding?.refresh();
    this._stateLayer?.refresh();
    this._colorBinding?.refresh();
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

    const track=root.querySelector('.track'),handle=root.querySelector('.handle');
    this._layout=new SelectionDOMLayout(this,{kind:'switch',control:root,canvas:track,signal});
    const over=(role,alpha)=>({color:`var(--md-sys-color-${role})`,alpha,over:'var(--md-sys-color-surface)'});
    // SwitchImpl reads its colors directly; unlike Radio/Checkbox there is no
    // animateColorAsState. Disabled getters copy alpha before compositeOver.
    this._colorBinding=bindSelectionColors(this,[
      {key:'track',scope:track,node:track,property:'background-color',token:'--_md-switch-track',snapAlways:true,
        disabledColor:disabled=>disabled?over(this.checked?'on-surface':'surface-container-highest',.12):null},
      {key:'border',scope:track,node:track,property:'border-color',token:'--_md-switch-border',snapAlways:true,
        disabledColor:disabled=>disabled&&!this.checked?over('on-surface',.12):null},
      {key:'handle',scope:handle,node:handle,property:'background-color',token:'--_md-switch-handle',snapAlways:true,
        disabledColor:disabled=>disabled?over(this.checked?'surface':'on-surface',this.checked?1:.38):null},
      {key:'icon',scope:handle,node:handle,property:'color',token:'--_md-switch-icon',snapAlways:true,
        disabledColor:disabled=>disabled?over(this.checked?'on-surface':'surface-container-highest',.38):null}
    ],{disabled:()=>this.disabled,signal});
    this.addEventListener('click', event => {
      if (event.composedPath()[0] === this && !this.disabled) root.click();
    }, { signal });

    this._stateLayer=bindStateLayer(root,{disabled:()=>this.disabled,hitTest:event=>this._layout.hoverHitTest(event),property:'--md-selection-state-alpha',onChange:kind=>{root.classList.toggle('interacting',kind!==null);this._colorBinding.refresh();},signal});
    const press = event => {
      if (this.disabled) return;
      root.classList.add('pressed');
      this._colorBinding.refresh();
      this._syncThumb();
      const thumb=root.querySelector('.handle-container');
      createRipple(event,thumb,{bounded:false,radius:20,before:thumb.querySelector('.state-layer')});
    };

    const release = () => {
      root.classList.remove('pressed');
      this._colorBinding.refresh();
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

  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="switch-root" role="switch" tabindex="0" aria-checked="false" aria-label="${escapeHtml(this.getAttribute('aria-label') || this.getAttribute('label') || this._internals?.labels?.[0]?.textContent.trim() || 'Switch')}">
        <div class="track">
          <div class="handle-container">
            <div class="handle">
              <span class="icon" aria-hidden="true">${escapeHtml(this.icon)}</span>
            </div>
            <div class="state-layer" aria-hidden="true"></div>
          </div>
        </div>
      </div>
    `;
  }
}

if (!customElements.get('md-switch')) {
  customElements.define('md-switch', delegateHostAria(MdSwitch));
}
