import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {testSnackbarParity, testSnackbarShowcase} from '../test/browser/snackbar-parity.mjs';
import {captureSnackbarLayout, testSnackbarLayout} from '../test/browser/snackbar-layout.mjs';
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const server = http.createServer((req, res) => {
  const filename = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname.replace(/\/$/, '/index.html'));
  if (!filename.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(filename, (error, data) => {
    res.writeHead(error ? 404 : 200, {'Content-Type': {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml'}[path.extname(filename)] || 'application/octet-stream'});
    res.end(error ? 'Not found' : data);
  });
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch(), base = `http://127.0.0.1:${server.address().port}`;
const source = {newPage: async options => {
  const page = await browser.newPage(options);
  await page.route('**/dist/md3-expressive.esm.js', route => route.fulfill({status: 200, contentType: 'text/javascript', body: 'export * from "/src/index.js";'}));
  return page;
}};
try {
  const target = process.argv.includes('--source') ? source : browser;
  if (process.argv.includes('--capture-layout')) await captureSnackbarLayout(target, base);
  else if (process.argv.includes('--showcase')) await testSnackbarShowcase(target, base);
  else { await testSnackbarParity(target, base); await testSnackbarLayout(target, base); await testSnackbarShowcase(target, base); }
}
finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
