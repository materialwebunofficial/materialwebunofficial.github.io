import assert from 'node:assert/strict';

// Expressive search at a095da93 (SearchBar.kt): SearchBarState springs,
// DockedSearchBarLayoutImpl height limits, ExpandedDockedSearchBarWithGap and
// FullScreenSearchBarLayout.
const suggestions = count => JSON.stringify(Array.from({ length: count }, (_, i) => ({ label: `Suggestion ${i}`, icon: 'history' })));

export async function testSearchBarParity(browser, base, { page: url = '/test/browser/fixtures/toolbars.html' } = {}) {
  const page = await browser.newPage({ viewport: { width: 900, height: 720 } }), errors = [];
  let checks = 0;
  const ok = (value, label) => { assert.ok(value, label); checks++; };
  const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(base + url);
    await page.evaluate(() => customElements.whenDefined('md-search-bar'));
    await page.clock.install({time:new Date('2026-10-11T12:00:00Z')});
    await page.clock.pauseAt(new Date('2026-10-11T12:00:01.008Z'));
    const mount = async attrs => {
      await page.evaluate(html => {
        document.querySelector('#fixture').innerHTML = html;
      }, `<md-search-bar id="search" placeholder="Search" ${attrs}></md-search-bar>`);
      await page.waitForTimeout(50); // native ResizeObserver delivery
      await page.clock.runFor(32);
    };
    // Expand (or collapse) and record the drawn geometry each frame.
    const record = async (expand, duration = 1100) => {
      await page.locator('#search').evaluate((host, { expand, duration }) => {
        const root = host.shadowRoot, frames = [], start = performance.now();
        host._testFrames = frames;
        host.expanded = expand;
        const step = now => {
          const surface = root.querySelector('.surface'), results = root.querySelector('.results');
          frames.push({
            height: surface.getBoundingClientRect().height, radius: getComputedStyle(surface).borderTopLeftRadius,
            resultsHidden: results.hidden, translate: results.style.transform, opacity: results.style.opacity,
            scrim: root.querySelector('.scrim').style.opacity, progress: Math.min(1, Math.max(0, host._progress.sample(now).position)),
          });
          if (now - start < duration) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }, { expand, duration });
      await page.clock.runFor(duration+32);
      return page.locator('#search').evaluate(host=>host._testFrames);
    };

    // ExpandedDockedSearchBar: 4 results (4 x 56dp) under a 1dp divider.
    await mount(`suggestions='${suggestions(4)}'`);
    equal(await page.locator('#search').evaluate(host => [host.shadowRoot.querySelector('.surface').getBoundingClientRect().height, getComputedStyle(host.shadowRoot.querySelector('.surface')).borderTopLeftRadius]), [56, '9999px'], 'collapsed CornerFull field');
    let frames = await record(true);
    const natural = 56 + 1 + 4 * 56, maxHeight = Math.round(720 * 2 / 3);
    ok(frames.every((f, i) => i === 0 || f.height >= frames[i - 1].height - 0.01), 'docked height grows monotonically');
    // While the limit lerp(56, 2/3 window, progress) is below 240dp the surface follows it.
    ok(frames.some(f => f.height > 56 && f.height < 240), 'height follows the progress limit');
    equal([frames.at(-1).height, frames.at(-1).radius, frames.at(-1).resultsHidden], [natural, '28px', false], 'docked expanded: content height, CornerExtraLarge');
    ok(frames.every(f => f.height <= maxHeight), 'at most 2/3 of the window');
    frames = await record(false, 900);
    ok(frames.every((f, i) => i === 0 || f.height <= frames[i - 1].height + 0.01) && frames.at(-1).height === 56 && frames.at(-1).resultsHidden, 'docked collapse');
    // At least 240dp (DockedExpandedTableMinHeight) once the limit allows.
    await mount(`suggestions='${suggestions(1)}'`);
    frames = await record(true);
    equal(frames.at(-1).height, 240, 'DockedExpandedTableMinHeight');
    // Long lists scroll inside the 2/3-window limit.
    await mount(`suggestions='${suggestions(20)}'`);
    frames = await record(true);
    equal(frames.at(-1).height, maxHeight, 'limited to 2/3 of the window');
    ok(await page.locator('#search').evaluate(host => { const t = host.shadowRoot.querySelector('.table'); return t.scrollHeight > t.clientHeight; }), 'table scrolls');
    // SlowSpatial (0.8 / 200) expansion takes longer than DefaultSpatial (0.8 / 380) collapse.
    const timing = await page.locator('#search').evaluate(host => {
      host.expanded = false; host._progress.finish(); host._tick();
      host.expanded = true; const a = host._progress.animation; const expand = [a.stiffness, a.dampingRatio];
      host._progress.finish(); host.expanded = false; const b = host._progress.animation; return { expand, collapse: [b.stiffness, b.dampingRatio] };
    });
    equal([Math.round(timing.expand[0]), Math.round(timing.expand[1] * 10) / 10, Math.round(timing.collapse[0]), Math.round(timing.collapse[1] * 10) / 10], [200, 0.8, 380, 0.8], 'rememberSearchBarState springs');

    // ExpandedDockedSearchBarWithGap: dropdown slides from half its height, content fades, scrim follows progress.
    await mount(`dropdown-gap-size suggestions='${suggestions(4)}'`);
    frames = await record(true);
    const shown = frames.filter(f => !f.resultsHidden);
    ok(shown.length > 2 && parseFloat(shown[0].translate.slice(11)) < -50, `dropdown starts half its height above ${shown.slice(0, 3).map(f => f.translate)}`);
    ok(frames.filter(f => f.resultsHidden && f.height > 56).every(f => f.progress <= 0.1 + 1e-3), 'dropdown appears above progress 0.1');
    equal([frames.at(-1).translate, frames.at(-1).opacity, frames.at(-1).scrim, frames.at(-1).height], ['translateY(0px)', '1', '1', 56 + 2 + 4 * 56], 'with-gap expanded');
    ok(frames.some(f => parseFloat(f.scrim) > 0 && parseFloat(f.scrim) < 1), 'scrim alpha follows progress');
    const gapSprings = await page.locator('#search').evaluate(host => { host._progress.finish(); host.expanded = false; const b = host._progress.animation; return [Math.round(b.stiffness), b.dampingRatio]; });
    equal([gapSprings[0], Math.round(gapSprings[1] * 10) / 10], [800, 0.6], 'with-gap collapse on FastSpatial');
    await page.clock.runFor(704);
    equal(await page.locator('#search').evaluate(host => [host.shadowRoot.querySelector('.results').hidden, host.shadowRoot.querySelector('.scrim').hidden]), [true, true], 'with-gap collapsed');

    // ExpandedFullScreenSearchBar: surface grows from the bar to the window.
    await mount(`full-screen suggestions='${suggestions(3)}'`);
    const bar = await page.locator('#search').evaluate(host => { const r = host.shadowRoot.querySelector('.surface').getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width }; });
    await page.locator('#search').evaluate(host => {
      const root = host.shadowRoot, frames = [], start = performance.now();
      host._testFrames = frames;
      host.expanded = true;
      const step = now => {
        const s = root.querySelector('.fs-surface').getBoundingClientRect(), f = root.querySelector('.fs-field').getBoundingClientRect();
        frames.push({ open: root.querySelector('.fs-layer').open, left: s.left, top: s.top, width: s.width, height: s.height,
          radius: parseFloat(getComputedStyle(root.querySelector('.fs-surface')).borderTopLeftRadius) || 0,
          field: [f.left, f.top, f.width], content: parseFloat(root.querySelector('.fs-content').style.opacity || '0'),
          contentTop: root.querySelector('.fs-content').getBoundingClientRect().top, focused: root.activeElement?.classList.contains('input') });
        if (now - start < 1300) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    await page.clock.runFor(1344);
    const full = await page.locator('#search').evaluate(host=>host._testFrames);
    const open = full.filter(f => f.open), last = full.at(-1);
    ok(open.length && Math.abs(open[0].width - bar.width) < 40 && open[0].radius > 20, `starts at the bar ${JSON.stringify(open[0])}`);
    equal([last.left, last.top, last.width, last.height, last.radius], [0, 0, 900, 720, 0], 'full window, rectangle');
    equal([last.field, last.contentTop, last.content, last.focused], [[0, 8, 900], 72, 1, true], 'field at 8dp, content below 8dp padding, focused');
    ok(open.every((f, i) => i === 0 || f.radius <= open[i - 1].radius + 1e-3), 'corner radius 28dp x (1 - progress)');
    equal(await page.locator('#search').evaluate(host => [host.shadowRoot.querySelector('.back').hidden, host.shadowRoot.querySelector('.leading-default').hidden]), [false, true], 'back button while expanded');
    await page.keyboard.press('Escape');
    await page.clock.runFor(912);
    equal(await page.locator('#search').evaluate(host => [host.expanded, host.shadowRoot.querySelector('.fs-layer').open, host.shadowRoot.querySelector('.surface').contains(host.shadowRoot.querySelector('.field')), host.shadowRoot.querySelector('.back').hidden]), [false, false, true, true], 'Escape collapses and restores the bar');

    // Reduced motion finishes at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(`suggestions='${suggestions(4)}'`);
    equal(await page.locator('#search').evaluate(host => { host.expanded = true; return host.shadowRoot.querySelector('.surface').getBoundingClientRect().height; }), natural, 'reduced motion');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    assert.deepEqual(errors, []);
    console.log(`Search: ${checks} Expressive SearchBarState checks (docked height limit/minimum/scrolling, SlowSpatial/DefaultSpatial and with-gap DefaultSpatial/FastSpatial springs, dropdown slide/fade/scrim, full-screen morph/padding/focus/Escape, reduced motion) passed.`);
  } finally { await page.close(); }
}
