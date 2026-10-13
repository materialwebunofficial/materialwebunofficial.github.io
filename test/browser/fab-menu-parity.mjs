import assert from 'node:assert/strict';

// FloatingActionButtonMenu / ToggleFloatingActionButton at a095da93, frame by
// frame under a controlled clock:
// - checked progress on FastSpatial (800, 0.6); container PrimaryContainer to
//   Primary and icon OnPrimaryContainer to OnPrimary through Compose's Color
//   lerp, which interpolates in Oklab; 56 to 56dp, corner 16 to 28dp, icon 24
//   to 20dp;
// - the item stagger: an Animatable<Int> on SlowEffects (800, 1) with a
//   visibility threshold of 1, its value converted with toInt();
// - each item's width fraction on FastSpatial and alpha on FastEffects (3800, 1).
// Expected values are computed here independently of the component.
export async function testFabMenuParity(browser, base, { page: url = '/test/browser/fixtures/toolbars.html' } = {}) {
  const page = await browser.newPage({ viewport: { width: 700, height: 800 } }), errors = [];
  let checks = 0;
  const ok = (value, label) => { assert.ok(value, label); checks++; };
  const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
  page.on('pageerror', e => errors.push(e.message));
  // Spring from rest (x0 = from - to): critically damped or underdamped.
  const spring = (stiffness, damping, from, to, ms) => {
    const w = Math.sqrt(stiffness), t = ms / 1000, x0 = from - to;
    if (damping === 1) return to + x0 * (1 + w * t) * Math.exp(-w * t);
    const wd = w * Math.sqrt(1 - damping * damping), a = damping * w;
    return to + Math.exp(-a * t) * (x0 * Math.cos(wd * t) + (a * x0 / wd) * Math.sin(wd * t));
  };
  // sRGB <-> Oklab (Björn Ottosson's matrices, as Compose's Oklab color space).
  const toLinear = c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const toGamma = c => c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  const oklab = ([r, g, b]) => {
    [r, g, b] = [r, g, b].map(v => toLinear(v / 255));
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
  };
  const fromOklab = ([L, A, B]) => {
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]
      .map(v => Math.round(Math.max(0, Math.min(1, toGamma(v))) * 255));
  };
  const lerpColor = (a, b, t) => { const p = oklab(a), q = oklab(b); return fromOklab(p.map((v, i) => v + (q[i] - v) * t)); };
  const rgb = text => text.match(/[\d.]+/g).slice(0, 3).map(Number).map(Math.round);
  try {
    await page.goto(base + url);
    await page.evaluate(() => customElements.whenDefined('md-fab-menu'));
    await page.clock.install({ time: new Date('2026-10-12T12:00:00Z') });
    await page.clock.pauseAt(new Date('2026-10-12T12:00:01.008Z'));
    await page.evaluate(() => { document.querySelector('#fixture').innerHTML = `<md-fab-menu id="menu" icon="add" label="Open menu"
      items='[{"icon":"edit","label":"Edit"},{"icon":"share","label":"Share"},{"icon":"delete","label":"Delete"},{"icon":"archive","label":"Archive"}]'></md-fab-menu>`; });
    await page.waitForTimeout(50);
    await page.clock.runFor(64);
    const roles = await page.locator('#menu').evaluate(host => {
      const probe = document.createElement('span'); host.after(probe);
      const resolve = role => { probe.style.color = `var(--md-sys-color-${role})`; return getComputedStyle(probe).color; };
      const out = Object.fromEntries(['primary', 'primary-container', 'on-primary', 'on-primary-container'].map(r => [r, resolve(r)]));
      probe.remove(); return out;
    });
    const record = async (open, duration) => {
      await page.locator('#menu').evaluate((host, { open, duration }) => {
        const root = host.shadowRoot, fab = root.querySelector('.fab'), frames = [], start = performance.now();
        // Any CSS color (oklab(), color()) as the sRGB pixel the browser paints.
        const canvas = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }), ctx = canvas.getContext('2d', { willReadFrequently: true });
        const paint = color => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); return `rgb(${[...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).join(',')})`; };
        host._testFrames = frames;
        host.open = open;
        const step = now => {
          const fabCss = getComputedStyle(fab), glyph = fab.querySelector('.glyph');
          frames.push({ t: Math.floor(now - start), progress: host._progress, size: fab.getBoundingClientRect().width, radius: parseFloat(fabCss.borderTopLeftRadius),
            container: paint(fabCss.backgroundColor), icon: paint(getComputedStyle(glyph).color), iconSize: parseFloat(getComputedStyle(glyph).fontSize), glyph: glyph.textContent,
            visible: host._records.map(r => r.visible), widths: host._records.map(r => r.item.getBoundingClientRect().width), alphas: host._records.map(r => Number(r.slot.style.opacity)),
            natural: host._records.map(r => r.natural) });
          if (now - start < duration) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }, { open, duration });
      await page.clock.runFor(duration + 32);
      return page.locator('#menu').evaluate(host => host._testFrames);
    };

    let frames = await record(true, 640);
    // Toggle FAB: FastSpatial progress, Oklab colors, sizes.
    const moving = frames.filter(f => f.progress > 0 && Math.abs(f.progress - 1) > 1e-3);
    ok(moving.length >= 6, 'toggle animates over several frames');
    ok(moving.every(f => Math.abs(f.progress - spring(800, 0.6, 0, 1, f.t)) < 0.01), 'checked progress on FastSpatial');
    ok(moving.some(f => f.progress > 1), 'FastSpatial overshoots');
    const colorError = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
    ok(moving.every(f => colorError(rgb(f.container), lerpColor(rgb(roles['primary-container']), rgb(roles.primary), Math.max(0, Math.min(1, f.progress)))) <= 1),
      'container color: Oklab lerp from PrimaryContainer to Primary');
    ok(moving.every(f => colorError(rgb(f.icon), lerpColor(rgb(roles['on-primary-container']), rgb(roles['on-primary']), Math.max(0, Math.min(1, f.progress)))) <= 1),
      'icon color: Oklab lerp from OnPrimaryContainer to OnPrimary');
    ok(moving.every(f => f.size === Math.round(56) && Math.abs(f.radius - (16 + 12 * f.progress)) < 0.01 && Math.abs(f.iconSize - (24 - 4 * f.progress)) < 0.01), '56dp, corner 16 to 28dp, icon 24 to 20dp');
    ok(frames.every(f => f.glyph === (f.progress > 0.5 ? 'close' : 'add')), 'glyph switches past half progress');
    // Stagger: count = toInt(SlowEffects spring 0 -> 4); the last item when within 1.
    const N = 4;
    for (const f of frames) {
      const value = spring(800, 1, 0, N, f.t), count = f.visible.filter(Boolean).length;
      if (N - value >= 1 + 1e-3) ok(count === Math.trunc(value) && f.visible.every((v, i) => v === (i >= N - count)), `stagger at ${f.t}ms: ${count} vs toInt(${value.toFixed(3)})`);
    }
    equal(frames.at(-1).visible, [true, true, true, true], 'all items once the count settles');
    // Items: width fraction FastSpatial, alpha FastEffects, from when each became visible.
    const shownAt = Array.from({ length: N }, (_, i) => frames.find(f => f.visible[i])?.t);
    for (const f of frames) for (let i = 0; i < N; i++) {
      if (shownAt[i] == null || f.t < shownAt[i] + 16 || !f.natural[i]) continue;
      // The item's own springs start at the frame that showed it; allow one frame of phase.
      const local = f.t - shownAt[i];
      const widths = [local, local + 16].map(t => Math.round(f.natural[i] * Math.max(0, spring(800, 0.6, 0, 1, t))));
      const alphas = [local, local + 16].map(t => Math.max(0, Math.min(1, spring(3800, 1, 0, 1, t))));
      ok(widths.some(w => Math.abs(f.widths[i] - w) <= 1) || f.widths[i] === Math.round(f.natural[i]), `item ${i} width at ${f.t}ms`);
      ok(alphas.some(a => Math.abs(f.alphas[i] - a) <= 0.02) || f.alphas[i] === 1, `item ${i} alpha at ${f.t}ms`);
    }
    // Closing: the count goes down the same way, the progress back to 0.
    frames = await record(false, 640);
    for (const f of frames) {
      const value = spring(800, 1, N, 0, f.t), count = f.visible.filter(Boolean).length;
      if (value >= 1 + 1e-3) ok(count === Math.trunc(value), `closing stagger at ${f.t}ms`);
    }
    equal([frames.at(-1).visible.some(Boolean), Math.abs(frames.at(-1).progress) < 1e-3, frames.at(-1).glyph], [false, true, 'add'], 'closed');
    assert.deepEqual(errors, []);
    console.log(`FAB menu: ${checks} ToggleFloatingActionButton (FastSpatial, Oklab colors, sizes) and FloatingActionButtonMenu (Int stagger, item width/alpha) checks passed.`);
  } finally { await page.close(); }
}
