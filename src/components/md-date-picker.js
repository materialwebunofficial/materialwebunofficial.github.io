/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-date-picker>
 *
 * Spec: research/DATE-PICKER-SOURCES.md & AndroidX Compose DatePicker / DateRangePicker / DatePickerDialog
 *   3 Official Types:
 *   1. Docked: Inline Outlined text field (MM/DD/YYYY) with attached docked calendar grid.
 *   2. Modal: Standalone/dialog calendar with "Select date" subhead, large headline ("Mon, Aug 17"),
 *             month-year dropdown, circular selection, mode toggle, and Cancel/OK actions.
 *   3. Range: Date range picker with "Enter dates" / "Aug 17 – Aug 24" headline, dual input fields
 *             or continuous range highlight track, and Cancel/Save actions.
 *
 * Contract: docs/AGENT-INTERACTION-CONTRACT.md
 */

import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import {ModalController,MODAL_STYLE,renderModalContent} from './modal-controller.js';
import {datePickerColors,datePickerDayColors,pickerCssColor,pickerPaletteStyle} from './picker-colors.js';
import {bindPress,createRipple} from '../motion/interactions.js';
import './md-button.js';
import './md-icon-button.js';
import './md-text-field.js';

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
    max-width: 100%;
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

  /* 1. DOCKED STYLES */
  /* Docked picker: a 360dp menu below its field. */
  .docked-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 360px;
    max-width: 100%;
    box-sizing: border-box;
  }

  .outlined-field-wrap {
    position: relative;
    display: flex;
    flex-direction: column;
    margin-top: 6px;
    width: 100%;
    box-sizing: border-box;
  }

  .field-label {
    position: absolute;
    top: -8px;
    left: 12px;
    background: var(--md-sys-color-surface, #FEF7FF);
    padding: 0 4px;
    font: var(--md-sys-typescale-label-medium, 500 12px/16px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-medium-tracking, 0.5px);
    color: var(--md-sys-color-primary, #6750A4);
    z-index: 2;
  }

  .outlined-input {
    box-sizing: border-box;
    width: 100%;
    height: 56px;
    border-radius: 4px;
    border: 2px solid var(--md-sys-color-primary, #6750A4);
    background: transparent;
    color: var(--md-sys-color-on-surface, #1D1B20);
    font: var(--md-sys-typescale-body-large, 400 16px/24px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-large-tracking, 0.5px);
    padding: 0 16px;
    outline: none;
  }

  .helper-text {
    font: var(--md-sys-typescale-body-small, 400 12px/16px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-small-tracking, 0.4px);
    color: var(--md-sys-color-on-surface-variant, #49454F);
    margin-top: 4px;
    margin-left: 12px;
  }

  /* Docked date picker: SurfaceContainerHigh, CornerLarge, elevation level 3. */
  .docked-calendar {
    background-color: var(--date-container-color);
    border: 0;
    border-radius: var(--md-sys-shape-corner-large, 16px);
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: var(--md-sys-elevation-level3, 0 1px 3px 0 rgba(0,0,0,.3), 0 4px 8px 3px rgba(0,0,0,.15));
    box-sizing: border-box;
    width: 100%;
  }

  .docked-nav-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px;
  }

  .nav-cluster {
    display: flex;
    align-items: center;
    gap: 0;
  }
  /* Month and year menus keep their label on one line between the arrows. */
  .nav-cluster md-button { flex: none; white-space: nowrap; }

  .dropdown-pill-btn {
    border: none;
    background: transparent;
    color: var(--md-sys-color-on-surface, #1D1B20);
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    border-radius: 9999px;
    cursor: pointer;
    outline: none;
    transition: background-color 150ms ease;
  }
  .dropdown-pill-btn:hover {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent);
  }

  /* 2. MODAL & RANGE DIALOG STYLES */
  .picker-dialog {
    background-color: var(--date-container-color);
    color: var(--md-sys-color-on-surface, #1D1B20);
    border-radius: var(--md-sys-shape-corner-extra-large, 28px);
    padding: 0;
    width: 360px;
    max-width: calc(100vw - 32px);
    box-shadow: none;
    display: flex;
    flex-direction: column;
    gap: 0;
    box-sizing: border-box;
    max-height: 100%;
    overflow-y: auto;
    margin: auto;
  }

  /* DatePickerDialog is 360dp wide whatever the headline or selection; an
     inline picker keeps that width instead of shrinking to its content. */
  :host([inline]) .picker-dialog {
    width: 360px;
    max-width: 100%;
    box-shadow: none;
    margin: 0 auto;
  }

  .picker-header {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* DatePickerDefaults: title padding 16/12/24, headline row with the mode toggle. */
  .picker-header {
    min-height: 120px;
    padding: 16px 12px 12px 24px;
    justify-content: space-between;
    box-sizing: border-box;
  }
  .header-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .mode-toggle, .nav-btn { --md-icon-button-content-color: var(--date-navigation-content-color); }
  .year-menu, .month-menu { --md-button-content-color: var(--date-navigation-content-color); }
  .calendar-views { position: relative; }
  .day-view[hidden], .year-grid[hidden], .option-list[hidden], .month-nav[hidden] { display: none; }
  /* Year picker: three columns of 72x36dp years, selected Primary, current year outlined. */
  .year-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    align-content: start;
    justify-items: center;
    row-gap: 16px;
    height: 336px;
    padding: 8px 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    box-sizing: border-box;
  }
  .year {
    position: relative;
    width: 72px;
    height: 36px;
    padding: 0;
    border: 0;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    background: transparent;
    color: var(--date-year-content-color);
    font: var(--md-sys-typescale-body-large, 400 16px/24px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-large-tracking, 0.5px);
    cursor: pointer;
    overflow: hidden;
    outline: none;
  }
  .year.current { box-shadow: inset 0 0 0 1px var(--date-today-date-border-color); color: var(--date-current-year-content-color); }
  .year.selected { box-shadow: none; background: var(--date-selected-year-container-color); color: var(--date-selected-year-content-color); }
  .year::before, .option::before { content: ''; position: absolute; inset: 0; background: currentColor; opacity: 0; pointer-events: none; }
  .year:hover::before, .option:hover::before { opacity: var(--md-sys-state-hover-state-layer-opacity, .08); }
  .year:focus-visible::before, .option:focus-visible::before { opacity: var(--md-sys-state-focus-state-layer-opacity, .1); }
  .year:focus-visible, .option:focus-visible { outline: 3px solid var(--md-sys-color-secondary, #625B71); outline-offset: -3px; }
  /* Docked month and year lists. */
  .option-list { display: flex; flex-direction: column; height: 336px; overflow-y: auto; overscroll-behavior: contain; padding: 8px 0; box-sizing: border-box; }
  .option {
    position: relative;
    display: flex;
    align-items: center;
    gap: 16px;
    flex: none;
    min-height: 48px;
    padding: 0 16px;
    border: 0;
    background: transparent;
    color: var(--md-sys-color-on-surface, #1D1B20);
    font: var(--md-sys-typescale-body-large, 400 16px/24px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-large-tracking, 0.5px);
    text-align: start;
    cursor: pointer;
    overflow: hidden;
    outline: none;
  }
  .option-check { width: 24px; font-family: var(--md-icon-font-family, 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif); font-size: 24px; line-height: 1; visibility: hidden; }
  .option.selected .option-check { visibility: visible; }
  .md-ripple-effect { position: absolute; border-radius: 50%; background: currentColor; opacity: 0; animation: date-ripple 450ms linear; pointer-events: none; }
  @keyframes date-ripple { from { transform: scale(0); opacity: .1; } to { transform: scale(1); opacity: 0; } }

  .header-title {
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    color: var(--date-title-content-color);
    text-transform: none;
  }

  .formatted-date {
    font: var(--md-sys-typescale-headline-large, 400 32px/40px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-headline-large-tracking, 0px);
    color: var(--date-headline-content-color);
  }
  /* DateRangePicker header: RangeSelectionHeaderContainerHeight less the 60dp
     of the full-screen dialog's own bar, title and headline inset 64dp/12dp,
     the headline in Title Large with the mode toggle 12dp from the end and
     bottom. The headline stays on one line, so the header keeps its height
     whatever is selected. */
  .picker-dialog.range .picker-header { min-height: 68px; padding: 0; }
  .picker-dialog.range .header-title { padding: 0 12px 0 64px; }
  .picker-dialog.range .header-row { padding-inline-start: 64px; align-items: center; }
  .picker-dialog.range .formatted-date {
    flex: 1 1 auto;
    min-width: 0;
    padding: 0 12px 12px 0;
    font: var(--md-sys-typescale-title-large-weight) var(--md-sys-typescale-title-large-size)/var(--md-sys-typescale-title-large-line-height) var(--md-sys-typescale-title-large-font);
    letter-spacing: var(--md-sys-typescale-title-large-tracking);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .picker-dialog.range .header-row > :last-child:not(.formatted-date) { margin: 0 12px 12px 0; }

  .icon-toggle-btn {
    border: none;
    background: transparent;
    color: var(--date-navigation-content-color);
    width: 36px;
    height: 36px;
    border-radius: 9999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    outline: none;
    transition: background-color 150ms ease;
  }
  .icon-toggle-btn:hover {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent);
  }

  .divider {
    height: 1px;
    background-color: var(--date-divider-color);
    margin: 0;
  }

  .calendar-body {
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 100%;
    padding: 0 12px;
    box-sizing: border-box;
  }

  .month-header {
    min-height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0;
  }

  .month-nav {
    display: flex;
    gap: 4px;
  }

  .nav-btn {
    border: none;
    background: transparent;
    color: var(--date-navigation-content-color);
    cursor: pointer;
    width: 36px;
    height: 36px;
    border-radius: 9999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    outline: none;
    transition: background-color 150ms ease;
  }
  .nav-btn:hover {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent);
  }

  .ico {
    font-family: var(--md-icon-font-family, 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif);
    font-size: 22px;
    line-height: 1;
    display: inline-block;
    white-space: nowrap;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24;
  }
  .ico.arrow { font-size: 18px; }

  .weekdays-row {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    text-align: center;
    font: var(--md-sys-typescale-body-large, 400 16px/24px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-large-tracking, 0.5px);
    color: var(--date-weekday-content-color);
    height: 48px;
    align-items: center;
    justify-items: center;
    width: 100%;
    box-sizing: border-box;
  }

  .days-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    grid-template-rows: repeat(6, 48px);
    gap: 0;
    height: 288px;
    align-items: center;
    justify-items: center;
    width: 100%;
    box-sizing: border-box;
  }

  .day-cell {
    position: relative;
    width: 100%;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    font: var(--md-sys-typescale-body-large, 400 16px/24px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-large-tracking, 0.5px);
    border: none;
    background: transparent;
    color: var(--date-day-content);
    cursor: pointer;
    outline: none;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
  }
  .day-cell.empty {
    cursor: default;
    pointer-events: none;
  }
  .day-cell .day-text {
    position: relative;
    z-index: 2;
    width: 40px;
    height: 40px;
    min-width: 40px;
    min-height: 40px;
    max-width: 40px;
    max-height: 40px;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin: auto;
    background-color: var(--date-day-container);
    text-align: center;
    transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
    box-sizing: border-box;
  }
  /* State layer: the day's content color at the hover opacity. */
  .day-cell:hover:not(.empty):not(.selected):not(.in-range) .day-text {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent);
  }
  .day-cell.today:not(.selected) .day-text {
    border: 1px solid var(--date-today-date-border-color);
  }

  /* Native range ink is 40dp high, centered within each 48dp week. */
  .day-cell.in-range {
    background: linear-gradient(var(--date-day-in-selection-range-container-color),var(--date-day-in-selection-range-container-color)) center / 100% 40px no-repeat;
    border-radius: 0;
  }
  .day-cell.range-start::before {
    content: '';
    position: absolute;
    top: 4px;
    bottom: 4px;
    inset-inline-end: 0;
    width: 50%;
    background-color: var(--date-day-in-selection-range-container-color);
    z-index: 1;
  }
  .day-cell.range-end::before {
    content: '';
    position: absolute;
    top: 4px;
    bottom: 4px;
    inset-inline-start: 0;
    width: 50%;
    background-color: var(--date-day-in-selection-range-container-color);
    z-index: 1;
  }
  .day-cell.range-start.range-end::before {
    display: none;
  }

  /* DateRangePicker: weekdays over a vertically scrolling list of months. */
  .range-body { padding: 0 12px; }
  .months-list {
    position: relative;
    height: 336px;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
  }
  .month-subhead {
    padding: 20px 0 8px 24px;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    font: var(--md-sys-typescale-title-small, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-title-small-tracking, 0.1px);
  }
  .months-edge { height: 1px; }

  .range-input-pane, .modal-input-pane {
    display: flex;
    gap: 12px;
    padding: 16px 24px 24px;
    width: 100%;
    box-sizing: border-box;
  }
  .range-input-pane md-text-field, .modal-input-pane md-text-field { flex: 1; min-width: 0; }
  .range-input-pane .outlined-field-wrap { flex: 1; }

  /* DatePickerDialog: buttons 8dp apart, padded 8dp from the bottom and 6dp from the end. */
  .actions-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 0 6px 8px 0;
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

  @media (max-width: 600px) {
    .docked-container {
      width: 100% !important;
      max-width: 360px !important;
      margin: 0 auto !important;
    }
    .docked-calendar {
      padding: 16px 12px !important;
    }
  }
`;

const datePickerSheet = createComponentSheet(defaultStyle);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateMMDDYYYY(d) {
  if (!d || isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function parseDateMMDDYYYY(str) {
  if (!str) return null;
  // Support YYYY-MM-DD or MM/DD/YYYY
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return isNaN(d.getTime()) ? null : d;
    }
  }
  const parts = str.split('/');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[2], 10), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export class MdDatePicker extends HTMLElement {
  static get observedAttributes() {
    return ['open', 'variant', 'value', 'range', 'start-date', 'end-date', 'show-mode-toggle', 'inline', 'date-formatter'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, datePickerSheet);

    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    this.state = {
      selectedDate: now,
      startDate: now,
      endDate: futureDate,
      viewYear: now.getFullYear(),
      viewMonth: now.getMonth(),
      displayMode: 'picker', // 'picker' | 'input'
      selectingRangeEnd: false
    };
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
    this._monthEdges?.disconnect();
    this._monthPlacement?.disconnect();
    this._monthEdges = this._monthPlacement = null;
    this._monthWindow = null;
    this._abortController?.abort();
    this._abortController = null;
    this._modal.detach();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === 'open') {
      this._sync();
    }
    if (name === 'value' && this.value) {
      const parsed = parseDateMMDDYYYY(this.value);
      if (parsed) {
        this.state.selectedDate = parsed;
        this.state.viewYear = parsed.getFullYear();
        this.state.viewMonth = parsed.getMonth();
        this._updateUI();
      }
    }
    if(name === 'start-date' || name === 'end-date'){
      this.state[name === 'start-date'?'startDate':'endDate']=parseDateMMDDYYYY(newVal);
      this._updateUI();
    }
    if (name === 'variant' || name === 'inline' || name === 'range') {
      this.render();
      this._setup();
      this._sync();
    }
  }

  _parseInitialAttributes() {
    if (this.hasAttribute('value')) {
      const parsed = parseDateMMDDYYYY(this.getAttribute('value'));
      if (parsed) {
        this.state.selectedDate = parsed;
        this.state.viewYear = parsed.getFullYear();
        this.state.viewMonth = parsed.getMonth();
      }
    }
    if (this.hasAttribute('start-date')) {
      this.state.startDate = parseDateMMDDYYYY(this.getAttribute('start-date'));
      // DateRangePicker initially displays the month of the selected start date.
      if (this.state.startDate && !this.hasAttribute('value')) {
        this.state.viewYear = this.state.startDate.getFullYear();
        this.state.viewMonth = this.state.startDate.getMonth();
      }
    }
    if (this.hasAttribute('end-date')) {
      this.state.endDate = parseDateMMDDYYYY(this.getAttribute('end-date'));
    }
    if (this.variant === 'modal-input' || (this.range && this.getAttribute('mode') === 'input')) {
      this.state.displayMode = 'input';
    }
  }

  get open() { return this.hasAttribute('open'); }
  set open(v) {
    if (v) this.setAttribute('open', '');
    else this.removeAttribute('open');
  }

  get inline() { return this.hasAttribute('inline') || this.variant === 'docked'; }
  set inline(v) {
    if (v) this.setAttribute('inline', '');
    else this.removeAttribute('inline');
  }

  get variant() { return this.getAttribute('variant') || 'modal'; } // 'docked' | 'modal' | 'range' | 'modal-input'
  set variant(v) { this.setAttribute('variant', v); }

  get value() { return this.getAttribute('value') || formatDateMMDDYYYY(this.state.selectedDate); }
  set value(v) { this.setAttribute('value', v); }

  get range() { return this.hasAttribute('range') || this.variant === 'range'; }
  set range(v) {
    if (v) this.setAttribute('range', '');
    else this.removeAttribute('range');
  }

  get startDate() { return this.getAttribute('start-date') || formatDateMMDDYYYY(this.state.startDate); }
  set startDate(v) { this.setAttribute('start-date', v); }

  get showModeToggle() { return this.getAttribute('show-mode-toggle') !== 'false'; }
  set showModeToggle(v) {
    if (v) this.setAttribute('show-mode-toggle', 'true');
    else this.setAttribute('show-mode-toggle', 'false');
  }

  get dateFormatter() { return this.getAttribute('date-formatter') || ''; }
  set dateFormatter(v) {
    if (v === null || v === undefined) this.removeAttribute('date-formatter');
    else this.setAttribute('date-formatter', v);
  }

  get endDate() { return this.getAttribute('end-date') || formatDateMMDDYYYY(this.state.endDate); }
  set endDate(v) { this.setAttribute('end-date', v); }

  show() {
    this.open = true;
    this._sync();
  }
  close() {
    this.open = false;
  }

  _sync() {
    if (this.inline) {
      this.style.display = 'inline-block';
      this._modal.detach();
    } else {
      this.style.display = 'contents';
      this._modal.sync(this.open);
    }
  }

  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const prevBtn = this.shadowRoot.querySelector('#prev-month');
    const nextBtn = this.shadowRoot.querySelector('#next-month');
    if (prevBtn && nextBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.state.view !== 'day') this._setView('day');
        this.state.viewMonth--;
        if (this.state.viewMonth < 0) {
          this.state.viewMonth = 11;
          this.state.viewYear--;
        }
        this._updateUI();
      }, { signal });
      nextBtn.addEventListener('click', () => {
        if (this.state.view !== 'day') this._setView('day');
        this.state.viewMonth++;
        if (this.state.viewMonth > 11) {
          this.state.viewMonth = 0;
          this.state.viewYear++;
        }
        this._updateUI();
      }, { signal });
    }

    const yearMenu = this.shadowRoot.querySelector('#year-menu');
    yearMenu?.addEventListener('click', () => this._setView(this.state.view === 'year' ? 'day' : 'year'), { signal });
    this.shadowRoot.querySelector('#month-menu')?.addEventListener('click', () => this._setView(this.state.view === 'month' ? 'day' : 'month'), { signal });
    for (const [id, step] of [['#prev-year', -1], ['#next-year', 1]]) {
      this.shadowRoot.querySelector(id)?.addEventListener('click', () => {
        this.state.viewYear = Math.min(2100, Math.max(1900, this.state.viewYear + step));
        if (this.state.view !== 'day') this._setView('day');
        this._updateUI();
      }, { signal });
    }

    const modeToggle = this.shadowRoot.querySelector('#mode-toggle-btn');
    if (modeToggle) {
      modeToggle.addEventListener('click', () => {
        this.state.displayMode = this.state.displayMode === 'picker' ? 'input' : 'picker';
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
            date: this.state.selectedDate,
            startDate: this.state.startDate,
            endDate: this.state.endDate,
            value: this.value
          },
          bubbles: true,
          composed: true
        }));
        if (!this.inline) this.close();
      }, { signal });
    }

    // Docked input event listener
    const dockedInput = this.shadowRoot.querySelector('#docked-text-input');
    if (dockedInput) {
      dockedInput.addEventListener('input', (e) => {
        const parsed = parseDateMMDDYYYY(e.target.value);
        if (parsed) {
          this.state.selectedDate = parsed;
          this.state.viewYear = parsed.getFullYear();
          this.state.viewMonth = parsed.getMonth();
          this.value = formatDateMMDDYYYY(parsed);
          this._updateCalendarGrid();
        }
      }, { signal });
    }

    // Range input listeners
    const rangeStartInput = this.shadowRoot.querySelector('#range-start-input');
    const rangeEndInput = this.shadowRoot.querySelector('#range-end-input');
    if (rangeStartInput && rangeEndInput) {
      rangeStartInput.addEventListener('input', (e) => {
        const s = parseDateMMDDYYYY(e.target.value);
        if (s) {
          this.state.startDate = s;
          this.startDate = formatDateMMDDYYYY(s);
          this._updateHeader();
        }
      }, { signal });
      rangeEndInput.addEventListener('input', (e) => {
        const endD = parseDateMMDDYYYY(e.target.value);
        if (endD) {
          this.state.endDate = endD;
          this.endDate = formatDateMMDDYYYY(endD);
          this._updateHeader();
        }
      }, { signal });
    }

    this._updateUI();
  }

  _updateUI() {
    this._updateHeader();
    this._updateCalendarGrid();
  }

  _updateHeader() {
    const isRange = this.range;
    const headerEl = this.shadowRoot.querySelector('.formatted-date');
    if (!headerEl) return;

    if (isRange) {
      if (this.state.displayMode === 'input') {
        headerEl.textContent = 'Enter dates';
      } else if (this.state.startDate && this.state.endDate) {
        const s = this.state.startDate;
        const e = this.state.endDate;
        headerEl.textContent = `${MONTH_SHORT[s.getMonth()]} ${s.getDate()} – ${MONTH_SHORT[e.getMonth()]} ${e.getDate()}`;
      } else {
        headerEl.textContent = 'Start date – End date';
      }
    } else {
      const sel = this.state.selectedDate;
      headerEl.textContent = `${DAY_NAMES[sel.getDay()]}, ${MONTH_SHORT[sel.getMonth()]} ${sel.getDate()}`;
    }
  }

  _updateCalendarGrid() {
    const yearMenu = this.shadowRoot.querySelector('#year-menu');
    const monthMenu = this.shadowRoot.querySelector('#month-menu');
    if (this.variant === 'docked') {
      monthMenu?.setAttribute('label', MONTH_SHORT[this.state.viewMonth]);
      yearMenu?.setAttribute('label', String(this.state.viewYear));
    } else {
      yearMenu?.setAttribute('label', `${MONTH_NAMES[this.state.viewMonth]} ${this.state.viewYear}`);
    }

    const monthsList = this.shadowRoot.querySelector('.months-list');
    if (monthsList) { this._renderMonthList(monthsList); return; }
    const daysGrid = this.shadowRoot.querySelector('.days-grid');
    if (!daysGrid) return;
    daysGrid.innerHTML = this._monthCells(this.state.viewYear, this.state.viewMonth);
    for (const cell of daysGrid.querySelectorAll('.day-cell:not(.empty)')) {
      cell.addEventListener('click', () => this._pickDate(new Date(this.state.viewYear, this.state.viewMonth, Number(cell.dataset.day))));
    }
  }

  /** One month's 6 x 7 day grid (Month: six 48dp weeks, empty leading and trailing cells). */
  _monthCells(viewYear, viewMonth) {
    const isRange = this.range;
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const today = new Date();

    const startTime = this.state.startDate ? new Date(this.state.startDate.getFullYear(), this.state.startDate.getMonth(), this.state.startDate.getDate()).getTime() : null;
    const endTime = this.state.endDate ? new Date(this.state.endDate.getFullYear(), this.state.endDate.getMonth(), this.state.endDate.getDate()).getTime() : null;

    let gridHtml = '';
    for (let i = 0; i < firstDayIndex; i++) {
      gridHtml += `<div class="day-cell empty"></div>`;
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const currentCellDate = new Date(viewYear, viewMonth, day);
      const currentTime = currentCellDate.getTime();

      const isToday =
        today.getFullYear() === viewYear &&
        today.getMonth() === viewMonth &&
        today.getDate() === day;

      let cellClasses = 'day-cell';
      if (isToday) cellClasses += ' today';

      if (isRange) {
        const isStart = startTime !== null && currentTime === startTime;
        const isEnd = endTime !== null && currentTime === endTime;
        const inRange = startTime !== null && endTime !== null && currentTime > startTime && currentTime < endTime;

        if (isStart || isEnd) {
          cellClasses += ' selected';
          if(isStart && endTime !== null)cellClasses += ' range-start';
          if(isEnd && startTime !== null)cellClasses += ' range-end';
        } else if (inRange) cellClasses += ' in-range';
      } else {
        const isSelected =
          this.state.selectedDate.getFullYear() === viewYear &&
          this.state.selectedDate.getMonth() === viewMonth &&
          this.state.selectedDate.getDate() === day;
        if (isSelected) cellClasses += ' selected';
      }

      const selected=cellClasses.includes(' selected'),inRange=!!(isRange&&startTime!==null&&endTime!==null&&currentTime>=startTime&&currentTime<=endTime);
      const colors=datePickerDayColors({isToday,selected,inRange});
      gridHtml += `
        <button class="${cellClasses}" data-day="${day}" tabindex="0" type="button" aria-pressed="${selected}" style="--date-day-content:${pickerCssColor(colors.content)};--date-day-container:${pickerCssColor(colors.container)}" aria-label="${day} ${MONTH_NAMES[viewMonth]} ${viewYear}">
          <span class="day-text">${day}</span>
        </button>
      `;
    }
    for(let i=firstDayIndex+daysInMonth;i<42;i++)gridHtml+='<div class="day-cell empty"></div>';
    return gridHtml;
  }

  /** Selects a date (or extends the range) and reports the change. */
  _pickDate(pickedDate) {
    if (this.range) {
      if (!this.state.startDate || (this.state.startDate && this.state.endDate)) {
        this.state.startDate = pickedDate;
        this.state.endDate = null;
        this.startDate = formatDateMMDDYYYY(pickedDate);
        this.endDate = '';
      } else {
        if (pickedDate < this.state.startDate) {
          this.state.endDate = this.state.startDate;
          this.state.startDate = pickedDate;
        } else {
          this.state.endDate = pickedDate;
        }
        this.startDate = formatDateMMDDYYYY(this.state.startDate);
        this.endDate = formatDateMMDDYYYY(this.state.endDate);
      }
    } else {
      this.state.selectedDate = pickedDate;
      this.value = formatDateMMDDYYYY(pickedDate);
      const dockedInput = this.shadowRoot.querySelector('#docked-text-input');
      if (dockedInput) dockedInput.value = this.value;
    }
    this._updateUI();
    this.dispatchEvent(new CustomEvent('change', {
      detail: { date: this.state.selectedDate, startDate: this.state.startDate, endDate: this.state.endDate, value: this.value },
      bubbles: true,
      composed: true
    }));
  }

  /*
   * DateRangePicker VerticalMonthsList: weekdays stay above a vertically
   * scrolling list of months, each a Title Small subhead (24dp start, 20dp top,
   * 8dp bottom) over its grid. The list starts at the displayed month; months
   * are added in blocks as either end comes near (a lazy list over 1900-2100).
   */
  _renderMonthList(list) {
    const FIRST = 1900 * 12, LAST = 2100 * 12 + 11, BLOCK = 12;
    const block = index => {
      const year = Math.floor(index / 12), month = index % 12;
      return `<section class="month-block" data-month="${index}" aria-label="${MONTH_NAMES[month]} ${year}">
        <div class="month-subhead">${MONTH_NAMES[month]} ${year}</div>
        <div class="days-grid range-grid">${this._monthCells(year, month)}</div>
      </section>`;
    };
    if (!this._monthWindow || this._monthWindow.list !== list) {
      const anchor = this.state.startDate ?? new Date(this.state.viewYear, this.state.viewMonth, 1);
      const first = Math.min(LAST, Math.max(FIRST, anchor.getFullYear() * 12 + anchor.getMonth()));
      this._monthWindow = { list, from: Math.max(FIRST, first - BLOCK), to: Math.min(LAST, first + BLOCK) };
      let html = '';
      for (let index = this._monthWindow.from; index <= this._monthWindow.to; index++) html += block(index);
      list.innerHTML = `<div class="months-edge" data-edge="start"></div>${html}<div class="months-edge" data-edge="end"></div>`;
      // The displayed month starts at the top of the list, once the list has a size.
      const shown = list.querySelector(`[data-month="${first}"]`);
      this._monthPlacement?.disconnect();
      this._monthPlacement = new ResizeObserver(() => {
        if (!list.clientHeight || !shown) return;
        list.scrollTop = shown.offsetTop;
        this._monthPlacement.disconnect();
      });
      this._monthPlacement.observe(list);
      list.addEventListener('click', event => {
        const cell = event.target.closest?.('.day-cell:not(.empty)');
        const index = Number(cell?.closest('.month-block')?.dataset.month);
        if (!cell || !Number.isFinite(index)) return;
        this._pickDate(new Date(Math.floor(index / 12), index % 12, Number(cell.dataset.day)));
      }, { signal: this._abortController?.signal });
      this._monthEdges?.disconnect();
      this._monthEdges = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const range = this._monthWindow;
          if (entry.target.dataset.edge === 'end' && range.to < LAST) {
            const to = Math.min(LAST, range.to + BLOCK);
            let more = '';
            for (let index = range.to + 1; index <= to; index++) more += block(index);
            entry.target.insertAdjacentHTML('beforebegin', more);
            range.to = to;
          } else if (entry.target.dataset.edge === 'start' && range.from > FIRST) {
            const from = Math.max(FIRST, range.from - BLOCK), before = list.scrollHeight;
            let more = '';
            for (let index = from; index < range.from; index++) more += block(index);
            entry.target.insertAdjacentHTML('afterend', more);
            // Months already on screen keep their position.
            list.scrollTop += list.scrollHeight - before;
            range.from = from;
          }
        }
      }, { root: list, rootMargin: '600px 0px' });
      for (const edge of list.querySelectorAll('.months-edge')) this._monthEdges.observe(edge);
      return;
    }
    // Selection changed: repaint the rendered months in place.
    for (const section of list.querySelectorAll('.month-block')) {
      const index = Number(section.dataset.month);
      section.querySelector('.days-grid').innerHTML = this._monthCells(Math.floor(index / 12), index % 12);
    }
  }

  render() {
    const isDocked = this.variant === 'docked';
    const isRange = this.range;
    const isInputMode = this.state.displayMode === 'input';
    this.state.view = 'day';

    const currentFormattedValue = formatDateMMDDYYYY(this.state.selectedDate);
    const startFormattedValue = formatDateMMDDYYYY(this.state.startDate);
    const endFormattedValue = formatDateMMDDYYYY(this.state.endDate);
    const m = this.state.viewMonth, y = this.state.viewYear;

    const weekdays = `<div class="weekdays-row" aria-hidden="true"><div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div></div>`;
    const dayView = `<div class="day-view">${weekdays}<div class="days-grid${isRange ? ' range-grid' : ''}"></div></div>`;
    // DatePicker: the year picker replaces the calendar while it is open.
    const yearGrid = `<div class="year-grid" role="listbox" aria-label="Years" hidden></div>`;
    const modeToggle = `<md-icon-button class="mode-toggle" id="mode-toggle-btn" icon="${isInputMode ? 'date_range' : 'edit'}"
      aria-label="${isInputMode ? 'Switch to calendar input mode' : 'Switch to text input mode'}"></md-icon-button>`;
    const monthHeader = `
      <div class="month-header">
        <md-button class="year-menu" id="year-menu" variant="text" trailing-icon="arrow_drop_down"
          label="${MONTH_NAMES[m]} ${y}" aria-label="Switch to selecting a year"></md-button>
        <div class="month-nav">
          <md-icon-button class="nav-btn" id="prev-month" icon="chevron_left" aria-label="Change to previous month"></md-icon-button>
          <md-icon-button class="nav-btn" id="next-month" icon="chevron_right" aria-label="Change to next month"></md-icon-button>
        </div>
      </div>`;
    const actions = label => `
      <div class="actions-row">
        <md-button variant="text" id="cancel-btn" label="Cancel"></md-button>
        <md-button variant="text" id="ok-btn" label="${label}"></md-button>
      </div>`;

    let cardContentHtml = '';

    if (isDocked) {
      // Docked: an outlined field, with month and year menus above the calendar.
      cardContentHtml = `
        <div class="docked-container">
          <md-text-field class="docked-field" id="docked-text-input" variant="outlined" single-line label="Date"
            value="${currentFormattedValue}" placeholder="MM/DD/YYYY" supporting-text="MM/DD/YYYY"></md-text-field>
          <div class="docked-calendar" style="${pickerPaletteStyle(datePickerColors(),'date')}">
            <div class="docked-nav-row">
              <div class="nav-cluster">
                <md-icon-button class="nav-btn" id="prev-month" icon="chevron_left" aria-label="Change to previous month"></md-icon-button>
                <md-button class="month-menu" id="month-menu" variant="text" trailing-icon="arrow_drop_down" label="${MONTH_SHORT[m]}" aria-label="Select month"></md-button>
                <md-icon-button class="nav-btn" id="next-month" icon="chevron_right" aria-label="Change to next month"></md-icon-button>
              </div>
              <div class="nav-cluster">
                <md-icon-button class="nav-btn" id="prev-year" icon="chevron_left" aria-label="Change to previous year"></md-icon-button>
                <md-button class="year-menu" id="year-menu" variant="text" trailing-icon="arrow_drop_down" label="${y}" aria-label="Select year"></md-button>
                <md-icon-button class="nav-btn" id="next-year" icon="chevron_right" aria-label="Change to next year"></md-icon-button>
              </div>
            </div>
            <div class="calendar-views">
              ${dayView}
              <div class="option-list month-list" role="listbox" aria-label="Months" hidden></div>
              <div class="option-list year-list" role="listbox" aria-label="Years" hidden></div>
            </div>
          </div>
        </div>
      `;
    } else if (isRange) {
      const headline = isInputMode ? 'Enter dates' : (this.state.startDate && this.state.endDate
        ? `${MONTH_SHORT[this.state.startDate.getMonth()]} ${this.state.startDate.getDate()} – ${MONTH_SHORT[this.state.endDate.getMonth()]} ${this.state.endDate.getDate()}`
        : 'Start date – End date');
      cardContentHtml = `
        <div class="picker-dialog range" part="dialog" style="${pickerPaletteStyle(datePickerColors(),'date')}">
          <div class="picker-header">
            <span class="header-title">Select dates</span>
            <div class="header-row"><div class="formatted-date">${headline}</div>${modeToggle}</div>
          </div>
          <div class="divider"></div>
          ${isInputMode ? `
            <div class="range-input-pane">
              <md-text-field id="range-start-input" variant="outlined" single-line label="Start date" value="${startFormattedValue}" placeholder="mm/dd/yyyy"></md-text-field>
              <md-text-field id="range-end-input" variant="outlined" single-line label="End date" value="${endFormattedValue}" placeholder="mm/dd/yyyy"></md-text-field>
            </div>
          ` : `
            <div class="calendar-body range-body">${weekdays}<div class="months-list" role="group" aria-label="Calendar"></div></div>
          `}
          ${actions('Save')}
        </div>
      `;
    } else {
      cardContentHtml = `
        <div class="picker-dialog modal" part="dialog" style="${pickerPaletteStyle(datePickerColors(),'date')}">
          <div class="picker-header">
            <span class="header-title">Select date</span>
            <div class="header-row"><div class="formatted-date">${isInputMode ? 'Enter date' : `${DAY_NAMES[this.state.selectedDate.getDay()]}, ${MONTH_SHORT[this.state.selectedDate.getMonth()]} ${this.state.selectedDate.getDate()}`}</div>${modeToggle}</div>
          </div>
          <div class="divider"></div>
          ${isInputMode ? `
            <div class="modal-input-pane">
              <md-text-field id="docked-text-input" variant="outlined" single-line label="Date" value="${currentFormattedValue}" placeholder="mm/dd/yyyy"></md-text-field>
            </div>
          ` : `
            <div class="calendar-body">${monthHeader}<div class="calendar-views">${dayView}${yearGrid}</div></div>
          `}
          ${actions('OK')}
        </div>
      `;
    }

    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);

    if(!hasAdopted&&!this.shadowRoot.querySelector('style')){
      const style=document.createElement('style');style.textContent=defaultStyle;this.shadowRoot.prepend(style);
    }
    renderModalContent(this,this.inline?cardContentHtml:`<div class="scrim">${cardContentHtml}</div>`,{inline:this.inline,label:this.range?'Select dates':'Select date'});
  }

  /** Switches between the day grid and the year (and, docked, month) selection. */
  _setView(view) {
    const root = this.shadowRoot;
    const isDocked = this.variant === 'docked';
    this.state.view = view;
    const dayView = root.querySelector('.day-view');
    if (!dayView) return;
    dayView.hidden = view !== 'day';
    const years = root.querySelector(isDocked ? '.year-list' : '.year-grid');
    const months = root.querySelector('.month-list');
    if (years) years.hidden = view !== 'year';
    if (months) months.hidden = view !== 'month';
    const yearMenu = root.querySelector('#year-menu'), monthMenu = root.querySelector('#month-menu');
    yearMenu?.setAttribute('trailing-icon', view === 'year' ? 'arrow_drop_up' : 'arrow_drop_down');
    monthMenu?.setAttribute('trailing-icon', view === 'month' ? 'arrow_drop_up' : 'arrow_drop_down');
    yearMenu?.setAttribute('aria-expanded', String(view === 'year'));
    monthMenu?.setAttribute('aria-expanded', String(view === 'month'));
    // The modal picker hides month navigation while the year picker is shown.
    if (!isDocked) root.querySelector('.month-nav')?.toggleAttribute('hidden', view === 'year');
    if (view === 'year') this._renderYears(years, isDocked);
    if (view === 'month') this._renderMonths(months);
  }

  _renderYears(container, asList) {
    if (!container) return;
    const current = new Date().getFullYear(), selected = this.state.viewYear;
    let html = '';
    for (let year = 1900; year <= 2100; year++) {
      const cls = `${asList ? 'option' : 'year'}${year === selected ? ' selected' : ''}${year === current ? ' current' : ''}`;
      html += asList
        ? `<button class="${cls}" type="button" role="option" data-year="${year}" aria-selected="${year === selected}"><span class="option-check" aria-hidden="true">check</span><span>${year}</span></button>`
        : `<button class="${cls}" type="button" role="option" data-year="${year}" aria-selected="${year === selected}">${year}</button>`;
    }
    container.innerHTML = html;
    const chosen = container.querySelector('.selected');
    if (chosen) container.scrollTop = chosen.offsetTop - container.clientHeight / 2 + chosen.offsetHeight / 2;
    for (const button of container.querySelectorAll('button')) {
      bindPress(button, { onPress: event => createRipple(event, button), onActivate: () => {
        this.state.viewYear = Number(button.dataset.year);
        this._setView('day');
        this._updateUI();
        this.shadowRoot.querySelector('#year-menu')?.focus();
      } });
    }
    chosen?.focus({ preventScroll: true });
  }

  _renderMonths(container) {
    if (!container) return;
    container.innerHTML = MONTH_NAMES.map((name, index) => `<button class="option${index === this.state.viewMonth ? ' selected' : ''}" type="button" role="option" data-month="${index}" aria-selected="${index === this.state.viewMonth}"><span class="option-check" aria-hidden="true">check</span><span>${name}</span></button>`).join('');
    for (const button of container.querySelectorAll('button')) {
      bindPress(button, { onPress: event => createRipple(event, button), onActivate: () => {
        this.state.viewMonth = Number(button.dataset.month);
        this._setView('day');
        this._updateUI();
        this.shadowRoot.querySelector('#month-menu')?.focus();
      } });
    }
    container.querySelector('.selected')?.focus({ preventScroll: true });
  }

}

if (!customElements.get('md-date-picker')) {
  customElements.define('md-date-picker', MdDatePicker);
}
