import {FrameResizeObserver} from '../utils/resize-observer.js';
/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-date-picker>
 *
 * Spec: research/DATE-PICKER-SOURCES.md & AndroidX Compose DatePicker / DateRangePicker / DatePickerDialog
 *   3 Official Types:
 *   1. Docked: Inline Outlined text field (the locale's input pattern) with attached docked calendar grid.
 *   2. Modal: Standalone/dialog calendar with "Select date" subhead, yMMMd headline,
 *             month-year dropdown, circular selection, mode toggle, and Cancel/OK actions.
 *   3. Range: Date range picker with "Select dates" / "Enter dates" title, "start - end" headline,
 *             dual input fields or continuous range highlight track, and Cancel/Save actions.
 *
 * Locale (date-locale.js, CalendarModel / DatePickerFormatter / DateInput at a095da93):
 *   the locale attribute, else the nearest [lang], else navigator.language. Weekday order and
 *   leading cells follow WeekFields.firstDayOfWeek; headlines, month labels and day descriptions
 *   use the yMMMd / yMMMM / yMMMMEEEEd skeletons; date input takes digits only, draws the SHORT
 *   pattern's delimiters, resolves days SMART and reports the Material3 validator strings.
 *   The value / start-date / end-date attributes stay MM/DD/YYYY or ISO.
 *
 * DatePickerState yearRange and selectableDates: `year-range` ("1900..2100",
 * DatePickerDefaults.YearRange) bounds the months, years, arrows and input,
 * and a selection outside it is no selection. `selectableDates` takes
 * isSelectableDate(utcTimeMillis) and isSelectableYear(year): a day is enabled
 * when both allow it, a year when isSelectableYear does; the input reports
 * "Date not allowed". Disabled days are skipped by the arrow keys, as focus
 * search skips Compose's disabled day cells.
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
import {bindStateLayer} from '../motion/state-layer.js';
import {SpringValue} from '../motion/selection-motion.js';
import {SpringPhysics} from '../motion/spring-physics.js';
import {resolveLocale,formatWithSkeleton,toLocalString,orderedWeekdays,daysFromStartOfWeek,firstDayOfWeek,monthNames,dateInputFormat,formatInputDigits,withDelimiters,parseInputDigits,asciiDigits,YEAR_MONTH_SKELETON,YEAR_ABBR_MONTH_DAY_SKELETON,YEAR_MONTH_WEEKDAY_DAY_SKELETON,YEAR_RANGE} from './date-locale.js';

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
    gap: 0;
  }

  .nav-cluster {
    display: flex;
    align-items: center;
    flex: 0 1 auto;
    min-width: 0;
    gap: 0;
  }
  /* Month and year menus keep their label on one line between the arrows and
     shorten it (ellipsis) before the row would overflow. */
  .nav-cluster .menu-button { flex: 0 1 auto; }


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

  /* DatePickerDefaults: title padding 16/12/24, headline row with the mode
     toggle. HeaderContainerHeight (120dp) includes the 1dp divider that
     DateEntryContainer composes inside the header. */
  .picker-header {
    min-height: 119px;
    padding: 16px 12px 12px 24px;
    justify-content: space-between;
    box-sizing: border-box;
  }
  .header-row { display: flex; align-items: center; justify-content: space-between; }
  /* DatePickerHeadline: weight(1f), 12dp end padding, maxLines = 1. */
  .picker-dialog.modal .formatted-date { flex: 1 1 auto; min-width: 0; padding-inline-end: 12px; white-space: nowrap; overflow: hidden; }
  .mode-toggle, .nav-btn { --md-icon-button-content-color: var(--date-navigation-content-color); }
  /* The docked rows lay icon buttons out at their 40dp size (the 48dp target stays). */
  .docked-nav-row .nav-btn { --md-minimum-interactive-component-size: 0px; }
  .calendar-views { position: relative; }
  /* The month list's layers stay under the year picker drawn after it. */
  .day-view { isolation: isolate; }
  .day-view[hidden], .year-pane[hidden], .option-list[hidden], .month-nav[hidden] { display: none; }
  /* YearPickerMenuButton: a TextButton with CircleShape (no shape morph): the
     LabelLarge text, 8dp IconSpacing and a 24dp ArrowDropDown turned 180deg
     while the year picker is open; 48dp minimum interactive height. */
  .menu-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex: none;
    box-sizing: border-box;
    min-width: 58px;
    min-height: 40px;
    max-width: 100%;
    margin: 4px 0;
    padding: 8px 12px;
    border: 0;
    border-radius: 9999px;
    background: transparent;
    color: var(--date-navigation-content-color);
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    cursor: pointer;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }
  .menu-button::before { content: ''; position: absolute; inset: 0; border-radius: inherit; background: currentColor; opacity: var(--_state-alpha, 0); pointer-events: none; }
  .menu-button::after { content: ''; position: absolute; inset: -4px 0; }
  .menu-button:focus-visible { outline: 3px solid var(--md-sys-color-secondary, #625B71); outline-offset: 2px; }
  .menu-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ico.menu-arrow { flex: none; width: 24px; height: 24px; font-size: 24px; }
  .menu-button[aria-expanded="true"] .menu-arrow { transform: rotate(180deg); }
  /* YearPicker, drawn over the month list in an AnimatedVisibility clipped to
     its bounds: 48dp x 7 rows less the 1dp divider under it, full width with
     12dp padding, three 72x36dp years per row spaced 16dp, selected Primary,
     current year outlined. */
  .year-pane {
    position: absolute;
    top: 0;
    left: -12px;
    right: -12px;
    height: 0;
    overflow: hidden;
    background: var(--date-container-color);
  }
  .year-pane-content { height: 336px; }
  .year-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    align-content: start;
    justify-items: center;
    row-gap: 16px;
    height: 335px;
    padding: 0 12px;
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
  /* yearContentColor: a disabled year (even the current one) uses the disabled roles. */
  .year:disabled { color: var(--date-disabled-year-content-color); cursor: default; }
  .year.selected:disabled { background: var(--date-disabled-selected-year-container-color); color: var(--date-disabled-selected-year-content-color); }
  .option:disabled { color: var(--date-disabled-year-content-color); cursor: default; }
  .day-cell:disabled { cursor: default; }
  /* CommonRippleNode state layer (hover/focus); presses draw only the ripple. */
  .year::before, .option::before { content: ''; position: absolute; inset: 0; background: currentColor; opacity: var(--_state-alpha, 0); pointer-events: none; }
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
  /* The X and Save row the DateRangePicker header leaves room for
     (HeaderHeightOffset); DateRangePickerSample draws it above the picker. */
  .range-top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    flex: none;
  }
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

  /* MonthsNavigation: a 56dp row, the menu button at the start and the two
     IconButtons (40dp in 48dp) side by side at the end. */
  .month-header {
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0;
  }

  .month-nav {
    display: flex;
  }


  .ico {
    font-family: var(--md-icon-font-family, 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif);
    font-size: 22px;
    line-height: 1;
    display: inline-block;
    white-space: nowrap;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24;
  }

  .weekdays-row {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
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
    grid-template-columns: repeat(7, minmax(0, 1fr));
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
    height: auto;
    /* Keep the 40dp indicator at the native width; a constrained web pane
       may have less than 40dp per column. The row's touch height stays 48dp. */
    min-width: 0;
    min-height: 0;
    max-width: 40px;
    max-height: 40px;
    aspect-ratio: 1 / 1;
    flex-shrink: 1;
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
  .day-cell:focus-visible:not(.selected):not(.in-range) .day-text {
    background-color: color-mix(in srgb, var(--date-day-content) calc(var(--md-sys-state-focus-state-layer-opacity, .1) * 100%), transparent);
  }
  .day-cell:focus-visible .day-text {
    outline: 3px solid var(--md-sys-color-secondary, #625B71);
    outline-offset: 2px;
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
  /* DateRangePickerHeadline: start, "-" and end in a Row spaced by 4dp. */
  .formatted-date.range-headline { display: flex; gap: 4px; }
  .formatted-date > span { white-space: nowrap; }
  .month-subhead {
    padding: 20px 0 8px 24px;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    font: var(--md-sys-typescale-title-small, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-title-small-tracking, 0.1px);
  }
  .months-edge { height: 1px; }
  /* Like the source's lazy month list, months outside the list's viewport are
     not drawn (each keeps its 336dp: 48dp subhead and six 48dp week rows). */
  .month-block { content-visibility: auto; contain-intrinsic-size: auto 336px; }

  /* DateInputContent / DateRangeInputContent: InputTextFieldPadding (24dp at
     the sides, 10dp above), range fields 8dp apart (TextFieldSpacing). Each
     field keeps its supporting line (16dp) and 16dp below it; an error message
     takes 20dp and leaves 12dp, so the height does not change. */
  .range-input-pane, .modal-input-pane {
    display: flex;
    gap: 8px;
    padding: 10px 24px 0;
    width: 100%;
    box-sizing: border-box;
  }
  .range-input-pane md-text-field, .modal-input-pane md-text-field { flex: 1; min-width: 0; margin-bottom: 32px; }
  .range-input-pane md-text-field[error], .modal-input-pane md-text-field[error] { margin-bottom: 12px; }

  /* DatePickerDialog: buttons 8dp apart, padded 8dp from the bottom and 6dp from the end. */
  .actions-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 0 6px 8px 0;
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

// Material3 Strings used by DatePicker, DateRangePicker and DateInput.
const STRINGS = {
  datePickerHeadline: 'Selected date', dateInputHeadline: 'Entered date',
  datePickerHeadlineDescription: 'Current selection: %1$s', dateInputHeadlineDescription: 'Entered date: %1$s',
  noSelection: 'None', today: 'Today', startHeadline: 'Start date', endHeadline: 'End date', inRange: 'In range',
  dateInputLabel: 'Date', invalidForPattern: 'Date does not match expected pattern: %1$s',
  invalidYearRange: 'Date out of expected year range %1$s - %2$s', invalidRange: 'Invalid date range input',
  invalidNotAllowed: 'Date not allowed: %1$s',
  switchToYearSelection: 'Activate to change the year', switchToDaySelection: 'Activate to change month and date',
  navigateToYear: 'Navigate to year %1$s', yearPickerPaneTitle: 'Year picker visible',
};
const formatString = (template, ...args) => args.reduce((text, arg, i) => text.replace(`%${i + 1}$s`, arg), template);
// YearPicker: RecommendedSizeForAccessibility * (MaxCalendarRows + 1), the
// last 1dp being the divider under the grid; YearsInRow; 36dp years spaced 16dp.
const YEAR_PANE_HEIGHT = 48 * 7, YEARS_IN_ROW = 3, YEAR_ROW_PITCH = 36 + 16;
const escapeText = text => String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function formatDateMMDDYYYY(d) {
  if (!d || isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = String(d.getFullYear()).padStart(4, '0');
  return `${mm}/${dd}/${yyyy}`;
}

function parseDateMMDDYYYY(str) {
  const iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(str||'');
  const us=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str||'');
  if(!iso&&!us)return null;
  const [year,month,day]=iso?iso.slice(1).map(Number):[Number(us[3]),Number(us[1]),Number(us[2])];
  const date=new Date(0);date.setHours(0,0,0,0);date.setFullYear(year,month-1,day);
  return year>=1&&date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day?date:null;
}

export class MdDatePicker extends HTMLElement {
  static get observedAttributes() {
    return ['open', 'variant', 'value', 'range', 'start-date', 'end-date', 'show-mode-toggle', 'inline', 'date-formatter', 'locale', 'year-range'];
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
    this._disposeYearMotion();
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
    if (name === 'value') {
      const parsed = this._withinYears(parseDateMMDDYYYY(newVal));
      this.state.selectedDate = parsed;
      if (parsed) {
        this.state.viewYear = parsed.getFullYear();
        this.state.viewMonth = parsed.getMonth();
      }
      this._updateUI();
    }
    if(name === 'start-date' || name === 'end-date'){
      this.state[name === 'start-date'?'startDate':'endDate']=this._withinYears(parseDateMMDDYYYY(newVal));
      this._updateUI();
    }
    if (name === 'year-range') {
      for (const key of ['selectedDate', 'startDate', 'endDate']) this.state[key] = this._withinYears(this.state[key]);
      this._clampView();
      this.render();
      this._setup();
      this._sync();
      return;
    }
    if (name === 'variant' || name === 'inline' || name === 'range' || name === 'locale') {
      this.render();
      this._setup();
      this._sync();
    }
  }

  _parseInitialAttributes() {
    if (this.hasAttribute('value')) {
      const parsed = this._withinYears(parseDateMMDDYYYY(this.getAttribute('value')));
      this.state.selectedDate = parsed;
      if (parsed) {
        this.state.selectedDate = parsed;
        this.state.viewYear = parsed.getFullYear();
        this.state.viewMonth = parsed.getMonth();
      }
    }
    if (this.hasAttribute('start-date')) {
      this.state.startDate = this._withinYears(parseDateMMDDYYYY(this.getAttribute('start-date')));
      // DateRangePicker initially displays the month of the selected start date.
      if (this.state.startDate && !this.hasAttribute('value')) {
        this.state.viewYear = this.state.startDate.getFullYear();
        this.state.viewMonth = this.state.startDate.getMonth();
      }
    }
    if (this.hasAttribute('end-date')) {
      this.state.endDate = this._withinYears(parseDateMMDDYYYY(this.getAttribute('end-date')));
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

  get value() { return this.hasAttribute('value') ? formatDateMMDDYYYY(parseDateMMDDYYYY(this.getAttribute('value'))) : formatDateMMDDYYYY(this.state.selectedDate); }
  set value(v) { this.setAttribute('value', formatDateMMDDYYYY(parseDateMMDDYYYY(v))); }

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
        if (prevBtn.disabled) return;
        if (this.state.view !== 'day') this._setView('day');
        this.state.viewMonth--;
        if (this.state.viewMonth < 0) {
          this.state.viewMonth = 11;
          this.state.viewYear--;
        }
        this._updateUI();
      }, { signal });
      nextBtn.addEventListener('click', () => {
        if (nextBtn.disabled) return;
        if (this.state.view !== 'day') this._setView('day');
        this.state.viewMonth++;
        if (this.state.viewMonth > 11) {
          this.state.viewMonth = 0;
          this.state.viewYear++;
        }
        this._updateUI();
      }, { signal });
    }

    this.shadowRoot.addEventListener('keydown', event => {
      this._onDayKey(event);
      if (!event.defaultPrevented) this._onOptionKey(event);
    }, { signal });

    // The menu buttons' Surface: state layer and ripple.
    for (const button of this.shadowRoot.querySelectorAll('.menu-button')) {
      bindStateLayer(button, { property: '--_state-alpha', signal });
      bindPress(button, { signal, onPress: event => createRipple(event, button) });
    }
    const yearMenu = this.shadowRoot.querySelector('#year-menu');
    yearMenu?.addEventListener('click', () => this._setView(this.state.view === 'year' ? 'day' : 'year'), { signal });
    this.shadowRoot.querySelector('#month-menu')?.addEventListener('click', () => this._setView(this.state.view === 'month' ? 'day' : 'month'), { signal });
    for (const [id, step] of [['#prev-year', -1], ['#next-year', 1]]) {
      this.shadowRoot.querySelector(id)?.addEventListener('click', () => {
        const [first, last] = this.yearRange;
        this.state.viewYear = Math.min(last, Math.max(first, this.state.viewYear + step));
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

    // DateInputTextField: digits only, the locale's delimiters drawn between them.
    const dockedInput = this.shadowRoot.querySelector('#docked-text-input');
    if (dockedInput) {
      this._bindDateInput(dockedInput, 'single', date => {
        this.state.selectedDate = date;
        if (date) {
          this.state.viewYear = date.getFullYear();
          this.state.viewMonth = date.getMonth();
          this.value = formatDateMMDDYYYY(date);
        }
        this._updateUI();
      }, signal);
    }
    const rangeStartInput = this.shadowRoot.querySelector('#range-start-input');
    const rangeEndInput = this.shadowRoot.querySelector('#range-end-input');
    if (rangeStartInput && rangeEndInput) {
      this._bindDateInput(rangeStartInput, 'start', date => {
        this.state.startDate = date;
        if (date) this.startDate = formatDateMMDDYYYY(date);
        this._updateHeader();
      }, signal);
      this._bindDateInput(rangeEndInput, 'end', date => {
        this.state.endDate = date;
        if (date) this.endDate = formatDateMMDDYYYY(date);
        this._updateHeader();
      }, signal);
    }

    this._updateUI();
  }

  _updateUI() {
    this._updateHeader();
    this._updateCalendarGrid();
  }

  /** CalendarLocale: the locale attribute, the nearest lang, else the browser's. */
  /** DatePickerState.yearRange as [first, last]; the `year-range` attribute is "first..last". */
  get yearRange() {
    const match = /^\s*(-?\d+)\s*\.\.\s*(-?\d+)\s*$/.exec(this.getAttribute('year-range') ?? '');
    const first = match ? Number(match[1]) : NaN, last = match ? Number(match[2]) : NaN;
    return Number.isInteger(first) && Number.isInteger(last) && first >= 1 && last <= 9999 && first <= last ? [first, last] : [...YEAR_RANGE];
  }
  set yearRange(value) {
    if (value == null) this.removeAttribute('year-range');
    else this.setAttribute('year-range', Array.isArray(value) ? `${value[0]}..${value[1]}` : String(value));
  }
  /** SelectableDates: { isSelectableDate(utcTimeMillis), isSelectableYear(year) }, either optional. */
  get selectableDates() { return this._selectableDates ?? null; }
  set selectableDates(value) {
    this._selectableDates = value && typeof value === 'object' ? value : null;
    if (this._rendered) { this.render(); this._setup(); this._sync(); }
  }
  _yearAllowed(year) {
    const [first, last] = this.yearRange, fn = this._selectableDates?.isSelectableYear;
    return year >= first && year <= last && (typeof fn !== 'function' || fn.call(this._selectableDates, year) !== false);
  }
  /** isSelectableYear(year) && isSelectableDate(the day's UTC midnight), within the year range. */
  _dateAllowed(date) {
    if (!date || !this._yearAllowed(date.getFullYear())) return false;
    const fn = this._selectableDates?.isSelectableDate;
    if (typeof fn !== 'function') return true;
    const utc = new Date(0);
    utc.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    utc.setUTCHours(0, 0, 0, 0);
    return fn.call(this._selectableDates, utc.getTime()) !== false;
  }
  _withinYears(date) {
    const [first, last] = this.yearRange;
    return date && date.getFullYear() >= first && date.getFullYear() <= last ? date : null;
  }
  /** The displayed month stays inside the year range. */
  _clampView() {
    const [first, last] = this.yearRange;
    if (this.state.viewYear < first) { this.state.viewYear = first; this.state.viewMonth = 0; }
    if (this.state.viewYear > last) { this.state.viewYear = last; this.state.viewMonth = 11; }
  }
  get locale() { return resolveLocale(this); }
  set locale(value) { if (value) this.setAttribute('locale', value); else this.removeAttribute('locale'); }

  /** DateInputTransformation, DateOutputTransformation and DateInputValidator. */
  _bindDateInput(field, identifier, commit, signal) {
    const format = dateInputFormat(this.locale), length = format.patternWithoutDelimiters.length;
    const pattern = format.patternWithDelimiters.toUpperCase();
    let digits = asciiDigits(field.value || '').replaceAll(format.delimiter, '');
    field.addEventListener('input', () => {
      const typed = asciiDigits(field.value || '').replaceAll(format.delimiter, '');
      // Anything but digits, or more digits than the pattern, reverts the edit.
      if (typed.length > length || !/^\d*$/.test(typed)) { field.value = withDelimiters(digits, format); return; }
      digits = typed;
      const shown = withDelimiters(digits, format);
      if (field.value !== shown) field.value = shown;
      let error = '', date = null;
      if (digits.length === length) {
        date = parseInputDigits(digits, format);
        error = this._validateInput(date, identifier, pattern);
      }
      field.toggleAttribute('error', !!error);
      if (error) field.setAttribute('error-text', error); else field.removeAttribute('error-text');
      commit(error ? null : date);
    }, { signal });
  }

  _validateInput(date, identifier, pattern) {
    const locale = this.locale;
    if (!date) return formatString(STRINGS.invalidForPattern, pattern);
    const [first, last] = this.yearRange;
    if (date.getFullYear() < first || date.getFullYear() > last) {
      return formatString(STRINGS.invalidYearRange, toLocalString(first, locale), toLocalString(last, locale));
    }
    if (!this._dateAllowed(date)) return formatString(STRINGS.invalidNotAllowed, formatWithSkeleton(date, YEAR_ABBR_MONTH_DAY_SKELETON, locale));
    if ((identifier === 'start' && this.state.endDate && date > this.state.endDate) ||
        (identifier === 'end' && this.state.startDate && date < this.state.startDate)) return STRINGS.invalidRange;
    return '';
  }

  /** DatePickerHeadline / DateRangePickerHeadline text and semantics. */
  _headline() {
    const locale = this.locale, input = this.state.displayMode === 'input';
    const short = date => formatWithSkeleton(date, YEAR_ABBR_MONTH_DAY_SKELETON, locale);
    const verbose = date => formatWithSkeleton(date, YEAR_MONTH_WEEKDAY_DAY_SKELETON, locale) ?? STRINGS.noSelection;
    if (this.range) {
      const start = this.state.startDate, end = this.state.endDate;
      return {
        parts: [short(start) ?? STRINGS.startHeadline, '-', short(end) ?? STRINGS.endHeadline],
        description: `${STRINGS.startHeadline}: ${verbose(start)}, ${STRINGS.endHeadline}: ${verbose(end)}`,
      };
    }
    const date = this.state.selectedDate;
    return {
      parts: [short(date) ?? (input ? STRINGS.dateInputHeadline : STRINGS.datePickerHeadline)],
      description: formatString(input ? STRINGS.dateInputHeadlineDescription : STRINGS.datePickerHeadlineDescription, verbose(date)),
    };
  }

  _updateHeader() {
    const headerEl = this.shadowRoot.querySelector('.formatted-date');
    if (!headerEl) return;
    const { parts, description } = this._headline();
    // The range headline is a Row spaced by 4dp: start, "-", end.
    headerEl.replaceChildren(...parts.map(text => Object.assign(document.createElement('span'), { textContent: text })));
    headerEl.setAttribute('aria-label', description);
  }

  _updateCalendarGrid() {
    this._clampView();
    const [first, last] = this.yearRange, index = this.state.viewYear * 12 + this.state.viewMonth;
    for (const [id, disabled] of [['#prev-month', index <= first * 12], ['#next-month', index >= last * 12 + 11], ['#prev-year', this.state.viewYear <= first], ['#next-year', this.state.viewYear >= last]]) {
      const button = this.shadowRoot.querySelector(id);
      if (button) button.disabled = disabled;
    }
    const yearMenu = this.shadowRoot.querySelector('#year-menu');
    const monthMenu = this.shadowRoot.querySelector('#month-menu');
    const locale = this.locale;
    if (this.variant === 'docked') {
      this._labelMenu(monthMenu, monthNames(locale, 'short')[this.state.viewMonth]);
      this._labelMenu(yearMenu, toLocalString(this.state.viewYear, locale));
    } else {
      this._labelMenu(yearMenu, formatWithSkeleton(new Date(this.state.viewYear, this.state.viewMonth, 1), YEAR_MONTH_SKELETON, locale));
    }

    const monthsList = this.shadowRoot.querySelector('.months-list');
    if (monthsList) { this._renderMonthList(monthsList); return; }
    const daysGrid = this.shadowRoot.querySelector('.days-grid');
    if (!daysGrid) return;
    const refocus = this._dayFocused();
    daysGrid.innerHTML = this._monthCells(this.state.viewYear, this.state.viewMonth);
    for (const cell of daysGrid.querySelectorAll('.day-cell:not(.empty):not(:disabled)')) {
      cell.addEventListener('click', () => this._pickDate(new Date(this.state.viewYear, this.state.viewMonth, Number(cell.dataset.day))));
    }
    this._syncDayTabStop(refocus);
  }

  /*
   * Keyboard focus: the days are one tab stop (the last focused day, else the
   * selected date, else today, else the first of the month), and the arrow keys
   * move between days as directional focus search moves between Compose's day
   * cells. Home and End go to the week's ends, Page Up and Page Down a month,
   * with Shift a year.
   */
  _dayFocused() {
    return !!this.shadowRoot.activeElement?.classList?.contains('day-cell');
  }

  /** The rendered day cell for a date, if the day view shows its month. */
  _dayCell(date) {
    const list = this.shadowRoot.querySelector('.months-list');
    if (list) return list.querySelector(`[data-month="${date.getFullYear() * 12 + date.getMonth()}"] [data-day="${date.getDate()}"]`);
    if (date.getFullYear() !== this.state.viewYear || date.getMonth() !== this.state.viewMonth) return null;
    return this.shadowRoot.querySelector(`.days-grid [data-day="${date.getDate()}"]`);
  }

  _syncDayTabStop(refocus) {
    const candidates = [this._focusDate, this.range ? this.state.startDate : this.state.selectedDate, new Date(), new Date(this.state.viewYear, this.state.viewMonth, 1)];
    let cell = null;
    for (const date of candidates) if (date && (cell = this._dayCell(date)) && !cell.disabled) break; else cell = null;
    cell ??= this.shadowRoot.querySelector('.day-cell:not(.empty):not(:disabled)');
    for (const other of this.shadowRoot.querySelectorAll('.day-cell[tabindex="0"]')) if (other !== cell) other.tabIndex = -1;
    if (!cell) return;
    cell.tabIndex = 0;
    if (refocus) cell.focus();
  }

  _onDayKey(event) {
    const cell = event.target.closest?.('.day-cell:not(.empty)');
    if (!cell || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = Number(cell.closest('.month-block')?.dataset.month ?? this.state.viewYear * 12 + this.state.viewMonth);
    const year = Math.floor(index / 12), month = index % 12, day = Number(cell.dataset.day);
    // Days since the locale's first day of the week.
    const weekday = (((new Date(year, month, day).getDay() + 6) % 7) + 1 - firstDayOfWeek(this.locale) + 7) % 7;
    const forward = getComputedStyle(cell).direction === 'rtl' ? -1 : 1;
    let target;
    switch (event.key) {
      case 'ArrowLeft': target = new Date(year, month, day - forward); break;
      case 'ArrowRight': target = new Date(year, month, day + forward); break;
      case 'ArrowUp': target = new Date(year, month, day - 7); break;
      case 'ArrowDown': target = new Date(year, month, day + 7); break;
      case 'Home': target = new Date(year, month, day - weekday); break;
      case 'End': target = new Date(year, month, day + 6 - weekday); break;
      case 'PageUp':
      case 'PageDown': {
        const step = (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1);
        target = new Date(year, month + step, Math.min(day, new Date(year, month + step + 1, 0).getDate()));
        break;
      }
      default: return;
    }
    event.preventDefault();
    // Focus search passes over disabled days in the same direction.
    const from = new Date(year, month, day), arrow = event.key.startsWith('Arrow');
    const step = arrow ? Math.round((target - from) / 864e5) : Math.sign(target - from) || 1;
    const [first, last] = this.yearRange;
    for (let tries = 0; tries < 800 && !this._dateAllowed(target); tries++) {
      if (target.getFullYear() < first || target.getFullYear() > last) return;
      target = new Date(target.getFullYear(), target.getMonth(), target.getDate() + step);
    }
    if (!this._dateAllowed(target)) return;
    this._focusDay(target);
  }

  _focusDay(date) {
    this._focusDate = date;
    const range = this.shadowRoot.querySelector('.months-list') && this._monthWindow;
    if (range) {
      const index = date.getFullYear() * 12 + date.getMonth();
      while (index > range.to && range.extend('end'));
      while (index < range.from && range.extend('start'));
    } else if (date.getFullYear() !== this.state.viewYear || date.getMonth() !== this.state.viewMonth) {
      this.state.viewYear = date.getFullYear();
      this.state.viewMonth = date.getMonth();
      this._updateUI();
    }
    this._syncDayTabStop(true);
  }

  /** Year and month options: one tab stop, arrows move through the grid or list. */
  _onOptionKey(event) {
    const option = event.target.closest?.('.year, .option');
    if (!option || event.altKey || event.ctrlKey || event.metaKey) return;
    const options = [...option.parentElement.children];
    const columns = option.classList.contains('year') ? getComputedStyle(option.parentElement).gridTemplateColumns.split(' ').length : 1;
    const forward = getComputedStyle(option).direction === 'rtl' ? -1 : 1;
    const at = options.indexOf(option);
    const next = {
      ArrowUp: at - columns, ArrowDown: at + columns, Home: 0, End: options.length - 1,
      ArrowLeft: columns > 1 ? at - forward : at, ArrowRight: columns > 1 ? at + forward : at,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const target = options[Math.min(options.length - 1, Math.max(0, next))];
    option.tabIndex = -1;
    target.tabIndex = 0;
    target.focus();
  }

  /** One month's 6 x 7 day grid (Month: six 48dp weeks, empty leading and trailing cells). */
  _monthCells(viewYear, viewMonth) {
    const isRange = this.range, locale = this.locale;
    const firstDayIndex = daysFromStartOfWeek(viewYear, viewMonth, locale);
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
          this.state.selectedDate && this.state.selectedDate.getFullYear() === viewYear &&
          this.state.selectedDate.getMonth() === viewMonth &&
          this.state.selectedDate.getDate() === day;
        if (isSelected) cellClasses += ' selected';
      }

      const selected=cellClasses.includes(' selected'),inRange=!!(isRange&&startTime!==null&&endTime!==null&&currentTime>=startTime&&currentTime<=endTime);
      // dayContentDescription, then the yMMMMEEEEd date.
      const notes=[];
      if(isRange){if(startTime!==null&&currentTime===startTime)notes.push(STRINGS.startHeadline);else if(endTime!==null&&currentTime===endTime)notes.push(STRINGS.endHeadline);else if(cellClasses.includes('in-range'))notes.push(STRINGS.inRange);}
      if(isToday)notes.push(STRINGS.today);
      const dateDescription=formatWithSkeleton(currentCellDate,YEAR_MONTH_WEEKDAY_DAY_SKELETON,locale);
      const description=notes.length?`${notes.join(', ')}, ${dateDescription}`:dateDescription;
      const enabled=this._dateAllowed(currentCellDate);
      const colors=datePickerDayColors({isToday,selected,inRange,enabled});
      gridHtml += `
        <button class="${cellClasses}" data-day="${day}" tabindex="-1" type="button" aria-pressed="${selected}"${enabled ? '' : ' disabled'} style="--date-day-content:${pickerCssColor(colors.content)};--date-day-container:${pickerCssColor(colors.container)}" aria-label="${escapeText(description)}">
          <span class="day-text">${toLocalString(day, locale)}</span>
        </button>
      `;
    }
    for(let i=firstDayIndex+daysInMonth;i<42;i++)gridHtml+='<div class="day-cell empty"></div>';
    return gridHtml;
  }

  /** Selects a date (or extends the range) and reports the change. */
  _pickDate(pickedDate) {
    this._focusDate = pickedDate;
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
    const [firstYear, lastYear] = this.yearRange, FIRST = firstYear * 12, LAST = lastYear * 12 + 11, BLOCK = 12;
    const block = index => {
      const year = Math.floor(index / 12), month = index % 12;
      const title = escapeText(formatWithSkeleton(new Date(year, month, 1), YEAR_MONTH_SKELETON, this.locale));
      return `<section class="month-block" data-month="${index}" aria-label="${title}">
        <div class="month-subhead">${title}</div>
        <div class="days-grid range-grid">${this._monthCells(year, month)}</div>
      </section>`;
    };
    if (!this._monthWindow || this._monthWindow.list !== list) {
      const anchor = this.state.startDate ?? new Date(this.state.viewYear, this.state.viewMonth, 1);
      const first = Math.min(LAST, Math.max(FIRST, anchor.getFullYear() * 12 + anchor.getMonth()));
      // Adds a block of months at either end; false once that end is reached.
      const extend = edge => {
        const range = this._monthWindow, marker = list.querySelector(`[data-edge="${edge}"]`);
        let more = '';
        if (edge === 'end' && range.to < LAST) {
          const to = Math.min(LAST, range.to + BLOCK);
          for (let index = range.to + 1; index <= to; index++) more += block(index);
          marker.insertAdjacentHTML('beforebegin', more);
          range.to = to;
        } else if (edge === 'start' && range.from > FIRST) {
          const from = Math.max(FIRST, range.from - BLOCK), before = list.scrollHeight;
          for (let index = from; index < range.from; index++) more += block(index);
          marker.insertAdjacentHTML('afterend', more);
          // Months already on screen keep their position.
          list.scrollTop += list.scrollHeight - before;
          range.from = from;
        } else return false;
        if (!list.querySelector('.day-cell[tabindex="0"]')) this._syncDayTabStop(false);
        return true;
      };
      this._monthWindow = { list, from: Math.max(FIRST, first - BLOCK), to: Math.min(LAST, first + BLOCK), extend };
      let html = '';
      for (let index = this._monthWindow.from; index <= this._monthWindow.to; index++) html += block(index);
      list.innerHTML = `<div class="months-edge" data-edge="start"></div>${html}<div class="months-edge" data-edge="end"></div>`;
      this._syncDayTabStop(false);
      // The displayed month starts at the top of the list, once the list has a size.
      const shown = list.querySelector(`[data-month="${first}"]`);
      this._monthPlacement?.disconnect();
      this._monthPlacement = new FrameResizeObserver(() => {
        if (!list.clientHeight || !shown) return;
        list.scrollTop = shown.offsetTop;
        this._monthPlacement.disconnect();
      });
      this._monthPlacement.observe(list);
      list.addEventListener('click', event => {
        const cell = event.target.closest?.('.day-cell:not(.empty):not(:disabled)');
        const index = Number(cell?.closest('.month-block')?.dataset.month);
        if (!cell || !Number.isFinite(index)) return;
        this._pickDate(new Date(Math.floor(index / 12), index % 12, Number(cell.dataset.day)));
      }, { signal: this._abortController?.signal });
      this._monthEdges?.disconnect();
      this._monthEdges = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) extend(entry.target.dataset.edge);
      }, { root: list, rootMargin: '600px 0px' });
      for (const edge of list.querySelectorAll('.months-edge')) this._monthEdges.observe(edge);
      return;
    }
    // Selection changed: repaint the rendered months in place.
    const refocus = this._dayFocused();
    for (const section of list.querySelectorAll('.month-block')) {
      const index = Number(section.dataset.month);
      section.querySelector('.days-grid').innerHTML = this._monthCells(Math.floor(index / 12), index % 12);
    }
    this._syncDayTabStop(refocus);
  }

  render() {
    const isDocked = this.variant === 'docked';
    const isRange = this.range;
    const isInputMode = this.state.displayMode === 'input';
    this.state.view = 'day';
    this._disposeYearMotion();

    const m = this.state.viewMonth, y = this.state.viewYear;

    const locale = this.locale, inputFormat = dateInputFormat(locale), inputPattern = inputFormat.patternWithDelimiters.toUpperCase();
    const inputValue = date => withDelimiters(formatInputDigits(date, inputFormat), inputFormat);
    // WeekDays: narrow names from the locale's first day; day cells carry the full date.
    const weekdays = `<div class="weekdays-row" aria-hidden="true">${orderedWeekdays(locale).map(([, narrow]) => `<div>${escapeText(narrow)}</div>`).join('')}</div>`;
    const dayView = `<div class="day-view">${weekdays}<div class="days-grid${isRange ? ' range-grid' : ''}"></div></div>`;
    // DatePickerContent: the year picker and its divider, drawn over the month list.
    const yearGrid = `<div class="year-pane" role="region" aria-label="${STRINGS.yearPickerPaneTitle}" hidden><div class="year-pane-content">
      <div class="year-grid" role="listbox" aria-label="Years"></div><div class="divider"></div></div></div>`;
    // YearPickerMenuButton; the docked month and year menus use the same button.
    const menuButton = (id, text, action, live = false) => `<button class="menu-button" id="${id}" type="button" aria-expanded="false"
      aria-label="${escapeText(`${text}, ${action}`)}"><span class="menu-label"${live ? ' aria-live="polite"' : ''}>${escapeText(text)}</span><span class="ico menu-arrow" aria-hidden="true">arrow_drop_down</span></button>`;
    const modeToggle = `<md-icon-button class="mode-toggle" id="mode-toggle-btn" icon="${isInputMode ? 'date_range' : 'edit'}"
      aria-label="${isInputMode ? 'Switch to calendar input mode' : 'Switch to text input mode'}"></md-icon-button>`;
    const monthHeader = `
      <div class="month-header">
        ${menuButton('year-menu', formatWithSkeleton(new Date(y, m, 1), YEAR_MONTH_SKELETON, locale), STRINGS.switchToYearSelection, true)}
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
          <md-text-field class="docked-field" id="docked-text-input" variant="outlined" single-line label="${STRINGS.dateInputLabel}"
            value="${inputValue(this.state.selectedDate)}" placeholder="${inputPattern}" supporting-text="${inputPattern}" inputmode="numeric"></md-text-field>
          <div class="docked-calendar" style="${pickerPaletteStyle(datePickerColors(),'date')}">
            <div class="docked-nav-row">
              <div class="nav-cluster">
                <md-icon-button class="nav-btn" id="prev-month" icon="chevron_left" aria-label="Change to previous month"></md-icon-button>
                ${menuButton('month-menu', monthNames(locale, 'short')[m], 'Select month')}
                <md-icon-button class="nav-btn" id="next-month" icon="chevron_right" aria-label="Change to next month"></md-icon-button>
              </div>
              <div class="nav-cluster">
                <md-icon-button class="nav-btn" id="prev-year" icon="chevron_left" aria-label="Change to previous year"></md-icon-button>
                ${menuButton('year-menu', toLocalString(y, locale), 'Select year')}
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
      cardContentHtml = `
        <div class="picker-dialog range" part="dialog" style="${pickerPaletteStyle(datePickerColors(),'date')}">
          <div class="range-top-bar">
            <md-icon-button id="cancel-btn" icon="close" aria-label="Close"></md-icon-button>
            <md-button variant="text" id="ok-btn" label="Save"></md-button>
          </div>
          <div class="picker-header">
            <span class="header-title">${isInputMode ? 'Enter dates' : 'Select dates'}</span>
            <div class="header-row"><div class="formatted-date range-headline" aria-live="polite"></div>${modeToggle}</div>
          </div>
          <div class="divider"></div>
          ${isInputMode ? `
            <div class="range-input-pane">
              <md-text-field id="range-start-input" variant="outlined" single-line label="${STRINGS.startHeadline}" value="${inputValue(this.state.startDate)}" placeholder="${inputPattern}" inputmode="numeric"></md-text-field>
              <md-text-field id="range-end-input" variant="outlined" single-line label="${STRINGS.endHeadline}" value="${inputValue(this.state.endDate)}" placeholder="${inputPattern}" inputmode="numeric"></md-text-field>
            </div>
          ` : `
            <div class="calendar-body range-body">${weekdays}<div class="months-list" role="group" aria-label="Calendar"></div></div>
          `}
        </div>
      `;
    } else {
      cardContentHtml = `
        <div class="picker-dialog modal" part="dialog" style="${pickerPaletteStyle(datePickerColors(),'date')}">
          <div class="picker-header">
            <span class="header-title">Select date</span>
            <div class="header-row"><div class="formatted-date" aria-live="polite"></div>${modeToggle}</div>
          </div>
          <div class="divider"></div>
          ${isInputMode ? `
            <div class="modal-input-pane">
              <md-text-field id="docked-text-input" variant="outlined" single-line label="${STRINGS.dateInputLabel}" value="${inputValue(this.state.selectedDate)}" placeholder="${inputPattern}" inputmode="numeric"></md-text-field>
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
    const yearMenu = root.querySelector('#year-menu'), monthMenu = root.querySelector('#month-menu');
    for (const [menu, open] of [[yearMenu, view === 'year'], [monthMenu, view === 'month']]) {
      if (!menu) continue;
      menu.setAttribute('aria-expanded', String(open));
      this._labelMenu(menu);
    }
    if (isDocked) {
      // Docked: the month and year lists take the calendar's place.
      dayView.hidden = view !== 'day';
      const years = root.querySelector('.year-list'), months = root.querySelector('.month-list');
      if (years) years.hidden = view !== 'year';
      if (months) months.hidden = view !== 'month';
      if (view === 'year') this._renderYears(years, true);
      if (view === 'month') this._renderMonths(months);
      return;
    }
    // DatePickerContent: the month arrows are not composed while the year
    // picker is visible; the month list stays under it.
    root.querySelector('.month-nav')?.toggleAttribute('hidden', view === 'year');
    dayView.inert = view === 'year';
    const pane = root.querySelector('.year-pane');
    if (!pane) return;
    const entering = view === 'year' && pane.hidden;
    this._animateYearPane(pane, view === 'year');
    // A new YearPicker starts at its initial index; one still leaving keeps its scroll.
    if (view === 'year') this._renderYears(pane.querySelector('.year-grid'), false, entering);
  }

  /** The menu button's text, and its merged description (the text, then the icon's). */
  _labelMenu(button, text) {
    if (!button) return;
    const label = button.querySelector('.menu-label');
    if (text != null && label.textContent !== text) label.textContent = text;
    const open = button.getAttribute('aria-expanded') === 'true';
    const action = button.id === 'month-menu' ? 'Select month'
      : this.variant === 'docked' ? 'Select year'
      : open ? STRINGS.switchToDaySelection : STRINGS.switchToYearSelection;
    button.setAttribute('aria-label', `${label.textContent}, ${action}`);
  }

  /**
   * AnimatedVisibility(yearPickerVisible): expandVertically / shrinkVertically
   * (IntSize, from the bottom edge) on DefaultEffects, fadeIn from 0.6 on
   * DefaultEffects, fadeOut on FastEffects. The content stays until both end.
   */
  _animateYearPane(pane, visible) {
    let motion = this._yearMotion;
    if (motion?.pane !== pane) {
      this._disposeYearMotion();
      motion = this._yearMotion = { pane, height: new SpringValue(0), alpha: new SpringValue(0), raf: null };
    }
    if (visible && pane.hidden) {
      // PreEnter: initialHeight 0 and initialAlpha 0.6, at rest.
      for (const [channel, value] of [[motion.height, 0], [motion.alpha, 0.6]]) {
        channel.value = channel.target = value;
        channel.animation = null;
      }
      pane.hidden = false;
    }
    const now = performance.now();
    // IntSize springs settle within one pixel and retarget from the rounded size.
    motion.height.to(visible ? YEAR_PANE_HEIGHT : 0, { ...SpringPhysics.getPreset('expressiveEffectMedium', this), visibilityThreshold: 1 }, { now, roundInitial: true });
    motion.alpha.to(visible ? 1 : 0, SpringPhysics.getPreset(visible ? 'expressiveEffectMedium' : 'expressiveEffectFast', this), { now });
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { motion.height.finish(); motion.alpha.finish(); }
    const content = pane.firstElementChild;
    const draw = time => {
      motion.raf = null;
      const height = Math.max(0, Math.round(motion.height.sample(time).position));
      pane.style.height = `${height}px`;
      // Alignment.Bottom: the content's bottom edge follows the clip's.
      content.style.transform = `translateY(${height - YEAR_PANE_HEIGHT}px)`;
      pane.style.opacity = String(Math.min(1, Math.max(0, motion.alpha.sample(time).position)));
      if (motion.height.animation || motion.alpha.animation) motion.raf = requestAnimationFrame(draw);
      else if (!visible) pane.hidden = true;
    };
    if (motion.raf !== null) cancelAnimationFrame(motion.raf);
    draw(now);
  }

  _disposeYearMotion() {
    if (this._yearMotion?.raf != null) cancelAnimationFrame(this._yearMotion.raf);
    this._yearMotion = null;
  }

  _renderYears(container, asList, scroll = true) {
    if (!container) return;
    const current = new Date().getFullYear(), selected = this.state.viewYear, locale = this.locale;
    let html = '';
    const [first, last] = this.yearRange;
    for (let year = first; year <= last; year++) {
      const cls = `${asList ? 'option' : 'year'}${year === selected ? ' selected' : ''}${year === current ? ' current' : ''}`;
      const text = toLocalString(year, locale), disabled = this._yearAllowed(year) ? '' : ' disabled';
      html += asList
        ? `<button class="${cls}" type="button" role="option" tabindex="${year === selected ? 0 : -1}" data-year="${year}" aria-selected="${year === selected}"${disabled}><span class="option-check" aria-hidden="true">check</span><span>${text}</span></button>`
        : `<button class="${cls}" type="button" role="option" tabindex="${year === selected ? 0 : -1}" data-year="${year}" aria-selected="${year === selected}"${disabled} aria-label="${escapeText(formatString(STRINGS.navigateToYear, text))}">${text}</button>`;
    }
    const scrollTop = container.scrollTop;
    container.innerHTML = html;
    const chosen = container.querySelector('.selected');
    if (!asList) {
      // rememberLazyGridState(initialFirstVisibleItemIndex = displayedYear - first - YearsInRow):
      // that item's row starts the viewport.
      container.scrollTop = scroll ? Math.floor(Math.max(0, selected - first - YEARS_IN_ROW) / YEARS_IN_ROW) * YEAR_ROW_PITCH : scrollTop;
    } else if (chosen) container.scrollTop = chosen.offsetTop - container.clientHeight / 2 + chosen.offsetHeight / 2;
    this._yearAbort?.abort();
    this._yearAbort = new AbortController();
    const yearSignal = this._yearAbort.signal;
    for (const button of container.querySelectorAll('button')) {
      bindStateLayer(button, { property: '--_state-alpha', signal: yearSignal });
      bindPress(button, { signal: yearSignal, onPress: event => createRipple(event, button), onActivate: () => {
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
    container.innerHTML = monthNames(this.locale).map((name, index) => `<button class="option${index === this.state.viewMonth ? ' selected' : ''}" type="button" role="option" tabindex="${index === this.state.viewMonth ? 0 : -1}" data-month="${index}" aria-selected="${index === this.state.viewMonth}"><span class="option-check" aria-hidden="true">check</span><span>${name}</span></button>`).join('');
    this._monthAbort?.abort();
    this._monthAbort = new AbortController();
    const monthSignal = this._monthAbort.signal;
    for (const button of container.querySelectorAll('button')) {
      bindStateLayer(button, { property: '--_state-alpha', signal: monthSignal });
      bindPress(button, { signal: monthSignal, onPress: event => createRipple(event, button), onActivate: () => {
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
