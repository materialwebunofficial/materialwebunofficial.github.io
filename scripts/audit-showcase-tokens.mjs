// The showcase is styled only through Material 3 system tokens and the
// components themselves. This audit fails on literal colors, shadows, corner
// radii, motion curves/durations or type metrics in the showcase stylesheet and
// in inline styles of the page, so page-level fixes cannot stand in for
// component behavior.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(root, 'styles/showcase.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const failures = [];

// Icon glyph sizes (Material Symbols at 18/20/24dp) are the only literal type sizes.
const ICON_SIZES = new Set(['18px', '20px', '24px']);
const literalColor = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklab|oklch|lab|lch|hwb)\(|\b(?:white|black)\b/i;

function checkDeclaration(where, property, value) {
  const name = property.trim().toLowerCase(), v = value.trim();
  if (name.startsWith('--')) return;
  const usesToken = /var\(--md-sys-|var\(--md-|var\(--app-/.test(v);
  if (/(^|-)color$|^background|^fill$|^stroke$|^outline$|^border(-[a-z]+)*$/.test(name) && literalColor.test(v))
    failures.push(`${where}: ${name}: ${v} (literal color; use a color role)`);
  if (name === 'box-shadow' && v !== 'none' && !usesToken)
    failures.push(`${where}: box-shadow: ${v} (use an elevation level)`);
  if (/radius$/.test(name) && !/^(0|inherit|50%|9999px)$/.test(v) && !usesToken)
    failures.push(`${where}: ${name}: ${v} (use a shape corner token)`);
  if (/^(transition|animation)(-duration|-timing-function)?$/.test(name) && v !== 'none' && !/var\(--md-sys-motion/.test(v))
    failures.push(`${where}: ${name}: ${v} (use motion tokens or component springs)`);
  if (/cubic-bezier\(/.test(v) && !/var\(--md-sys-motion/.test(v))
    failures.push(`${where}: ${name}: ${v} (literal easing)`);
  if (['font-weight', 'line-height', 'letter-spacing'].includes(name) && !/^(normal|inherit|1|0)$/.test(v) && !usesToken)
    failures.push(`${where}: ${name}: ${v} (use a typescale token)`);
  if (name === 'font-size' && !ICON_SIZES.has(v) && !/^(inherit|\d*\.?\d+em)$/.test(v) && !usesToken)
    failures.push(`${where}: font-size: ${v} (use a typescale token)`);
  if (name === 'font' && !/var\(--md-sys-typescale-/.test(v))
    failures.push(`${where}: font: ${v} (use a typescale token)`);
}

for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const selector = rule[1].trim().replace(/\s+/g, ' ');
  for (const declaration of rule[2].split(';')) {
    const colon = declaration.indexOf(':');
    if (colon > 0) checkDeclaration(`showcase.css ${selector}`, declaration.slice(0, colon), declaration.slice(colon + 1));
  }
}

// Inline styles of live markup (code samples are text, not styles).
const markup = page.replace(/<code>[\s\S]*?<\/code>/g, '').replace(/<pre>[\s\S]*?<\/pre>/g, '');
for (const match of markup.matchAll(/\sstyle="([^"]*)"/g)) {
  for (const declaration of match[1].split(';')) {
    const colon = declaration.indexOf(':');
    if (colon > 0) checkDeclaration('index.html inline style', declaration.slice(0, colon), declaration.slice(colon + 1));
  }
}

// The generated entry only combines the audited sheet and package tokens.
const entry=fs.readFileSync(path.join(root,'styles/showcase-entry.css'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
const imports=[...entry.matchAll(/@import\s+['"]([^'"]+)['"]\s*;/g)];
if(JSON.stringify(imports.map(match=>match[1]))!==JSON.stringify(['../dist/tokens.min.css','./showcase.css'])||entry.replace(/@import\s+['"][^'"]+['"]\s*;/g,'').trim())failures.push('showcase-entry.css: only the package tokens and audited showcase stylesheet may be combined');
// The page loads their combined output, with no additional stylesheet.
for (const link of page.matchAll(/<link[^>]+rel="stylesheet"[^>]*href="([^"]+)"/g)) {
  if (link[1]!=='assets/showcase.css') failures.push(`index.html: unexpected stylesheet ${link[1]}`);
}

if (failures.length) {
  console.error(`Showcase token audit: ${failures.length} literal design value(s):\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log('Showcase token audit: color, elevation, shape, motion and type in showcase.css and inline styles use Material 3 system tokens; no extra stylesheets.');
