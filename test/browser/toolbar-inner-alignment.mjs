import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';

const all = JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/toolbar-inner-alignment/inner-oracle.json.gz', import.meta.url))));
const cases = all.filter(c => c.input.maxMain !== 2147483647);
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < .1, `${label}: ${actual} vs ${expected}`);

export async function testToolbarInnerAlignment(browser, base) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } }), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base + '/test/browser/fixtures/toolbars.html');
    await page.evaluate(async () => { await customElements.whenDefined('md-toolbar'); await document.fonts.ready; });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const create = async i => {
      await page.evaluate(i => {
        const parent = document.createElement('div'); parent.style.cssText = 'width:20000px;height:20000px;';
        const n = document.createElement('md-toolbar'); n.id = 'inner-toolbar'; n.variant = 'floating'; n.orientation = i.vertical ? 'vertical' : 'horizontal';
        n.dir = i.rtl ? 'rtl' : 'ltr'; n.expanded = i.expanded;
        for (const name of ['leading', 'main', 'trailing']) {
          if (name !== 'main' && !(i.presence & (name === 'leading' ? 1 : 2))) continue;
          for (const p of i[name]) {
            const child = document.createElement(p.native ? 'md-icon-button' : 'div'); if (name !== 'main') child.slot = name;
            if (p.native) {
              child.setAttribute('icon', 'edit'); child.setAttribute('size', ({ 32: 'xs', 40: 's', 56: 'm', 96: 'l', 136: 'xl' })[p.height]);
              if (p.width === 52) child.setAttribute('width', 'wide');
            } else child.style.cssText = `width:${p.width}px;height:${p.height}px;`;
            if (p.weight) child.dataset.toolbarWeight = p.weight;
            child.dataset.toolbarFill = String(p.fill);
            if (p.align !== 'default') child.dataset.toolbarAlign = p.align;
            if (p.line !== null) child.dataset.toolbarAlignmentLine = p.line;
            n.append(child);
          }
        }
        parent.append(n); document.getElementById('fixture').replaceChildren(parent);
      }, i);
      await page.waitForTimeout(16);
    };
    await page.evaluate(() => { window.collectInnerToolbarGeometry = n => {
      const root = n._frame.getBoundingClientRect();
      const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x - root.x, y: r.y - root.y, width: r.width, height: r.height }; };
      const boxes = { root: { x: 0, y: 0, width: root.width, height: root.height }, balanced: rect(n._main), 'main-row': rect(n._groups.main) };
      for (const name of ['leading', 'main', 'trailing']) {
        if (name !== 'main') {
          if (!n._rowLayout.placements[name]) continue;
          boxes[name] = rect(n._clips[name]); boxes[name + '-row'] = rect(n._groups[name]);
        }
        for (let j = 0; j < n._rowChildren[name].length; j++) {
          const child = n._rowChildren[name][j]; boxes[name + '-row-' + j] = rect(child);
          if (child.localName === 'md-icon-button') boxes[name + '-row-' + j + '-body'] = rect(child.shadowRoot.querySelector('button'));
        }
      }
      return { size: { width: root.width, height: root.height }, lines: n._rowLayout.lines, boxes };
    }; });
    const collect = n => window.collectInnerToolbarGeometry(n);
    const check = (actual, c) => {
      const label = JSON.stringify(c.input);
      assert.deepEqual(actual.size, c.size, label); assert.deepEqual(actual.lines, c.lines, label);
      for (const [id, box] of Object.entries(actual.boxes)) for (const field of ['x', 'y', 'width', 'height']) near(box[field], c.placements[id][field], id + '.' + field + ' ' + label);
    };
    let previous = '', count = 0;
    for (const c of cases) {
      const i = c.input, key = JSON.stringify([i.vertical, i.main, i.presence]);
      if (key !== previous) { await create(i); previous = key; }
      const actual = await page.locator('#inner-toolbar').evaluate((n, c) => {
        const i = c.input, axis = i.vertical ? 'Height' : 'Width', cross = i.vertical ? 'Width' : 'Height';
        n.expanded = i.expanded; n.dir = i.rtl ? 'rtl' : 'ltr';
        n.style['min' + axis] = i.minMain + 'px'; n.style['max' + axis] = i.maxMain + 'px';
        n.style['min' + cross] = i.minCross + 'px'; n.style['max' + cross] = i.maxCross + 'px'; n._rowLines = null;
        const channels = n._motion.channels, saved = {};
        for (const name of ['leading', 'trailing']) {
          n._visibilityState[name] = ({ visible: 'Visible', collapsed: 'PostExit', enter: 'PreEnter', exit: 'Visible' })[i.state];
          n._alignment[name] = name === 'leading' ? i.leadCurrent : i.trailCurrent;
          for (const key of [name, name + 'Cross', name + 'Offset']) { saved[key] = channels[key].animation; channels[key].animation = i.settled ? null : {}; }
        }
        // Finished Visible sizes come from the original visibility node output.
        // Intermediate sizes remain the explicit source transition samples.
        const size = name => i.sample < 0 ? (c.placements[name]?.[i.vertical ? 'height' : 'width'] ?? 0) : i.sample;
        const crossSize = name => i.sample < 0 ? (c.placements[name]?.[i.vertical ? 'width' : 'height'] ?? 0) : i.cross;
        try { n._draw({ ...n._values, leading: size('leading'), trailing: size('trailing'), leadingCross: crossSize('leading'), trailingCross: crossSize('trailing'), leadingOffset: 0, trailingOffset: 0, padding: i.padding }); return window.collectInnerToolbarGeometry(n); }
        finally { for (const [key, value] of Object.entries(saved)) channels[key].animation = value; }
      }, c);
      check(actual, c); count++;
    }

    // Attribute mutations exercise ordinary measurement and retained controls.
    let live = 0;
    for (const vertical of [false, true]) for (const rtl of [false, true]) {
      const select = explicit => all.find(c => {
        const i = c.input;
        return i.vertical === vertical && i.rtl === rtl && i.state === 'visible' && i.presence === 3 && i.maxMain === 10000 && i.main[0]?.width === 32 && i.main[1]?.width === 52 && i.main[0].align === (explicit ? 'end' : 'default');
      });
      const natural = select(false), explicit = select(true); await create(natural.input);
      await page.waitForTimeout(32); check(await page.locator('#inner-toolbar').evaluate(collect), natural);
      await page.locator('#inner-toolbar').evaluate(n => {
        n._savedControls = n._rowChildren.main.map(child => child.shadowRoot.querySelector('button'));
        n._savedControls[0].focus();
        n._rowChildren.main[0].dataset.toolbarAlign = 'end'; n._rowChildren.main[1].dataset.toolbarAlign = 'center';
      });
      await page.waitForTimeout(32); check(await page.locator('#inner-toolbar').evaluate(collect), explicit);
      await page.locator('#inner-toolbar').evaluate(n => {
        n._rowChildren.main[0].removeAttribute('data-toolbar-align'); n._rowChildren.main[1].removeAttribute('data-toolbar-align');
      });
      await page.waitForTimeout(32); check(await page.locator('#inner-toolbar').evaluate(collect), natural);
      assert.equal(await page.locator('#inner-toolbar').evaluate(n => n._rowChildren.main.every((child, j) => child.shadowRoot.querySelector('button') === n._savedControls[j]) && n._rowChildren.main[0].shadowRoot.activeElement === n._savedControls[0]), true);
      await page.locator('#inner-toolbar').evaluate(n => { const parent = n.parentElement; n.remove(); parent.append(n); });
      await page.waitForTimeout(32); check(await page.locator('#inner-toolbar').evaluate(collect), natural); live++;
    }
    assert.deepEqual(errors, []);
    console.log(`Toolbar inner defaults: ${count} original Kotlin native/mixed/weighted/relative-line/RTL/visibility DOM trees, ${live} live default/explicit/removal/lifecycle cases with retained focused controls passed.`);
  } finally { await page.close(); }
}
