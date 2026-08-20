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

server.listen(3584, async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3584/index.html');
  await page.waitForTimeout(600);

  // 1. Test Side Sheet (Close button icon & List item rounded hover)
  const openSideBtn = page.locator('#open-side-sheet-btn');
  await openSideBtn.scrollIntoViewIfNeeded();
  await openSideBtn.click();
  await page.waitForTimeout(400);

  // Hover over the second list item
  const listItem = page.locator('#sample-side-sheet md-list-item:nth-child(2)');
  await listItem.hover();
  await page.waitForTimeout(200);

  await page.screenshot({ path: 'scratch_side_sheet_hover.png' });

  // Close Side Sheet via close method
  await page.evaluate(() => document.querySelector('#sample-side-sheet').close());
  await page.waitForTimeout(400);

  // 2. Test Bottom Sheet
  const openBottomBtn = page.locator('#open-bottom-sheet-btn');
  await openBottomBtn.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'scratch_bottom_sheet_open.png' });

  await browser.close();
  server.close();
  console.log('Sheets screenshots captured successfully.');
});
