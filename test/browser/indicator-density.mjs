import assert from 'node:assert/strict';

/**
 * Zoom or a move to another display changes devicePixelRatio without resizing
 * the element. Every indicator canvas must follow the new density, and the
 * drawing must stay centered (a stale backing store crops or shrinks it).
 */
export async function testIndicatorDensity(browser, base) {
  let checks = 0;
  const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    // Headless CDP emulation updates devicePixelRatio without notifying
    // resolution media queries; a real zoom or display change does notify them.
    await page.addInitScript(() => {
      const native = window.matchMedia.bind(window), queries = [];
      window.matchMedia = query => { const list = native(query); if (/resolution/.test(query)) queries.push(list); return list; };
      window.notifyDensity = () => {
        const changed = queries.filter(list => !list.matches);
        for (const list of changed) { queries.splice(queries.indexOf(list), 1); list.dispatchEvent(new Event('change')); }
        return changed.length;
      };
    });
    await page.goto(base + '/test/browser/fixtures/toolbars.html');
    await page.waitForFunction(() => ['md-progress-indicator', 'md-loading-indicator'].every(tag => customElements.get(tag)), null, { timeout: 10000 });
    await page.evaluate(() => {
      document.querySelector('#fixture').innerHTML = `
        <md-progress-indicator id="linear-wavy" variant="wavy" value="60" style="display:block;width:200px"></md-progress-indicator>
        <md-progress-indicator id="linear" value="60" style="display:block;width:200px"></md-progress-indicator>
        <md-progress-indicator id="circular" type="circular" value="100"></md-progress-indicator>
        <md-progress-indicator id="circular-spin" type="circular" indeterminate></md-progress-indicator>
        <md-progress-indicator id="circular-wavy" type="circular" variant="wavy" indeterminate></md-progress-indicator>
        <md-loading-indicator id="loading" progress="1" size="large"></md-loading-indicator>
        <md-loading-indicator id="loading-spin" size="large"></md-loading-indicator>`;
    });
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 50)))));
    await settle();
    const cdp = await page.context().newCDPSession(page);
    for (const dpr of [2, 1.5, 1]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: 640, height: 400, deviceScaleFactor: dpr, mobile: false });
      await page.evaluate(() => window.notifyDensity());
      await settle();
      const rows = await page.evaluate(() => [...document.querySelectorAll('#fixture > *')].map(host => {
        const canvas = host.shadowRoot.querySelector('canvas'), css = canvas.getBoundingClientRect();
        const ctx = canvas.getContext('2d'), { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let minX = width, minY = height, maxX = -1, maxY = -1;
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 24) {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
        return { id: host.id, dpr: devicePixelRatio, backing: [canvas.width, canvas.height], css: [css.width, css.height], box: maxX < 0 ? null : [minX, minY, maxX, maxY] };
      }));
      for (const row of rows) {
        assert.equal(row.dpr, dpr);
        assert.equal(row.backing[0], Math.round(row.css[0] * dpr), `${row.id} backing width at ${dpr}x: ${JSON.stringify(row)}`);
        assert.equal(row.backing[1], Math.round(row.css[1] * dpr), `${row.id} backing height at ${dpr}x: ${JSON.stringify(row)}`);
        assert.ok(row.box, `${row.id} drew nothing at ${dpr}x`);
        checks += 3;
        // Complete circles and the loading shape are centered in their canvas.
        if (row.id === 'circular' || row.id === 'loading') {
          const cx = (row.box[0] + row.box[2]) / 2, cy = (row.box[1] + row.box[3]) / 2;
          assert.ok(Math.abs(cx - row.backing[0] / 2) <= 2 && Math.abs(cy - row.backing[1] / 2) <= 2, `${row.id} drawing is off center at ${dpr}x: ${row.box}`);
          checks++;
        }
      }
    }
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
  console.log(`Indicator density: ${checks} checks across 2x, 1.5x and 1x`);
}
