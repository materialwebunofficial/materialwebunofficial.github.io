import fs from 'node:fs';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const imports = [];
for (const entry of [
  "import {MdButton} from '@materialwebunofficial/md3e-web'; console.log(MdButton)",
  "import {MdButton} from '@materialwebunofficial/md3e-web/components/md-button.js'; console.log(MdButton)",
]) {
  const built = await build({ stdin: { contents: entry, resolveDir: process.cwd() }, bundle: true, minify: true, format: 'esm', target: 'es2022', write: false });
  imports.push({ entry, bytes: built.outputFiles[0].contents.length, gzipBytes: gzipSync(built.outputFiles[0].contents).length });
}
const fresh = await build({ entryPoints: ['src/index.js'], outfile: 'dist/md3-expressive.esm.js', bundle: true, minify: true, format: 'esm', target: 'es2022', sourcemap: true, write: false });
const buildComparison = fresh.outputFiles.map(file => ({ path: file.path, bytes: file.contents.length, matchesDist: fs.existsSync(file.path) && Buffer.compare(fs.readFileSync(file.path), file.contents) === 0 }));
const browser = await chromium.launch();
let api;
try {
  const page = await browser.newPage(); await page.goto('http://127.0.0.1:28081/__audit/blank?mode=src'); await page.waitForFunction(() => 'ready' in document.documentElement.dataset);
  const runtime = await page.evaluate(async () => Object.keys(await import('/src/index.js')));
  const declared = [...fs.readFileSync('types/index.d.ts','utf8').matchAll(/^export (?:declare )?(?:class|function|const) (\w+)/gm)].map(m => m[1]);
  api = { runtimeWithoutTypes: runtime.filter(name => !declared.includes(name)), typesWithoutRuntime: declared.filter(name => !runtime.includes(name)), distTypesMatch: fs.readFileSync('types/index.d.ts','utf8') === fs.readFileSync('dist/index.d.ts','utf8') };
} finally { await browser.close(); }
let ssr;
try { await import('../../src/index.js'); ssr = { success: true }; } catch (error) { ssr = { success: false, error: error.name + ': ' + error.message }; }
const result = { imports, buildComparison, api, ssr, main: { bytes: fs.statSync('dist/md3-expressive.esm.js').size, gzipBytes: gzipSync(fs.readFileSync('dist/md3-expressive.esm.js')).length } };
fs.writeFileSync(new URL('./packaging-results.json', import.meta.url), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
