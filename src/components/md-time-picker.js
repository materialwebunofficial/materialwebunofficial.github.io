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

import './md-button.js';
import './md-icon-button.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import {ModalController,MODAL_STYLE,renderModalContent} from './modal-controller.js';
import {PickerClock} from './picker-clock.js';
import {timePickerColors,timeInputColors,pickerPaletteStyle} from './picker-colors.js';
import {PickerPeriodGroup} from './picker-period.js';
import {PickerTimeInput} from './picker-input.js';

const defaultStyle = MODAL_STYLE+`
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    display: block;
    outline: none;
    box-sizing: border-box;
    user-select: none;
    font-family: var(--md-sys-typescale-font-family, 'Roboto', system-ui, sans-serif);
    -webkit-font-smoothing: antialiased;
  }
  :host([inline]) {
    display: inline-block;
  }

  .scrim {
    position: fixed;
    inset: 0;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    box-sizing: border-box;
  }

  .picker-dialog {
    background-color: var(--time-container-color);
    color: var(--md-sys-color-on-surface, #1D1B20);
    border-radius: var(--md-sys-shape-corner-extra-large, 28px);
    padding: 24px;
    box-shadow: none;
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-sizing: border-box;
    max-height: 100%;
    overflow-y: auto;
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

  .picker-header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .header-title {
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    color: var(--md-sys-color-on-surface-variant, #49454F);
  }

  .main-layout-wrap.vertical {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 36px;
    padding-bottom: 24px;
  }

  .main-layout-wrap.horizontal {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 36px;
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
    align-items: flex-start;
    gap: 0;
  }
  .clock-display-numbers {
    display: flex;
    align-items: flex-start;
    direction: ltr;
    flex-shrink: 0;
  }
  .period-toggle-column {
    margin-inline-start: 4px;
  }

  .time-card {
    width: 96px;
    height: 80px;
    border-radius: var(--md-sys-shape-corner-small, 8px);
    border: none;
    box-sizing: border-box;
    background-color: var(--time-time-selector-container-color);
    color: var(--time-time-selector-content-color);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    outline: none;
  }
  .time-card.active {
    background-color: var(--time-time-selector-selected-container-color);
    color: var(--time-time-selector-selected-content-color);
  }

  .time-val {
    font: var(--md-sys-typescale-display-large, 400 57px/64px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-display-large-tracking, -0.2px);
  }

  .time-separator {
    width: 24px;
    height: 80px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font: var(--md-sys-typescale-display-large, 400 57px/64px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-display-large-tracking, -0.2px);
    color: var(--md-sys-color-on-surface, #1D1B20);
    user-select: none;
  }
  .time-separator span {transform: translateY(-4px);}
  .input-mode .main-layout-wrap {padding-bottom: 0;}

  /* Keyboard Input Mode Textfields */
  .input-card-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    width: 96px;
  }

  .time-input-slot {width: 96px; height: 72px; position: relative;}
  .time-input-slot [hidden] {display: none;}

  .time-input-field {
    box-sizing: border-box;
    width: 96px;
    height: 72px;
    border-radius: var(--md-sys-shape-corner-small, 8px);
    border: none;
    padding: 0;
    background-color: var(--time-input-container,var(--time-time-selector-container-color));
    color: var(--time-time-selector-selected-content-color);
    font: var(--md-sys-typescale-display-medium, 400 45px/52px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-display-medium-tracking, 0);
    caret-color: var(--md-sys-color-primary);
    text-align: center;
    outline: none;
  }
  .time-input-field[aria-invalid="true"], .time-input-field[aria-invalid="true"]:focus {
    color: var(--md-sys-color-error);
  }
  .time-input-outline {position: absolute; inset: 0; width: 96px; height: 72px; overflow: visible; pointer-events: none; color: var(--time-input-indicator,var(--md-sys-color-outline));}
  .time-input-outline rect {fill: none; stroke: currentColor;}
  .time-input-selector {
    position: relative;
    box-sizing: border-box;
    width: 96px;
    height: 72px;
    padding: 0;
    border: none;
    border-radius: var(--md-sys-shape-corner-small, 8px);
    background: var(--time-time-selector-container-color);
    color: var(--time-time-selector-content-color);
    font: var(--md-sys-typescale-display-medium, 400 45px/52px Roboto, sans-serif);
    text-align: center;
    cursor: pointer;
    outline: none;
    overflow: hidden;
    isolation: isolate;
  }
  .time-input-selector[aria-invalid="true"] {background: var(--md-sys-color-error-container); color: var(--md-sys-color-on-error-container);}
  .time-input-selector .state-layer {position: absolute; inset: 0; background: currentColor; opacity: var(--md-button-state-alpha,0); pointer-events: none;}
  .time-input-selector .selector-text {position: relative;}

  .input-sublabel {
    min-height: 32px;
    font: var(--md-sys-typescale-body-small, 400 12px/16px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-small-tracking, 0.4px);
    color: var(--md-sys-color-on-surface-variant, #49454F);
  }
  .input-sublabel.error {color: var(--md-sys-color-error);}

  /* Current AndroidX updated AM/PM toggle: two independent ToggleButtons. */
  .period-toggle-column {
    height: 80px;
    width: 52px;
  }
  .period-toggle-column,.period-toggle-row {
    position: relative;
    flex-shrink: 0;
    direction: ltr;
    border: none;
  }
  .period-btn {
    position: absolute;
    box-sizing: border-box;
    min-width: 0;
    min-height: 0;
    padding: 0;
    border: none;
    border-radius: 9999px;
    background: var(--time-period-selector-container-color);
    color: var(--time-period-selector-content-color);
    font: var(--md-sys-typescale-title-medium, 500 16px/24px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-title-medium-tracking, 0.2px);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    isolation: isolate;
    cursor: pointer;
    outline: none;
  }
  .period-btn.active {
    background-color: var(--time-period-selector-selected-container-color);
    color: var(--time-period-selector-selected-content-color);
    font-weight: 700;
  }
  .period-btn .state-layer {
    position: absolute;
    inset: 0;
    background: currentColor;
    opacity: var(--md-button-state-alpha,0);
    pointer-events: none;
  }
  .period-btn .lbl-wrapper {position: relative;}
  .period-toggle-row {
    height: 38px;
    width: 216px;
  }

  /* 256dp Clock Dial */
  .dial-section {
    display: flex;
    justify-content: center;
    width: 256px;
    height: 256px;
    flex-shrink: 0;
  }

  /* The arm is a dial-sized square rotated about its center; clipping at the
     round dial keeps its rotated box from widening the dialog (no scrollbar). */
  .clock-face {
    position: relative;
    width: 256px;
    height: 256px;
    border-radius: 9999px;
    overflow: clip;
    background-color: var(--time-clock-dial-color);
    touch-action: none;
    cursor: pointer;
    flex-shrink: 0;
  }

  .dial-center-dot {
    position: absolute;
    width: 8px;
    height: 8px;
    background-color: var(--time-selector-color);
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
    z-index: 2;
  }

  .clock-hand-line {
    position: absolute;
    width: 2px;
    height: 100px;
    background-color: var(--time-selector-color);
    left: 127px;
    top: 28px;
  }

  .clock-selector-head {
    position: absolute;
    width: 48px;
    height: 48px;
    border-radius: 9999px;
    background-color: var(--time-selector-color);
    left: 104px;
    top: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .clock-label-layer {position:absolute;inset:0;z-index:3;}

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
    color: var(--time-clock-dial-content-color);
    user-select: none;
    cursor: pointer;
    z-index: 3;
    outline: none;
    overflow: hidden;
  }
  .dial-number-selected {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--time-clock-dial-selected-content-color);
    pointer-events: none;
  }
  .dial-number-selected::before { content: attr(data-text); }

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
    font-family: var(--md-icon-font-family, 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif);
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
    return ['open', 'value', 'mode', 'is-24-hour', 'rich-colors', 'layout-type', 'inline', 'hour', 'minute', 'variant', 'accessibility-services-enabled'];
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
    this._modal=new ModalController(this,{surface:'.picker-dialog',onDismiss:reason=>this.close(reason)});
  }

  connectedCallback() {
    if (!this._rendered) {
      this._parseInitialAttributes();
      this.render();
      this._rendered = true;
    }
    this._setup();
    this._sync();
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
    this._isDragging=false;
    this._modal.detach();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === 'open') {
      this._sync();
    }
    if (name === 'value' && newVal) {
      this._parseValue(newVal);
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
    if (name === 'layout-type' || name === 'mode' || name === 'rich-colors' || name === 'is-24-hour' || name === 'inline' || name === 'variant') {
      this._parseInitialAttributes(false);
      this.render();
      this._setup();
      this._sync();
    }
  }

  _parseInitialAttributes(readTime = true) {
    const previousHour=this.state.is24Hour?this.state.hours:this.state.hours%12+(this.state.period==='PM'?12:0);
    this.state.is24Hour = this.is24Hour;
    if (readTime && this.hasAttribute('value')) this._parseValue(this.getAttribute('value'));
    if (readTime && this.hasAttribute('hour')) {
      const h = parseInt(this.getAttribute('hour'), 10);
      if (!isNaN(h)) this.state.hours = h;
    }
    if (readTime && this.hasAttribute('minute')) {
      const m = parseInt(this.getAttribute('minute'), 10);
      if (!isNaN(m)) this.state.minutes = m;
    }
    if(!readTime){this.state.hours=this.state.is24Hour?previousHour:previousHour%12||12;this.state.period=previousHour>=12?'PM':'AM';}
    this.state.richColors = this.richColors;
    if (this.hasAttribute('mode')) this.state.mode = this.getAttribute('mode');
    if (this.hasAttribute('layout-type')) this.state.layoutType = this.getAttribute('layout-type');
    if (this.hasAttribute('variant')) {
      const v = this.getAttribute('variant');
      if (v === 'horizontal') this.state.layoutType = 'horizontal';
      else if (v === 'input') this.state.mode = 'input';
      else if (v === 'dial') this.state.mode = 'dial';
    }
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
  set value(v) {
    const text=String(v);
    if(this.getAttribute('value')===text){this._parseValue(text);if(this._rendered)this._updateDisplay(true);}
    else this.setAttribute('value',text);
  }

  get hour() { return this.state.hours; }
  set hour(v) {
    const text=String(v);
    if(this.getAttribute('hour')===text){const hour=parseInt(text,10);if(!isNaN(hour)){this.state.hours=hour;if(this._rendered)this._updateDisplay(true);}}
    else this.setAttribute('hour',text);
  }

  get minute() { return this.state.minutes; }
  set minute(v) {
    const text=String(v);
    if(this.getAttribute('minute')===text){const minute=parseInt(text,10);if(!isNaN(minute)){this.state.minutes=minute;if(this._rendered)this._updateDisplay(true);}}
    else this.setAttribute('minute',text);
  }

  get is24Hour() { return this.hasAttribute('is-24-hour'); }
  set is24Hour(v) {
    if (v) this.setAttribute('is-24-hour', '');
    else this.removeAttribute('is-24-hour');
  }

  get accessibilityServicesEnabled() { return this.hasAttribute('accessibility-services-enabled'); }
  set accessibilityServicesEnabled(value) { this.toggleAttribute('accessibility-services-enabled',Boolean(value)); }
  get hourInput() { return this._pickerTime?.hourInput ?? (this.state.is24Hour?this.state.hours:this.state.hours%12+(this.state.period==='PM'?12:0)); }
  get minuteInput() { return this._pickerTime?.minuteInput ?? this.state.minutes; }
  get isInputValid() { return this._pickerTime?.isInputValid ?? (this.hourInput>=0&&this.hourInput<=23&&this.minuteInput>=0&&this.minuteInput<=59); }

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
    this._sync();
  }
  close() {
    this._clock?.cancelAction();
    this.open = false;
  }

  _parseValue(valStr) {
    if (!valStr) return;
    const match = valStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match) {
      this.state.hours = parseInt(match[1], 10);
      this.state.minutes = parseInt(match[2], 10);
      if (match[3]) this.state.period = match[3].toUpperCase();
    }
  }

  _sync() {
    if(!this.inline&&!this.open)this._clock?.cancelAction();
    if (this.inline) {
      this.style.display = 'inline-block';
      this._modal.detach();
    } else {
      this.style.display = 'contents';
      this._modal.sync(this.open);
      if(this.open)this._input?.focusSelection();
    }
  }

  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    signal.addEventListener('abort',()=>{this._isDragging=false;},{once:true});

    const hourCard = this.shadowRoot.querySelector('#hour-card');
    const minCard = this.shadowRoot.querySelector('#min-card');
    if (hourCard && minCard) {
      hourCard.addEventListener('click', event => {
        this.state.activeUnit = 'hours';
        this._updateDisplay(true);
        if(event.detail===0)this._clock?.focusSelected();
      }, { signal });
      minCard.addEventListener('click', event => {
        this.state.activeUnit = 'minutes';
        this._updateDisplay(true);
        if(event.detail===0)this._clock?.focusSelected();
      }, { signal });
    }

    this._input=this.shadowRoot.querySelector('#hour-input')?new PickerTimeInput(this,signal):null;

    const periodGroup=this.shadowRoot.querySelector('.period-toggle-column,.period-toggle-row');
    this._periodGroup=periodGroup?new PickerPeriodGroup(this,periodGroup,{period:()=>this.state.period,signal,onActivate:period=>{
      if(this.state.period===period)return;
      this.state.period=period;this._updateDisplay();this._emitChange();
    }}):null;

    const modeToggle = this.shadowRoot.querySelector('#mode-toggle-btn');
    if (modeToggle) {
      modeToggle.addEventListener('click', () => {
        this.state.mode = this.state.mode === 'dial' ? 'input' : 'dial';
        this.render();
        this._setup();
        this._sync();
      }, { signal });
    }

    const cancelBtn = this.shadowRoot.querySelector('#cancel-btn');
    const okBtn = this.shadowRoot.querySelector('#ok-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.close(), { signal });
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
      }, { signal });
    }

    const clockFace = this.shadowRoot.querySelector('.clock-face');
    this._clock=clockFace?new PickerClock(this,clockFace,signal):null;

    this._updateDisplay();
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

  _updateDisplay(force = false) {
    this._periodGroup?.refresh();
    const isHours = this.state.activeUnit === 'hours';
    const hourCard = this.shadowRoot.querySelector('#hour-card');
    const minCard = this.shadowRoot.querySelector('#min-card');
    const hourValEl = this.shadowRoot.querySelector('#hour-val');
    const minValEl = this.shadowRoot.querySelector('#min-val');

    const hh = String(this.state.hours).padStart(2, '0');
    const mm = String(this.state.minutes).padStart(2, '0');
    if (hourCard) {
      hourCard.classList.toggle('active', isHours);
      hourCard.setAttribute('aria-label', `Hour ${hh}`);
    }
    if (minCard) {
      minCard.classList.toggle('active', !isHours);
      minCard.setAttribute('aria-label', `Minute ${mm}`);
    }
    if (hourValEl) hourValEl.textContent = hh;
    if (minValEl) minValEl.textContent = mm;

    this._input?.sync(force);

    this._clock?.sync();
  }

  render() {
    const isHorizontal = this.state.layoutType === 'horizontal';
    const isInputMode = this.state.mode === 'input';
    const isRich = this.state.richColors;

    const hh = String(this.state.hours).padStart(2, '0');
    const mm = String(this.state.minutes).padStart(2, '0');

    const dialogContent = `
      <div class="picker-dialog ${this.state.layoutType} ${isRich ? 'rich' : ''} ${isInputMode ? 'input-mode' : ''}" part="dialog" style="${pickerPaletteStyle(isInputMode?timeInputColors(isRich):timePickerColors(isRich),'time')}">
        <div class="picker-header">
          <span class="header-title">${isInputMode ? 'Enter time' : 'Select time'}</span>
        </div>

        <div class="main-layout-wrap ${isHorizontal ? 'horizontal' : 'vertical'}">
          <!-- Time Display Cards (HH : MM + AM/PM) -->
          <div class="time-display-section ${isHorizontal ? 'horizontal' : ''}">
            <div class="time-cards-row">
              <div class="clock-display-numbers">
              ${isInputMode ? `
                <div class="input-card-wrap">
                  <div class="time-input-slot">
                  <button type="button" id="hour-input-selector" class="time-input-selector" role="radio" aria-label="Select hour" aria-describedby="hour-support"><span class="state-layer"></span><span class="selector-text">${hh}</span></button>
                  <input type="text" id="hour-input" class="time-input-field" inputmode="numeric" enterkeyhint="next" value="${hh}" aria-label="Hour" aria-describedby="hour-support" />
                  <svg class="time-input-outline" aria-hidden="true" viewBox="0 0 96 72"><rect /></svg>
                  </div>
                  <span class="input-sublabel" id="hour-support">Hour</span>
                </div>
                <div class="time-separator" aria-hidden="true"><span>:</span></div>
                <div class="input-card-wrap">
                  <div class="time-input-slot">
                  <button type="button" id="min-input-selector" class="time-input-selector" role="radio" aria-label="Select minute" aria-describedby="minute-support"><span class="state-layer"></span><span class="selector-text">${mm}</span></button>
                  <input type="text" id="min-input" class="time-input-field" inputmode="numeric" enterkeyhint="done" value="${mm}" aria-label="Minute" aria-describedby="minute-support" />
                  <svg class="time-input-outline" aria-hidden="true" viewBox="0 0 96 72"><rect /></svg>
                  </div>
                  <span class="input-sublabel" id="minute-support">Minute</span>
                </div>
              ` : `
                <button class="time-card active" id="hour-card" type="button" aria-label="Hour ${hh}">
                  <span class="time-val" id="hour-val">${hh}</span>
                </button>
                <div class="time-separator" aria-hidden="true"><span>:</span></div>
                <button class="time-card" id="min-card" type="button" aria-label="Minute ${mm}">
                  <span class="time-val" id="min-val">${mm}</span>
                </button>
              `}
              </div>

              ${!this.state.is24Hour && !isHorizontal ? `
                <div class="period-toggle-column" role="group" aria-label="AM or PM">
                  <button class="period-btn ${this.state.period === 'AM' ? 'active' : ''}" id="am-btn" data-period="AM" type="button"><span class="state-layer"></span><span class="lbl-wrapper">AM</span></button>
                  <button class="period-btn ${this.state.period === 'PM' ? 'active' : ''}" id="pm-btn" data-period="PM" type="button"><span class="state-layer"></span><span class="lbl-wrapper">PM</span></button>
                </div>
              ` : ''}
            </div>

            ${!this.state.is24Hour && isHorizontal ? `
              <div class="period-toggle-row" role="group" aria-label="AM or PM">
                <button class="period-btn ${this.state.period === 'AM' ? 'active' : ''}" id="am-btn" data-period="AM" type="button"><span class="state-layer"></span><span class="lbl-wrapper">AM</span></button>
                <button class="period-btn ${this.state.period === 'PM' ? 'active' : ''}" id="pm-btn" data-period="PM" type="button"><span class="state-layer"></span><span class="lbl-wrapper">PM</span></button>
              </div>
            ` : ''}
          </div>

          <!-- Clock Dial (Rendered in Dial Mode) -->
          ${!isInputMode ? `
            <div class="dial-section">
              <div class="clock-face" role="region" aria-label="Clock Dial">
                <div class="dial-center-dot"></div>
                <div class="clock-arm" id="clock-arm">
                  <div class="clock-hand-line"></div>
                  <div class="clock-selector-head">
                  </div>
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Footer Actions Bar -->
        <div class="picker-footer">
          <md-icon-button class="mode-switch" id="mode-toggle-btn" icon="${isInputMode ? 'schedule' : 'keyboard'}"
            aria-label="${isInputMode ? 'Switch to clock input' : 'Switch to text input'}"></md-icon-button>
          <div class="action-buttons">
            <md-button variant="text" id="cancel-btn" label="Cancel"></md-button>
            <md-button variant="text" id="ok-btn" label="OK"></md-button>
          </div>
        </div>
      </div>
    `;

    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);

    if(!hasAdopted&&!this.shadowRoot.querySelector('style')){
      const style=document.createElement('style');style.textContent=defaultStyle;this.shadowRoot.prepend(style);
    }
    renderModalContent(this,this.inline?dialogContent:`<div class="scrim">${dialogContent}</div>`,{inline:this.inline,label:'Select time'});
  }
}

if (!customElements.get('md-time-picker')) {
  customElements.define('md-time-picker', MdTimePicker);
}
