import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const mimeTypes = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join('.', reqPath);
  const ext = path.extname(filePath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404); res.end('Not found');
  }
});

server.listen(3577, async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.goto('http://localhost:3577/index.html');
  await page.waitForTimeout(600);

  // 1. Loading & Progress
  const loading = page.locator('#loading-indicator');
  await loading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await loading.screenshot({ path: 'scratch_loading_progress.png' });

  // 2. Sliders & Text Fields
  const sliders = page.locator('#sliders');
  await sliders.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await sliders.screenshot({ path: 'scratch_sliders_section.png' });

  const textFields = page.locator('#text-fields');
  await textFields.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await textFields.screenshot({ path: 'scratch_text_fields.png' });

  // 3. Selection Controls
  const selControls = page.locator('#selection-controls');
  await selControls.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await selControls.screenshot({ path: 'scratch_selection_controls.png' });

  // 4. Chips
  const chips = page.locator('#chips');
  await chips.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await chips.screenshot({ path: 'scratch_chips_section.png' });

  await browser.close();
  server.close();
  console.log('All screenshots captured.');
});
