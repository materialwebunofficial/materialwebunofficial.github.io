const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootBase = 'C:/Users/sagla/OneDrive/Belgeler/MD3E for web';
const subBase = 'C:/Users/sagla/OneDrive/Belgeler/MD3E for web/material-design-3-expressive-unofficial';

function copyDirRecursive(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('🚀 SENKRONİZASYON BAŞLATILIYOR...\n');

// 1. Copy src/
console.log('📁 1. src/ klasörü eşitleniyor...');
copyDirRecursive(path.join(rootBase, 'src'), path.join(subBase, 'src'));

// 2. Copy styles/
console.log('📁 2. styles/ klasörü eşitleniyor...');
copyDirRecursive(path.join(rootBase, 'styles'), path.join(subBase, 'styles'));

// 3. Copy docs/MD3E-DESIGN-FOUNDATIONS-AND-COMPONENT-ANATOMY.md
const docFile = 'docs/MD3E-DESIGN-FOUNDATIONS-AND-COMPONENT-ANATOMY.md';
const srcDoc = path.join(rootBase, docFile);
const destDoc = path.join(subBase, docFile);
if (fs.existsSync(srcDoc)) {
  console.log('📁 3. Dokümantasyon kopyalanıyor...');
  fs.copyFileSync(srcDoc, destDoc);
}

// 4. Update sub package scripts/build.js to include spacing.css in cssFiles if not present
const subBuildJs = path.join(subBase, 'scripts/build.js');
if (fs.existsSync(subBuildJs)) {
  let content = fs.readFileSync(subBuildJs, 'utf8');
  if (!content.includes('src/tokens/spacing.css')) {
    content = content.replace(
      "'src/tokens/motion.css',",
      "'src/tokens/motion.css',\n  'src/tokens/spacing.css',"
    );
    fs.writeFileSync(subBuildJs, content, 'utf8');
    console.log('🔧 4. scripts/build.js içine spacing.css eklendi.');
  }
}

// 5. Update sub package.json exports to include ./tokens/spacing and ./tokens/spacing.css
const subPkgJson = path.join(subBase, 'package.json');
if (fs.existsSync(subPkgJson)) {
  let pkg = JSON.parse(fs.readFileSync(subPkgJson, 'utf8'));
  if (pkg.exports && !pkg.exports['./tokens/spacing']) {
    pkg.exports['./tokens/spacing'] = './src/tokens/spacing.css';
    pkg.exports['./tokens/spacing.css'] = './src/tokens/spacing.css';
    fs.writeFileSync(subPkgJson, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log('🔧 5. package.json içine spacing.css export tanımları eklendi.');
  }
}

console.log('\n✅ Kopyalama ve konfigürasyon güncellemeleri tamamlandı.');
