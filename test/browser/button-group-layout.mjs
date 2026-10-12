import assert from 'node:assert/strict';

// ButtonGroup.kt at a095da93 measures layout sizes, unaffected by graphicsLayer
// transforms. A group measured while an ancestor is scaled (for example a dialog
// or card entering with a scale animation) must keep its unscaled natural widths.
const GROUP = `<div id="wrapper" style="display:inline-block;transform:scale(.3);transform-origin:0 0">
  <md-button-group id="group" aria-label="Media controls">
    <md-button size="l" variant="tonal" icon="skip_previous" aria-label="Previous"></md-button>
    <md-button size="l" variant="filled" label="Play"></md-button>
    <md-button size="l" variant="tonal" icon="skip_next" aria-label="Next"></md-button>
  </md-button-group>
</div>`;

export async function testButtonGroupLayout(browser, base, { page: url = '/test/browser/fixtures/toolbars.html' } = {}) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } }), errors = [];
  let checks = 0;
  const check = (value, label) => { assert.ok(value, label); checks++; };
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base + url);
    await page.evaluate(() => Promise.all(['md-button-group', 'md-button'].map(name => customElements.whenDefined(name))));
    await page.evaluate(() => document.fonts.ready);
    // Mount and measure while the ancestor is scaled to 0.3.
    await page.evaluate(html => { document.querySelector('#fixture').innerHTML = html; }, GROUP);
    await page.waitForTimeout(150);
    await page.evaluate(() => { document.querySelector('#group')._measure(); });
    // The entrance ends: the ancestor is no longer transformed.
    await page.evaluate(() => { document.querySelector('#wrapper').style.transform = 'none'; });
    await page.waitForTimeout(150);
    const rest = await page.locator('#group').evaluate(group => ({
      natural: group._natural,
      layout: [...group.children].map(item => item.offsetWidth),
      boxes: [...group.children].map(item => { const r = item.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, width: r.width, height: r.height }; }),
    }));
    check(rest.natural.every((width, index) => Math.abs(width - rest.layout[index]) <= 1), `natural widths are layout widths, not scaled ones: ${JSON.stringify(rest)}`);
    check(rest.natural[1] > rest.natural[0] && rest.natural[0] > 80, `unscaled sizes ${rest.natural}`);
    // Press and hold the middle button with a real pointer.
    const middle = rest.boxes[1];
    await page.mouse.move(middle.x, middle.y);
    await page.mouse.down();
    await page.waitForTimeout(500);
    const pressed = await page.locator('#group').evaluate(group => [...group.children].map(item => { const r = item.getBoundingClientRect(); return { width: r.width, height: r.height }; }));
    await page.mouse.up();
    const sum = list => list.reduce((total, value) => total + value, 0);
    check(pressed[1].width > rest.natural[1] && pressed[0].width < rest.natural[0] && pressed[2].width < rest.natural[2], `the pressed item grows at its neighbours' expense ${JSON.stringify(pressed)}`);
    check(pressed.every((box, index) => box.width > rest.natural[index] - 25), `compression stays within 24dp ${JSON.stringify(pressed)}`);
    check(Math.abs(sum(pressed.map(box => box.width)) - sum(rest.natural)) <= 1, 'the group keeps its total width');
    check(pressed.every((box, index) => Math.abs(box.height - rest.boxes[index].height) < 0.5), `heights unchanged; the label does not wrap ${JSON.stringify(pressed)}`);
    await page.waitForTimeout(600);
    const released = await page.locator('#group').evaluate(group => [...group.children].map(item => item.style.width));
    check(released.every(width => width === ''), 'released items return to their natural widths');
    assert.deepEqual(errors, []);
    console.log(`Button group layout: ${checks} checks passed; natural widths measured under a scale(0.3) ancestor stay layout widths, and pressing redistributes them.`);
  } finally { await page.close(); }
}
