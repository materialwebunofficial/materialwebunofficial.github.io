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

server.listen(3588, async () => {
  const browser = await chromium.launch();

  // Test 1: Root URL (no hash) -> Must be at top (scrollY = 0)
  const page1 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page1.goto('http://localhost:3588/index.html');
  await page1.waitForTimeout(600);
  const scrollY1 = await page1.evaluate(() => window.scrollY);
  console.log('Test 1 (No Hash) ScrollY:', scrollY1);
  await page1.screenshot({ path: 'scratch_initial_page_top.png' });

  // Test 2: URL with #buttons -> Must scroll to #buttons
  const page2 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page2.goto('http://localhost:3588/index.html#buttons');
  await page2.waitForTimeout(600);
  const scrollY2 = await page2.evaluate(() => window.scrollY);
  console.log('Test 2 (#buttons Hash) ScrollY:', scrollY2);
  await page2.screenshot({ path: 'scratch_hash_buttons.png' });

  // Test 3: URL with #sliders -> Must scroll to #sliders
  const page3 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page3.goto('http://localhost:3588/index.html#sliders');
  await page3.waitForTimeout(600);
  const scrollY3 = await page3.evaluate(() => window.scrollY);
  console.log('Test 3 (#sliders Hash) ScrollY:', scrollY3);
  await page3.screenshot({ path: 'scratch_hash_sliders.png' });

  await browser.close();
  server.close();
  console.log('Initial scroll tests finished.');
});
