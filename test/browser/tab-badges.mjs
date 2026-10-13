import assert from 'node:assert/strict';

// A Tab icon wrapped in BadgedBox (Badge.kt at a095da93): the badge's top end
// placement from the anchor (dot: 6dp in, 6dp overlap; with content: 12dp in,
// 14dp overlap), held inside the tab by Tab's badgeBounds rulers:
// x = min(anchorWidth - offset, endRuler - badgeWidth), y = max(-badgeHeight +
// offset, topRuler), rulers provided unmirrored and the badge placed relative.
export async function testTabBadges(browser, base, { page: url = '/test/browser/fixtures/toolbars.html' } = {}) {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } }), errors = [];
  let checks = 0;
  const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(base + url);
    await page.evaluate(() => Promise.all([customElements.whenDefined('md-tabs'), customElements.whenDefined('md-badge'), document.fonts.ready]));
    const mount = async (html) => { await page.evaluate(html => { document.querySelector('#fixture').innerHTML = html; }, html); await page.waitForTimeout(150); };
    // Independent placement from the drawn icon, tab and badge boxes.
    const check = async (id, label) => {
      const rows = await page.locator('#' + id).evaluate(host => [...host.shadowRoot.querySelectorAll('.tab')].map(tab => {
        const badge = tab.querySelector('.tab-badge'), icon = tab.querySelector('.icon'), t = tab.getBoundingClientRect();
        if (!badge || badge.hidden) return { name: tab.getAttribute('aria-label') };
        const b = badge.getBoundingClientRect(), i = icon.getBoundingClientRect();
        return { name: tab.getAttribute('aria-label'), rtl: getComputedStyle(host).direction === 'rtl', tab: [t.left, t.top, t.width],
          icon: [i.left - t.left, i.top - t.top, i.width], badge: [b.left - t.left, b.top - t.top, b.width, b.height], hidden: badge.getAttribute('aria-hidden') };
      }));
      for (const row of rows.filter(r => r.badge)) {
        const [ax, ay, aw] = row.icon, [, , bw, bh] = row.badge, content = bw > 6;
        const horizontal = content ? 12 : 6, vertical = content ? 14 : 6;
        const x = Math.min(aw - horizontal, Math.trunc(row.tab[2] - ax) - bw), y = Math.max(-bh + vertical, Math.trunc(-ay));
        const expected = [ax + (row.rtl ? aw - x - bw : x), ay + y];
        assert.ok(Math.abs(row.badge[0] - expected[0]) < 0.6 && Math.abs(row.badge[1] - expected[1]) < 0.6, `${label}: badge at ${row.badge} vs ${expected}`);
        checks++;
        equal(row.hidden, 'true', `${label}: the count is part of the tab's name, not a second announcement`);
      }
      return rows;
    };

    await mount(`<md-tabs id="tabs" style="width:360px" tabs='[{"icon":"inbox","label":"Inbox","badge":"3"},{"icon":"star","label":"Starred","badge":""},{"icon":"send","label":"Sent"}]'></md-tabs>`);
    let rows = await check('tabs', 'LTR');
    equal(rows.map(r => r.name), ['Inbox, 3', 'Starred', 'Sent'], 'names merge the count');
    equal(rows.map(r => r.badge ? [r.badge[2], r.badge[3]] : null), [[16, 16], [6, 6], null], 'Badge with content (16dp) and dot (6dp)');
    // Unclamped: the badge's top end from the icon.
    equal([Math.round(rows[0].badge[0] - rows[0].icon[0]), Math.round(rows[0].badge[1] - rows[0].icon[1])], [12, -2], 'content badge 12dp in, 14dp overlap');
    equal([Math.round(rows[1].badge[0] - rows[1].icon[0]), Math.round(rows[1].badge[1] - rows[1].icon[1])], [18, 0], 'dot 6dp in, 6dp overlap');
    // RTL mirrors the placement.
    await mount(`<div dir="rtl"><md-tabs id="tabs" style="width:360px" tabs='[{"icon":"inbox","label":"Inbox","badge":"12"},{"icon":"star","label":"Starred","badge":""}]'></md-tabs></div>`);
    rows = await check('tabs', 'RTL');
    ok(rows[0].badge[0] < rows[0].icon[0] + rows[0].icon[2] / 2, 'RTL: the badge is on the icon start side');
    // Narrow tabs: a wide badge is held at the tab's end edge by the ruler.
    await mount(`<md-tabs id="tabs" style="width:200px" tabs='[{"icon":"inbox","badge":"999+"},{"icon":"star"},{"icon":"send"},{"icon":"drafts"}]'></md-tabs>`);
    rows = await check('tabs', 'narrow');
    ok(Math.abs(rows[0].badge[0] + rows[0].badge[2] - rows[0].tab[2]) < 0.6, `the badge ends at the tab edge: ${rows[0].badge} in ${rows[0].tab}`);
    equal(rows[0].name, 'inbox, 999+', 'icon-only tab name');
    // Removing a badge hides it.
    await page.locator('#tabs').evaluate(host => { host.tabs = [{ icon: 'inbox' }, { icon: 'star' }]; });
    await page.waitForTimeout(100);
    equal(await page.locator('#tabs').evaluate(host => [...host.shadowRoot.querySelectorAll('.tab-badge')].every(b => b.hidden)), true, 'badge removed');
    assert.deepEqual(errors, []);
    console.log(`Tab badges: ${checks} BadgedBox placement, badgeBounds clamping, RTL and naming checks passed.`);
  } finally { await page.close(); }

  function ok(value, label) { assert.ok(value, label); checks++; }
}
