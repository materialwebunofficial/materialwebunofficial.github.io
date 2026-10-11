import assert from 'node:assert/strict';
import { modalRailTarget } from '../../src/components/navigation-rail-layout.js';

// ModalWideNavigationRail at a095da93 (WideNavigationRail.kt, WideNavigationRailState.kt,
// NavigationRailExpandedTokens, ScrimTokens, AnchoredDraggable computeTarget).
const ITEMS = JSON.stringify([{ icon: 'home', label: 'Home' }, { icon: 'search', label: 'Search' }, { icon: 'person', label: 'Profile' }]);

export async function testNavigationRailModal(browser, base, { page: url = '/test/browser/fixtures/toolbars.html' } = {}) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } }), errors = [];
  let checks = 0;
  const ok = (value, label) => { assert.ok(value, label); checks++; };
  const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(base + url);
    await page.evaluate(() => customElements.whenDefined('md-navigation-rail'));
    await page.evaluate(() => document.fonts.ready);
    const mount = attrs => page.evaluate(({ attrs, items }) => {
      document.querySelector('#fixture').innerHTML = `<md-navigation-rail id="rail" style="height:500px" items='${items}' ${attrs}></md-navigation-rail>`;
      return new Promise(requestAnimationFrame);
    }, { attrs, items: ITEMS });
    const state = () => page.locator('#rail').evaluate(host => {
      const root = host.shadowRoot, rail = root.querySelector('.rail'), layer = root.querySelector('.modal-layer');
      const surface = root.querySelector('.modal-surface'), placeholder = root.querySelector('.placeholder');
      return {
        open: layer.open, inModal: rail.parentElement === surface, railHidden: rail.hidden, placeholder: !placeholder.hidden,
        placeholderWidth: placeholder.getBoundingClientRect().width, hostWidth: host.getBoundingClientRect().width,
        width: rail.getBoundingClientRect().width, left: rail.getBoundingClientRect().left, top: rail.getBoundingClientRect().top,
        radius: getComputedStyle(rail).borderTopLeftRadius, background: getComputedStyle(rail).backgroundColor,
        scrim: parseFloat(root.querySelector('.scrim').style.opacity || '0'), scrimColor: getComputedStyle(root.querySelector('.scrim')).backgroundColor,
        transform: surface.style.transform, expanded: host.expanded, iconPosition: root.querySelector('.item').dataset.iconPosition,
      };
    });
    const roles = await page.evaluate(() => {
      const probe = document.createElement('span'); document.body.append(probe);
      const resolve = v => { probe.style.color = v; return getComputedStyle(probe).color; };
      const out = { container: resolve('var(--md-sys-color-surface-container)'), scrim: resolve('rgb(from var(--md-sys-color-scrim) r g b / .32)') };
      probe.remove(); return out;
    });

    // Modal (hideOnCollapse = false): the collapsed rail stays in the layout.
    await mount('modal');
    let s = await state();
    equal([s.open, s.inModal, s.railHidden, s.placeholder, s.width], [false, false, false, false, 96], 'collapsed modal rail sits in the layout');
    // positionProgress on DefaultEffects: sample frames while expanding.
    const frames = await page.locator('#rail').evaluate(host => new Promise(resolve => {
      const root = host.shadowRoot, rail = root.querySelector('.rail'), out = [], start = performance.now();
      host.expand();
      const step = now => {
        out.push({ t: now - start, inModal: !!rail.parentElement?.classList.contains('modal-surface'), width: rail.getBoundingClientRect().width,
          scrim: parseFloat(root.querySelector('.scrim').style.opacity || '0'), progress: host._positionMotion.channels.progress.sample(now).position, modalExpanded: !!host._modalExpanded });
        if (now - start < 900) requestAnimationFrame(step); else resolve(out);
      };
      requestAnimationFrame(step);
    }));
    ok(frames.every(f => f.inModal === (f.progress > 0)) && frames.at(-1).inModal, `content moves into the dialog as soon as progress leaves 0 ${JSON.stringify(frames.slice(0, 3))}`);
    ok(frames.every(f => f.modalExpanded === (f.progress >= 0.3)), 'the modal rail expands from progress 0.3');
    const firstExpanded = frames.findIndex(f => f.modalExpanded);
    ok(firstExpanded > 0 && frames.slice(0, firstExpanded).every(f => Math.abs(f.width - 96) < 0.5), `modal rail starts collapsed ${frames.map(f => f.width.toFixed(1))}`);
    // FastSpatial (0.6 / 800) overshoots its expanded width before settling.
    const final = frames.at(-1).width;
    ok(final >= 220 && final <= 360, `expanded width ${final}`);
    ok(Math.max(...frames.map(f => f.width)) > final + 0.5, 'FastSpatial width overshoot');
    ok(frames.at(-1).scrim === 1 && frames.slice(0, firstExpanded).every(f => f.scrim === 0), 'scrim fades in once modalExpanded');
    // DefaultEffects progress: critically damped, monotonic.
    ok(frames.every((f, i) => i === 0 || f.progress >= frames[i - 1].progress - 1e-6), 'monotonic progress');
    s = await state();
    equal([s.open, s.placeholder, Math.round(s.placeholderWidth), Math.round(s.hostWidth), s.left, s.top, s.radius, s.background, s.scrimColor, s.iconPosition],
      [true, true, 96, 96, 0, 0, '16px', roles.container, roles.scrim, 'start'], 'dialog: placeholder keeps the layout, rail at the window start with CornerLarge SurfaceContainer, Scrim 32%');
    // Escape (dialog cancel) collapses; the dialog closes when progress reaches 0.
    const changes = [];
    await page.exposeFunction('__railChange', detail => changes.push(detail));
    await page.locator('#rail').evaluate(host => host.addEventListener('expanded-change', e => window.__railChange(e.detail)));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
    s = await state();
    equal([s.expanded, s.open, s.inModal, s.placeholder, s.width, s.iconPosition], [false, false, false, false, 96, 'top'], 'Escape collapses and returns the content');
    equal(changes, [{ expanded: false }], 'expanded-change');
    // Scrim tap collapses too.
    await page.locator('#rail').evaluate(host => host.expand());
    await page.waitForTimeout(600);
    await page.mouse.click(900, 600);
    await page.waitForTimeout(700);
    equal((await state()).open, false, 'scrim tap collapses');

    // hideOnCollapse: nothing in the layout; the rail slides in on DefaultSpatial.
    await mount('modal hide-on-collapse');
    s = await state();
    equal([s.open, s.railHidden, s.hostWidth], [false, true, 0], 'standalone modal rail hidden when collapsed');
    const slide = await page.locator('#rail').evaluate(host => new Promise(resolve => {
      const root = host.shadowRoot, surface = root.querySelector('.modal-surface'), out = [], start = performance.now();
      host.expand();
      const step = now => {
        out.push({ offset: new DOMMatrix(getComputedStyle(surface).transform).m41, width: root.querySelector('.rail').getBoundingClientRect().width });
        if (now - start < 1000) requestAnimationFrame(step); else resolve(out);
      };
      requestAnimationFrame(step);
    }));
    // Frames before progress leaves 0 have no modal rail yet.
    const shown = slide.filter(f => f.width > 0), w = shown.at(-1).width;
    ok(slide.length - shown.length <= 1 && w >= 220 && shown.every(f => Math.abs(f.width - w) < 0.5), `standalone rail is laid out expanded from the start ${slide.map(f => f.width.toFixed(1))}`);
    ok(shown[0].offset >= -w - 0.01 && shown.some(f => f.offset > -w + 1 && f.offset < -1) && shown.at(-1).offset === 0, `slides in from -width ${shown.map(f => f.offset.toFixed(1))}`);
    // DefaultSpatial (0.8 / 380) overshoots past the Expanded anchor when animated.
    ok(Math.max(...shown.map(f => f.offset)) > 0.05, 'programmatic animateTo is not clamped');
    // Drag: a short slow drag stays open; a long drag past half the width closes.
    const box = await page.locator('#rail').evaluate(host => { const r = host.shadowRoot.querySelector('.rail').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 300, width: r.width }; });
    await page.mouse.move(box.x, box.y); await page.mouse.down();
    for (let i = 1; i <= 10; i++) { await page.mouse.move(box.x - i * 4, box.y); await page.waitForTimeout(30); }
    await page.waitForTimeout(80); await page.mouse.up();
    await page.waitForTimeout(800);
    s = await state();
    equal([s.expanded, s.open, s.transform], [true, true, 'translateX(0px)'], 'short drag settles open');
    // Keep the complete gesture inside the viewport. Firefox clips negative
    // pointer coordinates, which would turn a two-thirds drag into a half drag.
    const dragStart = box.x + box.width / 3;
    await page.mouse.move(dragStart, box.y); await page.mouse.down();
    for (let i = 1; i <= 20; i++) { await page.mouse.move(dragStart - i * box.width / 30, box.y); await page.waitForTimeout(16); }
    await page.mouse.up();
    await page.waitForTimeout(900);
    s = await state();
    equal([s.expanded, s.open, s.railHidden], [false, false, true], 'drag past the threshold closes and collapses');
    // Scrim tap: slide out first, then collapse.
    await page.locator('#rail').evaluate(host => host.expand());
    await page.waitForTimeout(800);
    const order = await page.locator('#rail').evaluate(host => new Promise(resolve => {
      const root = host.shadowRoot, surface = root.querySelector('.modal-surface'), out = [];
      const width = root.querySelector('.rail').getBoundingClientRect().width;
      host.addEventListener('expanded-change', () => out.push(['collapse', new DOMMatrix(getComputedStyle(surface).transform).m41]), { once: true });
      root.querySelector('.scrim').click();
      setTimeout(() => resolve({ out, width }), 900);
    }));
    ok(order.out.length === 1 && Math.abs(order.out[0][1] + order.width) < 0.5, `scrim tap slides out before collapsing ${JSON.stringify(order)}`);

    // computeTarget: closest anchor at rest, direction at 125dp/s, else half the distance.
    equal([modalRailTarget(-50, 0, 300), modalRailTarget(-150, 0, 300), modalRailTarget(-10, -130, 300), modalRailTarget(-200, 120, 300),
      modalRailTarget(-140, 120, 300), modalRailTarget(-160, -100, 300), modalRailTarget(-140, -100, 300)], [0, -300, -300, -300, 0, -300, 0], 'AnchoredDraggable computeTarget');

    // Reduced motion finishes at once.
    await mount('modal');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    s = await page.locator('#rail').evaluate(host => { host.expand(); const r = host.shadowRoot; return [r.querySelector('.modal-layer').open, r.querySelector('.scrim').style.opacity]; });
    equal(s, [true, '1'], 'reduced motion opens fully');
    await page.locator('#rail').evaluate(host => host.collapse());
    equal(await page.locator('#rail').evaluate(host => host.shadowRoot.querySelector('.modal-layer').open), false, 'reduced motion closes at once');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    assert.deepEqual(errors, []);
    console.log(`Navigation rail modal: ${checks} ModalWideNavigationRail checks (layout placeholder, DefaultEffects progress with the 0.3 modal threshold, FastSpatial widths, Scrim, CornerLarge SurfaceContainer, Escape/scrim collapse, standalone DefaultSpatial slide, drag thresholds, reduced motion) passed.`);
  } finally { await page.close(); }
}
