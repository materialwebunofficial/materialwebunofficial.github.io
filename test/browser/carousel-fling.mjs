import assert from 'node:assert/strict';

// Pager carousel releases. singleAdvanceFlingBehavior (default) moves at most
// one item; fling-behavior="multi-browse" is CarouselDefaults.
// multiBrowseFlingBehavior: PagerSnapLayoutInfoProvider.calculateApproachOffset
// takes the spline decay's suggested page, the approach runs to one page
// before it, then the snap. Releases are given as the pager's fling input (a
// scroll velocity and the gesture's drag delta); a trusted drag checks the
// pointer wiring.
export async function testCarouselFling(browser, base, { page: url = '/test/browser/fixtures/toolbars.html' } = {}) {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } }), errors = [];
  let checks = 0;
  const ok = (value, label) => { assert.ok(value, label); checks++; };
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(base + url);
    await page.evaluate(() => customElements.whenDefined('md-carousel'));
    await page.evaluate(() => {
      document.querySelector('#fixture').innerHTML = `<md-carousel id="c" preferred-item-width="186" item-spacing="8" style="width:360px;height:205px">${
        Array.from({ length: 24 }, (_, i) => `<div style="background:hsl(${i * 15} 60% 60%)">${i}</div>`).join('')}</md-carousel>`;
    });
    await page.waitForTimeout(100);
    // One release from rest at item 0; resolves with the settled item, its
    // fraction from the snap position, and the expected multi-browse page.
    const release = (behavior, velocity, dragDelta) => page.evaluate(async ({ behavior, velocity, dragDelta }) => {
      const { AndroidFlingDecay } = await import('/src/motion/android-fling.js');
      const host = document.querySelector('#c');
      host.flingBehavior = behavior;
      host.scrollToItem(0);
      // The drag has scrolled the pager before its release.
      host._scrollBy(-dragDelta);
      const pageSize = host._pageSize + host._pageSpacing, count = host.children.length;
      const pages = Math.trunc(Math.fround(new AndroidFlingDecay().target(0, velocity) / pageSize));
      const suggested = Math.min(Math.max(pages, 0), count);
      const settled = new Promise(resolve => host.addEventListener('settle', resolve, { once: true }));
      host._fling(velocity, dragDelta);
      await settled;
      return { item: host.currentItem, fraction: host._currentPageOffsetFraction(), suggested, count };
    }, { behavior, velocity, dragDelta });

    for (const velocity of [1500, 4000, 8000]) {
      const single = await release('single-advance', velocity, -60);
      ok(single.item === 1 && Math.abs(single.fraction) < 1e-3, `single advance at ${velocity}px/s: item ${single.item}`);
      const multi = await release('multi-browse', velocity, -60);
      ok(Math.abs(multi.fraction) < 1e-3, `multi-browse at ${velocity}px/s ends at a snap position (${multi.fraction})`);
      // The approach ends one page before the suggested page; the snap goes on to it.
      ok(multi.item === Math.min(multi.suggested, multi.count - 1), `multi-browse at ${velocity}px/s: item ${multi.item}, suggested ${multi.suggested}`);
      if (multi.suggested > 1) ok(multi.item > single.item, `multi-browse travels further than single advance (${multi.item} > ${single.item})`);
    }
    // A slow release (no approach) behaves like the single advance.
    const slow = await release('multi-browse', 300, -60);
    ok(slow.item === 1, `a slow drag past the threshold advances one item: ${slow.item}`);

    // A trusted fast drag with multi-browse moves several items.
    await page.evaluate(() => { const host = document.querySelector('#c'); host.flingBehavior = 'multi-browse'; host.scrollToItem(0); });
    const box = await page.locator('#c').boundingBox();
    const settled = page.evaluate(() => new Promise(resolve => document.querySelector('#c').addEventListener('settle', () => resolve(document.querySelector('#c').currentItem), { once: true })));
    await page.mouse.move(box.x + 330, box.y + 100);
    await page.mouse.down();
    for (let x = 330; x >= 30; x -= 60) await page.mouse.move(box.x + x, box.y + 100);
    await page.mouse.up();
    const dragged = await settled;
    ok(dragged >= 2, `a trusted fast drag moves several items: ${dragged}`);

    assert.deepEqual(errors, []);
    console.log(`Carousel fling: ${checks} single-advance, multiBrowseFlingBehavior approach/snap and trusted drag checks passed.`);
  } finally { await page.close(); }
}
