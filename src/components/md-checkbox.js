/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-checkbox>
 *
 * Spec: research/MD3E-actions-inputs-research.md §8 (Checkbox)
 *   Updated MD3 styling (indeterminate + error state), 18×18dp canvas, 2dp corner radius,
 *   40×40dp state layer, 48×48dp min touch target.
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
import { SelectionMotion, checkboxPath, checkboxBox } from '../motion/selection-motion.js';
import { bindSelectionColors } from '../motion/selection-color.js';
import { setSelectionValidity } from '../utils/selection-validity.js';
import { bindStateLayer } from '../motion/state-layer.js';
import { SelectionDOMLayout } from './selection-dom-layout.js';

const defaultStyle = `
  /* MD3 canvas has no legacy M2 padding; indication remains unbounded. */
  .ripple { position: absolute; width: 18px; height: 18px; pointer-events: none; color: var(--_md-checkbox-press-color); }

  :host {
    display: inline-block;
    position: relative;
    box-sizing: border-box;
    width: var(--_md-selection-width, max(18px, var(--md-minimum-interactive-component-size, 48px)));
    height: var(--_md-selection-height, max(18px, var(--md-minimum-interactive-component-size, 48px)));
    max-width: 100%;
    max-height: 100%;
    outline: none;
    vertical-align: middle;
  }

  .chk-root {
    --_md-checkbox-state-color: var(--md-sys-color-on-surface);
    --_md-checkbox-press-color: var(--md-sys-color-primary);
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
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
  .chk-root.selected {
    --_md-checkbox-state-color: var(--md-sys-color-primary);
    --_md-checkbox-press-color: var(--md-sys-color-on-surface);
  }
  .chk-root.error {
    --_md-checkbox-state-color: var(--md-sys-color-error);
    --_md-checkbox-press-color: var(--md-sys-color-error);
  }

  /* 40x40 State layer */
  .state-layer {
    position: absolute;
    width: 40px;
    height: 40px;
    border-radius: 9999px;
    background: rgb(from var(--md-ripple-color, var(--_md-checkbox-state-color)) r g b / 1);
    opacity: var(--md-selection-state-alpha, 0);
    pointer-events: none;
    transition: none;
  }

  /* CheckboxTokens.ContainerSize, from the updated MD3 styling branch. */
  .box {
    position: relative;
    width: 18px;
    height: 18px;
    box-sizing: border-box;
    border-radius: 2px;
    border: none;
    background: none;
    --_md-checkbox-box: transparent;
    --_md-checkbox-border: var(--md-sys-color-on-surface-variant);
    --_md-checkbox-mark: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: none;
    outline: none;
  }

  .box.checked,
  .box.indeterminate {
    --_md-checkbox-box: var(--md-sys-color-primary);
    --_md-checkbox-border: var(--md-sys-color-primary);
    --_md-checkbox-mark: var(--md-sys-color-on-primary);
  }

  .box.error {
    --_md-checkbox-border: var(--md-sys-color-error);
  }
  .chk-root:where(.interacting, .pressed) .box:where(:not(.checked, .indeterminate, .error)) {
    --_md-checkbox-border: var(--md-sys-color-on-surface);
  }
  .box.error.checked,
  .box.error.indeterminate {
    --_md-checkbox-box: var(--md-sys-color-error);
    --_md-checkbox-border: var(--md-sys-color-error);
    --_md-checkbox-mark: var(--md-sys-color-on-error);
  }

  .chk-root.disabled {
    cursor: not-allowed;
  }
  .chk-root.disabled .box {
    --_md-checkbox-border: rgb(from var(--md-sys-color-on-surface) r g b / .38);
    --_md-checkbox-mark: var(--md-sys-color-surface);
  }
  .chk-root.disabled .box.checked,
  .chk-root.disabled .box.indeterminate {
    --_md-checkbox-box: rgb(from var(--md-sys-color-on-surface) r g b / .38);
    --_md-checkbox-border: rgb(from var(--md-sys-color-on-surface) r g b / .38);
  }

  /* One continuously drawn/morphed path, as in Compose drawCheck. */
  svg {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 18px;
    height: 18px;
    pointer-events: none;
    overflow: visible;
  }

  .mark-check {
    fill: none;
    stroke: var(--_md-checkbox-mark);
    stroke-width: 2;
    stroke-linecap: square;
    stroke-linejoin: miter;
  }

  .box-fill { fill: var(--_md-checkbox-box); }
  .box-outline { fill: none; stroke: var(--_md-checkbox-border); }
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

    root.classList.toggle('disabled',this.disabled);
    root.classList.toggle('selected',this.checked||this.indeterminate);
    root.classList.toggle('error',this.error);
    if(this.disabled)root.classList.remove('pressed');
    box.className = `box${this.checked && !this.indeterminate ? ' checked' : ''}${this.indeterminate ? ' indeterminate' : ''}${this.error ? ' error' : ''}`;
    this._layout?.measure();
    this._pressBinding?.refresh();
    this._stateLayer?.refresh();

    this.shadowRoot.querySelector('.mark-check').style.strokeWidth = `${this.checkmarkStroke}px`;
    this._colorBinding?.refresh();
    this._paintBox();
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
        gravitation: this.indeterminate ? 1 : 0 }, values => {
        const mark = this.shadowRoot.querySelector('.mark-check');
        mark.setAttribute('d', checkboxPath(values.fraction, values.gravitation));
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
          snap: previous === 'off' || !selected, delay: previous === 'off' ? 0 : 100, transition: true }
      });
    });
  }

  _paintBox() {
    const fill=this.shadowRoot.querySelector('.box-fill'),outline=this.shadowRoot.querySelector('.box-outline');
    if(!fill||!outline)return;
    const equal=getComputedStyle(fill).fill===getComputedStyle(outline).stroke;
    const geometry=checkboxBox(18,this.outlineStroke,2,equal);
    const paint=(node,rect)=>{
      for(const key of ['x','y','width','height'])node.setAttribute(key,String(rect[key]));
      // SVG rejects a negative corner radius; its zero corner is the rect case.
      node.setAttribute('rx',String(Math.max(0,rect.radius)));
    };
    paint(fill,geometry.fill);
    outline.style.display=geometry.outline?'':'none';
    if(geometry.outline){paint(outline,geometry.outline);outline.setAttribute('stroke-width',String(geometry.outline.stroke));}
  }

  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const root = this.shadowRoot.querySelector('.chk-root');
    if (!root) return;

    const box=root.querySelector('.box');
    this._layout=new SelectionDOMLayout(this,{kind:'checkbox',control:root,canvas:box,ripple:root.querySelector('.ripple'),signal});
    this._colorBinding=bindSelectionColors(this,[
      {key:'box',scope:box,node:box.querySelector('.box-fill'),property:'fill',token:'--_md-checkbox-box',snapDisabled:true,
        disabledColor:disabled=>disabled&&(this.checked||this.indeterminate)?{color:'var(--md-sys-color-on-surface)',alpha:.38}:null},
      {key:'border',scope:box,node:box.querySelector('.box-outline'),property:'stroke',token:'--_md-checkbox-border',snapDisabled:true,
        disabledColor:disabled=>disabled?{color:'var(--md-sys-color-on-surface)',alpha:.38}:null},
      {key:'mark',scope:box,node:box.querySelector('.mark-check'),property:'stroke',token:'--_md-checkbox-mark'}
    ],{disabled:()=>this.disabled,role:()=>this.checked||this.indeterminate?'expressiveEffectMedium':'expressiveEffectFast',onPaint:()=>this._paintBox(),signal});

    this.addEventListener('click', event => {
      if (event.composedPath()[0] === this && !this.disabled) root.click();
    }, { signal });

    this._stateLayer=bindStateLayer(root,{disabled:()=>this.disabled,hitTest:event=>this._layout.hoverHitTest(event),property:'--md-selection-state-alpha',onChange:kind=>{
      root.classList.toggle('interacting',kind!==null);this._colorBinding.refresh();
    },signal});
    const press = event => { root.classList.add('pressed'); this._colorBinding.refresh(); createRipple(event, root.querySelector('.ripple'),{bounded:false,radius:20}); };
    const release = () => {root.classList.remove('pressed');this._colorBinding.refresh();};

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
      <div class="chk-root" role="checkbox" tabindex="0" aria-checked="false" aria-label="${escapeHtml(this.getAttribute('aria-label') || this.getAttribute('label') || this._internals?.labels?.[0]?.textContent.trim() || 'Checkbox')}">
        <div class="box">
          <svg viewBox="0 0 18 18" aria-hidden="true">
            <rect class="box-fill"></rect>
            <rect class="box-outline"></rect>
            <path class="mark-check" d=""></path>
          </svg>
        </div>
        <span class="ripple" aria-hidden="true"></span>
        <span class="state-layer" aria-hidden="true"></span>
      </div>
    `;
  }
}

if (!customElements.get('md-checkbox')) {
  customElements.define('md-checkbox', MdCheckbox);
}
