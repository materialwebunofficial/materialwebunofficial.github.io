import assert from 'node:assert/strict';

// layout="multi-aspect": the LazyRow of MultiAspectCarouselRowSample (item
// widths 305/205/275/350/100, 8dp spacing, 16dp content padding) with
// Modifier.carouselParallaxScrollEffect. Items sit end to end at their own
// widths; each box is translated by its item offset plus the parallax distance
// and clipped back to the mask CarouselParallaxScrollEffect.kt computes
// (carousel-parallax.js, compared exactly with the Kotlin source in
// carousel-oracle.test.mjs).
const WIDTHS = [305, 205, 275, 350, 100], SPACING = 8, PADDING = 16, WIDTH = 400, HEIGHT = 205;

export async function testCarouselMultiAspect(browser, base, { page: url = '/test/browser/fixtures/toolbars.html' } = {}) {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } }), errors = [];
  let checks = 0;
  const ok = (value, label) => { assert.ok(value, label); checks++; };
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(base + url);
    await page.evaluate(() => customElements.whenDefined('md-carousel'));
    const mount = (dir = 'ltr') => page.evaluate(({ WIDTHS, SPACING, PADDING, WIDTH, HEIGHT, dir }) => {
      document.querySelector('#fixture').innerHTML = `<div dir="${dir}"><md-carousel id="c" layout="multi-aspect" item-spacing="${SPACING}" content-padding="${PADDING}" style="width:${WIDTH}px;height:${HEIGHT}px">${
        WIDTHS.map((w, i) => `<div style="width:${w}px;background:hsl(${i * 70} 60% 60%)"><button>Item ${i}</button></div>`).join('')}</md-carousel></div>`;
      window.changes = [];
      document.querySelector('#c').addEventListener('change', e => window.changes.push(e.detail.index));
    }, { WIDTHS, SPACING, PADDING, WIDTH, HEIGHT, dir });
    // Each box's translateX and clip insets, against the production parallax
    // function at the list's whole-pixel scroll.
    const audit = (scroll, rtl = false) => page.evaluate(async ({ scroll, rtl, WIDTHS, SPACING, PADDING, WIDTH, HEIGHT }) => {
      const { calculateParallaxItemInfo } = await import('/src/components/carousel-parallax.js');
      const host = document.querySelector('#c'), boxes = [...host.shadowRoot.querySelectorAll('.item')];
      const out = [];
      let start = 0;
      boxes.forEach((box, index) => {
        const size = WIDTHS[index], offset = start - scroll;
        start += size + SPACING;
        const visible = offset + size + SPACING > -PADDING && offset < WIDTH - PADDING;
        const info = calculateParallaxItemInfo({ isItemVisible: visible, itemMainAxisSize: size, itemCrossAxisSize: HEIGHT, itemOffset: offset, viewportStartOffset: -PADDING, viewportEndOffset: WIDTH - PADDING });
        const maskStart = info.size === 0 ? 0 : info.maskStart, maskEnd = info.size === 0 ? size : info.maskEnd;
        const left = PADDING + offset, x = rtl ? WIDTH - left - size : left;
        const translate = parseFloat(/translateX\(([-\d.e]+)px\)/.exec(box.style.transform)?.[1]);
        const inset = /inset\(0px ([-\d.e]+)px 0px ([-\d.e]+)px/.exec(box.style.clipPath)?.slice(1).map(Number);
        out.push({ index, width: box.offsetWidth, translate, expectTranslate: x + info.parallax, inset,
          expectInset: [size - maskEnd + info.parallax, maskStart - info.parallax], parallax: info.parallax, progress: info.maskProgress,
          hidden: box.hasAttribute('data-offscreen'), expectHidden: !visible || x + maskEnd <= 0 || x + maskStart >= WIDTH });
      });
      return { items: out, current: host.currentItem, changes: window.changes.slice() };
    }, { scroll, rtl, WIDTHS, SPACING, PADDING, WIDTH, HEIGHT });
    const near = (a, b) => Math.abs(a - b) < 1e-3;
    const verify = (state, label) => {
      for (const item of state.items) {
        ok(item.width === WIDTHS[item.index], `${label}: item ${item.index} keeps its width (${item.width})`);
        ok(near(item.translate, item.expectTranslate), `${label}: item ${item.index} at ${item.translate}, expected ${item.expectTranslate}`);
        ok(item.inset && near(item.inset[0], item.expectInset[0]) && near(item.inset[1], item.expectInset[1]), `${label}: item ${item.index} mask ${item.inset} vs ${item.expectInset}`);
        ok(item.hidden === item.expectHidden, `${label}: item ${item.index} hidden ${item.hidden}`);
      }
    };
    const starts = WIDTHS.reduce((list, w, i) => [...list, i ? list[i - 1] + WIDTHS[i - 1] + SPACING : 0], []);
    const maxScroll = WIDTHS.reduce((a, b) => a + b) + SPACING * (WIDTHS.length - 1) + 2 * PADDING - WIDTH;

    await mount();
    await page.waitForTimeout(100);
    let state = await audit(0);
    verify(state, 'at rest');
    // The second item leaves the end: masked from its end and shifted toward its start.
    ok(state.items[1].progress > 0 && state.items[1].parallax < 0, `item 1 entering at the end: progress ${state.items[1].progress}, parallax ${state.items[1].parallax}`);
    ok(state.items[0].parallax === 0 && state.current === 0, 'the first item rests unmasked; currentItem 0');

    // LazyListState.scrollToItem: the item's start at the scroll position.
    await page.evaluate(() => document.querySelector('#c').scrollToItem(2));
    state = await audit(starts[2]);
    verify(state, 'scrollToItem(2)');
    ok(state.current === 2 && state.changes.at(-1) === 2, `firstVisibleItemIndex 2 (${state.current}), change event ${state.changes}`);
    ok(state.items[1].progress > 0 && state.items[1].parallax > 0, 'item 1 leaving at the start: masked from its start, shifted toward its end');

    // A horizontal wheel scrolls directly and does not snap.
    await page.locator('#c').hover();
    await page.mouse.wheel(37, 0);
    await page.waitForTimeout(250);
    state = await audit(starts[2] + 37);
    verify(state, 'wheel');

    // animateScrollToItem (End key): the last item cannot reach the start; the list ends at its maximum scroll.
    await page.evaluate(() => document.querySelector('#c').shadowRoot.querySelector('.viewport').focus());
    const settled = page.evaluate(() => new Promise(resolve => document.querySelector('#c').addEventListener('settle', resolve, { once: true })));
    await page.keyboard.press('End');
    await settled;
    state = await audit(maxScroll);
    verify(state, 'animateScrollToItem(4)');
    ok(state.current === 3, `first visible item at the end: ${state.current}`);

    // Focus in the partly visible fourth item brings it into view with
    // BringIntoViewSpec's default distance (here its leading edge to the
    // container's). Items outside the viewport are hidden and not focusable.
    const leading = PADDING + starts[3] - maxScroll, trailing = leading + WIDTHS[3];
    const distance = Math.abs(leading) < Math.abs(trailing - WIDTH) ? leading : trailing - WIDTH;
    ok(leading < 0 && trailing > 0, `the fourth item is cut off at the start (${leading}..${trailing})`);
    const back = page.evaluate(() => new Promise(resolve => document.querySelector('#c').addEventListener('settle', resolve, { once: true })));
    const focused = await page.evaluate(() => { const buttons = document.querySelectorAll('#c button'); buttons[0].focus(); const first = document.activeElement === buttons[0]; buttons[3].focus(); return [first, document.activeElement === buttons[3]]; });
    ok(!focused[0] && focused[1], `the hidden first item is not focusable, the fourth is: ${focused}`);
    await back;
    state = await audit(maxScroll + distance);
    verify(state, 'bring into view');

    // RTL mirrors the item positions; the mask and parallax stay physical, as in the source.
    await mount('rtl');
    await page.waitForTimeout(100);
    await page.evaluate(() => document.querySelector('#c').scrollToItem(1));
    state = await audit(starts[1], true);
    verify(state, 'rtl');

    // Switching to a pager layout gives every item the strategy's size again.
    await page.evaluate(() => document.querySelector('#c').setAttribute('layout', 'multi-browse'));
    await page.waitForTimeout(100);
    const widths = await page.evaluate(() => [...document.querySelector('#c').shadowRoot.querySelectorAll('.item')].map(b => b.offsetWidth));
    ok(new Set(widths).size === 1, `multi-browse items share one size: ${widths}`);

    // The items attribute's width sizes image items.
    await page.evaluate(() => { document.querySelector('#fixture').innerHTML = `<md-carousel id="i" layout="multi-aspect" style="width:400px;height:205px" items='[{"image":"data:image/gif;base64,R0lGODlhAQABAAAAACw=","title":"One","width":180},{"image":"data:image/gif;base64,R0lGODlhAQABAAAAACw=","title":"Two","width":240}]'></md-carousel>`; });
    await page.waitForTimeout(100);
    const sized = await page.evaluate(() => [...document.querySelector('#i').shadowRoot.querySelectorAll('.item')].map(b => b.offsetWidth));
    ok(sized[0] === 180 && sized[1] === 240, `items attribute widths: ${sized}`);

    assert.deepEqual(errors, []);
    console.log(`Carousel multi-aspect: ${checks} LazyRow layout, parallax mask/translation, scrollToItem, wheel, animateScrollToItem, bring-into-view, RTL and layout switch checks passed.`);
  } finally { await page.close(); }
}
