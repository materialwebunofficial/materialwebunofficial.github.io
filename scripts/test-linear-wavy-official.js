import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join('.', reqPath);
  const ext = path.extname(filePath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(3589, async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2.0 });
  await page.goto('http://localhost:3589/index.html');
  await page.waitForTimeout(600);

  const linearCard = page.locator('#loading-indicator .cards-grid > div:nth-child(1)');
  await linearCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  // 1. Screenshot of the official 75% Linear Wavy (Active wavy, flat track, flat stop dot)
  await linearCard.screenshot({ path: 'scratch_linear_wavy_official_75.png' });

  // 2. Test 5% amplitude (p <= 0.1 -> amplitude 0 flat)
  await page.evaluate(() => {
    const el = document.querySelector('#loading-indicator md-progress-indicator[type="linear"][variant="wavy"]:not([indeterminate])');
    if (el) el.setAttribute('value', '5');
  });
  await page.waitForTimeout(200);
  await linearCard.screenshot({ path: 'scratch_linear_wavy_step_5.png' });

  // 3. Test 98% amplitude (p >= 0.95 -> amplitude 0 flat)
  await page.evaluate(() => {
    const el = document.querySelector('#loading-indicator md-progress-indicator[type="linear"][variant="wavy"]:not([indeterminate])');
    if (el) el.setAttribute('value', '98');
  });
  await page.waitForTimeout(200);
  await linearCard.screenshot({ path: 'scratch_linear_wavy_step_98.png' });

  // Reset back to 75%
  await page.evaluate(() => {
    const el = document.querySelector('#loading-indicator md-progress-indicator[type="linear"][variant="wavy"]:not([indeterminate])');
    if (el) el.setAttribute('value', '75');
  });
  await page.waitForTimeout(200);

  await browser.close();
  server.close();
  console.log('Official linear wavy verification screenshots captured.');
});
