import { chromium } from 'playwright';

const sections = [
  'buttons', 'fabs', 'icon-buttons', 'chips', 'selection', 'sliders',
  'text-fields', 'segmented', 'progress', 'app-bars', 'nav', 'tabs',
  'search', 'menus', 'cards', 'dialogs', 'sheets', 'snackbars',
  'tooltips', 'badges', 'pickers', 'carousel', 'lists', 'dividers', 'toolbars'
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });

// Collect console errors (component registration failures, etc.)
const consoleErrors = [];
const pageErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => pageErrors.push(e.message));

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// Count rendered custom elements (check if they actually mounted)
const componentCounts = await page.evaluate(() => {
  const tags = ['md-button','md-fab','md-icon-button','md-split-button','md-chip','md-slider','md-switch','md-checkbox','md-radio-button','md-segmented-button','md-progress-indicator','md-loading-indicator','md-card','md-list','md-list-item','md-divider','md-badge','md-tooltip','md-top-app-bar','md-bottom-app-bar','md-navigation-bar','md-navigation-rail','md-navigation-drawer','md-side-sheet','md-tabs','md-toolbar','md-search-bar','md-menu','md-bottom-sheet','md-dialog','md-snackbar','md-fab-menu','md-date-picker','md-time-picker','md-carousel','md-text-field'];
  const out = {};
  tags.forEach(t => {
    const els = document.querySelectorAll(t);
    out[t] = els.length;
    // check shadow DOM rendered (not empty)
    els.forEach(el => {
      if (el.shadowRoot && el.shadowRoot.children.length === 0) out[t + '_EMPTY'] = (out[t+'_EMPTY']||0)+1;
    });
  });
  return out;
});

console.log('=== COMPONENT INSTANCE COUNTS ===');
let total = 0, empty = 0;
for (const [k,v] of Object.entries(componentCounts)) {
  if (k.endsWith('_EMPTY')) { empty += v; console.log(`  ⚠ EMPTY SHADOW: ${k} = ${v}`); }
  else if (typeof v === 'number') { total += v; console.log(`  ${k}: ${v}`); }
}
console.log(`\nTOTAL instances: ${total}, EMPTY shadow DOMs: ${empty}`);

// Screenshot full page + each section
await page.screenshot({ path: 'scripts/shot-full.png', fullPage: true });
console.log('\nSaved scripts/shot-full.png (full page)');

// Per-section screenshots for visual QC
for (const sec of sections) {
  const el = await page.$('#' + sec);
  if (!el) { console.log(`  ⚠ section #${sec} NOT FOUND`); continue; }
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await el.screenshot({ path: `scripts/shot-${sec}.png` }).catch(e => console.log(`  ✗ shot ${sec}: ${e.message}`));
}
console.log('Per-section screenshots saved to scripts/shot-*.png');

console.log('\n=== CONSOLE ERRORS (' + consoleErrors.length + ') ===');
consoleErrors.slice(0,30).forEach(e => console.log('  ' + e));
console.log('\n=== PAGE ERRORS (' + pageErrors.length + ') ===');
pageErrors.slice(0,30).forEach(e => console.log('  ' + e));

await browser.close();
