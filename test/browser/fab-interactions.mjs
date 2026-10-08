import assert from 'node:assert/strict';
import fs from 'node:fs';
const oracle = JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/ripple/interaction-oracle.json', import.meta.url)), (key, value) => typeof value === 'number' ? Math.fround(value) : value);
const nativeElevation = (fromKind, toKind, from, to) => oracle.elevations.find(c => c.fromKind === fromKind && c.toKind === toKind && c.from === from && c.to === to);
const nativeAlpha = (fromKind, toKind, from, to) => oracle.layers.find(c => c.fromKind === fromKind && c.toKind === toKind && c.from === Math.fround(from) && c.to === Math.fround(to));
const near = (actual, expected, message, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);

export async function testFabInteractions(browser, base) {
  const page = await browser.newPage({viewport: {width: 960, height: 800}}), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.__fabTime = 0; window.__fabJobs = new Map(); let id = 0;
    performance.now = () => window.__fabTime;
    requestAnimationFrame = callback => { const key = ++id; window.__fabJobs.set(key, callback); return key; };
    cancelAnimationFrame = key => window.__fabJobs.delete(key);
    window.__fabFrame = time => { window.__fabTime = time; const jobs = [...window.__fabJobs.values()]; window.__fabJobs.clear(); for (const callback of jobs) callback(time); };
  });
  try {
    await page.goto(base + '/test/browser/fixtures/toolbars.html');
    await page.evaluate(async () => { await customElements.whenDefined('md-fab'); await document.fonts.ready; document.querySelector('#fixture').innerHTML = '<md-theme id="scope"><md-fab id="fab" size="baseline" aria-label="Create"></md-fab></md-theme>'; });
    const host = page.locator('#fab'), button = host.locator('button');
    const frame = time => page.evaluate(t => window.__fabFrame(t), time);
    const elevation = () => button.evaluate(node => Number(node.dataset.elevation));
    const alpha = () => button.evaluate(node => Number(getComputedStyle(node, '::before').opacity));
    const pointer=async(target,type)=>target.evaluate((b,type)=>{const r=b.getBoundingClientRect();b.dispatchEvent(new PointerEvent(type,{pointerId:83,pointerType:'mouse',button:0,isPrimary:true,bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2}));},type);
    assert.equal(await elevation(), 6);
    await pointer(button,'pointerenter');
    const entry = nativeElevation(null, 'hover', 6, 8);
    for (const [time, expected] of entry.frames) {
      await frame(time); assert.equal(await elevation(), expected, 'native incoming FAB elevation');
      const lengths = await button.evaluate(node => [...getComputedStyle(node).boxShadow.matchAll(/(-?[\d.]+)px/g)].map(match => Number(match[1])));
      near(lengths[1], 1 + (expected - 6) / 2, 'rendered CSS shadow follows native elevation', 2e-5);
      near(lengths[5], 4 + expected - 6, 'rendered second CSS shadow follows native elevation', 2e-5);
    }
    near(await alpha(), .08, 'hover opacity');
    assert.equal(await page.evaluate(() => window.__fabJobs.size), 0, 'settled hover has no perpetual frame loop');
    await pointer(button,'pointerleave');
    const exit = nativeElevation('hover', null, 8, 6);
    for (const [time, expected] of exit.frames) { await frame(200 + time); assert.equal(await elevation(), expected, 'native outgoing FAB elevation'); }
    near(await alpha(), 0, 'hover exit');

    // Interrupt source hover elevation with press, using independently sampled
    // Kotlin start values. Releasing to the same target must not restart it.
    for (const [index, history] of oracle.interrupted.entries()) {
      const start = 1000 + index * 700;
      await frame(start); await pointer(button,'pointerenter'); await frame(start + history.cut);
      assert.equal(await elevation(), history.from);
      await pointer(button,'pointerdown');
      for (const [time, expected] of history.frames) { await frame(start + history.cut + time); assert.equal(await elevation(), expected, 'native interrupted hover-to-press'); }
      await pointer(button,'pointercancel'); await pointer(button,'pointerleave'); await frame(start + 600);
    }

    // Most recent active interaction wins for elevation. Press does not enter
    // the separate hover/focus state-layer ordering.
    await frame(4000); await pointer(button,'pointerdown');
    await pointer(button,'pointerenter'); await frame(4120);
    assert.equal(await elevation(), 8, 'hover starting after press controls elevation');
    near(await alpha(), .08, 'press leaves hover state-layer ordering intact');
    await pointer(button,'pointerleave'); await frame(4240);
    assert.equal(await elevation(), 6, 'removing hover reveals the still-active press');
    await pointer(button,'pointercancel'); await frame(4500);

    await page.keyboard.press('Tab'); assert.equal(await button.evaluate(node => node.matches(':focus-visible')), true);
    const focused = nativeAlpha(null, 'focus', 0, .1);
    for (const [time, expected] of focused.frames) { await frame(4500 + time); near(await alpha(), expected, 'native 45ms focus entry'); }
    assert.equal(await button.evaluate(node => getComputedStyle(node).outlineStyle), 'none', 'source default focus uses opacity instead of an extra outside ring');
    await host.evaluate(node => { node._button = node.shadowRoot.querySelector('button'); node.label = 'Live action'; node.contentColor = 'rgb(10 20 30 / .2)'; });
    assert.equal(await host.evaluate(node => node.shadowRoot.querySelector('button') === node._button), true);
    const opaque = await button.evaluate(node => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1; const ctx = canvas.getContext('2d'); ctx.fillStyle = getComputedStyle(node, '::before').backgroundColor; ctx.fillRect(0, 0, 1, 1); return Array.from(ctx.getImageData(0, 0, 1, 1).data); });
    assert.deepEqual(opaque, [10, 20, 30, 255], 'state-layer color replaces content alpha');
    await pointer(button,'pointerenter'); await frame(4701);
    near(await alpha(), nativeAlpha('focus', 'hover', .1, .08).frames.find(record => record[0] === 1)[1], 'new hover supersedes older focus opacity');
    await pointer(button,'pointerleave'); await frame(4750);
    near(await alpha(), .1, 'removing hover restores the still-active focus'); await frame(4800);
    await button.evaluate(node => node.blur());
    const unfocused = nativeAlpha('focus', null, .1, 0);
    for (const [time, expected] of unfocused.frames) { await frame(4800 + time); near(await alpha(), expected, 'native 15ms focus exit'); }

    await frame(5000); await pointer(button,'pointerenter'); await frame(5016);
    await host.evaluate(node => node.lowered = true);
    assert.equal(await elevation(), 3, 'new lowered elevation snaps the current hover target');
    assert.equal(await page.evaluate(() => window.__fabJobs.size), 0, 'configuration snap retires the previous frame immediately');
    await pointer(button,'pointerleave'); await frame(5240); assert.equal(await elevation(), 1);
    await host.evaluate(node => node.disabled = true); assert.equal(await elevation(), 0);
    await host.evaluate(node => node.disabled = false); assert.equal(await elevation(), 1, 'enabling restores default elevation immediately');

    await page.emulateMedia({reducedMotion: 'reduce'}); await pointer(button,'pointerenter');
    assert.equal(await elevation(), 3); near(await alpha(), .08, 'reduced motion retains static hover indication');
    await pointer(button,'pointerleave'); assert.equal(await elevation(), 1);
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await pointer(button,'pointerenter'); await frame(5272);
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.waitForFunction(() => document.querySelector('#fab').shadowRoot.querySelector('button').dataset.elevation === '3', null, {polling: 10});
    assert.equal(await elevation(), 3, 'midflight reduced motion settles');
    await pointer(button,'pointerleave');
    await page.emulateMedia({reducedMotion: 'no-preference'});

    // Live token values are resolved through the actual inherited scope.
    await page.locator('#scope').evaluate(node => node.style.setProperty('--md-sys-elevation-level-1', '0px 11px 2px rgb(12 34 56 / .4)'));
    assert.match(await button.evaluate(node => getComputedStyle(node).boxShadow), /11px/);
    await host.evaluate(node => { const parent = node.parentElement; node.remove(); parent.append(node); });
    assert.equal(await elevation(), 1); assert.equal(await button.locator('span[aria-hidden="true"][style*="display: none"]').count(), 2, 'reconnect has one pair of shadow probes');
    await pointer(button,'pointerenter'); await frame(5400); assert.equal(await elevation(), 3);
    await host.evaluate(node => node.remove()); await frame(5700);
    assert.equal(await page.evaluate(() => window.__fabJobs.size), 0, 'detach cancels all interaction frames');

    await page.locator('#fixture').evaluate(node => node.innerHTML = '<md-toolbar id="toolbar" variant="floating" expanded><md-fab id="toolbar-fab" slot="fab" size="baseline" aria-label="Create"></md-fab></md-toolbar>');
    const toolbarFab = page.locator('#toolbar-fab').locator('button');
    await page.waitForFunction(() => document.querySelector('#toolbar-fab').shadowRoot.querySelector('button').dataset.elevation === '3');
    await pointer(toolbarFab,'pointerenter'); await frame(5820);
    assert.equal(await toolbarFab.evaluate(node => Number(node.dataset.elevation)), 6, 'native toolbar helper uses Level2/Level3');
    await page.locator('#toolbar').evaluate(node => node.remove()); await frame(6000);
    assert.deepEqual(errors, []);
    console.log('FAB interactions browser: native incoming/outgoing/interrupted elevation, recent interactions, independent 15/45ms layers, opaque live color, lowered/toolbar targets, focus, updates, reduced motion and disposal passed.');
  } finally { await page.close(); }
}
