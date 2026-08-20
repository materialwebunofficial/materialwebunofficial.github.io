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

server.listen(3585, async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3585/index.html');
  await page.waitForTimeout(600);

  // 1. Open Bottom sheet
  const openBottomBtn = page.locator('#open-bottom-sheet-btn');
  await openBottomBtn.scrollIntoViewIfNeeded();
  await openBottomBtn.click();
  await page.waitForTimeout(400);

  // Get handle element bounding box
  const sheetHandle = await page.evaluateHandle(() => {
    return document.querySelector('#sample-bottom-sheet').shadowRoot.querySelector('.handle-area');
  });
  const handleBox = await sheetHandle.boundingBox();

  // 2. Drag Upward Test (mouse down, move up 80px, check no gap)
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2 - 80, { steps: 5 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'scratch_bottom_sheet_drag_up.png' });

  // Release mouse
  await page.mouse.up();
  await page.waitForTimeout(400);

  // 3. Click handle test (should NOT collapse)
  await page.mouse.click(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'scratch_bottom_sheet_after_click.png' });

  // 4. Drag Downward Test (mouse down, move down 120px to dismiss)
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2 + 120, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(300);

  const isClosed = await page.evaluate(() => !document.querySelector('#sample-bottom-sheet').hasAttribute('open'));
  console.log('Is bottom sheet closed after downward drag?', isClosed);

  await browser.close();
  server.close();
  console.log('Bottom sheet drag tests completed.');
});
