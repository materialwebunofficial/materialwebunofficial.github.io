import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

function startServer(port = 3457) {
  return new Promise((resolve) => {
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.woff2': 'font/woff2',
      '.woff': 'font/woff',
      '.ttf': 'font/ttf',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
    };

    const server = http.createServer((req, res) => {
      let reqPath = req.url.split('?')[0];
      if (reqPath === '/') reqPath = '/index.html';
      const filePath = path.join(projectRoot, reqPath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`404 Not Found: ${reqPath}`);
      }
    });

    server.listen(port, () => {
      resolve(server);
    });
  });
}

async function checkIcons() {
  const server = await startServer(3457);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3457/index.html', { waitUntil: 'networkidle' });

  const brokenIcons = await page.evaluate(() => {
    const results = [];

    // Helper to scan a root (document or shadowRoot)
    function scan(root, contextName) {
      const iconEls = root.querySelectorAll('.mat-sym, .material-symbols-outlined, .material-symbols-rounded, .ico, .icon');
      iconEls.forEach(el => {
        const text = el.textContent?.trim();
        if (!text || text.length === 0) return;
        const rect = el.getBoundingClientRect();
        // A single Material Symbol icon glyph is typically 18px-28px wide.
        // If it renders as raw multi-letter text, width is usually > 32px.
        if (rect.width > 30) {
          results.push({
            context: contextName,
            iconName: text,
            width: rect.width,
            height: rect.height,
            tag: el.tagName,
            parentHTML: el.parentElement?.outerHTML?.slice(0, 100)
          });
        }
      });

      // Recurse into custom elements shadow roots
      const customElements = root.querySelectorAll('*');
      customElements.forEach(customEl => {
        if (customEl.shadowRoot) {
          scan(customEl.shadowRoot, `<${customEl.tagName.toLowerCase()}>`);
        }
      });
    }

    scan(document, 'document');
    return results;
  });

  console.log('=== BROKEN / TEXT-FALLBACK ICONS DETECTED ===');
  console.log(JSON.stringify(brokenIcons, null, 2));

  await browser.close();
  server.close();
}

checkIcons();
