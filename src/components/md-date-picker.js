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

  /* 1. DOCKED STYLES */
  .docked-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 328px;
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

  .docked-calendar {
    background-color: var(--md-sys-color-surface-container-high, #ECE6F0);
    border: 1px solid var(--md-sys-color-outline-variant, #CAC4D0);
    border-radius: 16px;
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: var(--md-sys-elevation-level-1, 0 1px 3px rgba(0,0,0,0.12));
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
    gap: 2px;
  }

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
    background-color: var(--md-sys-color-surface-container-high, #ECE6F0);
    color: var(--md-sys-color-on-surface, #1D1B20);
    border-radius: var(--md-sys-shape-corner-extra-large, 28px);
    padding: 24px;
    width: 328px;
    max-width: calc(100vw - 32px);
    box-shadow: var(--md-sys-elevation-level-3, 0 4px 8px 3px rgba(0,0,0,0.15));
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-sizing: border-box;
    will-change: transform;
    margin: auto;
  }

  :host([inline]) .picker-dialog {
    width: 100%;
    max-width: 328px;
    box-shadow: none;
    margin: 0 auto;
  }

  .picker-header {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-title {
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    color: var(--md-sys-color-on-surface-variant, #49454F);
    text-transform: capitalize;
  }

  .formatted-date {
    font: var(--md-sys-typescale-headline-large, 400 32px/40px Roboto Flex, sans-serif);
    letter-spacing: var(--md-sys-typescale-headline-large-tracking, 0px);
    color: var(--md-sys-color-on-surface, #1D1B20);
  }

  .icon-toggle-btn {
    border: none;
    background: transparent;
    color: var(--md-sys-color-on-surface-variant, #49454F);
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
    background-color: var(--md-sys-color-outline-variant, #CAC4D0);
    margin: 0;
  }

  .calendar-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
  }

  .month-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    padding: 0 4px;
  }

  .month-nav {
    display: flex;
    gap: 4px;
  }

  .nav-btn {
    border: none;
    background: transparent;
    color: var(--md-sys-color-on-surface-variant, #49454F);
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
    font-family: 'Material Symbols Outlined', 'Material Symbols Rounded', sans-serif;
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
    font: var(--md-sys-typescale-label-medium, 500 12px/16px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-medium-tracking, 0.5px);
    color: var(--md-sys-color-on-surface-variant, #49454F);
    height: 32px;
    align-items: center;
    justify-items: center;
    width: 100%;
    box-sizing: border-box;
  }

  .days-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px 0;
    align-items: center;
    justify-items: center;
    width: 100%;
    box-sizing: border-box;
  }

  .day-cell {
    position: relative;
    width: 100%;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    font: var(--md-sys-typescale-body-medium, 400 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-medium-tracking, 0.2px);
    border: none;
    background: transparent;
    color: var(--md-sys-color-on-surface, #1D1B20);
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
    width: 36px;
    height: 36px;
    min-width: 36px;
    min-height: 36px;
    max-width: 36px;
    max-height: 36px;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin: auto;
    line-height: 1;
    text-align: center;
    transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
    box-sizing: border-box;
  }
  .day-cell:hover:not(.empty):not(.selected):not(.in-range) .day-text {
    background-color: color-mix(in srgb, var(--md-sys-color-primary, #6750A4) 12%, transparent);
  }
  .day-cell.today .day-text {
    border: 1px solid var(--md-sys-color-primary, #6750A4);
  }
  .day-cell.selected .day-text {
    background-color: var(--md-sys-color-primary, #6750A4);
    color: var(--md-sys-color-on-primary, #FFFFFF);
    font-weight: var(--md-sys-typescale-body-medium-emphasized-weight, 500);
  }

  /* Seamless Continuous Range Selection Highlighting (1:1 AndroidX Compose DateRangePicker Parity) */
  .day-cell.in-range {
    background-color: var(--md-sys-color-secondary-container, #E8DEF8);
    color: var(--md-sys-color-on-secondary-container, #1D192B);
    border-radius: 0;
  }
  .day-cell.range-start::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    width: 50%;
    background-color: var(--md-sys-color-secondary-container, #E8DEF8);
    z-index: 1;
  }
  .day-cell.range-end::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 50%;
    background-color: var(--md-sys-color-secondary-container, #E8DEF8);
    z-index: 1;
  }
  .day-cell.range-start.range-end::before {
    display: none;
  }

  .range-input-pane, .modal-input-pane {
    display: flex;
    gap: 12px;
    padding: 12px 0;
    width: 100%;
    box-sizing: border-box;
  }
  .range-input-pane .outlined-field-wrap { flex: 1; }

  .actions-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
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
    .picker-dialog {
      width: 328px !important;
      max-width: calc(100vw - 32px) !important;
      padding: 20px 16px !important;
      border-radius: var(--md-sys-shape-corner-extra-large, 28px) !important;
      box-sizing: border-box !important;
      margin: auto !important;
    }
    .docked-container {
      width: 100% !important;
      max-width: 328px !important;
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
      const parsed = parseDateMMDDYYYY(this.value);
      if (parsed) {
        this.state.selectedDate = parsed;
        this.state.viewYear = parsed.getFullYear();
        this.state.viewMonth = parsed.getMonth();
        this._updateUI();
      }
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
      const s = parseDateMMDDYYYY(this.getAttribute('start-date'));
      if (s) this.state.startDate = s;
    }
    if (this.hasAttribute('end-date')) {
      const e = parseDateMMDDYYYY(this.getAttribute('end-date'));
      if (e) this.state.endDate = e;
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
    if (!this.inline) document.body.style.overflow = 'hidden';
  }
  close() {
    this.open = false;
    if (!this.inline) document.body.style.overflow = '';
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

    const prevBtn = this.shadowRoot.querySelector('#prev-month');
    const nextBtn = this.shadowRoot.querySelector('#next-month');
    if (prevBtn && nextBtn) {
      prevBtn.addEventListener('click', () => {
        this.state.viewMonth--;
        if (this.state.viewMonth < 0) {
          this.state.viewMonth = 11;
          this.state.viewYear--;
        }
        this._updateUI();
      }, { signal });
      nextBtn.addEventListener('click', () => {
        this.state.viewMonth++;
        if (this.state.viewMonth > 11) {
          this.state.viewMonth = 0;
          this.state.viewYear++;
        }
        this._updateUI();
      }, { signal });
    }

    const modeToggle = this.shadowRoot.querySelector('#mode-toggle-btn');
    if (modeToggle) {
      modeToggle.addEventListener('click', () => {
        this.state.displayMode = this.state.displayMode === 'picker' ? 'input' : 'picker';
        this.render();
        this._setup();
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
      });
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
      });
      rangeEndInput.addEventListener('input', (e) => {
        const endD = parseDateMMDDYYYY(e.target.value);
        if (endD) {
          this.state.endDate = endD;
          this.endDate = formatDateMMDDYYYY(endD);
          this._updateHeader();
        }
      });
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
        headerEl.textContent = 'Select range';
      }
    } else {
      const sel = this.state.selectedDate;
      headerEl.textContent = `${DAY_NAMES[sel.getDay()]}, ${MONTH_SHORT[sel.getMonth()]} ${sel.getDate()}`;
    }
  }

  _updateCalendarGrid() {
    const monthLabelEl = this.shadowRoot.querySelector('.month-label');
    if (monthLabelEl) {
      if (this.variant === 'docked') {
        monthLabelEl.textContent = `${MONTH_SHORT[this.state.viewMonth]}`;
        const yearLabelEl = this.shadowRoot.querySelector('.year-label');
        if (yearLabelEl) yearLabelEl.textContent = `${this.state.viewYear}`;
      } else {
        monthLabelEl.textContent = `${MONTH_NAMES[this.state.viewMonth]} ${this.state.viewYear}`;
      }
    }

    const daysGrid = this.shadowRoot.querySelector('.days-grid');
    if (!daysGrid) return;

    const isRange = this.range;
    const firstDayIndex = new Date(this.state.viewYear, this.state.viewMonth, 1).getDay();
    const daysInMonth = new Date(this.state.viewYear, this.state.viewMonth + 1, 0).getDate();
    const today = new Date();

    const startTime = this.state.startDate ? new Date(this.state.startDate.getFullYear(), this.state.startDate.getMonth(), this.state.startDate.getDate()).getTime() : null;
    const endTime = this.state.endDate ? new Date(this.state.endDate.getFullYear(), this.state.endDate.getMonth(), this.state.endDate.getDate()).getTime() : null;

    let gridHtml = '';
    for (let i = 0; i < firstDayIndex; i++) {
      gridHtml += `<div class="day-cell empty"></div>`;
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const currentCellDate = new Date(this.state.viewYear, this.state.viewMonth, day);
      const currentTime = currentCellDate.getTime();

      const isToday =
        today.getFullYear() === this.state.viewYear &&
        today.getMonth() === this.state.viewMonth &&
        today.getDate() === day;

      let cellClasses = 'day-cell';
      if (isToday) cellClasses += ' today';

      if (isRange) {
        const isStart = startTime && currentTime === startTime;
        const isEnd = endTime && currentTime === endTime;
        const inRange = startTime && endTime && currentTime > startTime && currentTime < endTime;

        if (isStart) cellClasses += ' range-start selected';
        else if (isEnd) cellClasses += ' range-end selected';
        else if (inRange) cellClasses += ' in-range';
      } else {
        const isSelected =
          this.state.selectedDate.getFullYear() === this.state.viewYear &&
          this.state.selectedDate.getMonth() === this.state.viewMonth &&
          this.state.selectedDate.getDate() === day;
        if (isSelected) cellClasses += ' selected';
      }

      gridHtml += `
        <button class="${cellClasses}" data-day="${day}" tabindex="0" type="button" aria-label="${day} ${MONTH_NAMES[this.state.viewMonth]} ${this.state.viewYear}">
          <span class="day-text">${day}</span>
        </button>
      `;
    }
    daysGrid.innerHTML = gridHtml;

    const dayCells = daysGrid.querySelectorAll('.day-cell:not(.empty)');
    dayCells.forEach((cell) => {
      cell.addEventListener('click', () => {
        const dayNum = parseInt(cell.getAttribute('data-day'), 10);
        const pickedDate = new Date(this.state.viewYear, this.state.viewMonth, dayNum);

        if (isRange) {
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

          // Update docked textfield if present
          const dockedInput = this.shadowRoot.querySelector('#docked-text-input');
          if (dockedInput) dockedInput.value = this.value;
        }

        this._updateUI();
        this.dispatchEvent(new CustomEvent('change', {
          detail: {
            date: this.state.selectedDate,
            startDate: this.state.startDate,
            endDate: this.state.endDate,
            value: this.value
          },
          bubbles: true,
          composed: true
        }));
      });
    });
  }

  render() {
    const isDocked = this.variant === 'docked';
    const isRange = this.range;
    const isInputMode = this.state.displayMode === 'input';

    const currentFormattedValue = formatDateMMDDYYYY(this.state.selectedDate);
    const startFormattedValue = formatDateMMDDYYYY(this.state.startDate);
    const endFormattedValue = formatDateMMDDYYYY(this.state.endDate);

    let cardContentHtml = '';

    if (isDocked) {
      // 1. DOCKED DATE PICKER (Outlined input field at top + attached docked calendar)
      cardContentHtml = `
        <div class="docked-container">
          <div class="outlined-field-wrap">
            <label class="field-label">Date</label>
            <input type="text" id="docked-text-input" class="outlined-input" value="${currentFormattedValue}" placeholder="MM/DD/YYYY" />
            <span class="helper-text">MM/DD/YYYY</span>
          </div>

          <div class="docked-calendar">
            <div class="docked-nav-row">
              <div class="nav-cluster">
                <button class="nav-btn" id="prev-month" type="button" aria-label="Previous month"><span class="ico">chevron_left</span></button>
                <button class="dropdown-pill-btn" type="button"><span class="month-label">${MONTH_SHORT[this.state.viewMonth]}</span> <span class="ico arrow">arrow_drop_down</span></button>
                <button class="nav-btn" id="next-month" type="button" aria-label="Next month"><span class="ico">chevron_right</span></button>
              </div>
              <div class="nav-cluster">
                <button class="dropdown-pill-btn" type="button"><span class="year-label">${this.state.viewYear}</span> <span class="ico arrow">arrow_drop_down</span></button>
              </div>
            </div>

            <div class="weekdays-row">
              <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
            </div>

            <div class="days-grid"></div>
          </div>
        </div>
      `;
    } else if (isRange) {
      // 3. DATE RANGE PICKER (Modal Range / Input)
      cardContentHtml = `
        <div class="picker-dialog range" part="dialog">
          <div class="picker-header">
            <div class="header-top">
              <span class="header-title">Select date</span>
              <button class="icon-toggle-btn" id="mode-toggle-btn" type="button" aria-label="Toggle input mode">
                <span class="ico">${isInputMode ? 'calendar_month' : 'edit'}</span>
              </button>
            </div>
            <div class="formatted-date">${isInputMode ? 'Enter dates' : (this.state.startDate && this.state.endDate ? `${MONTH_SHORT[this.state.startDate.getMonth()]} ${this.state.startDate.getDate()} – ${MONTH_SHORT[this.state.endDate.getMonth()]} ${this.state.endDate.getDate()}` : 'Select range')}</div>
          </div>

          <div class="divider"></div>

          ${isInputMode ? `
            <div class="range-input-pane">
              <div class="outlined-field-wrap">
                <label class="field-label">Date</label>
                <input type="text" id="range-start-input" class="outlined-input" value="${startFormattedValue}" placeholder="mm/dd/yyyy" />
              </div>
              <div class="outlined-field-wrap">
                <label class="field-label">End date</label>
                <input type="text" id="range-end-input" class="outlined-input" value="${endFormattedValue}" placeholder="mm/dd/yyyy" />
              </div>
            </div>
          ` : `
            <div class="calendar-body">
              <div class="month-header">
                <button class="dropdown-pill-btn" type="button">
                  <span class="month-label">${MONTH_NAMES[this.state.viewMonth]} ${this.state.viewYear}</span>
                  <span class="ico arrow">arrow_drop_down</span>
                </button>
                <div class="month-nav">
                  <button class="nav-btn" id="prev-month" type="button" aria-label="Previous month"><span class="ico">chevron_left</span></button>
                  <button class="nav-btn" id="next-month" type="button" aria-label="Next month"><span class="ico">chevron_right</span></button>
                </div>
              </div>

              <div class="weekdays-row">
                <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
              </div>

              <div class="days-grid range-grid"></div>
            </div>
          `}

          <div class="actions-row">
            <button class="text-btn" id="cancel-btn" type="button">Cancel</button>
            <button class="text-btn primary" id="ok-btn" type="button">Save</button>
          </div>
        </div>
      `;
    } else {
      // 2. MODAL DATE PICKER (Full Calendar Dialog)
      cardContentHtml = `
        <div class="picker-dialog modal" part="dialog">
          <div class="picker-header">
            <div class="header-top">
              <span class="header-title">Select date</span>
              <button class="icon-toggle-btn" id="mode-toggle-btn" type="button" aria-label="Toggle input mode">
                <span class="ico">${isInputMode ? 'calendar_month' : 'edit'}</span>
              </button>
            </div>
            <div class="formatted-date">${DAY_NAMES[this.state.selectedDate.getDay()]}, ${MONTH_SHORT[this.state.selectedDate.getMonth()]} ${this.state.selectedDate.getDate()}</div>
          </div>

          <div class="divider"></div>

          ${isInputMode ? `
            <div class="modal-input-pane">
              <div class="outlined-field-wrap">
                <label class="field-label">Date</label>
                <input type="text" id="docked-text-input" class="outlined-input" value="${currentFormattedValue}" placeholder="MM/DD/YYYY" />
                <span class="helper-text">MM/DD/YYYY</span>
              </div>
            </div>
          ` : `
            <div class="calendar-body">
              <div class="month-header">
                <button class="dropdown-pill-btn" type="button">
                  <span class="month-label">${MONTH_NAMES[this.state.viewMonth]} ${this.state.viewYear}</span>
                  <span class="ico arrow">arrow_drop_down</span>
                </button>
                <div class="month-nav">
                  <button class="nav-btn" id="prev-month" type="button" aria-label="Previous month"><span class="ico">chevron_left</span></button>
                  <button class="nav-btn" id="next-month" type="button" aria-label="Next month"><span class="ico">chevron_right</span></button>
                </div>
              </div>

              <div class="weekdays-row">
                <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
              </div>

              <div class="days-grid"></div>
            </div>
          `}

          <div class="actions-row">
            <button class="text-btn" id="cancel-btn" type="button">Cancel</button>
            <button class="text-btn primary" id="ok-btn" type="button">OK</button>
          </div>
        </div>
      `;
    }

    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);

    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      ${this.inline ? cardContentHtml : `<div class="scrim" role="dialog" aria-modal="true">${cardContentHtml}</div>`}
    `;
  }
}

if (!customElements.get('md-date-picker')) {
  customElements.define('md-date-picker', MdDatePicker);
}
