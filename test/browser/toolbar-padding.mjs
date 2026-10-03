import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';

const root = new URL('../fixtures/androidx/toolbar-padding/', import.meta.url);
const read = name => JSON.parse(gunzipSync(fs.readFileSync(new URL(name + '-oracle.json.gz', root))));
const rows = read('row'), fabs = read('fab');
const near = (a, b, label) => assert.ok(Math.abs(a - b) < .1, `${label}: ${a} vs ${b}`);
const compare = (actual, expected) => {
  assert.deepEqual(actual.size, expected.size, JSON.stringify(expected.input));
  if (actual.lines) assert.deepEqual(actual.lines, expected.lines, JSON.stringify(expected.input));
  for (const [id, box] of Object.entries(actual.boxes)) for (const key of ['x', 'y', 'width', 'height']) near(box[key], expected.placements[id][key], id + '.' + key + ' ' + JSON.stringify(expected.input));
};

export async function testToolbarPadding(browser, base) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(base + '/test/browser/fixtures/toolbars.html');
    await page.evaluate(async () => { await customElements.whenDefined('md-toolbar'); await document.fonts.ready; });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => {
      window.paddingRect = (n, el) => { const root = n._frame.getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: r.x - root.x, y: r.y - root.y, width: r.width, height: r.height }; };
      window.createPaddingRow = i => {
        const parent = document.createElement('div'); parent.style.cssText = 'width:20000px;height:20000px;';
        const n = document.createElement('md-toolbar'); n.id = 'padding-row'; n.variant = 'floating'; n.orientation = i.vertical ? 'vertical' : 'horizontal'; n.dir = i.rtl ? 'rtl' : 'ltr'; n.expanded = i.expanded; n.contentPadding = i.contentPadding;
        for (const name of ['leading', 'main', 'trailing']) {
          if (name !== 'main' && !(i.presence & (name === 'leading' ? 1 : 2))) continue;
          for (const p of i[name]) {
            const child = document.createElement(p.native ? 'md-icon-button' : 'div'); if (name !== 'main') child.slot = name;
            if (p.native) { child.setAttribute('icon', 'edit'); child.setAttribute('size', ({ 32: 'xs', 40: 's', 56: 'm', 96: 'l', 136: 'xl' })[p.height]); if (p.width === 52) child.setAttribute('width', 'wide'); }
            else child.style.cssText = `width:${p.width}px;height:${p.height}px;`;
            if (p.weight) child.dataset.toolbarWeight = p.weight; child.dataset.toolbarFill = String(p.fill);
            if (p.align !== 'default') child.dataset.toolbarAlign = p.align;
            if (p.line !== null) child.dataset.toolbarAlignmentLine = p.line;
            n.append(child);
          }
        }
        parent.append(n); document.getElementById('fixture').replaceChildren(parent); n._measure(); return n;
      };
      window.collectPaddingRow = n => {
        const r = n._frame.getBoundingClientRect(), rect = el => window.paddingRect(n, el);
        const boxes = { root: { x: 0, y: 0, width: r.width, height: r.height }, balanced: rect(n._main), 'main-row': rect(n._groups.main) };
        for (const name of ['leading', 'main', 'trailing']) {
          if (name !== 'main') { if (!n._rowLayout.placements[name]) continue; boxes[name] = rect(n._clips[name]); boxes[name + '-row'] = rect(n._groups[name]); }
          for (let j = 0; j < n._rowChildren[name].length; j++) {
            const child = n._rowChildren[name][j]; boxes[name + '-row-' + j] = rect(child);
            if (child.localName === 'md-icon-button') boxes[name + '-row-' + j + '-body'] = rect(child.shadowRoot.querySelector('button'));
          }
        }
        return { size: { width: r.width, height: r.height }, lines: n._rowLayout.lines, boxes };
      };
      window.createPaddingFab = (i, native = false) => {
        const parent = document.createElement('div'); parent.style.cssText = 'width:20000px;height:20000px;';
        const n = document.createElement('md-toolbar'); n.id = 'padding-fab'; n.variant = 'floating'; n.orientation = i.vertical ? 'vertical' : 'horizontal'; n.dir = i.rtl ? 'rtl' : 'ltr'; n.expanded = true; n.contentPadding = i.contentPadding; n.fabPosition = i.position;
        if (native) { const b = document.createElement('md-icon-button'); b.setAttribute('icon', 'edit'); n.append(b); }
        const content = document.createElement('div'); content.style.cssText = `width:${i.vertical ? i.contentCross : i.contentAxis - (native ? 48 : 0)}px;height:${i.vertical ? i.contentAxis - (native ? 48 : 0) : i.contentCross}px;`; n.append(content);
        const fab = document.createElement('md-fab'); fab.slot = 'fab'; fab.setAttribute('icon', 'add'); n.append(fab); parent.append(n); document.getElementById('fixture').replaceChildren(parent); n._measure(); return n;
      };
      window.collectPaddingFab = n => {
        const r = n._frame.getBoundingClientRect(), rect = el => window.paddingRect(n, el), group = rect(n._groups.main);
        const boxes = { toolbar: rect(n._surface), fab: rect(n._fab), viewport: rect(n._viewport) };
        const vertical = n.orientation === 'vertical';
        return { size: { width: r.width, height: r.height }, boxes, group, range: vertical ? n._viewport.scrollHeight - n._viewport.clientHeight : n._viewport.scrollWidth - n._viewport.clientWidth, fabBody: rect(n.querySelector('md-fab').shadowRoot.querySelector('button')) };
      };
    });

    // Batch atomic DOM measurements; every expected coordinate remains Kotlin data.
    const finiteRows = process.argv.includes('--padding-fab-only') ? [] : rows.filter(c => c.input.maxMain !== 2147483647);
    let rowCount = 0;
    for (let offset = 0; offset < finiteRows.length; offset += 32) {
      const batch = finiteRows.slice(offset, offset + 32);
      const actual = await page.evaluate(batch => batch.map(c => {
        const i = c.input, key = JSON.stringify([i.vertical, i.main, i.presence]);
        let n = document.getElementById('padding-row'); if (!n || window.paddingRowKey !== key) { n = window.createPaddingRow(i); window.paddingRowKey = key; }
        n.dir = i.rtl ? 'rtl' : 'ltr'; n.expanded = i.expanded; n.contentPadding = i.contentPadding;
        const axis = i.vertical ? 'Height' : 'Width', cross = i.vertical ? 'Width' : 'Height';
        n.style['min' + axis] = i.minMain + 'px'; n.style['max' + axis] = i.maxMain + 'px'; n.style['min' + cross] = i.minCross + 'px'; n.style['max' + cross] = i.maxCross + 'px'; n._measure(); n._rowLines = null;
        const channels = n._motion.channels, saved = {};
        for (const name of ['leading', 'trailing']) {
          n._visibilityState[name] = ({ visible: 'Visible', collapsed: 'PostExit', enter: 'PreEnter', exit: 'Visible' })[i.state]; n._alignment[name] = name === 'leading' ? i.leadCurrent : i.trailCurrent;
          for (const key of [name, name + 'Cross', name + 'Offset']) { saved[key] = channels[key].animation; channels[key].animation = i.settled ? null : {}; }
        }
        const size = (name, dimension) => i.sample < 0 ? (c.placements[name]?.[dimension] ?? 0) : dimension === (i.vertical ? 'height' : 'width') ? i.sample : i.cross;
        try {
          n._draw({ ...n._values, leading: size('leading', i.vertical ? 'height' : 'width'), trailing: size('trailing', i.vertical ? 'height' : 'width'), leadingCross: size('leading', i.vertical ? 'width' : 'height'), trailingCross: size('trailing', i.vertical ? 'width' : 'height'), leadingOffset: 0, trailingOffset: 0, padding: i.padding });
          return window.collectPaddingRow(n);
        } finally { for (const [key, value] of Object.entries(saved)) channels[key].animation = value; }
      }), batch);
      actual.forEach((a, j) => compare(a, batch[j])); rowCount += actual.length;
    }
    const finiteFabs = fabs.filter(c => !c.error && c.input.maxAxis !== 2147483647 && c.input.contentAxis === 203);
    let fabCount = 0;
    for (let offset = 0; offset < finiteFabs.length; offset += 32) {
      const batch = finiteFabs.slice(offset, offset + 32);
      const actual = await page.evaluate(batch => batch.map(c => {
        const i = c.input, key = JSON.stringify([i.vertical, i.contentCross]);
        let n = document.getElementById('padding-fab'); if (!n || window.paddingFabKey !== key) { n = window.createPaddingFab(i); window.paddingFabKey = key; }
        n.dir = i.rtl ? 'rtl' : 'ltr'; n.fabPosition = i.position; n.toolbarContentPadding = i.contentPadding; n._measure();
        n._constraints = { minAxis: i.minAxis, maxAxis: i.maxAxis, minCross: i.minCross, maxCross: i.maxCross };
        n._draw({ ...n._values, progress: i.progress }); n._viewport[i.vertical ? 'scrollTop' : 'scrollLeft'] = i.vertical ? i.scroll : i.rtl ? -i.scroll : i.scroll;
        return window.collectPaddingFab(n);
      }), batch);
      actual.forEach((a, j) => {
        const c = batch[j]; compare(a, c); near(a.range, c.scroll.max, 'native scroll range ' + JSON.stringify({ input: c.input, group: a.group, size: a.size }));
        for (const key of ['x', 'y', 'width', 'height']) near(a.fabBody[key], c.placements.fab[key], 'native FAB body ' + key);
        if (c.scroll.viewport > 0) { const coordinate = c.input.vertical ? 'y' : 'x', axis = c.input.vertical ? 'height' : 'width'; near(a.group[coordinate], c.placements.content[coordinate], 'content scroll placement'); near(a.group[axis], c.placements.content[axis], 'content main size'); }
      }); fabCount += actual.length;
    }

    let live = 0;
    for (const vertical of [false, true]) for (const rtl of [false, true]) {
      const natural = rows.filter(c => c.input.vertical === vertical && c.input.rtl === rtl && c.input.state === 'visible' && c.input.presence === 3 && c.input.maxMain === 10000 && c.input.main[0]?.width === 32 && c.input.main[1]?.width === 52);
      await page.evaluate(i => { const n = window.createPaddingRow(i); n._savedControls = n._rowChildren.main.map(c => c.shadowRoot.querySelector('button')); n._savedControls[0].focus(); }, natural[0].input);
      for (const c of natural) {
        await page.locator('#padding-row').evaluate((n, padding) => { n.contentPadding = padding; }, c.input.contentPadding); await page.waitForTimeout(32);
        compare(await page.locator('#padding-row').evaluate(n => window.collectPaddingRow(n)), c);
        assert.equal(await page.locator('#padding-row').evaluate(n => n._rowChildren.main.every((c, j) => c.shadowRoot.querySelector('button') === n._savedControls[j]) && n._rowChildren.main[0].shadowRoot.activeElement === n._savedControls[0]), true); live++;
      }
      // Inherited direction changes invalidate logical padding without forced draw.
      const logical = natural.find(c => c.input.contentPadding.start === 3);
      await page.locator('#padding-row').evaluate((n, padding) => { n.contentPadding = padding; n.removeAttribute('dir'); n.parentElement.dir = n.parentElement.dir === 'rtl' ? 'ltr' : 'rtl'; }, logical.input.contentPadding);
      await page.waitForTimeout(32);
      const inheritedRtl = await page.locator('#padding-row').evaluate(n => getComputedStyle(n).direction === 'rtl');
      const inherited = rows.find(c => c.input.vertical === vertical && c.input.rtl === inheritedRtl && c.input.state === 'visible' && c.input.presence === 3 && c.input.maxMain === 10000 && c.input.main[0]?.width === 32 && c.input.main[1]?.width === 52 && c.input.contentPadding.start === 3);
      compare(await page.locator('#padding-row').evaluate(n => window.collectPaddingRow(n)), inherited);
      await page.locator('#padding-row').evaluate(n => { const parent = n.parentElement; n.remove(); parent.append(n); }); await page.waitForTimeout(32); compare(await page.locator('#padding-row').evaluate(n => window.collectPaddingRow(n)), inherited);

      const naturalFab = fabs.filter(c => !c.error && c.input.vertical === vertical && c.input.rtl === rtl && c.input.contentAxis === 144 && c.input.contentCross === 56 && c.input.maxAxis === 10000 && c.input.progress === 1 && c.input.position === (vertical ? 'bottom' : 'end') && c.input.scroll === 0);
      await page.evaluate(i => { const n = window.createPaddingFab(i, true); n._savedButton = n.querySelector('md-icon-button').shadowRoot.querySelector('button'); n._savedButton.focus(); }, naturalFab[0].input);
      for (const c of naturalFab) {
        await page.locator('#padding-fab').evaluate((n, padding) => { n.contentPadding = 8; n.toolbarContentPadding = padding; }, c.input.contentPadding); await page.waitForTimeout(32);
        compare(await page.locator('#padding-fab').evaluate(n => window.collectPaddingFab(n)), c);
        assert.equal(await page.locator('#padding-fab').evaluate(n => n.querySelector('md-icon-button').shadowRoot.querySelector('button') === n._savedButton && n.querySelector('md-icon-button').shadowRoot.activeElement === n._savedButton), true); live++;
      }
      const fallback = naturalFab.find(c => c.input.contentPadding.start === 3);
      await page.locator('#padding-fab').evaluate((n, padding) => { n.contentPadding = padding; n.toolbarContentPadding = null; }, fallback.input.contentPadding); await page.waitForTimeout(32);
      compare(await page.locator('#padding-fab').evaluate(n => window.collectPaddingFab(n)), fallback);
      await page.locator('#padding-fab').evaluate(n => { const parent = n.parentElement; n.remove(); parent.append(n); }); await page.waitForTimeout(32); compare(await page.locator('#padding-fab').evaluate(n => window.collectPaddingFab(n)), fallback);
    }
    assert.deepEqual(errors, []);
    console.log(`Toolbar content padding browser: ${rowCount} source native no-FAB DOM trees, ${fabCount} source FAB/viewport/scroll/native FAB-body trees, ${live} live logical/absolute/fractional/zero/large updates, inherited RTL, alias fallback, retained focused controls and lifecycle passed.`);
  } finally { await page.close(); }
}
