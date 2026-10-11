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
      document.querySelector('#fixture').innerHTML = '<form><md-button id="custom" type="submit">Custom</md-button><button id="native" type="submit">Native</button></form><md-checkbox id="check" label="Custom checkbox"></md-checkbox><input id="nativecheck" type="checkbox">';
      window.auditSubmissions = 0;
      document.querySelector('form').addEventListener('submit', event => { event.preventDefault(); window.auditSubmissions++; });
      for (const id of ['custom', 'native', 'check', 'nativecheck']) document.getElementById(id).addEventListener('click', event => event.preventDefault());
    });
    for (const id of ['custom', 'native', 'check', 'nativecheck']) await page.locator('#' + id).click();
    const actual = await page.evaluate(() => ({ submissions: window.auditSubmissions, customChecked: document.querySelector('#check').checked, nativeChecked: document.querySelector('#nativecheck').checked }));
    const row = { engine, actual }; results.push(row); console.log(JSON.stringify(row));
  } finally { await browser.close(); }
}
fs.writeFileSync(new URL('./trusted-click-results.json', import.meta.url), JSON.stringify(results, null, 2));
