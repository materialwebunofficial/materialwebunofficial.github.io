import assert from 'node:assert/strict';

// DatePicker layout at a095da93: DatePickerModalTokens, DateEntryContainer /
// DatePickerHeader, MonthsNavigation and YearPickerMenuButton, WeekDays, the
// YearPicker's AnimatedVisibility, DateInput / DateRangeInput padding and the
// DatePickerDialog button row. Expected values come from those sources.
export async function testDatePickerGeometry(browser, base, { page: url = '/test/browser/fixtures/toolbars.html' } = {}) {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } }), errors = [];
  let checks = 0;
  const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
  const ok = (value, label) => { assert.ok(value, label); checks++; };
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(base + url);
    await page.evaluate(() => customElements.whenDefined('md-date-picker'));
    await page.clock.install({ time: new Date('2026-10-12T12:00:00Z') });
    await page.clock.pauseAt(new Date('2026-10-12T12:00:01.008Z'));
    const mount = async html => {
      await page.evaluate(html => { document.querySelector('#fixture').innerHTML = html; }, html);
      await page.waitForTimeout(50);
      await page.clock.runFor(64);
    };
    // Rectangles relative to the picker's container.
    const layout = selectors => page.locator('#picker').evaluate((host, selectors) => {
      const root = host.shadowRoot, box = root.querySelector('.picker-dialog, .docked-calendar').getBoundingClientRect();
      const find = path => path.split(' >> ').reduce((node, part) => node && (node.shadowRoot ?? node).querySelector(part), root);
      return Object.fromEntries(Object.entries(selectors).map(([key, path]) => {
        const r = find(path)?.getBoundingClientRect();
        return [key, r && [r.left - box.left, r.top - box.top, r.width, r.height].map(v => Math.round(v * 100) / 100)];
      }));
    }, selectors);

    // Modal DatePicker in a DatePickerDialog: 360 x 568dp.
    await mount('<md-date-picker id="picker" inline value="03/15/2030" locale="en-US"></md-date-picker>');
    let rects = await layout({
      dialog: '.picker-dialog', title: '.header-title', headline: '.formatted-date', toggle: '#mode-toggle-btn', toggleContainer: '#mode-toggle-btn >> button',
      divider: '.divider', navigation: '.month-header', menu: '#year-menu', menuArrow: '#year-menu .menu-arrow',
      previous: '#prev-month', previousContainer: '#prev-month >> button', next: '#next-month', nextContainer: '#next-month >> button',
      weekdays: '.weekdays-row', days: '.days-grid', day: '.day-cell:not(.empty)', actions: '.actions-row', ok: '#ok-btn',
    });
    equal(rects.dialog, [0, 0, 360, 568], 'ContainerWidth x ContainerHeight');
    // Header: 120dp including the divider; title 24/16dp; headline 24dp from the start and 12dp
    // above the divider; the mode toggle (40dp in 48dp) 12dp from the end and the bottom.
    equal([rects.divider, rects.title.slice(0, 2), rects.headline.slice(0, 2), rects.toggle, rects.toggleContainer],
      [[0, 119, 360, 1], [24, 16], [24, 63], [300, 59, 48, 48], [304, 63, 40, 40]], 'DatePickerHeader');
    // MonthsNavigation: a 56dp row padded 12dp; IconButtons side by side at the end.
    equal([rects.navigation, rects.previous, rects.previousContainer, rects.next, rects.nextContainer],
      [[12, 120, 336, 56], [252, 124, 48, 48], [256, 128, 40, 40], [300, 124, 48, 48], [304, 128, 40, 40]], 'MonthsNavigation');
    const menu = await page.locator('#picker').evaluate(host => {
      const button = host.shadowRoot.querySelector('#year-menu'), css = getComputedStyle(button);
      const label = button.querySelector('.menu-label').getBoundingClientRect(), arrow = button.querySelector('.menu-arrow').getBoundingClientRect();
      return { padding: css.padding, radius: css.borderTopLeftRadius, font: [css.fontSize, css.fontWeight], gap: Math.round(arrow.left - label.right), name: button.getAttribute('aria-label'), expanded: button.getAttribute('aria-expanded') };
    });
    equal([rects.menu[0], rects.menu[1], rects.menu[3], rects.menuArrow.slice(2), menu.padding, menu.radius, menu.font, menu.gap],
      [12, 128, 40, [24, 24], '8px 12px', '9999px', ['14px', '500'], 8], 'YearPickerMenuButton: TextButton padding, CircleShape, LabelLarge, IconSpacing, 24dp icon');
    equal([menu.name, menu.expanded], ['March 2030, Activate to change the year', 'false'], 'menu button semantics');
    equal([rects.weekdays, rects.days, rects.day.slice(2)], [[12, 176, 336, 48], [12, 224, 336, 288], [48, 48]], 'WeekDays and six 48dp weeks');
    // DatePickerDialog: buttons 8dp from the bottom and 6dp from the end.
    equal([rects.actions, rects.ok[0] + rects.ok[2], rects.ok[1] + rects.ok[3]], [[0, 512, 360, 56], 354, 560], 'dialog buttons');

    // YearPicker: AnimatedVisibility over the month list.
    const record = async (action, duration) => {
      await page.locator('#picker').evaluate((host, { action, duration }) => {
        const root = host.shadowRoot, pane = root.querySelector('.year-pane'), frames = [], start = performance.now();
        host._testFrames = frames;
        if (action === 'open') root.querySelector('#year-menu').click();
        else root.querySelector(`.year[data-year="${action}"]`).click();
        const step = now => {
          frames.push({ t: Math.floor(now - start), hidden: pane.hidden, height: pane.getBoundingClientRect().height, opacity: Number(pane.style.opacity), transform: pane.firstElementChild.style.transform });
          if (now - start < duration) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }, { action, duration });
      await page.clock.runFor(duration + 32);
      return page.locator('#picker').evaluate(host => host._testFrames);
    };
    // Critically damped spring from rest: DefaultEffects 1600, FastEffects 3800. A spring ends
    // (at its target) once within its visibility threshold: 1px for IntSize, 0.01 for alpha.
    const spring = (stiffness, from, to, t) => { const w = Math.sqrt(stiffness), s = t / 1000; return to + (from - to) * (1 + w * s) * Math.exp(-w * s); };
    let frames = await record('open', 480);
    const moving = frames.filter(f => f.height > 0 && f.height < 336);
    ok(moving.length >= 5, 'year picker expands over several frames');
    ok(moving.every(f => Math.abs(f.height - Math.round(spring(1600, 0, 336, f.t))) <= 1 && Math.abs(f.opacity - spring(1600, 0.6, 1, f.t)) <= 0.01),
      'expandVertically (DefaultEffects IntSize) and fadeIn from 0.6 (DefaultEffects)');
    ok(moving.every(f => f.transform === `translateY(${f.height - 336}px)`), 'content aligned to the bottom of the expanding clip');
    equal([frames.at(-1).height, frames.at(-1).opacity], [336, 1], 'expanded');
    const years = await page.locator('#picker').evaluate(host => {
      const root = host.shadowRoot, dialog = root.querySelector('.picker-dialog').getBoundingClientRect(), grid = root.querySelector('.year-grid');
      const g = grid.getBoundingClientRect(), divider = grid.nextElementSibling.getBoundingClientRect();
      const visible = [...grid.children].filter(b => { const r = b.getBoundingClientRect(); return r.top >= g.top - 0.5 && r.top < g.top + 1; });
      return {
        grid: [g.left - dialog.left, g.top - dialog.top, g.width, g.height], divider: [divider.left - dialog.left, divider.top - dialog.top, divider.width, divider.height],
        firstRow: visible.map(b => b.textContent), xs: visible.map(b => b.getBoundingClientRect().left - dialog.left), size: [visible[0].offsetWidth, visible[0].offsetHeight],
        pitch: grid.children[3].getBoundingClientRect().top - grid.children[0].getBoundingClientRect().top,
        focused: root.activeElement?.textContent, label: root.activeElement?.getAttribute('aria-label'),
        arrows: root.querySelector('.month-nav').hidden, inert: root.querySelector('.day-view').inert,
        menu: [root.querySelector('#year-menu').getAttribute('aria-label'), getComputedStyle(root.querySelector('#year-menu .menu-arrow')).transform],
      };
    });
    // 7 x 48dp less the divider; 12dp padding; first visible item displayedYear - first - YearsInRow.
    equal([years.grid, years.divider], [[0, 176, 360, 335], [0, 511, 360, 1]], 'YearPicker height and divider');
    equal([years.firstRow, years.xs, years.size, years.pitch], [['2026', '2027', '2028'], [32, 144, 256], [72, 36], 52], 'YearPicker grid: initial index, three 72x36dp years per row spaced 16dp');
    equal([years.focused, years.label, years.arrows, years.inert], ['2030', 'Navigate to year 2030', true, true], 'displayed year takes focus; arrows not composed; month list under the picker');
    equal(years.menu, ['March 2030, Activate to change month and date', 'matrix(-1, 0, 0, -1, 0, 0)'], 'expanded menu button');
    frames = await record(2031, 480);
    const leaving = frames.filter(f => !f.hidden && f.height > 0 && f.height < 336);
    ok(leaving.length >= 3 && leaving.every(f => Math.abs(f.height - Math.round(spring(1600, 336, 0, f.t))) <= 1 && Math.abs(f.opacity - spring(3800, 1, 0, f.t)) <= 0.01),
      'shrinkVertically (DefaultEffects) and fadeOut (FastEffects)');
    equal(await page.locator('#picker').evaluate(host => { const root = host.shadowRoot; return [root.querySelector('.year-pane').hidden, root.querySelector('.day-view').inert, root.querySelector('#year-menu .menu-label').textContent, host.state.viewYear]; }),
      [true, false, 'March 2031', 2031], 'year selected, picker removed after its exit');

    // DateInputContent: 24dp at the sides, 10dp above; the supporting line and
    // 16dp below it are kept, an error takes its place.
    await page.locator('#picker').evaluate(host => { host.state.displayMode = 'input'; host.render(); host._setup(); });
    await page.clock.runFor(64);
    rects = await layout({ dialog: '.picker-dialog', pane: '.modal-input-pane', field: '#docked-text-input', container: '#docked-text-input >> .field-box', actions: '.actions-row' });
    equal([rects.dialog[3], rects.pane, rects.field.slice(0, 3), rects.container[1], rects.actions[1]], [282, [0, 120, 360, 106], [24, 130, 312], 138, 226], 'DateInput padding');
    const input = page.locator('#picker').locator('#docked-text-input input');
    await input.fill('');
    await input.type('01012200');
    await page.clock.runFor(64);
    rects = await layout({ pane: '.modal-input-pane', supporting: '#docked-text-input >> .helper-row' });
    equal([rects.pane[3], rects.supporting[3]], [106, 20], 'an error message does not change the height');

    // DateRangeInputContent: two fields 8dp apart.
    await mount('<md-date-picker id="picker" inline range start-date="03/10/2030" end-date="03/15/2030" locale="en-US"></md-date-picker>');
    await page.locator('#picker').evaluate(host => { host.state.displayMode = 'input'; host.render(); host._setup(); });
    await page.clock.runFor(64);
    rects = await layout({ pane: '.range-input-pane', start: '#range-start-input', end: '#range-end-input' });
    equal([rects.pane.slice(2), rects.start.slice(0, 3), rects.end.slice(0, 3)], [[360, 106], [24, 139, 152], [184, 139, 152]], 'DateRangeInput');

    // Docked (spec): icon buttons are laid out at their container size and the row fits.
    await mount('<md-date-picker id="picker" variant="docked" inline value="03/15/2030" locale="en-US"></md-date-picker>');
    const docked = await page.locator('#picker').evaluate(host => {
      const root = host.shadowRoot, row = root.querySelector('.docked-nav-row').getBoundingClientRect();
      const items = [...root.querySelectorAll('.docked-nav-row md-icon-button, .docked-nav-row .menu-button')];
      return { contained: items.every(item => { const r = item.getBoundingClientRect(), inner = (item.shadowRoot?.querySelector('button') ?? item).getBoundingClientRect(); return inner.left >= r.left - 0.5 && inner.right <= r.right + 0.5 && r.left >= row.left - 0.5 && r.right <= row.right + 0.5; }),
        overlap: items.some((item, i) => i > 0 && item.getBoundingClientRect().left < items[i - 1].getBoundingClientRect().right - 0.5), height: row.height };
    });
    equal(docked, { contained: true, overlap: false, height: 48 }, 'docked navigation row');
    assert.deepEqual(errors, []);
    console.log(`Date picker geometry: ${checks} DatePicker/DateInput/DatePickerDialog layout and YearPicker motion checks passed.`);
  } finally { await page.close(); }
}
