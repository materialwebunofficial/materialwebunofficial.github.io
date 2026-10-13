import assert from 'node:assert/strict';

// ListItem's onLongClick (foundation combinedClickable at a095da93): a press
// held for longPressTimeoutMillis (400ms) calls onLongClick and the release
// does not click; a shorter press clicks; leaving the bounds cancels; a key
// press (Enter) held as long acts the same way. Web adapter: the context menu
// request performs the action, and the label describes the item.
export async function testListLongClick(browser, base, { page: url = '/test/browser/fixtures/toolbars.html' } = {}) {
  const page = await browser.newPage({ viewport: { width: 700, height: 500 } }), errors = [];
  let checks = 0;
  const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(base + url);
    await page.evaluate(() => customElements.whenDefined('md-list-item'));
    await page.clock.install({ time: new Date('2026-10-13T12:00:00Z') });
    await page.clock.pauseAt(new Date('2026-10-13T12:00:01.000Z'));
    await page.evaluate(() => {
      document.querySelector('#fixture').innerHTML = `<md-list style="width:400px">
        <md-list-item id="item" headline="Inbox" interactive long-click long-click-label="Show message options"></md-list-item>
        <md-list-item id="plain" headline="Sent" interactive></md-list-item></md-list>`;
      window.events = [];
      for (const id of ['item', 'plain']) for (const type of ['long-click', 'action']) document.getElementById(id).addEventListener(type, () => window.events.push(`${id}:${type}`));
    });
    await page.clock.runFor(100);
    const events = async () => { const list = await page.evaluate(() => window.events.splice(0)); return list; };
    const box = await page.locator('#item').boundingBox(), cx = box.x + box.width / 2, cy = box.y + box.height / 2;

    // Held past the timeout: one long-click, and the release is not a click.
    await page.mouse.move(cx, cy); await page.mouse.down();
    await page.clock.runFor(399);
    equal(await events(), [], 'nothing before 400ms');
    await page.clock.runFor(2);
    equal(await events(), ['item:long-click'], 'onLongClick at longPressTimeoutMillis');
    await page.mouse.up(); await page.clock.runFor(20);
    equal(await events(), [], 'the release after a long press does not click');
    // A short press clicks.
    await page.mouse.down(); await page.clock.runFor(200); await page.mouse.up(); await page.clock.runFor(20);
    equal(await events(), ['item:action'], 'a short press clicks');
    // Leaving the item cancels the long press (and the click).
    await page.mouse.move(cx, cy); await page.mouse.down(); await page.clock.runFor(100);
    await page.mouse.move(cx, box.y + box.height + 40); await page.clock.runFor(500);
    await page.mouse.up(); await page.clock.runFor(20);
    equal(await events(), [], 'out of bounds before the timeout: no long click, no click');
    // Keyboard: Enter held as long.
    await page.locator('#item').evaluate(host => host.shadowRoot.querySelector('.item').focus());
    await page.keyboard.down('Enter'); await page.clock.runFor(450); await page.keyboard.up('Enter'); await page.clock.runFor(20);
    equal(await events(), ['item:long-click'], 'Enter held: long click, no click');
    await page.keyboard.down('Enter'); await page.clock.runFor(100); await page.keyboard.up('Enter'); await page.clock.runFor(20);
    equal(await events(), ['item:action'], 'Enter tapped: click');
    // Context menu request (secondary click, Shift+F10, Menu key).
    const prevented = await page.locator('#item').evaluate(host => { const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, composed: true }); host.shadowRoot.querySelector('.item').dispatchEvent(e); return e.defaultPrevented; });
    equal([prevented, await events()], [true, ['item:long-click']], 'contextmenu performs the long press action');
    // Without long-click nothing changes.
    const plain = await page.locator('#plain').boundingBox();
    await page.mouse.move(plain.x + 20, plain.y + plain.height / 2); await page.mouse.down(); await page.clock.runFor(600); await page.mouse.up(); await page.clock.runFor(20);
    equal(await events(), ['plain:action'], 'no long-click attribute: the held press clicks');
    // Label as description; removed with the attribute; disabled does nothing.
    equal(await page.locator('#item').evaluate(host => host.shadowRoot.querySelector('.item').getAttribute('aria-description')), 'Show message options', 'onLongClickLabel describes the item');
    await page.locator('#item').evaluate(host => host.removeAttribute('long-click'));
    equal(await page.locator('#item').evaluate(host => host.shadowRoot.querySelector('.item').hasAttribute('aria-description')), false, 'description removed with long-click');
    await page.locator('#item').evaluate(host => { host.setAttribute('long-click', ''); host.disabled = true; });
    await page.mouse.move(cx, cy); await page.mouse.down(); await page.clock.runFor(600); await page.mouse.up(); await page.clock.runFor(20);
    equal(await events(), [], 'disabled: no long click');
    assert.deepEqual(errors, []);
    console.log(`List long click: ${checks} combinedClickable timeout, click suppression, bounds cancel, keyboard, context menu and label checks passed.`);
  } finally { await page.close(); }
}
