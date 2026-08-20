const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootBase = 'C:/Users/sagla/OneDrive/Belgeler/MD3E for web';
const subBase = 'C:/Users/sagla/OneDrive/Belgeler/MD3E for web/material-design-3-expressive-unofficial';

const syncDirs = ['src', 'styles', 'scripts', 'test', 'types', 'dist', 'research', 'docs'];
const syncFiles = ['package.json', 'index.html', 'README.md', 'LICENSE', 'NOTICE'];

function copyRecursive(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('🚀 Synchronizing all source, component, and dist files to material-design-3-expressive-unofficial/...\n');

syncDirs.forEach(dir => {
  const src = path.join(rootBase, dir);
  const dest = path.join(subBase, dir);
  if (fs.existsSync(src)) {
    copyRecursive(src, dest);
    console.log(`✅ Synced directory: ${dir}/`);
  }
});

syncFiles.forEach(file => {
  const src = path.join(rootBase, file);
  const dest = path.join(subBase, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✅ Synced file: ${file}`);
  }
});

console.log('\n🎉 ALL components, source code, and distribution files are now 100% in sync!');
