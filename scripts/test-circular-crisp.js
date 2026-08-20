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

server.listen(3583, async () => {
  const browser = await chromium.launch();

  // Test at 2.0x (Retina / High DPI)
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2.0 });
  await page.goto('http://localhost:3583/index.html');
  await page.waitForTimeout(600);

  const circularCard = page.locator('#loading-indicator .cards-grid > div:nth-child(2)');
  await circularCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await circularCard.screenshot({ path: 'scratch_circular_progress_crisp.png' });

  const progressSection = page.locator('#loading-indicator');
  await progressSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await progressSection.screenshot({ path: 'scratch_progress_section_all.png' });

  await browser.close();
  server.close();
  console.log('High-res screenshots captured.');
});
