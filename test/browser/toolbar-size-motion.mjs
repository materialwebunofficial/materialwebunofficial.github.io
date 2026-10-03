import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';

const fixture = new URL('../fixtures/androidx/toolbar-size-motion/', import.meta.url);
const read = name => JSON.parse(gunzipSync(fs.readFileSync(new URL(name, fixture))));
const geometry = read('layout-oracle.json.gz'), motion = read('size-oracle.json.gz');
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < .1, `${label}: ${actual} vs ${expected}`);

export async function testToolbarSizeMotion(browser, base) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } }), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base + '/test/browser/fixtures/toolbars.html');
    await page.evaluate(async () => { await customElements.whenDefined('md-toolbar'); await document.fonts.ready; });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    let previous = '', count = 0;
    for (const c of geometry) {
      const i = c.input, key = JSON.stringify([i.vertical, i.body, i.presence]);
      if (key !== previous) {
        await page.evaluate(i => {
          const parent = document.createElement('div'); parent.style.cssText = 'width:20000px;height:20000px;';
          const n = document.createElement('md-toolbar'); n.id = 'size-toolbar'; n.variant = 'floating'; n.orientation = i.vertical ? 'vertical' : 'horizontal';
          for (const [slot, body] of [['leading', i.body], ['main', 40], ...(i.presence === 3 ? [['trailing', 56]] : [])]) {
            const child = document.createElement('md-icon-button'); if (slot !== 'main') child.slot = slot;
            child.setAttribute('size', ({ 40: 's', 56: 'm', 96: 'l' })[body]); child.setAttribute('icon', 'edit'); n.append(child);
          }
          parent.append(n); document.getElementById('fixture').replaceChildren(parent);
        }, i);
        await page.waitForTimeout(16); previous = key;
      }
      const actual = await page.locator('#size-toolbar').evaluate((n, i) => {
        n.expanded = i.expanded; n.dir = i.rtl ? 'rtl' : 'ltr';
        const axis = i.vertical ? 'Height' : 'Width', cross = i.vertical ? 'Width' : 'Height';
        n.style['min' + axis] = i.minMain + 'px'; n.style['max' + axis] = i.maxMain + 'px';
        n.style['min' + cross] = i.minCross + 'px'; n.style['max' + cross] = i.maxCross + 'px';
        n._rowLines = null;
        const channels = n._motion.channels, saved = {};
        for (const name of ['leading', 'trailing']) {
          n._visibilityState[name] = ({ initial: 'PreEnter', visible: 'Visible', exit: 'Visible', disposed: 'PostExit', enter: 'PreEnter' })[i.state];
          n._alignment[name] = name === 'leading' ? i.leadCurrent : i.trailCurrent;
          for (const key of [name, name + 'Cross', name + 'Offset']) { saved[key] = channels[key].animation; channels[key].animation = i.settled ? null : {}; }
        }
        try {
          n._draw({ ...n._values, leading: i.sample, trailing: i.sample, leadingCross: i.cross, trailingCross: i.cross, leadingOffset: 0, trailingOffset: 0, padding: Number(!i.expanded) });
          const root = n._frame.getBoundingClientRect();
          const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x - root.x, y: r.y - root.y, width: r.width, height: r.height }; };
          const boxes = { root: { x: 0, y: 0, width: root.width, height: root.height }, balanced: rect(n._main), 'main-row': rect(n._groups.main) };
          for (const name of ['leading', 'main', 'trailing']) {
            if (name !== 'main' && (!i.composed || (name === 'trailing' && i.presence !== 3))) continue;
            if (name !== 'main') { boxes[name] = rect(n._clips[name]); boxes[name + '-row'] = rect(n._groups[name]); }
            const child = n._rowChildren[name][0]; boxes[name + '-row-0'] = rect(child); boxes[name + '-row-0-body'] = rect(child.shadowRoot.querySelector('button'));
          }
          return { size: { width: root.width, height: root.height }, boxes, composed: !!n._rowLayout.placements.leading, hidden: rect(n._clips.leading) };
        } finally { for (const [key, value] of Object.entries(saved)) channels[key].animation = value; }
      }, i);
      assert.deepEqual(actual.size, c.size, JSON.stringify(i)); assert.equal(actual.composed, i.composed);
      for (const [id, box] of Object.entries(actual.boxes)) for (const field of ['x', 'y', 'width', 'height']) near(box[field], c.placements[id][field], id + '.' + field + ' ' + JSON.stringify(i));
      if (!i.composed) assert.equal(actual.hidden.width + actual.hidden.height, 0);
      count++;
    }

    // Actual mutation/RAF timelines use the independent original vector values.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.clock.install({ time: new Date('2026-10-03T10:00:00Z') });
    await page.clock.pauseAt(new Date('2026-10-03T10:00:01.008Z'));
    let frames = 0;
    const live = motion.vectors.filter(c => c.stiffness === 400 && c.velocity.every(v => v === 0) && c.from.every(v => v === 48) && ((c.to[0] === 56 && c.to[1] === 56) || (c.to[0] === 48 && c.to[1] === 96)));
    for (const vertical of [false, true]) for (const rtl of [false, true]) for (const c of live) {
      await page.evaluate(({ vertical, rtl, c }) => {
        const parent = document.createElement('div'); parent.style.cssText = 'width:10000px;height:10000px;';
        const n = document.createElement('md-toolbar'); n.id = 'live-size-toolbar'; n.variant = 'floating'; n.orientation = vertical ? 'vertical' : 'horizontal'; n.dir = rtl ? 'rtl' : 'ltr'; n.expanded = true;
        const leading = document.createElement(c.to[0] === 56 ? 'md-icon-button' : 'div'); leading.slot = 'leading';
        if (leading.localName === 'md-icon-button') leading.setAttribute('icon', 'undo'); else leading.style.cssText = 'width:48px;height:48px;';
        const main = document.createElement('md-icon-button'); main.setAttribute('icon', 'edit'); n.append(leading, main); parent.append(n); document.getElementById('fixture').replaceChildren(parent);
      }, { vertical, rtl, c });
      await page.clock.runFor(512);
      await page.locator('#live-size-toolbar').evaluate((n, { vertical, c }) => {
        const child = n.querySelector('[slot=leading]'); n._savedButton = child.shadowRoot?.querySelector('button');
        if (child.localName === 'md-icon-button') child.setAttribute('size', 'm'); else child.style[vertical ? 'width' : 'height'] = '96px';
      }, { vertical, c });
      if (c.interrupt) {
        await page.clock.runFor(c.interrupt);
        await page.locator('#live-size-toolbar').evaluate((n, vertical) => {
          const child = n.querySelector('[slot=leading]');
          if (child.localName === 'md-icon-button') child.setAttribute('size', 's'); else child.style[vertical ? 'width' : 'height'] = '48px';
        }, vertical);
      }
      let previousMs = 0;
      for (const sample of c.samples.filter(s => [0, 16, 32, 64, 80, 128].includes(s.ms))) {
        if (sample.ms > previousMs) await page.clock.runFor(sample.ms - previousMs); previousMs = sample.ms;
        const actual = await page.locator('#live-size-toolbar').evaluate(n => ({
          size: [Math.max(0, Math.round(n._values.leading)), Math.max(0, Math.round(n._values.leadingCross))],
          duration: n._motion.channels.leading.animation?.duration, crossDuration: n._motion.channels.leadingCross.animation?.duration,
          buttonRetained: !n._savedButton || n.querySelector('[slot=leading]').shadowRoot.querySelector('button') === n._savedButton,
        }));
        assert.deepEqual(actual.size, sample.size, `live ${vertical}/${rtl} ${JSON.stringify(c)} at${sample.ms}`);
        if (!sample.finished) { assert.equal(actual.duration, c.duration); assert.equal(actual.crossDuration, c.duration); }
        assert.equal(actual.buttonRetained, true); frames++;
      }
    }

    // Initially collapsed and completed-exit large controls contribute no cross
    // size. Fresh entry starts at the current constrained full cross dimension.
    for (const vertical of [false, true]) for (const rtl of [false, true]) {
      await page.evaluate(({ vertical, rtl }) => {
        const parent = document.createElement('div'); parent.style.cssText = 'width:10000px;height:10000px;';
        const n = document.createElement('md-toolbar'); n.id = 'disposed-toolbar'; n.variant = 'floating'; n.orientation = vertical ? 'vertical' : 'horizontal'; n.dir = rtl ? 'rtl' : 'ltr';
        const leading = document.createElement('md-icon-button'); leading.slot = 'leading'; leading.setAttribute('size', 'l'); leading.setAttribute('icon', 'undo');
        const main = document.createElement('md-icon-button'); main.setAttribute('icon', 'edit'); n.append(leading, main); parent.append(n); document.getElementById('fixture').replaceChildren(parent);
      }, { vertical, rtl });
      await page.clock.runFor(32);
      const el = page.locator('#disposed-toolbar'), cross = vertical ? 'width' : 'height';
      const state = () => el.evaluate((n, cross) => ({ cross: n._rowLayout.size[cross], composed: !!n._rowLayout.placements.leading, inert: n._clips.leading.inert, animatedCross: n._motion.channels.leadingCross.target }), cross);
      assert.deepEqual(await state(), { cross: 64, composed: false, inert: true, animatedCross: 96 });
      await el.evaluate(n => n.expand()); await page.clock.runFor(1024);
      assert.deepEqual(await state(), { cross: 112, composed: true, inert: false, animatedCross: 96 });
      await el.evaluate(n => n.collapse()); await page.clock.runFor(64);
      assert.equal((await state()).composed, true);
      await page.clock.runFor(1024); assert.deepEqual(await state(), { cross: 64, composed: false, inert: true, animatedCross: 96 });
      await el.evaluate(n => n.querySelector('[slot=leading]').setAttribute('size', 'm')); await page.clock.runFor(32);
      assert.deepEqual(await state(), { cross: 64, composed: false, inert: true, animatedCross: 56 });
      await el.evaluate(n => n.expand()); await page.clock.runFor(1024); assert.equal((await state()).cross, 72);
      await page.emulateMedia({ reducedMotion: 'reduce' }); await el.evaluate(n => n.collapse()); await page.clock.runFor(16);
      assert.deepEqual(await state(), { cross: 64, composed: false, inert: true, animatedCross: 56 });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await el.evaluate((n, cross) => { n.style['max' + cross[0].toUpperCase() + cross.slice(1)] = '33px'; }, cross); await page.clock.runFor(32);
      assert.equal((await state()).animatedCross, 17);
      await el.evaluate(n => { const parent = n.parentElement; n.remove(); parent.append(n); }); await page.clock.runFor(32);
      assert.equal((await state()).animatedCross, 17); assert.equal((await state()).composed, false);
    }
    assert.deepEqual(errors, []);
    console.log(`Toolbar IntSize/composition browser parity: ${count} source native modifier trees, ${frames} live vector RAF frames, retained native controls, disposal/re-entry/bounds/reduced-motion/lifecycle passed.`);
  } finally { await page.close(); }
}
