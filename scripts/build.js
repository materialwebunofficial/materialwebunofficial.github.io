#!/usr/bin/env node
/**
 * MD3 Expressive for Web - Production NPM Build Script
 * Builds ESM bundle, IIFE browser bundle, CSS tokens bundle, and TypeScript definitions.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

console.log('🚀 Starting MD3 Expressive NPM Build Pipeline...\n');

// 1. Ensure dist directory exists & clean
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// 2. Build Bundled CSS Tokens
console.log('📦 1/4 Bundling Design Tokens (dist/tokens.css)...');
const cssFiles = [
  'src/tokens/colors.css',
  'src/tokens/typography.css',
  'src/tokens/shapes.css',
  'src/tokens/spacing.css',
  'src/tokens/elevation.css',
  'src/tokens/motion.css',
  'src/icons/material-symbols.css'
];

let concatenatedCss = '/* Material Design 3 Expressive (M3 Expressive) Bundled Tokens */\n\n';
for (const file of cssFiles) {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    concatenatedCss += `/* --- ${file} --- */\n` + fs.readFileSync(filePath, 'utf8') + '\n\n';
  } else {
    console.warn(`⚠️ Warning: CSS file not found: ${file}`);
  }
}

const tokensCssPath = path.join(distDir, 'tokens.css');
fs.writeFileSync(tokensCssPath, concatenatedCss, 'utf8');

// Minify CSS
const minifiedCss = await esbuild.transform(concatenatedCss, {
  loader: 'css',
  minify: true
});
const tokensMinCssPath = path.join(distDir, 'tokens.min.css');
fs.writeFileSync(tokensMinCssPath, minifiedCss.code, 'utf8');
console.log(`  ✅ tokens.css (${(Buffer.byteLength(concatenatedCss) / 1024).toFixed(1)} KB)`);
console.log(`  ✅ tokens.min.css (${(Buffer.byteLength(minifiedCss.code) / 1024).toFixed(1)} KB)`);

// 3. Build ESM Bundle
console.log('\n📦 2/4 Building ES Module Bundle (dist/md3-expressive.esm.js)...');
await esbuild.build({
  entryPoints: [path.join(rootDir, 'src/index.js')],
  outfile: path.join(distDir, 'md3-expressive.esm.js'),
  bundle: true,
  format: 'esm',
  target: ['es2022'],
  sourcemap: true
});
const esmStats = fs.statSync(path.join(distDir, 'md3-expressive.esm.js'));
console.log(`  ✅ md3-expressive.esm.js (${(esmStats.size / 1024).toFixed(1)} KB)`);

// 4. Build Minified IIFE Browser Bundle (for direct <script src="..."> / CDN)
console.log('\n📦 3/4 Building Minified Browser Bundle (dist/md3-expressive.min.js)...');
await esbuild.build({
  entryPoints: [path.join(rootDir, 'src/index.js')],
  outfile: path.join(distDir, 'md3-expressive.min.js'),
  bundle: true,
  format: 'iife',
  globalName: 'MD3Expressive',
  minify: true,
  target: ['es2022'],
  sourcemap: true
});
const minStats = fs.statSync(path.join(distDir, 'md3-expressive.min.js'));
console.log(`  ✅ md3-expressive.min.js (${(minStats.size / 1024).toFixed(1)} KB)`);

// 5. Copy Fonts to dist/fonts
const fontsSrcDir = path.join(rootDir, 'src/icons/fonts');
const fontsDistDir = path.join(distDir, 'fonts');
if (fs.existsSync(fontsSrcDir)) {
  fs.mkdirSync(fontsDistDir, { recursive: true });
  const fontFiles = fs.readdirSync(fontsSrcDir);
  for (const font of fontFiles) {
    fs.copyFileSync(path.join(fontsSrcDir, font), path.join(fontsDistDir, font));
  }
  console.log(`  ✅ Copied ${fontFiles.length} font files to dist/fonts/`);
}

// 6. Copy TypeScript definitions to dist/
console.log('\n📦 4/4 Packaging TypeScript Definitions (dist/index.d.ts)...');
const typesSrc = path.join(rootDir, 'types/index.d.ts');
const typesDist = path.join(distDir, 'index.d.ts');
if (fs.existsSync(typesSrc)) {
  fs.copyFileSync(typesSrc, typesDist);
  const typesStats = fs.statSync(typesDist);
  console.log(`  ✅ index.d.ts (${(typesStats.size / 1024).toFixed(1)} KB)`);
}

console.log('\n================================================================');
console.log('🎉 BUILD SUCCESSFUL! All NPM distribution artifacts created in dist/');
console.log('================================================================\n');
