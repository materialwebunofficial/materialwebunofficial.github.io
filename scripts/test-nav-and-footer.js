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

server.listen(3579, async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3579/index.html');
  await page.waitForTimeout(600);

  // 1. Navigation Section (Drawer & Rail)
  const navSection = page.locator('#nav-bar');
  await navSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await navSection.screenshot({ path: 'scratch_navigation_section.png' });

  // 2. Footer Section (Dark Mode)
  const footer = page.locator('.m3-site-footer');
  await footer.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await footer.screenshot({ path: 'scratch_footer_dark.png' });

  // 3. Footer Section (Light Mode)
  const themeToggle = page.locator('#rail-theme-toggle');
  await themeToggle.click();
  await page.waitForTimeout(300);
  await footer.scrollIntoViewIfNeeded();
  await footer.screenshot({ path: 'scratch_footer_light.png' });

  await browser.close();
  server.close();
  console.log('Screenshots captured successfully.');
});
