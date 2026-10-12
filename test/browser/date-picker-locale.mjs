import assert from 'node:assert/strict';

// Date picker locale behavior at a095da93: CalendarModel weekday order and
// first day, DatePickerFormatter skeletons, Day semantics, DateRangePicker
// headline and DateInput (digits, delimiters, SMART parsing, validator texts).
export async function testDatePickerLocale(browser, base, { page: url = '/test/browser/fixtures/toolbars.html' } = {}) {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } }), errors = [];
  let checks = 0;
  const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(base + url);
    await page.evaluate(() => customElements.whenDefined('md-date-picker'));
    const mount = html => page.evaluate(html => { document.querySelector('#fixture').innerHTML = html; return new Promise(r => setTimeout(r, 150)); }, html);
    const read = () => page.locator('#picker').evaluate(host => {
      const root = host.shadowRoot, cells = [...root.querySelectorAll('.days-grid')].at(0)?.children ?? [];
      const days = [...cells].filter(c => !c.classList.contains('empty'));
      return {
        weekdays: [...root.querySelectorAll('.weekdays-row > div')].map(n => n.textContent).join(''),
        headline: [...root.querySelector('.formatted-date').children].map(n => n.textContent),
        headlineLabel: root.querySelector('.formatted-date').getAttribute('aria-label'),
        title: root.querySelector('.header-title')?.textContent,
        yearMenu: root.querySelector('#year-menu .menu-label')?.textContent,
        leading: [...cells].findIndex(c => !c.classList.contains('empty')),
        dayText: days.map(c => c.textContent.trim()).slice(0, 3),
        dayLabel: days[14]?.getAttribute('aria-label'),
      };
    });

    // en-US: Sunday first, yMMMd headline, yMMMM month, yMMMMEEEEd day descriptions.
    await mount('<md-date-picker id="picker" inline value="03/15/2030" locale="en-US"></md-date-picker>');
    let state = await read();
    equal([state.weekdays, state.title, state.headline, state.headlineLabel, state.yearMenu], ['SMTWTFS', 'Select date', ['Mar 15, 2030'], 'Current selection: Friday, March 15, 2030', 'March 2030'], 'en-US picker texts');
    // 1 March 2030 is a Friday: five leading cells from Sunday.
    equal([state.leading, state.dayText, state.dayLabel], [5, ['1', '2', '3'], 'Friday, March 15, 2030'], 'en-US grid');
    // No selection: Strings.DatePickerHeadline.
    await page.locator('#picker').evaluate(host => { host.removeAttribute('value'); host.state.selectedDate = null; host._updateUI(); });
    state = await read();
    equal([state.headline, state.headlineLabel], [['Selected date'], 'Current selection: None'], 'no selection');

    // tr-TR: Monday first and localized names.
    await mount('<md-date-picker id="picker" inline value="03/15/2030" locale="tr-TR"></md-date-picker>');
    state = await read();
    equal([state.weekdays, state.headline, state.leading, state.yearMenu], ['PSÇPCCP', ['15 Mar 2030'], 4, 'Mart 2030'], 'tr-TR picker');
    // de-DE through the nearest lang attribute.
    await mount('<div lang="de-DE"><md-date-picker id="picker" inline value="03/15/2030"></md-date-picker></div>');
    state = await read();
    equal([state.weekdays, state.yearMenu], ['MDMDFSS', 'März 2030'], 'de-DE from lang');

    // DateInput: digits only, delimiters drawn, SMART resolution and validator messages.
    await mount('<md-date-picker id="picker" inline locale="en-US"></md-date-picker>');
    await page.locator('#picker').evaluate(host => { host.state.displayMode = 'input'; host.render(); host._setup(); });
    const field = page.locator('#picker').locator('#docked-text-input');
    const input = field.locator('input');
    equal(await field.evaluate(f => [f.getAttribute('label'), f.getAttribute('placeholder'), f.getAttribute('inputmode')]), ['Date', 'MM/DD/YYYY', 'numeric'], 'input field label and pattern');
    const type = async text => { await input.fill(''); await input.press('End'); await input.type(text); return field.evaluate(f => ({ value: f.value, error: f.hasAttribute('error') ? f.getAttribute('error-text') : '' })); };
    equal(await type('02'), { value: '02/', error: '' }, 'first delimiter drawn after the month');
    equal(await type('02152030'), { value: '02/15/2030', error: '' }, 'complete date');
    state = await read();
    equal([state.title, state.headline], ['Select date', ['Feb 15, 2030']], 'input headline');
    equal(await type('0215a'), { value: '02/15/', error: '' }, 'non-digits revert; both delimiters drawn once the day is complete');
    equal(await type('02302030'), { value: '02/30/2030', error: '' }, 'SMART resolution accepts day 30');
    equal((await read()).headline, ['Feb 28, 2030'], 'resolved to the last day of February');
    equal(await type('13012030'), { value: '13/01/2030', error: 'Date does not match expected pattern: MM/DD/YYYY' }, 'pattern error');
    equal((await read()).headline, ['Entered date'], 'invalid input clears the selection');
    equal(await type('01012200'), { value: '01/01/2200', error: 'Date out of expected year range 1900 - 2100' }, 'year range error');

    // DateRangePickerHeadline and Day semantics in a range.
    await mount('<md-date-picker id="picker" inline range start-date="03/10/2030" end-date="03/15/2030" locale="en-US"></md-date-picker>');
    const range = await page.locator('#picker').evaluate(host => {
      const root = host.shadowRoot, headline = root.querySelector('.formatted-date');
      const block = root.querySelector('.month-block[data-month="' + (2030 * 12 + 2) + '"]');
      const label = day => block?.querySelector(`[data-day="${day}"]`)?.getAttribute('aria-label');
      return { parts: [...headline.children].map(n => n.textContent), gap: getComputedStyle(headline).columnGap, label: headline.getAttribute('aria-label'),
        title: root.querySelector('.header-title').textContent, start: label(10), inside: label(12), end: label(15) };
    });
    equal(range, { parts: ['Mar 10, 2030', '-', 'Mar 15, 2030'], gap: '4px', label: 'Start date: Sunday, March 10, 2030, End date: Friday, March 15, 2030', title: 'Select dates',
      start: 'Start date, Sunday, March 10, 2030', inside: 'In range, Tuesday, March 12, 2030', end: 'End date, Friday, March 15, 2030' }, 'range headline and day semantics');
    await page.locator('#picker').evaluate(host => { host.state.startDate = null; host.state.endDate = null; host._updateHeader(); });
    equal(await page.locator('#picker').evaluate(host => [...host.shadowRoot.querySelector('.formatted-date').children].map(n => n.textContent)), ['Start date', '-', 'End date'], 'range placeholders');
    assert.deepEqual(errors, []);
    console.log(`Date picker locale: ${checks} CalendarModel/DatePickerFormatter/DateRangePicker/DateInput checks passed in en-US, tr-TR and de-DE.`);
  } finally { await page.close(); }
}
