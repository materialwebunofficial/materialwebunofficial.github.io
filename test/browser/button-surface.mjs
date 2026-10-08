import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';

const native = JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/button/surface-composition-oracle.json.gz', import.meta.url))));
const cssColor = argb => `rgba(${(argb >>> 16) & 255},${(argb >>> 8) & 255},${argb & 255},${(argb >>> 24) / 255})`;

export async function testButtonSurface(browser, base) {
  const page = await browser.newPage({viewport: {width: 700, height: 450}, reducedMotion: 'reduce'}), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let colorCases = 0, paintCases = 0;
  try {
    await page.goto(base + '/test/browser/fixtures/toolbars.html');
    await page.evaluate(async () => { await customElements.whenDefined('md-button'); await document.fonts.ready; });
    // Original Surface passes explicit content color and density-scaled shadow;
    // these cases exercise its independent parent-only tonal color channel.
    for (const reference of native.filter(c => c.input.density === 1 && !c.input.inset && c.input.tonal === 0 && c.input.shadow === 0 && !c.input.border)) {
      const background = reference.commands.find(c => c.kind === 'background');
      const actual = await page.evaluate(({input, container, expected}) => {
        const fixture = document.querySelector('#fixture'); fixture.replaceChildren();
        const host = document.createElement('md-button'); host.id = 'surface'; host.setAttribute('label', 'Surface');
        if (input.mode !== 'button') host.setAttribute('toggle', '');
        if (input.mode === 'on') host.setAttribute('selected', '');
        host.disabled = !input.enabled;
        fixture.style.setProperty('--md-absolute-tonal-elevation', String(input.parent));
        fixture.style.setProperty('--md-tonal-elevation-enabled', String(input.tonalEnabled));
        fixture.style.setProperty('--md-sys-color-surface', '#fffbfe');
        fixture.style.setProperty('--md-sys-color-surface-tint', '#6750a4');
        fixture.append(host);
        const button = host.shadowRoot.querySelector('.btn');
        button.style.setProperty('background-color', container);
        button.style.color = 'rgb(17, 34, 51)';
        host._surface.refresh();
        const probe = document.createElement('span'); probe.style.backgroundColor = expected; fixture.append(probe);
        const result = {actual: getComputedStyle(button).backgroundColor, expected: getComputedStyle(probe).backgroundColor, content: getComputedStyle(button).color, total: host._surface.resolved.total};
        probe.remove(); return result;
      }, {input: reference.input, container: cssColor(reference.input.background), expected: cssColor(background.argb)});
      assert.equal(actual.actual, actual.expected, JSON.stringify(reference.input));
      assert.equal(actual.content, 'rgb(17, 34, 51)', 'explicit Button content color survives Surface');
      assert.equal(actual.total, reference.absoluteElevation, 'original provided absolute tonal elevation');
      colorCases++;
    }

    await page.evaluate(() => {
      const fixture = document.querySelector('#fixture'); fixture.replaceChildren(); fixture.removeAttribute('style');
      fixture.innerHTML = '<md-button id="live" label="Live"></md-button>';
      fixture.style.setProperty('--md-absolute-tonal-elevation', '6');
      fixture.style.setProperty('--md-sys-color-primary', 'var(--md-sys-color-surface)');
      const h = document.querySelector('#live'); h._surface.refresh(); h._saved = h.shadowRoot.querySelector('.btn'); h._saved.focus();
    });
    const live = page.locator('#live');
    const before = await live.evaluate(h => getComputedStyle(h._saved).backgroundColor);
    await page.locator('#fixture').evaluate(f => f.style.setProperty('--md-tonal-elevation-enabled', 'false'));
    await page.waitForFunction(before => getComputedStyle(document.querySelector('#live')._saved).backgroundColor !== before, before);
    const noOverlay = await live.evaluate(h => getComputedStyle(h._saved).backgroundColor);
    await page.locator('#fixture').evaluate(f => f.style.setProperty('--md-tonal-elevation-enabled', 'true'));
    await page.waitForFunction(before => getComputedStyle(document.querySelector('#live')._saved).backgroundColor === before, before);
    await live.locator('.btn').hover();
    await page.waitForFunction(() => document.querySelector('#live')._elevationMotion.raf === null);
    assert.equal(await live.evaluate(h => getComputedStyle(h._saved).backgroundColor), before, 'hover shadow does not add tonal elevation');
    assert.notEqual(before, noOverlay);
    assert.equal(await live.evaluate(h => h._saved === h.shadowRoot.querySelector('.btn') && h.shadowRoot.activeElement === h._saved), true, 'theme updates retain actual control/focus');
    await live.evaluate(h => { h._saved.style.backgroundColor = 'rgb(12, 34, 56)'; });
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#live')._saved).backgroundColor === 'rgb(12, 34, 56)');
    assert.equal(await live.evaluate(h => {
      const controller = h._surface, probe = controller.probe, button = h._saved; window.retiredHost = h; window.retiredSurface = controller; h.remove();
      return controller.disposed && !probe.isConnected && button.style.backgroundColor === 'rgb(12, 34, 56)' && [...controller.children].every(c => !c.style.clipPath);
    }), true, 'retirement restores caller paint and removes owned content clips');
    assert.equal(await page.evaluate(() => {
      const h = window.retiredHost; document.querySelector('#fixture').append(h);
      return h._surface !== window.retiredSurface && h._saved === h.shadowRoot.querySelector('.btn') && getComputedStyle(h._saved).backgroundColor === 'rgb(12, 34, 56)';
    }), true, 'reconnection starts a new Surface binding on the same native control');

    await page.evaluate(() => { document.querySelector('#fixture').innerHTML = '<md-button id="shape-live" toggle label="Shape" icon="add"></md-button>'; });
    const shape = page.locator('#shape-live');
    const restingClip = await shape.evaluate(h => h.shadowRoot.querySelector('.lbl-wrapper').style.clipPath);
    await shape.locator('.btn').hover(); await page.mouse.down();
    const pressedClip = await shape.evaluate(h => h.shadowRoot.querySelector('.lbl-wrapper').style.clipPath);
    assert.notEqual(pressedClip, restingClip, 'real press updates content clipping with the source shape');
    await page.mouse.up();

    // Sample unmodified Chromium screenshots away from antialiased edges.
    // This proves the web clip paints the source-defined rounded surface;
    // it is not an Android shadow/text raster comparison.
    await page.mouse.move(650, 400);
    for (const toggle of [false, true]) for (const size of ['xs', 's', 'm', 'l', 'xl']) for (const scale of [1, 1.25]) {
      await page.evaluate(({toggle, size, scale}) => {
        const fixture = document.querySelector('#fixture'); fixture.removeAttribute('style'); fixture.replaceChildren();
        document.body.style.background = 'white';
        const host = document.createElement('md-button'); host.id = 'paint'; host.setAttribute('size', size);
        if (toggle) host.setAttribute('toggle', '');
        const bounds = toggle ? {xs:[104,52],s:[112,60],m:[128,72],l:[176,104],xl:[208,136]}[size] : [80,40];
        host.style.cssText = `width:${bounds[0]}px;height:${bounds[1]}px;transform:scale(${scale});transform-origin:top left;`;
        host.innerHTML = '<span id="overflow" style="display:block;width:200px;height:160px;flex:none;background:rgb(255,0,255);color:transparent">Overflow</span>';
        fixture.append(host);
        const button = host.shadowRoot.querySelector('.btn');
        if (!toggle) { const style = document.createElement('style'); style.textContent = '.btn{width:80px!important;height:40px!important;min-height:0!important;padding:0!important}'; host.shadowRoot.append(style); }
        button.style.backgroundColor = 'white';
        host.elevation = null; host._updateShape(); host._surface.refresh();
        window.paintHost = host;
      }, {toggle, size, scale});
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const geometry = await page.evaluate(scale => {
        const host = window.paintHost, button = host.shadowRoot.querySelector('.btn'); host._surface.clip();
        const r = button.getBoundingClientRect();
        const label = button.querySelector('.lbl-wrapper'), l = label.getBoundingClientRect();
        return {x: r.x, y: r.y, width: r.width, height: r.height, radius: parseFloat(getComputedStyle(button).borderRadius) * scale, clip: getComputedStyle(label).clipPath, label: {x:l.x,y:l.y,width:l.width,height:l.height}};
      }, scale);
      const screenshot = await page.screenshot();
      const samples = await page.evaluate(async ({base64, g}) => {
        const blob = await (await fetch('data:image/png;base64,' + base64)).blob();
        const bitmap = await createImageBitmap(blob), canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
        const context = canvas.getContext('2d'); context.drawImage(bitmap, 0, 0); bitmap.close();
        const points = [[g.x + g.width / 2, g.y + g.height / 2], [g.x + 1, g.y + 1], [g.x + g.width + 8, g.y + g.height / 2], [g.x + g.width / 2, g.y - 8], [g.x + g.width / 2, g.y + g.height + 8]];
        return points.map(([x, y]) => [...context.getImageData(Math.floor(x), Math.floor(y), 1, 1).data]);
      }, {base64: screenshot.toString('base64'), g: geometry});
      assert.deepEqual(samples[0], [255, 0, 255, 255], 'content remains visible inside ' + JSON.stringify({toggle, size, scale}));
      for (const outside of samples.slice(1)) assert.deepEqual(outside, [255, 255, 255, 255], 'overflow/corner paints are clipped ' + JSON.stringify({toggle, size, scale, geometry, samples}));
      paintCases++;
    }
    assert.deepEqual(errors, []);
    console.log(`Button Surface: ${colorCases} original parent-tonal color records, explicit content/live roles/hover separation/style ownership/disposal and ${paintCases} real overflow/corner paint cases passed.`);
  } finally { await page.close(); }
}
