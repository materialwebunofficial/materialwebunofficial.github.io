import assert from 'node:assert/strict';

// Compose SplitButton.kt / SplitButton*Tokens / HorizontalCenterOptically /
// AnimatedShape at a095da93: geometry per size, shapeByInteraction springs,
// optical centering, checked overlay, arrow rotation and the DropdownMenu.
const SIZES = {
  xs: { height: 32, lead: [12, 10], trail: [13, 13], trailIcon: 22, leadIcon: 20, spacing: 4, inner: 4, pressed: 8, type: 'label-large' },
  s: { height: 40, lead: [16, 12], trail: [13, 13], trailIcon: 22, leadIcon: 20, spacing: 8, inner: 4, pressed: 12, type: 'label-large' },
  m: { height: 56, lead: [24, 24], trail: [15, 15], trailIcon: 26, leadIcon: 24, spacing: 8, inner: 4, pressed: 12, type: 'title-medium' },
  l: { height: 96, lead: [48, 48], trail: [29, 29], trailIcon: 38, leadIcon: 32, spacing: 12, inner: 8, pressed: 20, type: 'headline-small' },
  xl: { height: 136, lead: [64, 64], trail: [43, 43], trailIcon: 50, leadIcon: 40, spacing: 16, inner: 12, pressed: 20, type: 'headline-large' },
};
const near = (a, b, tolerance = 0.02) => Math.abs(a - b) <= tolerance;

export async function testSplitButtonLifecycle(browser, base) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } }), errors = [];
  let checks = 0;
  const ok = (value, label) => { assert.ok(value, label); checks++; };
  const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(base + '/test/browser/fixtures/toolbars.html');
    await page.evaluate(() => customElements.whenDefined('md-split-button'));
    await page.evaluate(() => document.fonts.ready);

    for (const [size, d] of Object.entries(SIZES)) for (const dir of ['ltr', 'rtl']) {
      await page.evaluate(({ size, dir }) => { document.querySelector('#fixture').innerHTML = `<md-split-button id="split" size="${size}" dir="${dir}" label="Label"></md-split-button>`; }, { size, dir });
      await page.evaluate(() => new Promise(requestAnimationFrame));
      const g = await page.locator('#split').evaluate(host => {
        const l = host.shadowRoot.querySelector('.btn-left'), r = host.shadowRoot.querySelector('.btn-right');
        const box = el => { const b = el.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, width: b.width, height: b.height }; };
        const icon = l.querySelector('.glyph'), label = l.querySelector('.label'), arrow = r.querySelector('.arrow');
        const cs = getComputedStyle(l);
        return {
          lead: box(l), trail: box(r), icon: box(icon), label: box(label), arrow: box(arrow),
          leadRadii: [l.style.borderStartStartRadius, l.style.borderStartEndRadius, l.style.borderEndEndRadius, l.style.borderEndStartRadius],
          trailRadii: [r.style.borderStartStartRadius, r.style.borderStartEndRadius, r.style.borderEndEndRadius, r.style.borderEndStartRadius],
          offset: r.querySelector('.content').style.transform,
          font: [cs.fontSize, cs.fontWeight, cs.lineHeight],
        };
      });
      const role = await page.evaluate(type => { const s = document.createElement('span'); s.style.font = `var(--md-sys-typescale-${type})`; document.body.append(s); const c = getComputedStyle(s); const r = [c.fontSize, c.fontWeight, c.lineHeight]; s.remove(); return r; }, d.type);
      const rtl = dir === 'rtl';
      const trailWidth = Math.max(48, d.trail[0] + d.trailIcon + d.trail[1]);
      ok(near(g.lead.height, d.height) && near(g.trail.height, d.height), `${size}/${dir} ContainerHeight`);
      ok(near(g.trail.width, trailWidth), `${size}/${dir} trailing width ${g.trail.width}`);
      // BetweenSpace 2dp; the leading button is at the start.
      ok(near(rtl ? g.lead.left - g.trail.right : g.trail.left - g.lead.right, 2), `${size}/${dir} 2dp spacing`);
      // Leading content padding, ButtonDefaults.iconSizeFor and iconSpacingFor.
      const start = rtl ? g.lead.right - g.icon.right : g.icon.left - g.lead.left;
      const end = rtl ? g.label.left - g.lead.left : g.lead.right - g.label.right;
      const spacing = rtl ? g.icon.left - g.label.right : g.label.left - g.icon.right;
      ok(near(start, d.lead[0], 0.6) && near(end, d.lead[1], 0.6), `${size}/${dir} leading padding ${start} ${end}`);
      ok(near(spacing, d.spacing, 0.6), `${size}/${dir} icon spacing ${spacing}`);
      ok(near(g.icon.width, d.leadIcon) && near(g.arrow.width, d.trailIcon), `${size}/${dir} icon sizes`);
      equal(g.font, role, `${size}/${dir} textStyleFor`);
      // Outer CornerFull resolves to half the smaller side; inner corners from the tokens.
      const leadFull = Math.min(g.lead.width, d.height) / 2, trailFull = Math.min(trailWidth, d.height) / 2;
      ok(near(parseFloat(g.leadRadii[0]), leadFull) && near(parseFloat(g.leadRadii[3]), leadFull), `${size}/${dir} leading outer corners`);
      equal([g.leadRadii[1], g.leadRadii[2]], [`${d.inner}px`, `${d.inner}px`], `${size}/${dir} leading inner corners`);
      equal(g.trailRadii, [`${d.inner}px`, `${trailFull}px`, `${trailFull}px`, `${d.inner}px`], `${size}/${dir} trailing corners`);
      // horizontalCenterOptically: 0.11 * (start - end), mirrored by placeRelative.
      const offset = Math.round(Math.max(-d.trail[0], Math.min(d.trail[1], 0.11 * (d.inner - Math.min(trailFull, d.height / 2)))));
      equal(g.offset, `translateX(${offset * (rtl ? -1 : 1)}px)`, `${size}/${dir} optical offset`);
    }

    // Pressed shape on DefaultEffects (critically damped: no overshoot), then back.
    await page.evaluate(() => { document.querySelector('#fixture').innerHTML = '<md-split-button id="split" label="Label"></md-split-button>'; });
    const trailing = page.locator('#split').locator('.btn-right');
    const box = await trailing.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const sample = () => page.locator('#split').evaluate(host => new Promise(resolve => {
      const r = host.shadowRoot.querySelector('.btn-right'), frames = [], start = performance.now();
      const step = now => { frames.push(parseFloat(r.style.borderStartStartRadius)); if (now - start < 450) requestAnimationFrame(step); else resolve(frames); };
      requestAnimationFrame(step);
    }));
    await page.mouse.down();
    const pressFrames = await sample();
    ok(pressFrames[0] > 4 && pressFrames[0] < 12 && pressFrames.every((v, i) => i === 0 || v >= pressFrames[i - 1] - 1e-6) && Math.max(...pressFrames) <= 12 + 1e-6, `press 4 -> 12 without overshoot ${pressFrames}`);
    equal(pressFrames.at(-1), 12, 'pressed inner corner');
    await page.mouse.up();
    // Releasing opened the menu (checked): the trailing button morphs to a circle.
    const checkedFrames = await sample();
    ok(checkedFrames.at(-1) === 20 && checkedFrames.every((v, i) => i === 0 || v >= checkedFrames[i - 1] - 1e-6), `pressed -> CircleShape ${checkedFrames}`);
    const opened = await page.locator('#split').evaluate(host => {
      const r = host.shadowRoot.querySelector('.btn-right'), menu = host.menu;
      const mb = menu.shadowRoot.querySelector('.menu').getBoundingClientRect(), hb = host.getBoundingClientRect();
      return { open: host.open, menu: menu.open, expanded: r.getAttribute('aria-expanded'), overlay: getComputedStyle(r, '::before').opacity, offset: r.querySelector('.content').style.transform, below: mb.top >= hb.bottom - 0.5, start: Math.abs(mb.left - hb.left) < 1.5 };
    });
    equal(opened, { open: true, menu: true, expanded: 'true', overlay: '0.1', offset: 'translateX(0px)', below: true, start: true }, 'checked trailing button, overlay, centred content and DropdownMenu below the start');

    // Arrow rotation on the default spring (1, 1500): monotonic to 180.
    const rotation = await page.locator('#split').evaluate(host => host.shadowRoot.querySelector('.arrow').style.transform);
    equal(rotation, 'rotate(180deg)', 'arrow rotated');
    const closing = await page.locator('#split').evaluate(host => new Promise(resolve => {
      const arrow = host.shadowRoot.querySelector('.arrow'), frames = [], start = performance.now();
      host.close();
      const step = now => { frames.push(parseFloat(arrow.style.transform.slice(7))); if (now - start < 500) requestAnimationFrame(step); else resolve(frames); };
      requestAnimationFrame(step);
    }));
    // The first RAF can share the retarget timestamp: t=0 is exactly 180.
    ok(closing[0] <= 180 && closing.some(v => v > 0 && v < 180) && closing.at(-1) === 0 && closing.every((v, i) => i === 0 || v <= closing[i - 1] + 1e-6), `arrow 180 -> 0 ${closing}`);

    // Keyboard: arrow keys open the menu and focus its first item; Escape returns focus.
    await trailing.focus();
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(50);
    const focused = () => page.evaluate(() => { let n = document.activeElement; while (n?.shadowRoot?.activeElement) n = n.shadowRoot.activeElement; return n?.getRootNode()?.host?.label ?? n?.className; });
    equal(await focused(), 'Edit', 'first item focused');
    await page.keyboard.press('ArrowDown');
    equal(await focused(), 'Duplicate', 'menu keyboard navigation');
    await page.locator('#split').evaluate(host => { window.__menuSelect = new Promise(resolve => { host.addEventListener('menu-select', e => resolve(e.detail), { once: true }); setTimeout(() => resolve('no menu-select'), 2000); }); });
    await page.keyboard.press('Enter');
    equal(await page.evaluate(() => window.__menuSelect), { index: 1, label: 'Duplicate' }, 'menu-select');
    await page.waitForTimeout(400);
    equal(await page.locator('#split').evaluate(host => host.open), false, 'selection closes the menu');
    await trailing.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(50);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const trailingFocused = await page.locator('#split').evaluate(host => host.shadowRoot.activeElement === host.shadowRoot.querySelector('.btn-right'));
    equal([await page.locator('#split').evaluate(host => host.open), trailingFocused], [false, true], 'Escape closes and restores focus');

    // Outside and leading taps dismiss; the leading tap still acts.
    await page.locator('#split').evaluate(host => host.openMenu());
    await page.waitForTimeout(50);
    await page.mouse.click(1000, 700);
    await page.waitForTimeout(50);
    equal(await page.locator('#split').evaluate(host => host.open), false, 'outside tap dismisses');
    await page.locator('#split').evaluate(host => host.openMenu());
    await page.locator('#split').evaluate(host => { window.__action = new Promise(resolve => { host.addEventListener('action', () => resolve(true), { once: true }); setTimeout(() => resolve('no action'), 2000); }); });
    await page.locator('#split').locator('.btn-left').click();
    equal([await page.evaluate(() => window.__action), await page.locator('#split').evaluate(host => host.open)], [true, false], 'leading tap acts and dismisses');

    // Elevation: filled rests at 0 and rises to 1dp on hover; elevated rests at 1dp.
    // Move the pointer away first: a button mounted under it starts hovered.
    await page.mouse.move(1000, 760);
    await page.evaluate(() => { document.querySelector('#fixture').innerHTML = '<md-split-button id="split" label="Label"></md-split-button><md-split-button id="elevated" variant="elevated" label="Label"></md-split-button>'; });
    await page.waitForTimeout(100);
    equal(await page.evaluate(() => ['split', 'elevated'].map(id => document.getElementById(id).shadowRoot.querySelector('.btn-left').dataset.elevation)), ['0', '1'], 'resting elevation');
    const lead = await page.locator('#split').locator('.btn-left').boundingBox();
    await page.mouse.move(lead.x + 10, lead.y + 10);
    await page.waitForTimeout(250);
    equal(await page.locator('#split').evaluate(host => host.shadowRoot.querySelector('.btn-left').dataset.elevation), '1', 'hovered elevation');

    // Disabled closes the menu; reconnecting rebuilds motion without errors.
    equal(await page.locator('#split').evaluate(host => { host.openMenu(); host.disabled = true; const r = host.shadowRoot.querySelector('.btn-right'); return [host.open, r.disabled, r.classList.contains('checked')]; }), [false, true, false], 'disabled');
    equal(await page.locator('#split').evaluate(async host => {
      host.disabled = false; host.openMenu();
      const parent = host.parentNode; host.remove(); parent.append(host);
      await new Promise(requestAnimationFrame);
      const r = host.shadowRoot.querySelector('.btn-right');
      return [host.open, r.style.borderStartStartRadius, host.shadowRoot.querySelector('.arrow').style.transform];
    }), [true, '20px', 'rotate(180deg)'], 'reconnected while open');
    await page.locator('#split').evaluate(host => host.close());

    await page.emulateMedia({ reducedMotion: 'reduce' });
    equal(await page.locator('#split').evaluate(host => { host.openMenu(); return [host.shadowRoot.querySelector('.btn-right').style.borderStartStartRadius, host.shadowRoot.querySelector('.arrow').style.transform]; }), ['20px', 'rotate(180deg)'], 'reduced motion finishes at once');
    await page.locator('#split').evaluate(host => host.close());
    assert.deepEqual(errors, []);
    console.log(`Split button: ${checks} SplitButton.kt geometry/token checks at five sizes in LTR and RTL, DefaultEffects pressed/checked shapes, optical centering, checked overlay, arrow spring, DropdownMenu keyboard/dismissal, elevation, disabled, reconnection and reduced motion passed.`);
  } finally { await page.close(); }
}
