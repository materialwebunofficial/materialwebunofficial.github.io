import { chromium } from 'playwright';
import fs from 'fs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

const sections = await page.evaluate(() => {
  return [...document.querySelectorAll('.category')].map(s => ({ id: s.id, name: s.querySelector('h2')?.textContent?.trim() }));
});

const dir = 'scripts/qc-shots';
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

for (const sec of sections) {
  const el = await page.$(`#${sec.id}`);
  if (!el) continue;
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const path = `${dir}/qc-${sec.id}.png`;
  await el.screenshot({ path, fullPage: false }).catch(() => {});
  console.log(`shot: ${sec.id} (${sec.name})`);
}

await browser.close();
console.log('DONE -', sections.length, 'sections');
