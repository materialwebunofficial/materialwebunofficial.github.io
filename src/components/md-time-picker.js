/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-time-picker>
 *
 * Spec: research/TIME-PICKER-SOURCES.md & AndroidX Compose TimePicker / TimeInput / TimePickerDefaults
 *   3 Official Types:
 *   1. Dial Vertical: Portrait layout with top [07]:[30] cards, AM/PM selector, and 256dp clock dial.
 *   2. Time Input: Keyboard mode with large [07]:[30] input fields, Hour/Minute labels, and AM/PM selector.
 *   3. Horizontal Rich: Landscape layout with left side time chips + right side rich-color clock dial.
 *
 * Contract: docs/AGENT-INTERACTION-CONTRACT.md
 */

import { SpringPhysics } from '../motion/spring-physics.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    display: block;
    outline: none;
    box-sizing: border-box;
    user-select: none;
    font-family: var(--md-sys-typescale-font-family, 'Roboto', 'Roboto Flex', system-ui, sans-serif);
    -webkit-font-smoothing: antialiased;
  }
  :host([inline]) {
    display: inline-block;
  }

  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 24px 16px;
    box-sizing: border-box;
  }

  .picker-dialog {
    background-color: var(--md-sys-color-surface-container-high, #ECE6F0);
    color: var(--md-sys-color-on-surface, #1D1B20);
    border-radius: var(--md-sys-shape-corner-extra-large, 28px);
    padding: 24px;
    box-shadow: var(--md-sys-elevation-level-3, 0 4px 8px 3px rgba(0,0,0,0.15));
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-sizing: border-box;
    will-change: transform;
    width: 328px;
    max-width: calc(100vw - 32px);
    margin: auto;
  }

  :host([inline]) .picker-dialog {
    width: 100%;
    max-width: 328px;
    box-shadow: none;
    margin: 0 auto;
  }

  .picker-dialog.horizontal,
  :host([inline]) .picker-dialog.horizontal {
    width: 580px;
    max-width: calc(100vw - 32px);
  }
  .picker-dialog.input-mode {
    width: 328px;
    max-width: calc(100vw - 32px);
  }

  /* Rich Color Scheme (Expressive Palette) */
  .picker-dialog.rich {
    background-color: var(--md-sys-color-surface-container-highest, #E6E0E9);
  }
  .picker-dialog.rich .time-card.active,
  .picker-dialog.rich .time-input-field:focus {
    background-color: var(--md-sys-color-primary-container, #EADDFF);
    color: var(--md-sys-color-on-primary-container, #21005D);
    border-color: var(--md-sys-color-primary, #6750A4);
  }
  .picker-dialog.rich .clock-face {
    background-color: color-mix(in srgb, var(--md-sys-color-primary, #6750A4) 10%, var(--md-sys-color-surface-container, #F3EDF7));
  }

  .picker-header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .header-title {
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    color: var(--md-sys-color-on-surface-variant, #49454F);
    text-transform: capitalize;
  }

  .main-layout-wrap.vertical {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }

  .main-layout-wrap.horizontal {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }

  /* Time Cards Section */
  .time-display-section {
    display: flex;
    justify-content: center;
  }

  .time-display-section.horizontal {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .time-cards-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .time-card {
    width: 96px;
    height: 80px;
    border-radius: var(--md-sys-shape-corner-medium, 12px);
    border: none;
    background-color: var(--md-sys-color-surface-container-highest, #E6E0E9);
    color: var(--md-sys-color-on-surface, #1D1B20);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    outline: none;
    transition: background-color 180ms ease, color 180ms ease;
  }
  .time-card.active {
    background-color: var(--md-sys-color-primary-container, #EADDFF);
    color: var(--md-sys-color-on-primary-container, #21005D);
  }

  .time-val {
    font: var(--md-sys-typescale-display-large, 400 57px/64px Roboto Flex, sans-serif);
    letter-spacing: var(--md-sys-typescale-display-large-tracking, -0.2px);
  }

  .time-separator {
    font: var(--md-sys-typescale-display-large, 400 57px/64px Roboto Flex, sans-serif);
    letter-spacing: var(--md-sys-typescale-display-large-tracking, -0.2px);
    color: var(--md-sys-color-on-surface, #1D1B20);
    line-height: 80px;
    user-select: none;
  }

  /* Keyboard Input Mode Textfields */
  .input-card-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .time-input-field {
    box-sizing: border-box;
    width: 96px;
    height: 80px;
    border-radius: var(--md-sys-shape-corner-medium, 12px);
    border: 2px solid transparent;
    background-color: var(--md-sys-color-surface-container-highest, #E6E0E9);
    color: var(--md-sys-color-on-surface, #1D1B20);
    font: var(--md-sys-typescale-display-large, 400 57px/64px Roboto Flex, sans-serif);
    letter-spacing: var(--md-sys-typescale-display-large-tracking, -0.2px);
    text-align: center;
    outline: none;
    transition: border-color 150ms ease, background-color 150ms ease;
  }
  .time-input-field:focus {
    border-color: var(--md-sys-color-primary, #6750A4);
    background-color: var(--md-sys-color-primary-container, #EADDFF);
    color: var(--md-sys-color-on-primary-container, #21005D);
  }

  .input-sublabel {
    font: var(--md-sys-typescale-body-small, 400 12px/16px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-small-tracking, 0.4px);
    color: var(--md-sys-color-on-surface-variant, #49454F);
  }

  /* AM / PM Segmented Column (Vertical layout) */
  .period-toggle-column {
    display: flex;
    flex-direction: column;
    height: 80px;
    width: 52px;
    border: 1px solid var(--md-sys-color-outline, #79747E);
    border-radius: var(--md-sys-shape-corner-small, 8px);
    overflow: hidden;
  }

  .period-toggle-column .period-btn {
    flex: 1;
    border: none;
    background: transparent;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    cursor: pointer;
    outline: none;
    transition: background-color 150ms ease, color 150ms ease;
  }
  .period-toggle-column .period-btn:first-child {
    border-bottom: 1px solid var(--md-sys-color-outline, #79747E);
  }
  .period-toggle-column .period-btn.active {
    background-color: var(--md-sys-color-tertiary-container, #FFD8E4);
    color: var(--md-sys-color-on-tertiary-container, #31111D);
    font-weight: var(--md-sys-typescale-label-large-emphasized-weight, 700);
  }

  /* AM / PM Segmented Row (Horizontal landscape layout - Android Compose Parity) */
  .period-toggle-row {
    display: flex;
    flex-direction: row;
    height: 38px;
    width: 216px;
    border: 1px solid var(--md-sys-color-outline, #79747E);
    border-radius: var(--md-sys-shape-corner-small, 8px);
    overflow: hidden;
  }

  .period-toggle-row .period-btn {
    flex: 1;
    border: none;
    background: transparent;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    cursor: pointer;
    outline: none;
    transition: background-color 150ms ease, color 150ms ease;
  }
  .period-toggle-row .period-btn:first-child {
    border-right: 1px solid var(--md-sys-color-outline, #79747E);
  }
  .period-toggle-row .period-btn.active {
    background-color: var(--md-sys-color-tertiary-container, #FFD8E4);
    color: var(--md-sys-color-on-tertiary-container, #31111D);
    font-weight: var(--md-sys-typescale-label-large-emphasized-weight, 700);
  }

  /* 256dp Clock Dial */
  .dial-section {
    display: flex;
    justify-content: center;
    width: 256px;
    height: 256px;
    flex-shrink: 0;
  }

  .clock-face {
    position: relative;
    width: 256px;
    height: 256px;
    border-radius: 9999px;
    background-color: var(--md-sys-color-surface-container-highest, #E6E0E9);
    touch-action: none;
    cursor: pointer;
    flex-shrink: 0;
  }

  .dial-center-dot {
    position: absolute;
    width: 8px;
    height: 8px;
    background-color: var(--md-sys-color-primary, #6750A4);
    border-radius: 9999px;
    top: 124px;
    left: 124px;
    z-index: 4;
  }

  .clock-arm {
    position: absolute;
    top: 0;
    left: 0;
    width: 256px;
    height: 256px;
    pointer-events: none;
    transform-origin: 128px 128px;
    transition: transform 180ms cubic-bezier(0.2, 0, 0, 1);
    z-index: 2;
  }

  .clock-hand-line {
    position: absolute;
    width: 2px;
    height: 100px;
    background-color: var(--md-sys-color-primary, #6750A4);
    left: 127px;
    top: 28px;
  }

  .clock-selector-head {
    position: absolute;
    width: 48px;
    height: 48px;
    border-radius: 9999px;
    background-color: var(--md-sys-color-primary, #6750A4);
    left: 104px;
    top: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .selector-dot {
    display: none;
    width: 8px;
    height: 8px;
    background-color: var(--md-sys-color-on-primary, #FFFFFF);
    border-radius: 9999px;
  }

  .dial-number {
    position: absolute;
    width: 48px;
    height: 48px;
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: center;
    font: var(--md-sys-typescale-body-large, 400 16px/24px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-large-tracking, 0.5px);
    color: var(--md-sys-color-on-surface, #1D1B20);
    transform: translate(-50%, -50%);
    user-select: none;
    cursor: pointer;
    z-index: 3;
    transition: color 150ms ease;
  }
  .dial-number.selected {
    color: var(--md-sys-color-on-primary, #FFFFFF) !important;
    font-weight: var(--md-sys-typescale-body-large-emphasized-weight, 500);
  }

  /* Footer Actions */
  .picker-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 4px;
  }

  .icon-btn {
    border: none;
    background: transparent;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    width: 40px;
    height: 40px;
    border-radius: 9999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    outline: none;
    transition: background-color 150ms ease;
  }
  .icon-btn:hover {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent);
  }

  .action-buttons {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .text-btn {
    border: none;
    background: transparent;
    color: var(--md-sys-color-primary, #6750A4);
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    height: 40px;
    padding: 0 16px;
    border-radius: 9999px;
    cursor: pointer;
    outline: none;
    transition: background-color 150ms ease;
  }
  .text-btn:hover {
    background-color: color-mix(in srgb, var(--md-sys-color-primary, #6750A4) 8%, transparent);
  }

  .ico {
    font-family: 'Material Symbols Outlined', 'Material Symbols Rounded', sans-serif;
    font-size: 24px;
    line-height: 1;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24;
  }

  @media (max-width: 600px) {
    .picker-dialog {
      width: 328px !important;
      max-width: calc(100vw - 32px) !important;
      padding: 24px 16px !important;
      border-radius: var(--md-sys-shape-corner-extra-large, 28px) !important;
      box-sizing: border-box !important;
      margin: auto !important;
    }
    .picker-dialog.horizontal {
      width: 328px !important;
      max-width: calc(100vw - 32px) !important;
    }
    .main-layout-wrap.horizontal {
      flex-direction: column !important;
      gap: 16px !important;
    }
  }
`;

const timePickerSheet = createComponentSheet(defaultStyle);

export class MdTimePicker extends HTMLElement {
  static get observedAttributes() {
    return ['open', 'value', 'mode', 'is-24-hour', 'rich-colors', 'layout-type', 'inline', 'hour', 'minute', 'variant'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, timePickerSheet);
    this.state = {
      hours: 7,
      minutes: 30,
      period: 'AM',
      activeUnit: 'hours', // 'hours' | 'minutes'
      mode: 'dial',        // 'dial' | 'input'
      is24Hour: false,
      richColors: false,
      layoutType: 'vertical' // 'vertical' | 'horizontal'
    };
    this._isDragging = false;
    this._rendered = false;
    this._abortController = null;
    this._currentArmAngle = (this.state.hours % 12) * 30;
  }

  connectedCallback() {
    if (!this._rendered) {
      this._parseInitialAttributes();
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
    if (name === 'open') {
      this._sync();
      if (this.open && !this.inline) this._animateOpen();
    }
    if (name === 'value' && this.value) {
      this._parseValue(this.value);
      this._updateDisplay(true);
    }
    if (name === 'hour') {
      const h = parseInt(newVal, 10);
      if (!isNaN(h)) {
        this.state.hours = h;
        this._updateDisplay(true);
      }
    }
    if (name === 'minute') {
      const m = parseInt(newVal, 10);
      if (!isNaN(m)) {
        this.state.minutes = m;
        this._updateDisplay(true);
      }
    }
    if (name === 'layout-type' || name === 'mode' || name === 'rich-colors' || name === 'inline' || name === 'variant') {
      this._parseInitialAttributes();
      this.render();
      this._setup();
      this._sync();
    }
  }

  _parseInitialAttributes() {
    if (this.hasAttribute('value')) this._parseValue(this.getAttribute('value'));
    if (this.hasAttribute('hour')) {
      const h = parseInt(this.getAttribute('hour'), 10);
      if (!isNaN(h)) this.state.hours = h;
    }
    if (this.hasAttribute('minute')) {
      const m = parseInt(this.getAttribute('minute'), 10);
      if (!isNaN(m)) this.state.minutes = m;
    }
    if (this.hasAttribute('is-24-hour')) this.state.is24Hour = true;
    if (this.hasAttribute('rich-colors')) this.state.richColors = true;
    if (this.hasAttribute('mode')) this.state.mode = this.getAttribute('mode');
    if (this.hasAttribute('layout-type')) this.state.layoutType = this.getAttribute('layout-type');
    if (this.hasAttribute('variant')) {
      const v = this.getAttribute('variant');
      if (v === 'horizontal') this.state.layoutType = 'horizontal';
      else if (v === 'input') this.state.mode = 'input';
      else if (v === 'dial') this.state.mode = 'dial';
    }
    this._currentArmAngle = (this.state.hours % 12) * 30;
  }

  get open() { return this.hasAttribute('open'); }
  set open(v) {
    if (v) this.setAttribute('open', '');
    else this.removeAttribute('open');
  }

  get inline() { return this.hasAttribute('inline'); }
  set inline(v) {
    if (v) this.setAttribute('inline', '');
    else this.removeAttribute('inline');
  }

  get value() {
    const hh = String(this.state.hours).padStart(2, '0');
    const mm = String(this.state.minutes).padStart(2, '0');
    return this.state.is24Hour ? `${hh}:${mm}` : `${hh}:${mm} ${this.state.period}`;
  }
  set value(v) { this.setAttribute('value', v); }

  get hour() { return this.state.hours; }
  set hour(v) { this.setAttribute('hour', String(v)); }

  get minute() { return this.state.minutes; }
  set minute(v) { this.setAttribute('minute', String(v)); }

  get is24Hour() { return this.hasAttribute('is-24-hour'); }
  set is24Hour(v) {
    if (v) this.setAttribute('is-24-hour', '');
    else this.removeAttribute('is-24-hour');
  }

  get richColors() { return this.hasAttribute('rich-colors'); }
  set richColors(v) {
    if (v) this.setAttribute('rich-colors', '');
    else this.removeAttribute('rich-colors');
  }

  get layoutType() { return this.getAttribute('layout-type') || this.state.layoutType; }
  set layoutType(v) { this.setAttribute('layout-type', v); }

  get mode() { return this.getAttribute('mode') || this.state.mode; }
  set mode(v) { this.setAttribute('mode', v); }

  show() {
    this.open = true;
    if (!this.inline) document.body.style.overflow = 'hidden';
  }
  close() {
    this.open = false;
    if (!this.inline) document.body.style.overflow = '';
  }

  _parseValue(valStr) {
    if (!valStr) return;
    const match = valStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match) {
      this.state.hours = parseInt(match[1], 10);
      this.state.minutes = parseInt(match[2], 10);
      if (match[3]) this.state.period = match[3].toUpperCase();
      this._currentArmAngle = (this.state.hours % 12) * 30;
    }
  }

  _animateOpen() {
    const dialog = this.shadowRoot.querySelector('.picker-dialog');
    if (dialog) {
      SpringPhysics.animateProperty(dialog, 'scale', 0.9, 1.0, 'expressiveSpatialFast');
    }
  }

  _sync() {
    if (this.inline) {
      this.style.display = 'inline-block';
    } else {
      this.style.display = this.open ? 'block' : 'none';
    }
  }

  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const scrim = this.shadowRoot.querySelector('.scrim');
    if (scrim) {
      const onScrimDismiss = (e) => {
        if (e.target === scrim) {
          e.preventDefault();
          this.close();
        }
      };
      scrim.addEventListener('click', onScrimDismiss, { signal });
      scrim.addEventListener('pointerdown', onScrimDismiss, { signal });
      scrim.addEventListener('touchstart', onScrimDismiss, { signal, passive: false });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.open && !this.inline) {
        this.close();
      }
    }, { signal });

    const hourCard = this.shadowRoot.querySelector('#hour-card');
    const minCard = this.shadowRoot.querySelector('#min-card');
    if (hourCard && minCard) {
      hourCard.addEventListener('click', () => {
        this.state.activeUnit = 'hours';
        this._updateDisplay(true);
      }, { signal });
      minCard.addEventListener('click', () => {
        this.state.activeUnit = 'minutes';
        this._updateDisplay(true);
      }, { signal });
    }

    const hourInput = this.shadowRoot.querySelector('#hour-input');
    const minInput = this.shadowRoot.querySelector('#min-input');
    if (hourInput && minInput) {
      hourInput.addEventListener('input', (e) => {
        let val = parseInt(e.target.value, 10);
        if (!isNaN(val)) {
          if (this.state.is24Hour) val = Math.max(0, Math.min(23, val));
          else val = Math.max(1, Math.min(12, val));
          this.state.hours = val;
          this._emitChange();
        }
      });
      minInput.addEventListener('input', (e) => {
        let val = parseInt(e.target.value, 10);
        if (!isNaN(val)) {
          val = Math.max(0, Math.min(59, val));
          this.state.minutes = val;
          this._emitChange();
        }
      });
    }

    const amBtn = this.shadowRoot.querySelector('#am-btn');
    const pmBtn = this.shadowRoot.querySelector('#pm-btn');
    if (amBtn && pmBtn) {
      amBtn.addEventListener('click', () => {
        this.state.period = 'AM';
        amBtn.classList.add('active');
        pmBtn.classList.remove('active');
        this._emitChange();
      });
      pmBtn.addEventListener('click', () => {
        this.state.period = 'PM';
        pmBtn.classList.add('active');
        amBtn.classList.remove('active');
        this._emitChange();
      });
    }

    const modeToggle = this.shadowRoot.querySelector('#mode-toggle-btn');
    if (modeToggle) {
      modeToggle.addEventListener('click', () => {
        this.state.mode = this.state.mode === 'dial' ? 'input' : 'dial';
        this.render();
        this._setup();
      });
    }

    const cancelBtn = this.shadowRoot.querySelector('#cancel-btn');
    const okBtn = this.shadowRoot.querySelector('#ok-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.close());
    if (okBtn) {
      okBtn.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('confirm', {
          detail: {
            hours: this.state.hours,
            minutes: this.state.minutes,
            period: this.state.period,
            value: this.value
          },
          bubbles: true,
          composed: true
        }));
        if (!this.inline) this.close();
      });
    }

    const clockFace = this.shadowRoot.querySelector('.clock-face');
    if (clockFace) {
      const updateFromAngle = (e) => {
        const rect = clockFace.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;

        let rad = Math.atan2(dy, dx) + Math.PI / 2;
        if (rad < 0) rad += Math.PI * 2;
        let deg = rad * (180 / Math.PI);
        const norm = ((deg % 360) + 360) % 360;

        if (this.state.activeUnit === 'hours') {
          let h = Math.round(norm / 30);
          if (h === 0 || h === 12) h = 12;
          this.state.hours = h;
        } else {
          let m = Math.round(norm / 6);
          if (m === 60) m = 0;
          this.state.minutes = m;
        }
        this._updateDisplay();
      };

      clockFace.addEventListener('pointerdown', (e) => {
        this._isDragging = true;
        clockFace.setPointerCapture?.(e.pointerId);
        updateFromAngle(e);
      });

      clockFace.addEventListener('pointermove', (e) => {
        if (this._isDragging) updateFromAngle(e);
      });

      const onEnd = () => {
        if (!this._isDragging) return;
        this._isDragging = false;
        this._emitChange();
        if (this.state.activeUnit === 'hours') {
          setTimeout(() => {
            this.state.activeUnit = 'minutes';
            this._updateDisplay(true);
          }, 200);
        }
      };

      clockFace.addEventListener('pointerup', onEnd);
      clockFace.addEventListener('pointercancel', onEnd);
    }

    this._updateDisplay(true);
  }

  _emitChange() {
    this.dispatchEvent(new CustomEvent('change', {
      detail: {
        hours: this.state.hours,
        minutes: this.state.minutes,
        period: this.state.period,
        value: this.value
      },
      bubbles: true,
      composed: true
    }));
  }

  _calcShortestRotation(currentAngle, targetAngle) {
    let diff = (targetAngle - currentAngle) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return currentAngle + diff;
  }

  _updateDisplay(rebuildNumbers = false) {
    const isHours = this.state.activeUnit === 'hours';
    const hourCard = this.shadowRoot.querySelector('#hour-card');
    const minCard = this.shadowRoot.querySelector('#min-card');
    const hourValEl = this.shadowRoot.querySelector('#hour-val');
    const minValEl = this.shadowRoot.querySelector('#min-val');

    if (hourCard && minCard) {
      hourCard.classList.toggle('active', isHours);
      minCard.classList.toggle('active', !isHours);
    }
    if (hourValEl) hourValEl.textContent = String(this.state.hours).padStart(2, '0');
    if (minValEl) minValEl.textContent = String(this.state.minutes).padStart(2, '0');

    // Update Input Textboxes if in input mode
    const hourInput = this.shadowRoot.querySelector('#hour-input');
    const minInput = this.shadowRoot.querySelector('#min-input');
    if (hourInput && hourInput !== this.shadowRoot.activeElement) {
      hourInput.value = String(this.state.hours).padStart(2, '0');
    }
    if (minInput && minInput !== this.shadowRoot.activeElement) {
      minInput.value = String(this.state.minutes).padStart(2, '0');
    }

    const clockArm = this.shadowRoot.querySelector('#clock-arm');
    const targetDeg = isHours ? (this.state.hours % 12) * 30 : this.state.minutes * 6;

    if (clockArm) {
      this._currentArmAngle = this._calcShortestRotation(this._currentArmAngle, targetDeg);
      clockArm.style.transform = `rotate(${this._currentArmAngle}deg)`;
    }

    // Selector dot is ONLY visible for off-grid un-labeled minutes (e.g. 14, 23).
    // On all labeled numbers (1..12 or 00, 05, 10... 55), the dot is hidden so it never covers the number!
    const selectorDot = this.shadowRoot.querySelector('.selector-dot');
    if (selectorDot) {
      const isOffGrid = !isHours && (this.state.minutes % 5 !== 0);
      selectorDot.style.display = isOffGrid ? 'block' : 'none';
    }

    if (rebuildNumbers) this._buildDialNumbers();
    this._highlightSelectedNumber();
  }

  _buildDialNumbers() {
    const clockFace = this.shadowRoot.querySelector('.clock-face');
    if (!clockFace) return;

    clockFace.querySelectorAll('.dial-number').forEach(el => el.remove());
    const isHours = this.state.activeUnit === 'hours';
    const total = 12;
    const radius = 100; // Radius in 256dp dial container

    for (let i = 1; i <= total; i++) {
      const val = isHours ? i : (i === 12 ? 0 : i * 5);
      const label = isHours ? String(val) : String(val).padStart(2, '0');
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const cx = 128 + radius * Math.cos(angle);
      const cy = 128 + radius * Math.sin(angle);

      const numEl = document.createElement('div');
      numEl.className = 'dial-number';
      numEl.setAttribute('data-val', String(val));
      numEl.style.left = `${cx}px`;
      numEl.style.top = `${cy}px`;
      numEl.textContent = label;

      numEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.state.activeUnit === 'hours') {
          this.state.hours = val;
          this._updateDisplay();
          this._emitChange();
          setTimeout(() => {
            this.state.activeUnit = 'minutes';
            this._updateDisplay(true);
          }, 250);
        } else {
          this.state.minutes = val;
          this._updateDisplay();
          this._emitChange();
        }
      });

      clockFace.appendChild(numEl);
    }
  }

  _highlightSelectedNumber() {
    const isHours = this.state.activeUnit === 'hours';
    const targetVal = isHours ? this.state.hours : this.state.minutes;

    this.shadowRoot.querySelectorAll('.dial-number').forEach((el) => {
      const val = parseInt(el.getAttribute('data-val'), 10);
      const isMatch = isHours ? (val === targetVal || (val === 12 && targetVal === 0)) : (val === targetVal);
      el.classList.toggle('selected', isMatch);
    });
  }

  render() {
    const isHorizontal = this.state.layoutType === 'horizontal';
    const isInputMode = this.state.mode === 'input';
    const isRich = this.state.richColors;

    const hh = String(this.state.hours).padStart(2, '0');
    const mm = String(this.state.minutes).padStart(2, '0');

    const dialogContent = `
      <div class="picker-dialog ${this.state.layoutType} ${isRich ? 'rich' : ''} ${isInputMode ? 'input-mode' : ''}" part="dialog">
        <div class="picker-header">
          <span class="header-title">${isInputMode ? 'Enter time' : 'Select time'}</span>
        </div>

        <div class="main-layout-wrap ${isHorizontal ? 'horizontal' : 'vertical'}">
          <!-- Time Display Cards (HH : MM + AM/PM) -->
          <div class="time-display-section ${isHorizontal ? 'horizontal' : ''}">
            <div class="time-cards-row">
              ${isInputMode ? `
                <div class="input-card-wrap">
                  <input type="text" id="hour-input" class="time-input-field" maxlength="2" value="${hh}" />
                  <span class="input-sublabel">Hour</span>
                </div>
                <div class="time-separator">:</div>
                <div class="input-card-wrap">
                  <input type="text" id="min-input" class="time-input-field" maxlength="2" value="${mm}" />
                  <span class="input-sublabel">Minute</span>
                </div>
              ` : `
                <button class="time-card active" id="hour-card" type="button" aria-label="Select hour">
                  <span class="time-val" id="hour-val">${hh}</span>
                </button>
                <div class="time-separator">:</div>
                <button class="time-card" id="min-card" type="button" aria-label="Select minute">
                  <span class="time-val" id="min-val">${mm}</span>
                </button>
              `}

              ${!this.state.is24Hour && !isHorizontal ? `
                <div class="period-toggle-column">
                  <button class="period-btn ${this.state.period === 'AM' ? 'active' : ''}" id="am-btn" type="button">AM</button>
                  <button class="period-btn ${this.state.period === 'PM' ? 'active' : ''}" id="pm-btn" type="button">PM</button>
                </div>
              ` : ''}
            </div>

            ${!this.state.is24Hour && isHorizontal ? `
              <div class="period-toggle-row">
                <button class="period-btn ${this.state.period === 'AM' ? 'active' : ''}" id="am-btn" type="button">AM</button>
                <button class="period-btn ${this.state.period === 'PM' ? 'active' : ''}" id="pm-btn" type="button">PM</button>
              </div>
            ` : ''}
          </div>

          <!-- Clock Dial (Rendered in Dial Mode) -->
          ${!isInputMode ? `
            <div class="dial-section">
              <div class="clock-face" role="slider" aria-label="Clock Dial" aria-valuemin="0" aria-valuemax="59">
                <div class="dial-center-dot"></div>
                <div class="clock-arm" id="clock-arm">
                  <div class="clock-hand-line"></div>
                  <div class="clock-selector-head">
                    <div class="selector-dot"></div>
                  </div>
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Footer Actions Bar -->
        <div class="picker-footer">
          <button class="icon-btn mode-switch" id="mode-toggle-btn" type="button" aria-label="Toggle input mode">
            <span class="ico">${isInputMode ? 'schedule' : 'keyboard'}</span>
          </button>
          <div class="action-buttons">
            <button class="text-btn" id="cancel-btn" type="button">Cancel</button>
            <button class="text-btn primary" id="ok-btn" type="button">OK</button>
          </div>
        </div>
      </div>
    `;

    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);

    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      ${this.inline ? dialogContent : `<div class="scrim" role="dialog" aria-modal="true">${dialogContent}</div>`}
    `;
  }
}

if (!customElements.get('md-time-picker')) {
  customElements.define('md-time-picker', MdTimePicker);
}
