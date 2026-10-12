import assert from 'node:assert/strict';

// AppBarWithSearch at a095da93 (SearchBar.kt AppBarWithSearchImpl,
// appBarWithSearchColors, EnterAlwaysSearchBarScrollBehavior, AppBarTokens).
const html = `
  <div id="stage" style="display:flex;flex-direction:column;width:800px;height:400px;overflow:hidden">
    <md-app-bar-with-search id="bar" scroll-behavior="enter-always">
      <md-icon-button slot="navigation" icon="menu" aria-label="Open menu"></md-icon-button>
      <md-search-bar full-screen contained placeholder="Search" suggestions='["One","Two"]'></md-search-bar>
      <md-icon-button slot="actions" icon="more_vert" aria-label="More options"></md-icon-button>
    </md-app-bar-with-search>
    <div id="content" style="flex:1;min-height:0;overflow:auto"><div style="height:2000px"></div></div>
  </div>`;

export async function testAppBarWithSearch(browser, base, { page: url = '/test/browser/fixtures/toolbars.html' } = {}) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } }), errors = [];
  let checks = 0;
  const ok = (value, label) => { assert.ok(value, label); checks++; };
  const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(base + url);
    await page.evaluate(() => customElements.whenDefined('md-app-bar-with-search'));
    await page.evaluate(html => {
      document.querySelector('#fixture').innerHTML = html;
      document.querySelector('#bar').scrollTarget = document.querySelector('#content');
      return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    }, html);
    const roles = await page.evaluate(() => { const p = document.createElement('span'); document.body.append(p); const r = v => { p.style.color = v; return getComputedStyle(p).color; };
      const out = Object.fromEntries(['surface', 'surface-container', 'surface-container-high', 'surface-container-highest', 'on-surface', 'on-surface-variant'].map(n => [n, r(`var(--md-sys-color-${n})`)])); p.remove(); return out; });
    const geometry = await page.locator('#bar').evaluate(host => {
      const box = el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
      const nav = host.querySelector('[slot=navigation]'), act = host.querySelector('[slot=actions]'), search = host.querySelector('md-search-bar');
      const bar = host.shadowRoot.querySelector('.bar');
      return { host: box(host), nav: box(nav), act: box(act), search: box(search), bar: getComputedStyle(bar).backgroundColor,
        navColor: getComputedStyle(nav.shadowRoot.querySelector('button')).color, actColor: getComputedStyle(act.shadowRoot.querySelector('button')).color,
        searchColor: getComputedStyle(search.shadowRoot.querySelector('.surface')).backgroundColor };
    });
    const g = geometry;
    equal(Math.round(g.host.height), 64, 'row height: 56dp search bar with 4dp vertical padding');
    equal(Math.round(g.nav.left - g.host.left), 4, 'navigation icon 4dp from the start');
    equal(Math.round(g.host.right - g.act.right), 4, 'actions 4dp from the end');
    equal([Math.round(g.search.left - g.nav.right), Math.round(g.act.left - g.search.right)], [8, 8], 'search bar 8dp from the icons');
    equal(Math.round(g.search.top - g.host.top), 4, 'search bar 4dp from the top');
    equal([g.bar, g.searchColor, g.navColor, g.actColor], [roles.surface, roles['surface-container-high'], roles['on-surface'], roles['on-surface-variant']], 'appBarWithSearchColors at rest');
    // Width is limited to 720dp and centred in the remaining space.
    await page.evaluate(() => { document.querySelector('#stage').style.width = '1400px'; });
    await page.setViewportSize({ width: 1500, height: 800 });
    await page.waitForTimeout(100);
    const wide = await page.locator('#bar').evaluate(host => { const s = host.querySelector('md-search-bar').getBoundingClientRect(), n = host.querySelector('[slot=navigation]').getBoundingClientRect(), a = host.querySelector('[slot=actions]').getBoundingClientRect(); return { width: s.width, left: s.left - n.right, right: a.left - s.right }; });
    ok(Math.round(wide.width) === 720 && Math.abs(wide.left - wide.right) < 1, `720dp, centred ${JSON.stringify(wide)}`);
    await page.evaluate(() => { document.querySelector("#stage").style.width = "800px"; });
    await page.setViewportSize({ width: 1000, height: 800 });
    // enterAlways: scrolling the content moves the bar out; scrolling back brings it in.
    // The bar's state is read in a scroll listener added after the component's,
    // before scrollend starts settling it.
    const scroll = y => page.locator('#content').evaluate((n, y) => new Promise(resolve => {
      const bar = document.querySelector('#bar');
      n.addEventListener('scroll', () => resolve({ offset: bar.scrollOffset, limit: bar.scrollOffsetLimit, height: bar.getBoundingClientRect().height, content: bar.contentOffset, fraction: bar.overlappedFraction }), { once: true });
      n.scrollTop = y;
    }), y);
    const settled = async () => { await page.waitForTimeout(600); return page.locator('#bar').evaluate(h => h.scrollOffset); };
    let state = await scroll(30);
    equal([state.offset, state.limit, Math.round(state.height), state.content], [-30, -64, 34, -30], 'bar follows the content');
    ok(state.fraction > 0.01, 'content overlaps the bar');
    equal(await settled(), 0, 'scrolling ends below half: snaps open');
    const scrolledColors = await page.locator('#bar').evaluate(h => [getComputedStyle(h.shadowRoot.querySelector('.bar')).backgroundColor, getComputedStyle(h.querySelector('md-search-bar').shadowRoot.querySelector('.surface')).backgroundColor]);
    equal(scrolledColors, [roles['surface-container'], roles['surface-container-highest']], 'scrolled colors follow the content offset');
    state = await scroll(200);
    equal([state.offset, Math.round(state.height)], [-64, 0], 'bar fully out');
    await settled();
    state = await scroll(180);
    equal(state.offset, -44, 'returns on any upward scroll (enter always)');
    equal(await settled(), -64, 'scrolling ends past half: snaps closed');
    state = await scroll(140);
    equal(state.offset, -24, 'upward scroll from closed');
    equal(await settled(), 0, 'snaps open below half');
    // While a full-screen search collapses, the app bar's own bar is invisible.
    await scroll(0);
    const visibility = await page.locator('#bar').evaluate(async host => {
      const search = host.querySelector('md-search-bar'), box = host.shadowRoot.querySelector('.search');
      search.expanded = true;
      await new Promise(r => setTimeout(r, 500));
      const expanded = box.classList.contains('hidden');
      search.expanded = false;
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const collapsing = box.classList.contains('hidden');
      await new Promise(r => setTimeout(r, 700));
      return [expanded, collapsing, box.classList.contains('hidden')];
    });
    equal(visibility, [false, true, false], 'hidden only while the full-screen search collapses');
    assert.deepEqual(errors, []);
    console.log(`App bar with search: ${checks} AppBarWithSearch layout, color, enterAlways scroll/settle and full-screen visibility checks passed.`);
  } finally { await page.close(); }
}
