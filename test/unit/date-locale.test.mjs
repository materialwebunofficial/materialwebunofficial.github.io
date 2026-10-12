import assert from 'node:assert/strict';
import {
  datePatternAsInputFormat, dateInputFormat, firstDayOfWeek, orderedWeekdays, daysFromStartOfWeek,
  formatWithSkeleton, parseInputDigits, formatInputDigits, withDelimiters, toLocalString, asciiDigits,
  YEAR_MONTH_SKELETON, YEAR_ABBR_MONTH_DAY_SKELETON, YEAR_MONTH_WEEKDAY_DAY_SKELETON,
} from '../../src/components/date-locale.js';

let checks = 0;
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };

// datePatternAsInputFormat (CalendarModel.kt) on java.time SHORT patterns.
equal(datePatternAsInputFormat('M/d/yy'), { patternWithDelimiters: 'MM/dd/yyyy', delimiter: '/', patternWithoutDelimiters: 'MMddyyyy' }, 'en-US SHORT');
equal(datePatternAsInputFormat('dd.MM.yy').patternWithDelimiters, 'dd.MM.yyyy', 'de SHORT');
equal(datePatternAsInputFormat('yy. M. d.').patternWithDelimiters, 'yyyy.MM.dd', 'ko SHORT: spaces and the trailing dot go');
equal(datePatternAsInputFormat('d-M-yy').delimiter, '-', 'dash delimiter');

// Locale input formats from Intl's SHORT date.
for (const [locale, pattern] of [['en-US', 'MM/dd/yyyy'], ['tr-TR', 'dd.MM.yyyy'], ['de-DE', 'dd.MM.yyyy'], ['ja-JP', 'yyyy/MM/dd'], ['en-GB', 'dd/MM/yyyy'], ['ko-KR', 'yyyy.MM.dd']]) {
  equal(dateInputFormat(locale).patternWithDelimiters, pattern, `${locale} input format`);
}

// WeekFields first day of week and WeekDays order.
equal([firstDayOfWeek('en-US'), firstDayOfWeek('tr-TR'), firstDayOfWeek('de-DE'), firstDayOfWeek('ja-JP')], [7, 1, 1, 7], 'first day of week');
equal(orderedWeekdays('en-US').map(([, narrow]) => narrow).join(''), 'SMTWTFS', 'en-US narrow weekdays from Sunday');
equal(orderedWeekdays('en-US')[0][0], 'Sunday', 'full names for semantics');
equal(orderedWeekdays('de-DE').map(([, narrow]) => narrow).join(''), 'MDMDFSS', 'de narrow weekdays from Monday');

// getMonth: leading cells. 1 October 2026 is a Thursday.
equal([daysFromStartOfWeek(2026, 9, 'en-US'), daysFromStartOfWeek(2026, 9, 'tr-TR')], [4, 3], 'leading empty cells');

// DatePickerFormatter skeletons.
const date = new Date(2026, 9, 11);
equal(formatWithSkeleton(date, YEAR_ABBR_MONTH_DAY_SKELETON, 'en-US'), 'Oct 11, 2026', 'yMMMd');
equal(formatWithSkeleton(date, YEAR_MONTH_SKELETON, 'en-US'), 'October 2026', 'yMMMM');
equal(formatWithSkeleton(date, YEAR_MONTH_WEEKDAY_DAY_SKELETON, 'en-US'), 'Sunday, October 11, 2026', 'yMMMMEEEEd');
equal(formatWithSkeleton(null, YEAR_MONTH_SKELETON, 'en-US'), null, 'no date');

// Typed digits: SMART resolution, delimiters, round trip.
const us = dateInputFormat('en-US'), tr = dateInputFormat('tr-TR');
equal(parseInputDigits('02312026', us)?.toDateString(), new Date(2026, 1, 28).toDateString(), 'SMART clamps the day to the month');
equal([parseInputDigits('13012026', us), parseInputDigits('02322026', us), parseInputDigits('00012026', us), parseInputDigits('01010000', us), parseInputDigits('0101202', us)], [null, null, null, null, null], 'invalid fields');
equal(parseInputDigits('11102026', tr)?.toDateString(), date.toDateString(), 'day-first locale');
equal([formatInputDigits(date, us), formatInputDigits(date, tr)], ['10112026', '11102026'], 'formatWithPattern digits');
equal([withDelimiters('0', us), withDelimiters('02', us), withDelimiters('021', us), withDelimiters('02112026', us), withDelimiters('1110', tr)], ['0', '02/', '02/1', '02/11/2026', '11.10.'], 'DateOutputTransformation');
equal(asciiDigits('١٠١١٢٠٢٦'), '10112026', 'Arabic-Indic digits count as digits');
equal([toLocalString(2026, 'en-US'), toLocalString(2026, 'ar-EG')], ['2026', '٢٠٢٦'], 'Int.toLocalString without grouping');

console.log(`Date locale: ${checks} CalendarModel/DatePickerFormatter/DateInput checks passed (input patterns, first day of week, weekday order, skeletons, SMART parsing, delimiters).`);
