import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const root = process.cwd();
const built = await build({ entryPoints: ['src/index.js'], bundle: true, minify: true, format: 'esm', target: 'es2022', write: false });
const current = built.outputFiles[0].contents;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json' };
for (const [port, fresh] of [[28081, false], [28082, true]]) {
  http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const route = decodeURIComponent(url.pathname);
    if (route === '/__audit/current.js' || (fresh && route === '/dist/md3-expressive.esm.js')) {
      res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(current); return;
    }
    if (route === '/__audit/blank') {
      const mode = url.searchParams.get('mode') || 'src';
      const entry = mode === 'dist' ? '/dist/md3-expressive.esm.js' : mode === 'fresh' ? '/__audit/current.js' : '/src/index.js';
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/dist/tokens.css"><script type="module">await import('${entry}');document.documentElement.dataset.ready='';</script><style>body{font-family:Roboto,sans-serif;background:var(--md-sys-color-surface);color:var(--md-sys-color-on-surface);padding:20px}md-text-field,md-select,md-autocomplete{margin:8px}</style></head><body><main id="fixture"></main></body></html>`);
      return;
    }
    const filename = path.resolve(root, '.' + (route.endsWith('/') ? route + 'index.html' : route));
    if (!filename.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(filename, (err, data) => {
      res.writeHead(err ? 404 : 200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream' });
      res.end(err ? 'Not found' : data);
    });
  }).listen(port, '127.0.0.1', () => console.log(`${fresh ? 'fresh bundle' : 'existing dist'} audit server:${port}`));
}
