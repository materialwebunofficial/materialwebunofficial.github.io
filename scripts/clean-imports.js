import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compDir = path.join(__dirname, '../src/components');

const files = fs.readdirSync(compDir).filter(f => f.endsWith('.js'));
let modified = 0;

files.forEach(f => {
  const p = path.join(compDir, f);
  let c = fs.readFileSync(p, 'utf-8');
  const original = c;
  c = c.replace(/[ \t]*@import url\(['"][^'"]*?tokens\/[^'"]*?\.css['"]\);?\r?\n?/g, '');
  c = c.replace(/[ \t]*@import url\(['"][^'"]*?icons\/[^'"]*?\.css['"]\);?\r?\n?/g, '');
  if (c !== original) {
    fs.writeFileSync(p, c, 'utf-8');
    modified++;
    console.log('Cleaned @import in:', f);
  }
});

console.log(`Successfully cleaned @import from ${modified} files.`);
