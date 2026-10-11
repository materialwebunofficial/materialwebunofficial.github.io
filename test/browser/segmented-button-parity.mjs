import assert from 'node:assert/strict';

// Compose SegmentedButton.kt at a095da93: row geometry (IntrinsicSize.Min,
// weight(1f), spacedBy(-space)), itemShape, colors, interactionZIndex, the
// content measure policy's label offset and SegmentedButtonDefaults.Icon.
const FIXTURE = `
  <md-segmented-button id="single" items='["Day","Week","Month","Year"]' selected-index="0" aria-label="Range"></md-segmented-button>
  <md-segmented-button id="multi" multi-select items='[{"label":"Walk","icon":"directions_walk"},{"label":"Ride","icon":"directions_bus"},{"label":"Drive","icon":"directions_car"}]' selected-indices="[0]"></md-segmented-button>
  <md-segmented-button id="comma" items="A,Longer label,C" selected-index="1"></md-segmented-button>
  <md-segmented-button id="disabled" items='["One",{"label":"Two","disabled":true},"Three"]' selected-index="1"></md-segmented-button>
  <md-segmented-button id="space" space="0" items='["X","Y"]'></md-segmented-button>
  <md-segmented-button id="solo" items='["Only"]'></md-segmented-button>
  <md-segmented-button id="wide" style="width:600px" items='["P","Q","R"]'></md-segmented-button>
  <div dir="rtl"><md-segmented-button id="rtl" items='["Uno","Dos","Tres"]' selected-index="0"></md-segmented-button></div>
  <span id="probe"></span>`;

export async function testSegmentedButtonParity(browser, base) {
  let checks = 0;
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } }), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base + '/#segmented-buttons').then(() => page.waitForFunction(() => document.documentElement.hasAttribute('data-showcase-ready'), null, { timeout: 20000 }));
    await page.waitForFunction(() => customElements.get('md-segmented-button') && document.fonts.status === 'loaded');
    await page.evaluate(html => {
      const area = document.createElement('div');
      area.id = 'segmented-fixtures';
      area.style.cssText = 'position:fixed;inset:0;z-index:99999;background:var(--md-sys-color-surface);padding:24px;display:flex;flex-direction:column;align-items:flex-start;gap:16px;overflow:auto';
      area.innerHTML = html;
      document.body.append(area);
    }, FIXTURE);
    await page.evaluate(() => document.fonts.ready);

    const geometry = await page.evaluate(() => {
      const read = id => {
        const host = document.getElementById(id);
        const segs = [...host.shadowRoot.querySelectorAll('.segment')];
        return {
          host: host.getBoundingClientRect().width,
          boxes: segs.map(s => { const r = s.getBoundingClientRect(); return { x: r.left, w: r.width, h: r.height }; }),
          labels: segs.map(s => s.querySelector('.label').getBoundingClientRect().width),
          radii: segs.map(s => { const c = getComputedStyle(s); return [c.borderStartStartRadius, c.borderStartEndRadius, c.borderEndStartRadius, c.borderEndEndRadius]; }),
        };
      };
      return Object.fromEntries(['single', 'multi', 'comma', 'space', 'solo', 'wide', 'rtl'].map(id => [id, read(id)]));
    });
    for (const [id, g] of Object.entries(geometry)) {
      const space = id === 'space' ? 0 : 1, n = g.boxes.length;
      const w = g.boxes[0].w;
      // Layout snaps to 1/64 px, so fractional tracks differ by one unit.
      const unit = 1 / 64 + 1e-6;
      // weight(1f) under IntrinsicSize.Min: every item takes the widest item's width.
      assert.ok(g.boxes.every(b => Math.abs(b.w - w) <= unit), `${id} equal widths ${JSON.stringify(g.boxes)}`);
      assert.ok(g.boxes.every(b => Math.abs(b.h - 40) < 0.01), `${id} 40dp height`);
      if (id !== 'wide') {
        // Content = max(18, icon) + 8 + label inside 12dp padding; MinWidth 58dp.
        const expected = Math.max(58, 24 + 26 + Math.max(...g.labels));
        assert.ok(Math.abs(w - expected) < 0.6, `${id} width ${w} vs ${expected}`);
      } else {
        // fillMaxWidth-style author width: (W + (n - 1) * space) / n.
        assert.ok(Math.abs(w - (600 + (n - 1) * space) / n) <= unit, `wide width ${w}`);
      }
      // spacedBy(-space): neighbours overlap by space; the row is n*w - (n-1)*space.
      const rtl = id === 'rtl';
      for (let k = 1; k < n; k++) {
        const step = rtl ? g.boxes[k - 1].x - g.boxes[k].x : g.boxes[k].x - g.boxes[k - 1].x;
        const width = rtl ? g.boxes[k].w : g.boxes[k - 1].w;
        assert.ok(Math.abs(step - (width - space)) <= unit, `${id} overlap ${step}`);
      }
      assert.ok(Math.abs(g.host - (n * w - (n - 1) * space)) < 0.6, `${id} row width ${g.host}`);
      // itemShape: CornerFull start on the first item, end on the last, rectangles between.
      const full = '9999px', none = '0px';
      g.radii.forEach((r, k) => {
        const start = k === 0, end = k === n - 1;
        assert.deepEqual(r, [start ? full : none, end ? full : none, start ? full : none, end ? full : none], `${id} item ${k} shape`);
      });
      checks += 4;
    }

    const colors = await page.evaluate(() => {
      const probe = document.getElementById('probe');
      const resolve = value => { probe.style.color = value; return getComputedStyle(probe).color; };
      const seg = (id, k) => document.getElementById(id).shadowRoot.querySelectorAll('.segment')[k];
      const style = (id, k) => { const s = seg(id, k), c = getComputedStyle(s); return { bg: c.backgroundColor, color: c.color, outline: getComputedStyle(s.querySelector('.outline')).borderTopColor, z: s.style.zIndex, disabled: s.disabled }; };
      return {
        roles: { sc: resolve('var(--md-sys-color-secondary-container)'), osc: resolve('var(--md-sys-color-on-secondary-container)'), os: resolve('var(--md-sys-color-on-surface)'), outline: resolve('var(--md-sys-color-outline)') },
        active: style('single', 0), inactive: style('single', 1),
        disabledActive: style('disabled', 1), enabledNeighbour: style('disabled', 0),
      };
    });
    assert.equal(colors.active.bg, colors.roles.sc);
    assert.equal(colors.active.color, colors.roles.osc);
    assert.equal(colors.inactive.bg, 'rgba(0, 0, 0, 0)');
    assert.equal(colors.inactive.color, colors.roles.os);
    assert.equal(colors.active.outline, colors.roles.outline);
    assert.equal(colors.inactive.outline, colors.roles.outline);
    // interactionZIndex: checked adds CheckedZIndexFactor 5.
    assert.equal(colors.active.z, '5');
    assert.equal(colors.inactive.z, '0');
    // Disabled active keeps SecondaryContainer; content OnSurface 38%, border Outline 12%.
    assert.equal(colors.disabledActive.disabled, true);
    assert.equal(colors.disabledActive.bg, colors.roles.sc);
    const alpha = value => { const m = value.match(/\/\s*([\d.]+)\)|rgba\([^)]*,\s*([\d.]+)\)/); return m ? Number(m[1] ?? m[2]) : 1; };
    assert.ok(Math.abs(alpha(colors.disabledActive.color) - 0.38) < 0.01, colors.disabledActive.color);
    assert.ok(Math.abs(alpha(colors.disabledActive.outline) - 0.12) < 0.01, colors.disabledActive.outline);
    checks += 11;

    // Label offset: -(18 + 8) / 2 without an icon keeps the label centred; with the check it is 0.
    const content = await page.evaluate(() => {
      const segs = [...document.getElementById('single').shadowRoot.querySelectorAll('.segment')];
      return segs.map(s => {
        const r = s.getBoundingClientRect(), label = s.querySelector('.label'), icon = s.querySelector('.icon');
        const l = label.getBoundingClientRect(), i = icon.getBoundingClientRect();
        return { center: r.left + r.width / 2, labelCenter: l.left + l.width / 2, transform: label.style.transform, iconHidden: icon.hidden, iconW: i.width, iconLeft: i.left, labelLeft: l.left };
      });
    });
    assert.equal(content[0].iconHidden, false);
    assert.equal(content[0].transform, 'translateX(0px)');
    assert.ok(Math.abs(content[0].iconW - 18) < 0.01);
    assert.ok(Math.abs(content[0].labelLeft - content[0].iconLeft - 26) < 0.01, 'label sits 18 + 8 after the icon');
    for (const c of content.slice(1)) {
      assert.equal(c.iconHidden, true);
      assert.equal(c.transform, 'translateX(-13px)');
      assert.ok(Math.abs(c.labelCenter - c.center) < 0.51, `label centred ${c.labelCenter} ${c.center}`);
    }
    checks += 5;

    // Item icons: the slot stays 18dp, so the label offset is 0 in both states.
    const multi = await page.evaluate(() => [...document.getElementById('multi').shadowRoot.querySelectorAll('.segment')].map(s => ({
      gap: s.querySelector('.label').getBoundingClientRect().left - s.querySelector('.icon').getBoundingClientRect().left, hidden: s.querySelector('.icon').hidden,
      check: getComputedStyle(s.querySelector('.check')).opacity, item: getComputedStyle(s.querySelector('.item')).opacity,
      glyph: (() => { const range = document.createRange(); range.selectNodeContents(s.querySelector('.item')); return range.getBoundingClientRect().width; })(),
    })));
    assert.deepEqual(multi.map(m => [Math.round(m.gap * 64) / 64, m.hidden]), [[26, false], [26, false], [26, false]]);
    assert.deepEqual(multi.map(m => [m.check, m.item]), [['1', '0'], ['0', '1'], ['0', '1']]);
    assert.ok(multi.every(m => Math.abs(m.glyph - 18) < 0.6), `icon ligatures render ${multi.map(m => m.glyph)}`);
    checks += 3;

    // Motion: Int label offset on FastSpatial (0.6 / 800 overshoots), check scale-in on FastSpatial,
    // fade-in on DefaultEffects; exit is ExitTransition.None.
    const motion = await page.evaluate(() => new Promise(resolve => {
      const host = document.getElementById('single');
      const segs = [...host.shadowRoot.querySelectorAll('.segment')];
      const frames = [];
      segs[2].click();
      const oldHidden = segs[0].querySelector('.icon').hidden;
      const start = performance.now();
      const sample = now => {
        frames.push({
          t: now - start,
          newOffset: parseFloat(segs[2].querySelector('.label').style.transform.slice(11)),
          oldOffset: parseFloat(segs[0].querySelector('.label').style.transform.slice(11)),
          scale: parseFloat(segs[2].querySelector('.check').style.transform.slice(6)),
          alpha: parseFloat(segs[2].querySelector('.check').style.opacity),
        });
        if (now - start < 900) requestAnimationFrame(sample); else resolve({ frames, oldHidden });
      };
      requestAnimationFrame(sample);
    }));
    const f = motion.frames, last = f.at(-1);
    assert.equal(motion.oldHidden, true, 'ExitTransition.None hides the old check at once');
    assert.ok(f.every(x => Number.isInteger(x.newOffset) && Number.isInteger(x.oldOffset)), 'Animatable<Int> offsets');
    assert.ok(f[0].newOffset < 0 && Math.max(...f.map(x => x.newOffset)) >= 1, `offset overshoots 0: ${f.map(x => x.newOffset)}`);
    assert.ok(f[0].oldOffset > -13 && Math.min(...f.map(x => x.oldOffset)) <= -14, `old offset overshoots -13: ${f.map(x => x.oldOffset)}`);
    assert.ok(Math.max(...f.map(x => x.scale)) > 1.05 && f[0].scale < 1, 'check scale-in overshoots');
    assert.ok(f[0].alpha < 1 && f.every((x, k) => k === 0 || x.alpha >= f[k - 1].alpha - 1e-6), 'critically damped fade-in');
    assert.deepEqual([last.newOffset, last.oldOffset, last.scale, last.alpha], [0, -13, 1, 1]);
    checks += 7;

    // Crossfade on DefaultEffects for item icons.
    const fade = await page.evaluate(() => new Promise(resolve => {
      const seg = document.getElementById('multi').shadowRoot.querySelectorAll('.segment')[1];
      seg.click();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const mid = [parseFloat(seg.querySelector('.check').style.opacity), parseFloat(seg.querySelector('.item').style.opacity)];
        setTimeout(() => resolve({ mid, end: [seg.querySelector('.check').style.opacity, seg.querySelector('.item').style.opacity] }), 600);
      }));
    }));
    assert.ok(fade.mid[0] > 0 && fade.mid[0] < 1 && fade.mid[1] > 0 && fade.mid[1] < 1, `crossfade ${fade.mid}`);
    assert.deepEqual(fade.end, ['1', '0']);
    checks += 2;

    // Events, keyboard, disabled items and RTL arrows.
    const behavior = await page.evaluate(async () => {
      const out = {};
      const single = document.getElementById('single'), segs = [...single.shadowRoot.querySelectorAll('.segment')];
      const events = [];
      single.addEventListener('change', e => events.push(e.detail.selectedIndex));
      segs[2].click(); segs[3].click();
      out.events = events.slice();
      out.tabStops = segs.map(s => s.tabIndex);
      segs[3].focus();
      segs[3].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }));
      out.wrap = [single.selectedIndex, single.shadowRoot.activeElement === segs[0]];
      const multi = document.getElementById('multi'), m = [...multi.shadowRoot.querySelectorAll('.segment')];
      let detail = null;
      multi.addEventListener('change', e => { detail = e.detail.selectedIndices; });
      m[2].click();
      out.multi = [detail, m.map(s => s.getAttribute('aria-checked')), m.map(s => s.tabIndex), multi.getAttribute('role'), multi.shadowRoot.querySelector('.row').getAttribute('role')];
      const dis = document.getElementById('disabled'), d = [...dis.shadowRoot.querySelectorAll('.segment')];
      d[1].click();
      d[0].click();
      d[0].focus();
      d[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }));
      out.disabled = [dis.selectedIndex, d.map(s => s.disabled)];
      const rtl = document.getElementById('rtl'), r = [...rtl.shadowRoot.querySelectorAll('.segment')];
      r[0].focus();
      r[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }));
      out.rtl = rtl.selectedIndex;
      // RTL: place() does not mirror, so the check stays left of the label.
      const icon = r[1].querySelector('.icon').getBoundingClientRect(), label = r[1].querySelector('.label').getBoundingClientRect();
      out.rtlIcon = icon.left < label.left;
      out.group = single.shadowRoot.querySelector('.row').getAttribute('aria-label');
      out.comma = [...document.getElementById('comma').shadowRoot.querySelectorAll('.label')].map(l => l.textContent);
      return out;
    });
    assert.deepEqual(behavior.events, [3], 'change fires only when the selection changes');
    assert.deepEqual(behavior.tabStops, [-1, -1, -1, 0]);
    assert.deepEqual(behavior.wrap, [0, true]);
    assert.deepEqual(behavior.multi[0], [0, 1, 2]);
    assert.deepEqual(behavior.multi[1], ['true', 'true', 'true']);
    assert.deepEqual(behavior.multi[2], [0, 0, 0]);
    assert.equal(behavior.multi[4], 'group');
    assert.deepEqual(behavior.disabled, [2, [false, true, false]], 'disabled items are skipped');
    assert.equal(behavior.rtl, 1, 'ArrowLeft moves forward in RTL');
    assert.equal(behavior.rtlIcon, true);
    assert.equal(behavior.group, 'Range');
    assert.deepEqual(behavior.comma, ['A', 'Longer label', 'C']);
    checks += 12;

    // Indication: ripple ink below the border, press raises the item.
    const point = await page.evaluate(() => {
      const r = document.getElementById('space').shadowRoot.querySelectorAll('.segment')[1].getBoundingClientRect();
      return { x: r.left + 6, y: r.top + 6 };
    });
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    const indication = await page.evaluate(() => {
      const seg = document.getElementById('space').shadowRoot.querySelectorAll('.segment')[1];
      return { order: [...seg.children].map(c => c.className), z: seg.style.zIndex };
    });
    await page.mouse.up();
    assert.deepEqual(indication.order, ['content', 'state-layer', 'md-ink', 'outline']);
    // Pressed and focused interactions, plus 5 once the click checks it.
    assert.ok(['1', '2'].includes(indication.z), indication.z);
    checks += 2;

    await page.evaluate(() => document.getElementById('segmented-fixtures').remove());
    assert.deepEqual(errors, []);
  } finally { await page.close(); }

  // Showcase: both samples render, fit the viewport and match their snippets.
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(base + '/#segmented-buttons').then(() => page.waitForFunction(() => document.documentElement.hasAttribute('data-showcase-ready'), null, { timeout: 20000 }));
      await page.waitForFunction(() => document.querySelectorAll('#segmented-buttons md-segmented-button').length === 2);
      await page.locator('#segmented-buttons').scrollIntoViewIfNeeded();
      const showcase = await page.locator('#segmented-buttons').evaluate(section => {
        const hosts = [...section.querySelectorAll('md-segmented-button')];
        const codes = [...section.querySelectorAll('.comp-code-box code')].map(c => c.textContent);
        return {
          fits: hosts.every(h => { const r = h.getBoundingClientRect(); return r.left >= -0.5 && r.right <= innerWidth + 0.5 && r.height === 40; }),
          snippets: hosts.map((h, k) => codes[k].includes(h.getAttribute('items'))),
          overflow: document.documentElement.scrollWidth <= innerWidth,
        };
      });
      assert.equal(showcase.fits, true);
      assert.deepEqual(showcase.snippets, [true, true]);
      assert.equal(showcase.overflow, true);
      assert.deepEqual(errors, []);
      checks += 3;
    } finally { await page.close(); }
  }
  console.log(`Segmented button: ${checks} SegmentedButton.kt row geometry (equal weights, -1dp overlap, itemShape), colors/disabled roles, z-index, label offset and Int FastSpatial spring, check scale/fade and crossfade, events, keyboard/RTL and showcase checks passed.`);
}
