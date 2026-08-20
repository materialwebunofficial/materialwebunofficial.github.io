const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const rootDir = process.cwd();
const pkgDir = path.join(rootDir, 'material-design-3-expressive-unofficial');

function sha256(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function scanDir(dir, base = '') {
  let list = [];
  if (!fs.existsSync(dir)) return list;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', 'material-design-3-expressive-unofficial', '.system_generated'].includes(item.name)) continue;
    const rel = base ? path.join(base, item.name) : item.name;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      list = list.concat(scanDir(full, rel));
    } else {
      list.push(rel.replace(/\\/g, '/'));
    }
  }
  return list;
}

const folders = ['src', 'styles', 'docs'];
let totalChecked = 0;
let mismatches = [];

folders.forEach(folder => {
  const rootFiles = scanDir(path.join(rootDir, folder), folder);
  rootFiles.forEach(rel => {
    totalChecked++;
    const rH = sha256(path.join(rootDir, rel));
    const pH = sha256(path.join(pkgDir, rel));
    if (rH !== pH) {
      mismatches.push({ file: rel, rootHash: rH, pkgHash: pH });
    }
  });
});

console.log('=== DERINLEMESINE SENKRONIZASYON KONTROLU ===');
console.log('Toplam Kontrol Edilen Dosya (src + styles + docs):', totalChecked);
console.log('Fark / Uyusmazlik Sayisi:', mismatches.length);
if (mismatches.length > 0) {
  console.log('Uyusmayan Dosyalar:', mismatches);
} else {
  console.log('TUM DOSYALAR %100 BIREBIR AYNI (SHA-256 MATCH)');
}

const distFiles = ['dist/md3-expressive.esm.js', 'dist/md3-expressive.min.js', 'dist/tokens.css', 'dist/tokens.min.css', 'dist/index.d.ts'];
console.log('\n=== DAGITIM PAKETI (DIST) KONTROLU ===');
distFiles.forEach(df => {
  const p = path.join(pkgDir, df);
  if (fs.existsSync(p)) {
    const st = fs.statSync(p);
    console.log(`PASS: ${df} (${(st.size / 1024).toFixed(1)} KB) - Updated: ${st.mtime.toLocaleTimeString()}`);
  } else {
    console.log(`FAIL (Eksik): ${df}`);
  }
});
