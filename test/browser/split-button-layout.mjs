import assert from 'node:assert/strict';

// SplitButtonLayout at a095da93: the trailing button keeps its max intrinsic
// width; the leading button takes the remaining width (less the 2dp spacing)
// and, when its label wraps there, both buttons take the taller height and
// are centred; unconstrained, both are the size's container height.
export async function testSplitButtonLayout(browser, base, { page: url = '/test/browser/fixtures/toolbars.html' } = {}) {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } }), errors = [];
  let checks = 0;
  const ok = (value, label) => { assert.ok(value, label); checks++; };
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(base + url);
    await page.evaluate(() => Promise.all([customElements.whenDefined('md-split-button'), document.fonts.ready]));
    await page.evaluate(() => { document.querySelector('#fixture').innerHTML = `
      <md-split-button id="free" label="Save the current document" icon="save"></md-split-button>
      <div style="width:170px"><md-split-button id="narrow" style="max-width:100%" label="Save the current document" icon="save"></md-split-button></div>`; });
    await page.waitForTimeout(200);
    const read = id => page.locator('#' + id).evaluate(host => {
      const r = el => el.getBoundingClientRect(), left = r(host.shadowRoot.querySelector('.btn-left')), right = r(host.shadowRoot.querySelector('.btn-right'));
      return { host: r(host).width, left: [left.left, left.top, left.width, left.height], right: [right.left, right.top, right.width, right.height] };
    });
    const free = await read('free'), narrow = await read('narrow');
    ok(Math.abs(free.left[3] - 40) < 0.5 && Math.abs(free.right[3] - 40) < 0.5, `unconstrained: both 40dp tall ${free.left[3]} ${free.right[3]}`);
    ok(narrow.left[3] > 40.5, `the leading label wraps in the remaining width: ${narrow.left[3]}`);
    ok(Math.abs(narrow.right[3] - narrow.left[3]) < 0.5, 'both buttons take the taller height');
    ok(Math.abs(narrow.right[2] - free.right[2]) < 0.5, 'the trailing button keeps its intrinsic width');
    ok(Math.abs(narrow.left[2] + 2 + narrow.right[2] - 170) < 1, `the leading button takes the rest less 2dp: ${narrow.left[2]} + 2 + ${narrow.right[2]}`);
    ok(Math.abs(narrow.right[0] - (narrow.left[0] + narrow.left[2] + 2)) < 0.5 && Math.abs(narrow.left[1] - narrow.right[1]) < 0.5, '2dp apart, aligned');
    assert.deepEqual(errors, []);
    console.log(`Split button layout: ${checks} SplitButtonLayout width priority, wrapping and equal-height checks passed.`);
  } finally { await page.close(); }
}
