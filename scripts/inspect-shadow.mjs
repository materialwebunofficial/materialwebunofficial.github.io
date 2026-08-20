import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

// Inspect shadow DOM of key "empty" components
const inspect = await page.evaluate(() => {
  function inner(tag) {
    const el = document.querySelector(tag);
    if (!el) return `${tag}: NOT IN DOM`;
    const sr = el.shadowRoot;
    if (!sr) return `${tag}: no shadowRoot`;
    // get first 400 chars of shadow innerHTML
    return `${tag}: shadowLen=${sr.innerHTML.length}\n${sr.innerHTML.slice(0, 300)}`;
  }
  return {
    navBar: inner('md-navigation-bar'),
    navRail: inner('md-navigation-rail'),
    tabs: inner('md-tabs'),
    seg: inner('md-segmented-button'),
    split: inner('md-split-button'),
    menu: inner('md-menu'),
  };
});

console.log('=== NAV BAR ===\n' + inspect.navBar);
console.log('\n=== NAV RAIL ===\n' + inspect.navRail);
console.log('\n=== TABS ===\n' + inspect.tabs);
console.log('\n=== SEGMENTED ===\n' + inspect.seg);
console.log('\n=== SPLIT ===\n' + inspect.split);
console.log('\n=== MENU ===\n' + inspect.menu);
console.log('\n=== PAGE ERRORS ===\n' + errs.join('\n'));
await browser.close();
