const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootBase = 'C:/Users/sagla/OneDrive/Belgeler/MD3E for web';
const subBase = 'C:/Users/sagla/OneDrive/Belgeler/MD3E for web/material-design-3-expressive-unofficial';

const filesToCopy = [
  'src/components/md-progress-indicator.js',
  'src/components/md-text-field.js',
  'src/components/md-chip.js',
  'src/components/md-bottom-sheet.js'
];

console.log('>>> Kopyalama islemi baslatiliyor...\n');

filesToCopy.forEach(rel => {
  const src = path.join(rootBase, rel);
  const dest = path.join(subBase, rel);
  
  fs.copyFileSync(src, dest);
  
  const srcHash = crypto.createHash('sha256').update(fs.readFileSync(src)).digest('hex');
  const destHash = crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex');
  
  const status = (srcHash === destHash) ? 'BASARILI (Hashler Esit)' : 'HATA';
  console.log(`[KOPYALANDI] ${rel} -> ${status}`);
});

console.log('\n>>> Tum 4 dosya basariyla esitlendi.');
