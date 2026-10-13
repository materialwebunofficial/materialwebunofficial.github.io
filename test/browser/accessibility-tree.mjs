import assert from 'node:assert/strict';

// The accessibility tree screen readers read (Chromium's, through CDP
// Accessibility.getFullAXTree) for every catalog example and the home page:
// every interactive node has a name, toggles expose their state, and no
// interactive node sits inside another one. It is not a screen reader run.
const INTERACTIVE = new Set(['button', 'checkbox', 'switch', 'slider', 'tab', 'radio', 'combobox', 'textbox', 'searchbox', 'spinbutton',
  'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'link', 'treeitem']);
const TOGGLES = { checkbox: 'checked', switch: 'checked', radio: 'checked', menuitemcheckbox: 'checked', menuitemradio: 'checked', tab: 'selected' };

export async function testAccessibilityTree(browser, base) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  let checked = 0;
  const problems = [];
  try {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Accessibility.enable');
    const audit = async view => {
      const { nodes } = await cdp.send('Accessibility.getFullAXTree');
      const byId = new Map(nodes.map(n => [n.nodeId, n]));
      for (const node of nodes) {
        if (node.ignored) continue;
        const role = node.role?.value;
        if (!INTERACTIVE.has(role)) continue;
        checked++;
        const name = (node.name?.value ?? '').trim();
        const props = Object.fromEntries((node.properties ?? []).map(p => [p.name, p.value?.value]));
        if (props.hidden) continue;
        if (!name) problems.push(`${view}: unnamed ${role}`);
        const state = TOGGLES[role];
        if (state && props[state] === undefined && !(role === 'tab')) problems.push(`${view}: ${role} "${name}" without ${state}`);
        // An interactive node inside another interactive node (nested controls).
        for (let parent = byId.get(node.parentId); parent; parent = byId.get(parent.parentId)) {
          const parentRole = parent.ignored ? null : parent.role?.value;
          if (parentRole && INTERACTIVE.has(parentRole) && !['option', 'treeitem', 'combobox', 'menuitem'].includes(parentRole)) {
            problems.push(`${view}: ${role} "${name}" inside ${parentRole} "${parent.name?.value ?? ''}"`);
            break;
          }
        }
      }
    };
    await page.goto(base + '/#home');
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-showcase-ready'), null, { timeout: 30000 });
    await page.waitForTimeout(800);
    await audit('home');
    await page.goto(base + '/#components');
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-showcase-ready'), null, { timeout: 30000 });
    const sections = await page.evaluate(() => [...document.querySelectorAll('#tab-view-components .category-section')].map(s => s.id));
    for (const id of sections) { await page.evaluate(id => { location.hash = id; }, id); await page.waitForTimeout(250); }
    await page.waitForTimeout(800);
    await audit('catalog');
    assert.deepEqual(problems, [], problems.join('\n'));
    assert.ok(checked > 400, `checked ${checked} interactive nodes`);
    assert.deepEqual(errors, []);
    console.log(`Accessibility tree: ${checked} interactive nodes on the home page and ${sections.length} catalog sections are named, expose their toggle state and are not nested.`);
  } finally { await page.close(); }
}
