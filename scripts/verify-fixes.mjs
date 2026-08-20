import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
const errs = [], f404 = [];
page.on('pageerror', e => errs.push(e.message));
page.on('response', r => { if (r.status() === 404) f404.push(r.url()); });

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// 1. Icons rendered?
const iconFont = await page.evaluate(() => {
  const el = document.querySelector('.mat-sym');
  if (!el) return 'no .mat-sym';
  const cs = getComputedStyle(el);
  return cs.fontFamily;
});

// 2. Snackbar centered?
// trigger snackbar if button exists
const snackTrig = await page.$('md-snackbar ~ * button, [data-trigger="snackbar"], #trigger-snackbar');
let snackCentered = 'n/a';
try {
  await page.evaluate(() => {
    const sb = document.querySelector('md-snackbar');
    if (sb && sb.show) sb.show('Test message');
  });
  await page.waitForTimeout(500);
  snackCentered = await page.evaluate(() => {
    const sb = document.querySelector('md-snackbar .snackbar');
    if (!sb) return 'no snackbar el';
    const r = sb.getBoundingClientRect();
    const center = window.innerWidth / 2;
    const elCenter = r.left + r.width / 2;
    return Math.abs(center - elCenter) < 5 ? 'CENTERED' : `OFF by ${Math.round(elCenter - center)}px`;
  });
} catch (e) { snackCentered = 'err: ' + e.message; }

// 3. Loading blob SVG present?
const blobOk = await page.evaluate(() => {
  const ld = document.querySelector('md-loading-indicator svg path');
  return !!ld;
});

// 4. Progress wavy SVG?
const wavyOk = await page.evaluate(() => {
  const w = document.querySelector('md-progress-indicator .wavy-svg');
  return !!w;
});

// 5. Carousel removed?
const carouselGone = await page.evaluate(() => !document.querySelector('md-carousel'));

// 6. Lists clickable (tabindex 0)?
const listClickable = await page.evaluate(() => {
  const items = [...document.querySelectorAll('md-list-item')];
  const interactive = items.filter(i => i.shadowRoot && i.shadowRoot.querySelector('.item')?.getAttribute('tabindex') === '0');
  return `${interactive.length}/${items.length} interactive`;
});

console.log('Icon font-family:', iconFont);
console.log('Snackbar:', snackCentered);
console.log('Loading blob SVG:', blobOk);
console.log('Progress wavy SVG:', wavyOk);
console.log('Carousel removed:', carouselGone);
console.log('Lists clickable:', listClickable);
console.log('404 count:', [...new Set(f404)].length, [...new Set(f404)].slice(0,3).join(', '));
console.log('Page errors:', errs.length, errs.join(' | '));

await browser.close();
