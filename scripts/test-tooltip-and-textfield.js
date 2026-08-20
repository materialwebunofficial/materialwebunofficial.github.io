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

server.listen(3586, async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3586/index.html');
  await page.waitForTimeout(600);

  // 1. Check Tooltips BEFORE ANY HOVER (Initial layout check)
  const tooltipCard = page.locator('#tooltips .comp-card');
  await tooltipCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await tooltipCard.screenshot({ path: 'scratch_tooltips_initial_aligned.png' });

  // 2. Hover over first tooltip button
  const btn1 = page.locator('#btn-tip-1');
  await btn1.hover();
  await page.waitForTimeout(300);
  await tooltipCard.screenshot({ path: 'scratch_tooltips_hover_plain.png' });

  // 3. Hover over second tooltip button
  const btn2 = page.locator('#btn-tip-2');
  await btn2.hover();
  await page.waitForTimeout(300);
  await tooltipCard.screenshot({ path: 'scratch_tooltips_hover_rich.png' });

  // 4. Test Text Field 1-click focus
  const tfSection = page.locator('#text-fields');
  await tfSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);

  // Click on the outline card padding/field box (not directly on input text)
  const tfBox = page.locator('#text-fields md-text-field').first();
  const box = await tfBox.boundingBox();
  // Click on top left corner of the text field container
  await page.mouse.click(box.x + 30, box.y + 15);
  await page.waitForTimeout(100);

  // Type text immediately
  await page.keyboard.type('_test_typing');
  await page.waitForTimeout(200);
  await tfSection.screenshot({ path: 'scratch_text_fields_single_click.png' });

  const val = await page.evaluate(() => document.querySelector('#text-fields md-text-field').value);
  console.log('Value typed after single click:', val);

  await browser.close();
  server.close();
  console.log('All tooltip and textfield tests completed.');
});
