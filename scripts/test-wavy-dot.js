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

server.listen(3587, async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2.0 });
  await page.goto('http://localhost:3587/index.html');
  await page.waitForTimeout(600);

  const linearCard = page.locator('#loading-indicator .cards-grid > div:nth-child(1)');
  await linearCard.scrollIntoViewIfNeeded();

  // Capture frame 1
  await page.waitForTimeout(200);
  await linearCard.screenshot({ path: 'scratch_linear_wavy_frame1.png' });

  // Capture frame 2 (different wave phase)
  await page.waitForTimeout(250);
  await linearCard.screenshot({ path: 'scratch_linear_wavy_frame2.png' });

  // Capture frame 3 (different wave phase)
  await page.waitForTimeout(250);
  await linearCard.screenshot({ path: 'scratch_linear_wavy_frame3.png' });

  await browser.close();
  server.close();
  console.log('Linear wavy animation frames captured.');
});
