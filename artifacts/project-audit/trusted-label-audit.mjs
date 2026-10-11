import { chromium, firefox, webkit } from 'playwright';
import fs from 'node:fs';
const results = [];
for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await type.launch({ headless: true });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    await page.goto('http://127.0.0.1:28081/__audit/blank?mode=src');
    await page.waitForFunction(() => 'ready' in document.documentElement.dataset);
    await page.evaluate(() => {
      document.querySelector('#fixture').innerHTML = '<label for="custom">Customer name</label><md-text-field id="custom" single-line></md-text-field><label for="native">Native customer name</label><input id="native">';
    });
    await page.locator('label[for="custom"]').click();
    const customFocused = await page.locator('#custom').evaluate(h => h.shadowRoot.activeElement === h.shadowRoot.querySelector('input'));
    await page.locator('label[for="native"]').click();
    const nativeFocused = await page.locator('#native').evaluate(h => document.activeElement === h);
    const ax = await page.locator('#fixture').ariaSnapshot();
    const row = { engine, customFocused, nativeFocused, ax }; results.push(row); console.log(JSON.stringify(row));
  } finally { await browser.close(); }
}
fs.writeFileSync(new URL('./trusted-label-results.json', import.meta.url), JSON.stringify(results, null, 2));
