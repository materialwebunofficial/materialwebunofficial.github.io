import assert from 'node:assert/strict';
import fs from 'node:fs';

// SliderDefaults.Track / Thumb parameters on md-slider: the drawn SVG equals
// the unchanged Kotlin drawTrack output for those parameters
// (tools/androidx-sliders/track-parameters-snapshot.mjs), and the layout follows
// SliderImpl: max(track, thumb) across, at least 48dp, the track inset by half
// the thumb along it, a stepped thumb placed by the track corner.
export async function testSliderTrackParameters(browser, base, { page: url = '/test/browser/fixtures/toolbars.html' } = {}) {
  const oracle = JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/sliders/track-parameters-oracle.json', import.meta.url), 'utf8'));
  const page = await browser.newPage({ viewport: { width: 960, height: 900 } }), errors = [];
  let checks = 0;
  const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
  const near = (actual, expected, label, tolerance = .01) => { assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} vs ${expected}`); checks++; };
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(base + url);
    await page.evaluate(() => customElements.whenDefined('md-slider'));
    await page.evaluate(() => { document.querySelector('#fixture').innerHTML = '<md-slider id="slider" value="65" aria-label="Volume" style="width:248px"></md-slider>'; });
    const slider = page.locator('#slider');
    const set = attributes => slider.evaluate((n, attributes) => {
      for (const name of ['track-height', 'track-corner-size', 'track-inside-corner-size', 'thumb-track-gap', 'stop-indicator', 'thumb-width', 'thumb-height']) n.removeAttribute(name);
      for (const [name, value] of Object.entries(attributes)) n.setAttribute(name, String(value));
      return new Promise(r => requestAnimationFrame(() => r()));
    }, attributes);

    // Drawn arguments against the executed source for horizontal 240px cases.
    let compared = 0;
    for (const c of oracle.filter(c => c.length === 240 && c.mode !== 'vertical' && !c.rtl)) {
      await slider.evaluate((n, c) => { n.range = c.mode === 'range'; n.centered = c.mode === 'centered'; n.steps = c.steps; n.style.width = `${240 + c.handle}px`;
        if (n.range) { n.rangeStart = c.start * 100; n.rangeEnd = c.end * 100; } else n.value = c.mode === 'centered' ? -100 + c.end * 200 : c.end * 100;
        if (n.centered) { n.min = -100; n.max = 100; } else { n.min = 0; n.max = 100; } }, c);
      // Track(trackCornerSize) always shrinks corners; a given corner without shrinking has no public API.
      const centered = c.mode === 'centered', cornerGiven = centered ? c.corner !== c.thickness / 2 : c.shrink;
      if (!centered && !c.shrink && c.corner !== c.thickness / 2) continue;
      await set({ 'track-height': c.thickness, ...(cornerGiven ? { 'track-corner-size': c.corner } : {}),
        'track-inside-corner-size': c.insideCorner, 'thumb-track-gap': c.gap, 'thumb-width': c.handle, ...(c.stopIndicators ? {} : { 'stop-indicator': 'false' }) });
      const actual = await slider.evaluate(n => ({ fraction: n.range ? [n.rangeStart, n.rangeEnd] : [n.value], paths: n._layout.paths.map(p => ['path', p.role, p.bounds.left, p.bounds.top, p.bounds.right, p.bounds.bottom, ...p.radii.map(r => r[0])]),
        dots: [...n.shadowRoot.querySelectorAll('circle')].map(d => [Number(d.getAttribute('cx')), Number(d.getAttribute('cy'))]) }));
      // Discrete sliders snap; compare only values that sit on the case's fraction.
      const expectedValue = c.mode === 'range' ? [c.start * 100, c.end * 100] : [c.mode === 'centered' ? -100 + c.end * 200 : c.end * 100];
      if (actual.fraction.some((v, i) => Math.abs(v - expectedValue[i]) > 1e-4)) continue;
      const paths = c.records.filter(r => r[0] === 'path'), dots = c.records.filter(r => r[0] === 'circle');
      assert.equal(actual.paths.length, paths.length, JSON.stringify({ ...c, records: undefined }));
      actual.paths.forEach((r, i) => r.forEach((v, j) => typeof v === 'number' ? near(v, paths[i][j], `path ${i}/${j}`, 1e-4) : assert.equal(v, paths[i][j])));
      equal(actual.dots.length, dots.length, 'stop indicator and tick count');
      actual.dots.forEach((d, i) => d.forEach((v, j) => near(v, dots[i][j + 2], `dot ${i}/${j}`, 1e-4)));
      compared++;
    }
    assert.ok(compared >= 40, `compared ${compared} source cases`);

    // Layout: an Expressive-sized track and thumb (SliderWithTrackIconsSample: 36dp track, 12dp corner).
    await slider.evaluate(n => { n.range = false; n.centered = false; n.steps = 0; n.min = 0; n.max = 100; n.value = 50; n.style.width = '248px'; });
    await set({ 'track-height': 36, 'track-corner-size': 12, 'stop-indicator': 'false', 'thumb-width': 8, 'thumb-height': 56 });
    let box = await slider.evaluate(n => {
      const r = n.shadowRoot.querySelector('.slider-root').getBoundingClientRect(), t = n.shadowRoot.querySelector('.track-box').getBoundingClientRect(), th = n.shadowRoot.querySelector('.thumb:not([hidden])').getBoundingClientRect();
      return { host: n.getBoundingClientRect().height, root: r.height, track: [t.left - r.left, t.top - r.top, t.width, t.height], thumb: [th.width, th.height, th.left + th.width / 2 - r.left, th.top - r.top], dots: n.shadowRoot.querySelectorAll('circle.stop').length };
    });
    equal(box, { host: 56, root: 56, track: [4, 10, 240, 36], thumb: [8, 56, 124, 0], dots: 0 }, 'max(track, thumb) across; track inset by half the thumb and centered; no stop indicator');
    await slider.locator('.slider-root').focus();
    near(await slider.evaluate(n => n.shadowRoot.querySelector('.thumb:not([hidden]) .handle').getBoundingClientRect().width), 4, 'focused thumb is half as wide');
    // Pointer mapping uses the same inset (SliderState.updateDimensions).
    const root = await slider.locator('.slider-root').boundingBox();
    await page.mouse.click(root.x + 4, root.y + 28);
    equal(await slider.evaluate(n => n.value), 0, 'a tap at half the thumb is the minimum');
    await page.mouse.click(root.x + 244, root.y + 28);
    equal(await slider.evaluate(n => n.value), 100, 'and at the end less half the thumb, the maximum');
    // A stepped thumb is placed by the corner size (CornerSizeAlignmentLine).
    await slider.evaluate(n => { n.steps = 3; n.value = 25; });
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => r())));
    const center = await slider.evaluate(n => { const r = n.shadowRoot.querySelector('.slider-root').getBoundingClientRect(), th = n.shadowRoot.querySelector('.thumb:not([hidden])').getBoundingClientRect(); return th.left + th.width / 2 - r.left; });
    equal(center, 4 + Math.round((240 - 24) * .25) + 12, 'stepped thumb offset with a 12dp corner');

    // Vertical: the thumb-height is across the track; the host takes the cross size.
    await slider.evaluate(n => { n.steps = 0; n.orientation = 'vertical'; n.style.width = ''; n.style.height = '248px'; });
    await set({ 'track-height': 40, 'thumb-height': 52 });
    box = await slider.evaluate(n => { const r = n.shadowRoot.querySelector('.slider-root').getBoundingClientRect(), t = n.shadowRoot.querySelector('.track-box').getBoundingClientRect(), th = n.shadowRoot.querySelector('.thumb:not([hidden])').getBoundingClientRect();
      return { host: n.getBoundingClientRect().width, track: [t.left - r.left, t.top - r.top, t.width, t.height], thumb: [th.width, th.height] }; });
    equal(box, { host: 52, track: [6, 2, 40, 244], thumb: [52, 4] }, 'vertical track and thumb');
    // Defaults stay the 16dp track and the 4 x 44dp thumb in 48dp.
    await slider.evaluate(n => { n.orientation = 'horizontal'; n.style.height = ''; n.style.width = '248px'; });
    await set({});
    box = await slider.evaluate(n => { const r = n.shadowRoot.querySelector('.slider-root').getBoundingClientRect(), t = n.shadowRoot.querySelector('.track-box').getBoundingClientRect();
      return [r.height, t.left - r.left, t.top - r.top, t.width, t.height]; });
    equal(box, [48, 2, 16, 244, 16], 'defaults unchanged');
    assert.deepEqual(errors, []);
    console.log(`Slider Track/Thumb parameters: ${compared} drawn cases equal the executed source; ${checks} layout, inset, stepping and orientation checks passed.`);
  } finally { await page.close(); }
}
