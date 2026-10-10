import assert from 'node:assert/strict';
import fs from 'node:fs';
const cases = JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/fab/expansion-oracle.json', import.meta.url)), (key, value) => typeof value === 'number' ? Math.fround(value) : value);
const near = (value, expected, message) => assert.ok(Math.abs(value - expected) < 2e-6, `${message}: ${value} vs ${expected}`);

export async function testFabExpansion(browser, base) {
  const page = await browser.newPage({viewport: {width: 1000, height: 800}}), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.__fabClock = 0; window.__fabFrames = new Map(); let next = 0;
    performance.now = () => window.__fabClock;
    requestAnimationFrame = callback => { const id = ++next; window.__fabFrames.set(id, callback); return id; };
    cancelAnimationFrame = id => window.__fabFrames.delete(id);
    window.__fabSample = time => { window.__fabClock = time; const frames = [...window.__fabFrames.values()]; window.__fabFrames.clear(); for (const frame of frames) frame(time); };
  });
  try {
    await page.goto(base + '/test/browser/fixtures/toolbars.html');
    await page.evaluate(async () => {
      await customElements.whenDefined('md-fab');
      document.querySelector('#fixture').innerHTML = '<md-fab label="Action" aria-label="Create"></md-fab>';
      await document.fonts.ready;
      document.querySelector('#fixture').replaceChildren();
    });
    const actual = await page.evaluate(cases => {
      const fixture = document.querySelector('#fixture');
      return cases.map((c, index) => {
        const start = index * 2000;
        window.__fabSample(start);
        const size = c.baseline ? 'baseline' : c.minimum === 56 ? 'small' : c.minimum === 80 ? 'medium' : 'large';
        fixture.innerHTML = `<div data-motion-scheme="${c.scheme}"><md-fab variant="extended" size="${size}" label="Action" expanded="${c.initial}" aria-label="Create document"></md-fab></div>`;
        const host = fixture.querySelector('md-fab'), button = host.shadowRoot.querySelector('button');
        // Native scalar fixtures supply an integer intrinsic width. Set the text
        // metric explicitly so browser font shaping is outside that comparison.
        const gap = c.baseline ? 12 : c.minimum === 56 ? 8 : c.minimum === 80 ? 12 : 16;
        host.shadowRoot.querySelector('.lbl').style.width = `${c.labelWidth - gap + (!c.baseline && c.minimum === 96 ? 4 : 0)}px`;
        host._sync();
        if (c.initial) { host._expansion.finish(); host._tickExpansion(start); }
        let eventIndex = 0;
        const frames = c.frames.map(([time]) => {
          window.__fabSample(start + time);
          if (eventIndex < c.events.length && c.events[eventIndex][0] === time) host.expanded = c.events[eventIndex++][1];
          const clip = host.shadowRoot.querySelector('.label-clip');
          return [button.getBoundingClientRect().width, Number(getComputedStyle(clip).opacity), !clip.hidden, host._expansionFrame !== null, button.getBoundingClientRect().height, getComputedStyle(button).borderRadius];
        });
        host.remove();
        return frames;
      });
    }, cases);
    let frames = 0;
    for (const [index, c] of cases.entries()) for (const [i, record] of c.frames.entries()) {
      const [time, , alpha, width, composed, running] = record, value = actual[index][i], context = `${c.scheme}/${c.baseline}/${c.minimum}/${JSON.stringify(c.events)}/${time}`;
      assert.equal(value[0], width, context + ' rendered native width');
      near(value[1], Math.max(0, Math.min(1, alpha)), context + ' rendered native alpha');
      assert.equal(value[2], composed, context + ' label composition');
      assert.equal(value[3], running, context + ' only native running channels request frames');
      assert.equal(value[4], c.minimum, context + ' height survives collapse');
      assert.equal(value[5], `${c.minimum === 56 ? 16 : c.minimum === 80 ? 20 : 28}px`, context + ' shape survives collapse');
      frames++;
    }
    const defaultDimensions = await page.evaluate(() => {
      const fixture = document.querySelector('#fixture');
      fixture.innerHTML = '<md-fab id="default" aria-label="Create"></md-fab><md-fab id="invalid" size="constructor" aria-label="Create"></md-fab><md-fab id="large" size="large" aria-label="Create"></md-fab><md-fab id="text" variant="extended" icon="" label="Compose" expanded="false"></md-fab>';
      return [...fixture.querySelectorAll('md-fab')].map(host => { const b = host.shadowRoot.querySelector('button'); return [b.getBoundingClientRect().height, getComputedStyle(b.querySelector('.material-symbols-outlined')).fontSize, host.shadowRoot.querySelector('.label-clip').hidden, b.getAttribute('aria-label')]; });
    });
    assert.deepEqual(defaultDimensions, [[56,'24px',true,'Create'],[56,'24px',true,'Create'],[96,'36px',true,'Create'],[56,'24px',false,'Compose']]);

    const unscaled = await page.locator('#text').locator('button').evaluate(button => button.style.width);
    await page.locator('#text').evaluate(host => { host.parentElement.style.transform = 'scale(.75)'; host._sync(); });
    assert.equal(await page.locator('#text').locator('button').evaluate(button => button.style.width), unscaled, 'intrinsic measurement uses logical layout, independent of ancestor scaling');
    await page.locator('#text').evaluate(host => host.parentElement.style.transform = '');

    await page.evaluate(() => {
      document.querySelector('#fixture').innerHTML = '<md-fab id="live" size="small" variant="extended" label="Compose"></md-fab>';
      const host = document.querySelector('#live'); host._savedButton = host.shadowRoot.querySelector('button'); host.focus(); host.expanded = false;
      window.__fabSample(200000); host.expanded = true;
    });
    await page.emulateMedia({reducedMotion: 'reduce'});
    const reduced = await page.locator('#live').evaluate(host => [host._expansionFrame, host._expansion.width.animation, host._expansion.alpha.animation, host.shadowRoot.activeElement === host._savedButton, !host.shadowRoot.querySelector('.label-clip').hidden]);
    assert.deepEqual(reduced, [null,null,null,true,true]);
    await page.locator('#live').evaluate(host => { host.expanded = false; });
    assert.equal(await page.locator('#live').locator('button').evaluate(button => button.getBoundingClientRect().width), 56);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.locator('#live').evaluate(host => { host.expanded = true; const parent = host.parentElement; host.remove(); parent.append(host); });
    assert.equal(await page.locator('#live').evaluate(host => host._expansionFrame), null, 'reconnection starts at the current state');
    await page.locator('#live').evaluate(host => { const parent = host.parentElement; host.remove(); host.expanded = false; host.expanded = true; parent.append(host); });
    assert.equal(await page.locator('#live').evaluate(host => Boolean(host._expansion.width.animation || host._expansion.alpha.animation)), false, 'offline changes reconnect at the current state');
    await page.locator('#live').evaluate(host => { host.expanded = false; host.remove(); });
    assert.equal(await page.evaluate(() => window.__fabFrames.size), 0, 'detaching retires expansion and interaction RAFs');
    assert.deepEqual(errors, []);
    console.log(`FAB expansion browser: ${frames} native rendered width/alpha frames, retained dimensions, default/icon sizes, text-only content, focus, reduced motion, reconnection and disposal passed.`);
  } finally { await page.close(); }
}

export async function testFabShowcase(browser, base) {
  const page = await browser.newPage({viewport:{width:1440,height:1100}}), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base + '/#extended-fabs', {waitUntil:'domcontentloaded'});
    await page.evaluate(async () => { await customElements.whenDefined('md-fab'); await document.fonts.ready; });
    const examples = page.locator('#extended-fab-examples'), control = page.locator('[data-fab-toggle="extended-fab-examples"]');
    for (const width of [1440,390]) for (const mode of ['light','dark']) {
      await page.setViewportSize({width,height:1100});
      await page.evaluate(mode => customElements.get('md-expressive-theme').applyGlobal({scheme:'expressive',colorMode:mode}), mode);
      await examples.locator('md-fab').evaluateAll(fabs => fabs.forEach(fab => fab.expanded = true));
      await page.waitForTimeout(800);
      assert.equal(await control.locator('button').getAttribute('aria-expanded'), 'true');
      await control.click(); await page.waitForTimeout(800);
      assert.deepEqual(await examples.locator('md-fab button').evaluateAll(buttons => buttons.map(button => [button.getBoundingClientRect().width,button.getBoundingClientRect().height])), [[56,56],[56,56],[80,80],[96,96]]);
      assert.equal(await control.locator('button').getAttribute('aria-expanded'), 'false');
      assert.equal(await control.locator('button').evaluate(b=>b.ariaControlsElements?.map(n=>n.id).join(' ')), 'extended-fab-examples');
      await control.press('Enter'); await page.waitForTimeout(800);
      assert.equal(await control.locator('button').getAttribute('aria-expanded'), 'true');
      const geometry = await examples.locator('md-fab button').evaluateAll(buttons => buttons.map(button => [button.getBoundingClientRect().width,button.getBoundingClientRect().height,button.querySelector('.label-clip').hidden]));
      assert.ok(geometry.every(([w,h,hidden]) => w > h && !hidden));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no showcase document overflow');
      assert.equal(await page.locator('#ambientWaveCanvas').count(),1);
      await page.locator('#extended-fabs').screenshot({path:`research/fab-expansion-showcase-${width}-${mode}.png`});
    }
    assert.match(await page.locator('#extended-fabs .comp-code-box code').textContent(), /size="baseline".*label="Compose"/);
    assert.deepEqual(errors, []);
    console.log('FAB showcase: four live sizes, pointer/keyboard expansion controls, 1440/390 light/dark, accessible state, copied snippet and preserved homepage wave canvas passed.');
  } finally { await page.close(); }
}
