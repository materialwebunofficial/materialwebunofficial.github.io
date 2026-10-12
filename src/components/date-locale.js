/* Copyright 2023 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0; obtain a copy at
 * https://www.apache.org/licenses/LICENSE-2.0 . Distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND. See the License for details.
 *
 * Locale behavior of Compose Material3's date pickers at AndroidX a095da93
 * (internal/CalendarModel.kt, CalendarModelImpl.android.kt, DatePicker.kt
 * DatePickerFormatter and skeletons, DateInput.kt). Intl stands in for
 * java.time and ICU: the best pattern for a skeleton, WeekFields, the SHORT
 * localized date pattern and localized integers.
 */

// DatePickerDefaults skeletons.
export const YEAR_MONTH_SKELETON = 'yMMMM';
export const YEAR_ABBR_MONTH_DAY_SKELETON = 'yMMMd';
export const YEAR_MONTH_WEEKDAY_DAY_SKELETON = 'yMMMMEEEEd';
// DatePickerDefaults.YearRange.
export const YEAR_RANGE = [1900, 2100];

const SKELETON_OPTIONS = {
  [YEAR_MONTH_SKELETON]: { year: 'numeric', month: 'long' },
  [YEAR_ABBR_MONTH_DAY_SKELETON]: { year: 'numeric', month: 'short', day: 'numeric' },
  [YEAR_MONTH_WEEKDAY_DAY_SKELETON]: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
};

const cache = new Map();
function cached(key, create) {
  if (!cache.has(key)) cache.set(key, create());
  return cache.get(key);
}

/** CalendarLocale: the element's own locale attribute, its language, else the browser's. */
export function resolveLocale(element) {
  const candidates = [element?.getAttribute?.('locale'), element?.closest?.('[lang]')?.getAttribute('lang'), globalThis.navigator?.language, 'en-US'];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try { return Intl.getCanonicalLocales(candidate)[0]; } catch { /* not a language tag */ }
  }
  return 'en-US';
}

/** formatWithSkeleton: the locale's best pattern for one of the DatePickerDefaults skeletons. */
export function formatWithSkeleton(date, skeleton, locale) {
  if (!date) return null;
  const format = cached(`s:${skeleton}:${locale}`, () => new Intl.DateTimeFormat(locale, SKELETON_OPTIONS[skeleton]));
  return format.format(date);
}

/** Int.toLocalString(): localized digits without grouping. */
export function toLocalString(value, locale) {
  return cached(`n:${locale}`, () => new Intl.NumberFormat(locale, { useGrouping: false })).format(value);
}

// CLDR weekData firstDay for regions that do not start on Monday, used where
// Intl.Locale has no week information.
const SUNDAY_REGIONS = new Set('AG AS BD BR BS BT BW BZ CA CN CO DM DO ET GT GU HK HN ID IL IN JM JP KE KH KR LA MH MM MO MT MX MZ NI NP PA PE PH PK PR PT PY SA SG SV TH TT TW UM US VE VI WS YE ZA ZW'.split(' '));
const SATURDAY_REGIONS = new Set('AE AF BH DJ DZ EG IQ IR JO KW LY OM QA SD SY'.split(' '));

/** WeekFields.of(locale).firstDayOfWeek: 1 = Monday ... 7 = Sunday. */
export function firstDayOfWeek(locale) {
  return cached(`w:${locale}`, () => {
    try {
      const value = new Intl.Locale(locale);
      const info = typeof value.getWeekInfo === 'function' ? value.getWeekInfo() : value.weekInfo;
      if (info?.firstDay >= 1 && info.firstDay <= 7) return info.firstDay;
      const region = value.maximize().region;
      if (SUNDAY_REGIONS.has(region)) return 7;
      if (SATURDAY_REGIONS.has(region)) return 6;
      if (region === 'MV') return 5;
    } catch { /* fall through */ }
    return 1;
  });
}

/** weekdayNames: (full, narrow) pairs starting with Monday, as ISO-8601 orders them. */
export function weekdayNames(locale) {
  return cached(`d:${locale}`, () => {
    const full = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });
    const narrow = new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' });
    // 2024-01-01 was a Monday.
    return Array.from({ length: 7 }, (_, i) => { const date = new Date(Date.UTC(2024, 0, 1 + i)); return [full.format(date), narrow.format(date)]; });
  });
}

/** WeekDays: the names rotated to start at firstDayOfWeek. */
export function orderedWeekdays(locale) {
  const names = weekdayNames(locale), first = firstDayOfWeek(locale);
  return [...names.slice(first - 1), ...names.slice(0, first - 1)];
}

/** getMonth(): how many leading cells precede the first of the month. */
export function daysFromStartOfWeek(year, month, locale) {
  // ISO day of week: 1 = Monday ... 7 = Sunday.
  const iso = ((new Date(year, month, 1).getDay() + 6) % 7) + 1;
  const difference = iso - firstDayOfWeek(locale);
  return difference < 0 ? difference + 7 : difference;
}

/** Month names for the docked month list. */
export function monthNames(locale, width = 'long') {
  return cached(`m:${width}:${locale}`, () => {
    const format = new Intl.DateTimeFormat(locale, { month: width, timeZone: 'UTC' });
    return Array.from({ length: 12 }, (_, i) => format.format(new Date(Date.UTC(2024, i, 1))));
  });
}

/** datePatternAsInputFormat (CalendarModel.kt). */
export function datePatternAsInputFormat(localeFormat) {
  let pattern = localeFormat
    .replace(/[^dMy/\-.]/g, '')
    .replace(/d{1,2}/g, 'dd')
    .replace(/M{1,2}/g, 'MM')
    .replace(/y{1,4}/g, 'yyyy')
    .replace('My', 'M/y');
  if (pattern.endsWith('.')) pattern = pattern.slice(0, -1);
  const delimiter = /[/\-.]/.exec(pattern)[0];
  return { patternWithDelimiters: pattern, delimiter, patternWithoutDelimiters: pattern.replaceAll(delimiter, '') };
}

/** The SHORT localized date pattern, rebuilt from Intl's formatted parts. */
export function shortDatePattern(locale) {
  return cached(`p:${locale}`, () => {
    const parts = new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeZone: 'UTC' }).formatToParts(new Date(Date.UTC(2026, 10, 23)));
    return parts.map(part => part.type === 'year' ? 'y'.repeat(part.value.length)
      : part.type === 'month' ? 'M'.repeat(Math.min(2, part.value.length))
      : part.type === 'day' ? 'd'.repeat(Math.min(2, part.value.length))
      : part.type === 'literal' ? part.value : '').join('');
  });
}

/** getDateInputFormat(locale). */
export function dateInputFormat(locale) {
  return cached(`i:${locale}`, () => {
    try { return datePatternAsInputFormat(shortDatePattern(locale)); }
    catch { return datePatternAsInputFormat('MM/dd/yyyy'); }
  });
}

/** formatWithPattern(patternWithoutDelimiters): the digits a date input field holds. */
export function formatInputDigits(date, format) {
  if (!date) return '';
  const values = { y: String(date.getFullYear()).padStart(4, '0'), M: String(date.getMonth() + 1).padStart(2, '0'), d: String(date.getDate()).padStart(2, '0') };
  let out = '';
  for (let i = 0; i < format.patternWithoutDelimiters.length;) {
    const letter = format.patternWithoutDelimiters[i], run = letter === 'y' ? 4 : 2;
    out += values[letter];
    i += run;
  }
  return out;
}

/** DateOutputTransformation: the delimiters drawn between typed digits. */
export function withDelimiters(digits, format) {
  const first = format.patternWithDelimiters.indexOf(format.delimiter);
  const second = format.patternWithDelimiters.lastIndexOf(format.delimiter);
  let text = digits;
  if (first >= 0 && first <= text.length) text = text.slice(0, first) + format.delimiter + text.slice(first);
  if (second > first && second <= text.length) text = text.slice(0, second) + format.delimiter + text.slice(second);
  return text;
}

/**
 * CalendarModel.parse with java.time's default SMART resolver: month 1-12,
 * day 1-31 clamped to the month's length, year of era from 1.
 */
export function parseInputDigits(digits, format) {
  const pattern = format.patternWithoutDelimiters;
  if (digits.length !== pattern.length || !/^\d+$/.test(digits)) return null;
  const fields = {};
  for (let i = 0; i < pattern.length;) {
    const letter = pattern[i], run = letter === 'y' ? 4 : 2;
    fields[letter] = Number(digits.slice(i, i + run));
    i += run;
  }
  const { y, M, d } = fields;
  if (!(y >= 1) || !(M >= 1 && M <= 12) || !(d >= 1 && d <= 31)) return null;
  const length = new Date(y, M, 0).getDate();
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(y, M - 1, Math.min(d, length));
  return date;
}

/** Accepts any Unicode decimal digits as typed input, as isDigit() does. */
export function asciiDigits(text) {
  return text.replace(/\p{Nd}/gu, digit => {
    const code = digit.codePointAt(0);
    for (const zero of [0x30, 0x660, 0x6F0, 0x966, 0x9E6, 0xE50, 0xFF10]) if (code >= zero && code <= zero + 9) return String(code - zero);
    return digit;
  });
}
