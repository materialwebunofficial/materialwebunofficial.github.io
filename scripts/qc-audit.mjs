import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

const results = await page.evaluate(() => {
  const out = { components: [], errors: [] };
  const tags = [
    'md-button','md-split-button','md-icon-button','md-fab','md-chip','md-slider',
    'md-switch','md-checkbox','md-radio-button','md-progress-indicator','md-loading-indicator',
    'md-segmented-button','md-text-field','md-top-app-bar','md-bottom-app-bar','md-navigation-bar',
    'md-navigation-rail','md-navigation-drawer','md-tabs','md-toolbar','md-search-bar','md-menu',
    'md-bottom-sheet','md-dialog','md-snackbar','md-fab-menu','md-card','md-list','md-list-item',
    'md-divider','md-badge','md-tooltip','md-date-picker','md-time-picker'
  ];
  for (const tag of tags) {
    const els = document.querySelectorAll(tag);
    const count = els.length;
    let mounted = 0;
    let emptyShadow = 0;
    els.forEach(el => {
      if (el.shadowRoot) {
        mounted++;
        const html = el.shadowRoot.innerHTML.trim();
        if (html.length < 10) emptyShadow++;
      }
    });
    out.components.push({ tag, count, mounted, emptyShadow });
  }
  return out;
});

// Test interactions: click a button, toggle a switch, open a dialog
const interactions = {};
try {
  // Click first filled button
  const btn = await page.$('md-button');
  if (btn) { await btn.click(); interactions.buttonClick = 'ok'; }
  // Toggle a switch
  const sw = await page.$('md-switch');
  if (sw) { await sw.click(); interactions.switchToggle = 'ok'; }
  // Open a dialog
  const dlgTrigger = await page.$('md-dialog');
  if (dlgTrigger) {
    await page.evaluate(() => { const d = document.querySelector('md-dialog'); if (d.show) d.show(); });
    await page.waitForTimeout(300);
    interactions.dialogOpen = 'ok';
  }
} catch (e) { interactions.error = e.message; }

console.log('=== COMPONENT MOUNT AUDIT ===');
let failCount = 0;
for (const c of results.components) {
  const status = (c.count > 0 && c.mounted === c.count && c.emptyShadow === 0) ? 'OK' : 'CHECK';
  if (status === 'CHECK') failCount++;
  console.log(`${status} ${c.tag}: count=${c.count} mounted=${c.mounted} emptyShadow=${c.emptyShadow}`);
}
console.log(`\n=== INTERACTIONS ===`);
console.log(JSON.stringify(interactions, null, 1));
console.log(`\n=== ERRORS ===`);
console.log('Page errors:', pageErrors.length, pageErrors.join(' | '));
console.log('Console errors:', consoleErrors.length, consoleErrors.slice(0,5).join(' | '));
console.log(`\n=== SUMMARY ===`);
console.log('Components needing check:', failCount);

await browser.close();
