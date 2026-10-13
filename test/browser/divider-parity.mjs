import assert from 'node:assert/strict';

// HorizontalDivider / VerticalDivider at a095da93: DividerDefaults.Thickness
// (1dp) in OutlineVariant, the spec insets, a given thickness, and Dp.Hairline:
// no layout size and a one-device-pixel stroke.
export async function testDividerParity(browser, base, { page: url = '/test/browser/fixtures/toolbars.html' } = {}) {
  let checks = 0;
  const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
  for (const scale of [1, 2]) {
    const context = await browser.newContext({ viewport: { width: 600, height: 400 }, deviceScaleFactor: scale });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
      await page.goto(base + url);
      await page.evaluate(() => customElements.whenDefined('md-divider'));
      await page.evaluate(() => {
        document.querySelector('#fixture').innerHTML = `<div id="box" style="width:300px">
          <md-divider id="full"></md-divider><md-divider id="inset" inset></md-divider><md-divider id="middle" inset="middle"></md-divider>
          <md-divider id="thick" thickness="3" color="rgb(255, 0, 0)"></md-divider><md-divider id="hair" thickness="hairline"></md-divider></div>
          <div style="display:flex;height:80px"><md-divider id="vertical" vertical></md-divider><md-divider id="vhair" vertical thickness="0"></md-divider></div>`;
      });
      const read = id => page.locator('#' + id).evaluate(host => {
        const line = host.shadowRoot.querySelector('.line'), box = document.querySelector('#box').getBoundingClientRect(), r = line.getBoundingClientRect(), h = host.getBoundingClientRect();
        const drawn = getComputedStyle(line, '::before');
        return { host: [h.width, h.height], line: [r.left - box.left, r.width, r.height], color: getComputedStyle(line).backgroundColor,
          hairline: line.classList.contains('hairline') ? [drawn.height, drawn.width, drawn.backgroundColor] : null };
      });
      const outlineVariant = await page.evaluate(() => { const p = document.createElement('span'); document.body.append(p); p.style.color = 'var(--md-sys-color-outline-variant)'; const c = getComputedStyle(p).color; p.remove(); return c; });
      equal(await read('full'), { host: [300, 1], line: [0, 300, 1], color: outlineVariant, hairline: null }, `${scale}x full width, 1dp, OutlineVariant`);
      equal((await read('inset')).line, [16, 284, 1], `${scale}x inset: 16dp at the start`);
      equal((await read('middle')).line, [16, 268, 1], `${scale}x middle inset: 16dp at both ends`);
      equal(await read('thick'), { host: [300, 3], line: [0, 300, 3], color: 'rgb(255, 0, 0)', hairline: null }, `${scale}x given thickness and color`);
      const hair = await read('hair');
      equal([hair.host, hair.line[2], hair.hairline[0], hair.hairline[2]], [[300, 0], 0, `${1 / scale}px`, outlineVariant], `${scale}x Dp.Hairline: no layout size, one device pixel`);
      const vertical = await page.locator('#vertical').evaluate(host => { const r = host.shadowRoot.querySelector('.line').getBoundingClientRect(); return [r.width, r.height]; });
      equal(vertical, [1, 80], `${scale}x vertical: 1dp wide, fills the height`);
      const vhair = await page.locator('#vhair').evaluate(host => { const line = host.shadowRoot.querySelector('.line'); return [line.getBoundingClientRect().width, getComputedStyle(line, '::before').width]; });
      equal(vhair, [0, `${1 / scale}px`], `${scale}x vertical hairline`);
      equal(await page.locator('#full').evaluate(host => host.shadowRoot.querySelector('.line').getAttribute('aria-hidden')), 'true', 'no semantics');
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
  console.log(`Divider: ${checks} thickness, inset, color, vertical and Dp.Hairline checks passed at 1x and 2x.`);
}
