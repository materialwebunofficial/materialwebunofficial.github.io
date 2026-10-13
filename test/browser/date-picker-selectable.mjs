import assert from 'node:assert/strict';

// DatePickerState yearRange and SelectableDates at a095da93: Month's day
// enabled = isSelectableYear(year) && isSelectableDate(utcTimeMillis), Year's
// enabled = isSelectableYear, MonthsNavigation previous/nextAvailable at the
// list ends, DateInputValidator's year range and "Date not allowed" messages,
// disabled day and year colors, and focus passing over disabled days.
export async function testDatePickerSelectable(browser, base, { page: url = '/test/browser/fixtures/toolbars.html' } = {}) {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } }), errors = [];
  let checks = 0;
  const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(base + url);
    await page.evaluate(() => customElements.whenDefined('md-date-picker'));
    const mount = html => page.evaluate(html => { document.querySelector('#fixture').innerHTML = html; return new Promise(r => setTimeout(r, 150)); }, html);
    const picker = page.locator('#picker');
    // Weekends and the year 2029 are not selectable.
    const selectable = () => picker.evaluate(host => {
      host.selectableDates = { isSelectableDate: ms => ![0, 6].includes(new Date(ms).getUTCDay()), isSelectableYear: year => year !== 2029 };
      return new Promise(r => setTimeout(r, 50));
    });
    const roles = await page.evaluate(() => { const p = document.createElement('span'); document.body.append(p); const read = v => { p.style.color = v; return getComputedStyle(p).color; };
      const alpha = Math.floor(0.38 * 255 + 0.5) / 255;
      const out = { disabled: read(`rgb(from var(--md-sys-color-on-surface) r g b / ${alpha})`), disabledYear: read(`rgb(from var(--md-sys-color-on-surface-variant) r g b / ${alpha})`) }; p.remove(); return out; });

    await mount('<md-date-picker id="picker" inline year-range="2020..2030" value="03/15/2030" locale="en-US"></md-date-picker>');
    await selectable();
    const days = await picker.evaluate(host => [...host.shadowRoot.querySelectorAll('.days-grid .day-cell:not(.empty)')].slice(0, 7).map(cell => ({
      day: Number(cell.dataset.day), disabled: cell.disabled, color: getComputedStyle(cell.querySelector('.day-text')).color })));
    // March 2030: the 1st is a Friday, the 2nd and 3rd a weekend.
    equal(days.map(d => [d.day, d.disabled]), [[1, false], [2, true], [3, true], [4, false], [5, false], [6, false], [7, false]], 'weekend days disabled');
    equal([days[1].color, days[0].color === days[1].color], [roles.disabled, false], 'disabledDayContentColor: OnSurface at 38% (alpha packed to 8 bits, as sRGB Color stores it)');
    await picker.evaluate(host => host.shadowRoot.querySelector('[data-day="2"]').click());
    equal(await picker.evaluate(host => host.value), '03/15/2030', 'a disabled day cannot be picked');
    // Focus search passes over the weekend: Friday 1 -> Monday 4.
    await picker.evaluate(host => { host.shadowRoot.querySelector('[data-day="1"]').focus(); });
    await page.keyboard.press('ArrowRight');
    equal(await picker.evaluate(host => host.shadowRoot.activeElement?.dataset.day), '4', 'ArrowRight skips disabled days');
    await page.keyboard.press('ArrowLeft');
    equal(await picker.evaluate(host => host.shadowRoot.activeElement?.dataset.day), '1', 'ArrowLeft skips back');

    // Arrows stop at the ends of the year range.
    const arrows = () => picker.evaluate(host => [host.shadowRoot.querySelector('#prev-month').disabled, host.shadowRoot.querySelector('#next-month').disabled]);
    equal(await arrows(), [false, false], 'March 2030: both arrows');
    await picker.evaluate(host => { host.state.viewYear = 2030; host.state.viewMonth = 11; host._updateUI(); });
    equal(await arrows(), [false, true], 'December 2030: next not available');
    await picker.evaluate(host => { host.state.viewYear = 2020; host.state.viewMonth = 0; host._updateUI(); });
    equal(await arrows(), [true, false], 'January 2020: previous not available');
    // A year that is not selectable disables all of its days.
    await picker.evaluate(host => { host.state.viewYear = 2029; host.state.viewMonth = 4; host._updateUI(); });
    equal(await picker.evaluate(host => [...host.shadowRoot.querySelectorAll('.days-grid .day-cell:not(.empty)')].every(c => c.disabled)), true, 'isSelectableYear false: every day disabled');

    // Year picker: only the range, the disabled year in the disabled role.
    await picker.evaluate(host => { host.state.viewYear = 2030; host.state.viewMonth = 2; host._updateUI(); host.shadowRoot.querySelector('#year-menu').click(); });
    await page.waitForTimeout(500);
    const years = await picker.evaluate(host => [...host.shadowRoot.querySelectorAll('.year')].map(y => ({ year: Number(y.dataset.year), disabled: y.disabled, color: getComputedStyle(y).color })));
    equal([years[0].year, years.at(-1).year, years.length], [2020, 2030, 11], 'years 2020..2030');
    const y2029 = years.find(y => y.year === 2029);
    equal([y2029.disabled, y2029.color, years.filter(y => y.disabled).length], [true, roles.disabledYear, 1], '2029 disabled: SelectionYearUnselectedLabelTextColor (OnSurfaceVariant) at 38%');

    // DateInputValidator: year range, then SelectableDates.
    await picker.evaluate(host => { host.state.displayMode = 'input'; host.render(); host._setup(); });
    const field = picker.locator('#docked-text-input'), input = field.locator('input');
    const type = async text => { await input.fill(''); await input.type(text); return field.evaluate(f => f.hasAttribute('error') ? f.getAttribute('error-text') : ''); };
    equal(await type('03162030'), 'Date not allowed: Mar 16, 2030', 'a Saturday is not allowed');
    equal(await type('05062029'), 'Date not allowed: May 6, 2029', 'a year that is not selectable');
    equal(await type('01012031'), 'Date out of expected year range 2020 - 2030', 'year range message with the attribute');
    equal(await type('03182030'), '', 'a Monday is accepted');
    equal(await picker.evaluate(host => host.value), '03/18/2030', 'and selected');

    // A selection outside the range is no selection.
    await mount('<md-date-picker id="picker" inline year-range="2020..2030" value="03/15/2031" locale="en-US"></md-date-picker>');
    // The source requires the initial displayed month inside the range (it throws);
    // an attribute cannot, so the picker shows the current month, held inside the range.
    equal(await picker.evaluate(host => [host.state.selectedDate, host.state.viewYear]), [null, Math.min(2030, Math.max(2020, new Date().getFullYear()))], 'out of range value: no selection');

    // DateRangePicker: the month list covers the range only.
    await mount('<md-date-picker id="picker" inline range year-range="2029..2030" start-date="01/10/2029" locale="en-US"></md-date-picker>');
    await page.waitForTimeout(300);
    // The list is lazy; scroll to its end so every block that can exist is added.
    for (let i = 0; i < 6; i++) { await picker.evaluate(host => { const list = host.shadowRoot.querySelector('.months-list'); list.scrollTop = list.scrollHeight; }); await page.waitForTimeout(200); }
    const months = await picker.evaluate(host => [...host.shadowRoot.querySelectorAll('.month-block')].map(b => Number(b.dataset.month)));
    equal([Math.min(...months), Math.max(...months)], [2029 * 12, 2030 * 12 + 11], 'month list from January 2029 to December 2030');
    assert.deepEqual(errors, []);
    console.log(`Date picker selectable dates: ${checks} yearRange, SelectableDates, colors, navigation, focus and input checks passed.`);
  } finally { await page.close(); }
}
