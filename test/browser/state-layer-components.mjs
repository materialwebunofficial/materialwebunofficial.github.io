import assert from 'node:assert/strict';

// Material3 CommonRippleNode state layer on components that previously used CSS
// :hover/:focus-visible opacity: hover 0.08 and focus 0.1 through the shared
// interaction tween, no extra layer while pressed (the ripple draws presses),
// and nothing while disabled.
const CASES = [
  ['navigation bar', `<md-navigation-bar id="c" items='[{"icon":"home","label":"Home"},{"icon":"search","label":"Search"}]'></md-navigation-bar>`, h => h.shadowRoot.querySelectorAll('.item')[1], b => b.querySelector('.ripple'), '::before'],
  ['navigation rail', `<md-navigation-rail id="c" style="height:300px" items='[{"icon":"home","label":"Home"},{"icon":"search","label":"Search"}]'></md-navigation-rail>`, h => h.shadowRoot.querySelectorAll('.item')[1], b => b.querySelector('.ripple'), '::before'],
  ['navigation drawer', `<md-navigation-drawer id="c" variant="standard" style="height:300px" items='[{"icon":"home","label":"Home"},{"icon":"search","label":"Search"}]'></md-navigation-drawer>`, h => h.shadowRoot.querySelectorAll('.item')[1], b => b, '::before'],
  ['tabs', `<md-tabs id="c" tabs='[{"label":"One"},{"label":"Two"}]'></md-tabs>`, h => h.shadowRoot.querySelectorAll('.tab')[1], b => b.querySelector('.state'), null],
  ['list item', `<md-list id="c"><md-list-item interactive headline="Inbox"></md-list-item></md-list>`, h => h.querySelector('md-list-item').shadowRoot.querySelector('.item'), b => b.querySelector('.ripple'), '::before'],
  ['stepper', `<md-stepper id="c"><md-step label="One"></md-step><md-step label="Two"></md-step></md-stepper>`, h => h.shadowRoot.querySelectorAll('.step-header')[1], b => b, '::before'],
];

export async function testStateLayerComponents(browser, base, { page: url = '/test/browser/fixtures/toolbars.html' } = {}) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } }), errors = [];
  let checks = 0;
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(base + url);
    await page.evaluate(() => Promise.all(['md-navigation-bar', 'md-navigation-rail', 'md-navigation-drawer', 'md-tabs', 'md-list', 'md-stepper'].map(n => customElements.whenDefined(n))));
    for (const [name, html, target, layer, pseudo] of CASES) {
      await page.mouse.move(990, 690);
      await page.evaluate(html => { document.querySelector('#fixture').innerHTML = html; return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }, html);
      const handle = await page.evaluateHandle(target => (0, eval)(`(${target})`)(document.querySelector('#c')), target.toString());
      const opacity = () => page.evaluate(({ target, layer, pseudo }) => {
        const b = (0, eval)(`(${target})`)(document.querySelector('#c')), l = (0, eval)(`(${layer})`)(b);
        return Number(getComputedStyle(l, pseudo).opacity);
      }, { target: target.toString(), layer: layer.toString(), pseudo });
      const box = await handle.evaluate(b => { const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      assert.equal(await opacity(), 0, `${name} rest`);
      await page.mouse.move(box.x, box.y);
      await page.waitForTimeout(80);
      assert.ok(Math.abs(await opacity() - 0.08) < 1e-6, `${name} hover 0.08`);
      await page.mouse.down();
      await page.waitForTimeout(80);
      assert.ok(Math.abs(await opacity() - 0.08) < 1e-6, `${name} press keeps the hover layer; the ripple draws the press`);
      await page.mouse.up();
      await page.mouse.move(990, 690);
      await page.waitForTimeout(80);
      assert.equal(await opacity(), 0, `${name} hover exit`);
      // Keyboard focus shows the focus layer.
      await handle.evaluate(b => b.blur());
      await page.keyboard.press('Escape');
      await handle.evaluate(b => b.focus());
      await page.waitForTimeout(120);
      const focused = await opacity();
      assert.ok(Math.abs(focused - 0.1) < 1e-6, `${name} keyboard focus 0.1 (${focused})`);
      await handle.evaluate(b => b.blur());
      await page.waitForTimeout(80);
      assert.equal(await opacity(), 0, `${name} focus exit`);
      checks += 6;
    }
    assert.deepEqual(errors, []);
    console.log(`Component state layers: ${checks} hover/press/exit/keyboard-focus checks across navigation bar, rail, drawer, tabs, list and stepper passed (shared CommonRippleNode tween).`);
  } finally { await page.close(); }
}
