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

server.listen(3582, async () => {
  const browser = await chromium.launch();

  // Test at 1.0x (100% zoom)
  const page1 = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.0 });
  await page1.goto('http://localhost:3582/index.html');
  await page1.waitForTimeout(600);
  const loadingCard1 = page1.locator('#loading-indicator .cards-grid > div:nth-child(3)');
  await loadingCard1.scrollIntoViewIfNeeded();
  await page1.waitForTimeout(400);
  await loadingCard1.screenshot({ path: 'scratch_loading_zoom100.png' });

  // Test at 2.0x (200% zoom)
  const page2 = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2.0 });
  await page2.goto('http://localhost:3582/index.html');
  await page2.waitForTimeout(600);
  const loadingCard2 = page2.locator('#loading-indicator .cards-grid > div:nth-child(3)');
  await loadingCard2.scrollIntoViewIfNeeded();
  await page2.waitForTimeout(400);
  await loadingCard2.screenshot({ path: 'scratch_loading_zoom200.png' });

  // Test in Light Theme
  const themeToggle = page1.locator('#rail-theme-toggle');
  await themeToggle.click();
  await page1.waitForTimeout(300);
  await loadingCard1.screenshot({ path: 'scratch_loading_light.png' });

  await browser.close();
  server.close();
  console.log('Loading indicator zoom & theme tests captured successfully.');
});
