/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-slider>
 *
 * Spec: research/MD3E-actions-inputs-research.md §6 (Sliders)
 *   Expressive M3 (standard, centered, stops/discrete), 16dp track height, CornerFull,
 *   44dp handle height, 4dp rest width -> morphs to 2dp on focus/press.
 *   Value indicator tooltip (inverse-surface / LabelLarge).
 *
 * Contract: docs/AGENT-INTERACTION-CONTRACT.md & docs/SECURITY-AND-A11Y-SPEC.md
 *   - Form-Associated Custom Element (FACE) support
 *   - Throttled DOM attribute updates during drag
 *   - Memory safety via AbortSignal
 *   - Keyboard navigation parity
 */

import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    display: block;
    width: 100%;
    outline: none;
    user-select: none;
    touch-action: none;
    vertical-align: middle;
  }

  .slider-root {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    height: 48px;
    box-sizing: border-box;
    cursor: pointer;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }
  .slider-root:focus { outline: none; }
  .slider-root:focus-visible .thumb {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 3px;
  }

  .track-box {
    position: relative;
    width: 100%;
    height: 16px;
    border-radius: 9999px;
    background: var(--md-slider-track-bg, var(--md-sys-color-secondary-container, #E8DEF8));
    overflow: visible;
  }

  .active-track {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 50%;
    background: var(--md-slider-active-track-bg, var(--md-sys-color-primary, #6750A4));
    border-radius: 9999px;
    pointer-events: none;
  }

  /* Stops dots */
  .stops {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .stop-dot {
    position: absolute;
    top: 50%;
    width: 4px;
    height: 4px;
    border-radius: 9999px;
    background-color: var(--md-sys-color-on-secondary-container, #1D192B);
    transform: translate(-50%, -50%);
    opacity: 0.5;
  }
  .stop-dot.active {
    background-color: var(--md-sys-color-on-primary, #FFFFFF);
    opacity: 0.7;
  }

  /* Handle (Thumb) — 44dp height, 4dp resting width -> morphs to 2dp on focus/press */
  .thumb {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 4px;
    height: 44px;
    border-radius: 9999px;
    background: var(--md-slider-thumb-bg, var(--md-sys-color-primary, #6750A4));
    transform: translate(-50%, -50%);
    box-shadow: var(--md-sys-elevation-level-1, 0 1px 3px 1px rgba(0,0,0,0.15));
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    transition:
      width var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-spatial, ease),
      transform var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-spatial, ease),
      background-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
    outline: none;
  }

  .slider-root:hover .thumb {
    width: 6px;
  }
  .slider-root.pressed .thumb,
  .slider-root:focus-visible .thumb {
    width: 2px;
    height: 44px;
    transform: translate(-50%, -50%) scale(1.15, 0.95);
  }

  /* Value Indicator (Tooltip) */
  .tooltip {
    position: absolute;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%) scale(0);
    transform-origin: bottom center;
    background-color: var(--md-sys-color-inverse-surface, #322F35);
    color: var(--md-sys-color-inverse-on-surface, #F5EFF7);
    font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
    font-size: var(--md-sys-typescale-label-large-size, 14px);
    font-weight: var(--md-sys-typescale-label-large-weight, 500);
    padding: 4px 8px;
    border-radius: 8px;
    pointer-events: none;
    opacity: 0;
    white-space: nowrap;
    transition:
      transform var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-spatial, ease),
      opacity var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
  }

  .slider-root.pressed .tooltip,
  .slider-root.labeled .tooltip,
  .slider-root:hover .tooltip {
    transform: translateX(-50%) scale(1);
    opacity: 1;
  }

  .slider-root.disabled {
    cursor: not-allowed;
    opacity: 0.38;
  }
  .slider-root.disabled .active-track,
  .slider-root.disabled .thumb {
    background-color: var(--md-sys-color-on-surface, #1D1B20);
    box-shadow: none;
  }
`;

const sliderSheet = createComponentSheet(defaultStyle);

export class MdSlider extends HTMLElement {
  static formAssociated = true;

  static get observedAttributes() {
    return [
      'value', 'min', 'max', 'step', 'disabled', 'labeled', 'stops', 'size',
      'centered', 'orientation', 'name', 'value-range', 'steps', 'top-to-bottom',
      'range', 'range-start', 'range-end'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, sliderSheet);
    this._internals = this.attachInternals ? this.attachInternals() : null;
    this._isDragging = false;
    this._rendered = false;
    this._currentValue = 50;
    this._abortController = null;
  }

  get form() { return this._internals?.form; }
  get name() { return this.getAttribute('name'); }
  set name(val) { this.setAttribute('name', val); }
  get type() { return 'range'; }

  formResetCallback() {
    this.value = parseFloat(this.getAttribute('value')) || 0;
  }

  formStateRestoreCallback(state) {
    if (state != null) this.value = parseFloat(state) || 0;
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
    if (name === 'value') {
      this._currentValue = this.value;
      this._internals?.setFormValue(String(this.value));
    } else if (name === 'value-range') {
      const parts = String(newVal).split('..').map(s => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        this.min = parts[0];
        this.max = parts[1];
      }
    } else if (name === 'steps') {
      const st = parseInt(newVal, 10);
      if (!isNaN(st) && st > 0) {
        this.step = (this.max - this.min) / st;
      }
    }
    this._sync();
  }

  get value() {
    const val = parseFloat(this.getAttribute('value'));
    return isNaN(val) ? 50 : val;
  }
  set value(val) {
    const clamped = Math.min(this.max, Math.max(this.min, val));
    const finalVal = this.step > 0 ? Math.round((clamped - this.min) / this.step) * this.step + this.min : clamped;
    this._currentValue = finalVal;
    this.setAttribute('value', String(Number(finalVal.toFixed(4))));
    this._internals?.setFormValue(String(Number(finalVal.toFixed(4))));
  }

  get min() {
    const v = parseFloat(this.getAttribute('min'));
    return isNaN(v) ? 0 : v;
  }
  set min(v) { this.setAttribute('min', String(v)); }

  get max() {
    const v = parseFloat(this.getAttribute('max'));
    return isNaN(v) ? 100 : v;
  }
  set max(v) { this.setAttribute('max', String(v)); }

  get step() {
    const v = parseFloat(this.getAttribute('step'));
    return isNaN(v) ? 0 : v;
  }
  set step(v) { this.setAttribute('step', String(v)); }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(val) {
    if (val) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  get labeled() { return this.hasAttribute('labeled'); }
  get stops() { return this.hasAttribute('stops') || this.step > 0; }

  get valueRange() { return [this.min, this.max]; }
  set valueRange(val) {
    if (Array.isArray(val) && val.length === 2) {
      this.min = val[0];
      this.max = val[1];
    } else if (typeof val === 'string') {
      this.setAttribute('value-range', val);
    }
  }

  get steps() {
    const st = parseInt(this.getAttribute('steps'), 10);
    if (!isNaN(st) && st > 0) return st;
    return this.step > 0 ? Math.floor((this.max - this.min) / this.step) : 0;
  }
  set steps(val) {
    if (val === null || val === undefined) this.removeAttribute('steps');
    else this.setAttribute('steps', String(val));
  }

  get topToBottom() { return this.hasAttribute('top-to-bottom'); }
  set topToBottom(val) {
    if (val) this.setAttribute('top-to-bottom', '');
    else this.removeAttribute('top-to-bottom');
  }

  get range() { return this.hasAttribute('range'); }
  set range(val) {
    if (val) this.setAttribute('range', '');
    else this.removeAttribute('range');
  }

  get rangeStart() {
    const v = parseFloat(this.getAttribute('range-start'));
    return isNaN(v) ? this.min : v;
  }
  set rangeStart(val) {
    if (val === null || val === undefined) this.removeAttribute('range-start');
    else this.setAttribute('range-start', String(val));
  }

  get rangeEnd() {
    const v = parseFloat(this.getAttribute('range-end'));
    return isNaN(v) ? this.value : v;
  }
  set rangeEnd(val) {
    if (val === null || val === undefined) this.removeAttribute('range-end');
    else this.setAttribute('range-end', String(val));
  }

  get size() { return this.getAttribute('size') || 'xs'; } // 'xs'(16dp) | 'sm'(24dp) | 'md'(32dp) | 'lg'(40dp) | 'xl'(48dp)
  set size(v) { this.setAttribute('size', v); }

  get centered() { return this.hasAttribute('centered'); }
  set centered(v) {
    if (v) this.setAttribute('centered', '');
    else this.removeAttribute('centered');
  }

  get orientation() { return this.getAttribute('orientation') || 'horizontal'; }
  set orientation(v) { this.setAttribute('orientation', v); }

  _pct(val = this.value) {
    const range = this.max - this.min;
    if (range <= 0) return 0;
    return Math.min(100, Math.max(0, ((val - this.min) / range) * 100));
  }

  _sync() {
    const root = this.shadowRoot.querySelector('.slider-root');
    const activeTrack = this.shadowRoot.querySelector('.active-track');
    const thumb = this.shadowRoot.querySelector('.thumb');
    const tooltip = this.shadowRoot.querySelector('.tooltip');
    if (!root || !activeTrack || !thumb) return;

    const pct = this._pct(this.value);
    activeTrack.style.width = `${pct}%`;
    thumb.style.left = `${pct}%`;
    if (tooltip) tooltip.textContent = Math.round(this.value);

    root.className = `slider-root${this.disabled ? ' disabled' : ''}${this.labeled ? ' labeled' : ''}`;
    root.setAttribute('tabindex', this.disabled ? '-1' : '0');
    root.setAttribute('aria-disabled', this.disabled ? 'true' : 'false');
    root.setAttribute('aria-valuenow', String(this.value));
    root.setAttribute('aria-valuemin', String(this.min));
    root.setAttribute('aria-valuemax', String(this.max));

    this._renderStops();
  }

  _renderStops() {
    const stopsContainer = this.shadowRoot.querySelector('.stops');
    if (!stopsContainer) return;
    if (!this.stops || this.step <= 0) {
      if (stopsContainer.childNodes.length > 0) stopsContainer.innerHTML = '';
      return;
    }
    const count = Math.floor((this.max - this.min) / this.step);
    if (count <= 0 || count > 100) {
      if (stopsContainer.childNodes.length > 0) stopsContainer.innerHTML = '';
      return;
    }

    const currentPct = this._pct(this.value);
    const existingDots = stopsContainer.children;

    // Only rebuild DOM if the count of stop dots has changed
    if (existingDots.length !== count + 1) {
      const frag = document.createDocumentFragment();
      for (let i = 0; i <= count; i++) {
        const dot = document.createElement('span');
        const p = (i / count) * 100;
        dot.className = `stop-dot${p <= currentPct ? ' active' : ''}`;
        dot.style.left = `${p}%`;
        frag.appendChild(dot);
      }
      stopsContainer.replaceChildren(frag);
    } else {
      // Fast path: reuse existing DOM elements, only toggle 'active' class
      for (let i = 0; i <= count; i++) {
        const dot = existingDots[i];
        const p = (i / count) * 100;
        dot.classList.toggle('active', p <= currentPct);
      }
    }
  }

  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const root = this.shadowRoot.querySelector('.slider-root');
    const trackBox = this.shadowRoot.querySelector('.track-box');
    const thumb = this.shadowRoot.querySelector('.thumb');
    const activeTrack = this.shadowRoot.querySelector('.active-track');
    const tooltip = this.shadowRoot.querySelector('.tooltip');
    if (!root || !trackBox || !thumb) return;

    let cachedRect = null;

    const updateFromPointer = (e, isFinal = false) => {
      if (this.disabled) return;
      if (!cachedRect) cachedRect = trackBox.getBoundingClientRect();
      if (cachedRect.width <= 0) return;
      const clientX = e.clientX;
      const ratio = Math.min(1, Math.max(0, (clientX - cachedRect.left) / cachedRect.width));
      let rawVal = this.min + ratio * (this.max - this.min);
      if (this.step > 0) {
        rawVal = Math.round((rawVal - this.min) / this.step) * this.step + this.min;
      }
      const clamped = Math.min(this.max, Math.max(this.min, rawVal));
      this._currentValue = clamped;

      const pct = this._pct(clamped);
      if (activeTrack) activeTrack.style.width = `${pct}%`;
      if (thumb) thumb.style.left = `${pct}%`;
      if (tooltip) tooltip.textContent = Math.round(clamped);
      root.setAttribute('aria-valuenow', String(clamped));

      if (isFinal) {
        this.value = clamped;
      }

      this.dispatchEvent(new CustomEvent('input', { detail: { value: clamped }, bubbles: true, composed: true }));
    };

    root.addEventListener('pointerdown', (e) => {
      if (this.disabled || e.button !== 0) return;
      this._isDragging = true;
      cachedRect = trackBox.getBoundingClientRect();
      try { root.setPointerCapture(e.pointerId); } catch (_) {}
      root.classList.add('pressed');
      updateFromPointer(e, false);
    }, { signal });

    root.addEventListener('pointermove', (e) => {
      if (!this._isDragging || this.disabled) return;
      updateFromPointer(e, false);
    }, { signal });

    const stopDrag = (e) => {
      if (!this._isDragging) return;
      this._isDragging = false;
      cachedRect = null;
      root.classList.remove('pressed');
      this.value = this._currentValue;
      this.dispatchEvent(new CustomEvent('change', { detail: { value: this.value }, bubbles: true, composed: true }));
    };

    root.addEventListener('pointerup', stopDrag, { signal });
    root.addEventListener('pointercancel', stopDrag, { signal });

    // Keyboard Parity
    root.addEventListener('keydown', (e) => {
      if (this.disabled) return;
      const stepVal = this.step > 0 ? this.step : (this.max - this.min) / 100;
      const bigStep = this.step > 0 ? this.step * 10 : (this.max - this.min) / 10;
      let handled = false;

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          this.value = this.value - stepVal;
          handled = true;
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          this.value = this.value + stepVal;
          handled = true;
          break;
        case 'PageDown':
          this.value = this.value - bigStep;
          handled = true;
          break;
        case 'PageUp':
          this.value = this.value + bigStep;
          handled = true;
          break;
        case 'Home':
          this.value = this.min;
          handled = true;
          break;
        case 'End':
          this.value = this.max;
          handled = true;
          break;
      }

      if (handled) {
        e.preventDefault();
        this.dispatchEvent(new CustomEvent('input', { detail: { value: this.value }, bubbles: true, composed: true }));
        this.dispatchEvent(new CustomEvent('change', { detail: { value: this.value }, bubbles: true, composed: true }));
      }
    }, { signal });
  }

  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="slider-root" role="slider" tabindex="0" aria-orientation="horizontal">
        <div class="track-box">
          <div class="active-track"></div>
          <div class="stops"></div>
        </div>
        <div class="thumb">
          <div class="tooltip">50</div>
        </div>
      </div>
    `;
  }
}

customElements.define('md-slider', MdSlider);
