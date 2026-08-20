const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootBase = 'C:/Users/sagla/OneDrive/Belgeler/MD3E for web';
const subBase = 'C:/Users/sagla/OneDrive/Belgeler/MD3E for web/material-design-3-expressive-unofficial';

const checks = [
  'index.html',
  'src/showcase.js',
  'styles/showcase.css'
];

checks.forEach(c => {
  const rPath = path.join(rootBase, c);
  const sPath = path.join(subBase, c);
  if (fs.existsSync(rPath) && fs.existsSync(sPath)) {
    const rHash = crypto.createHash('sha256').update(fs.readFileSync(rPath)).digest('hex');
    const sHash = crypto.createHash('sha256').update(fs.readFileSync(sPath)).digest('hex');
    console.log(c + ' -> Same: ' + (rHash === sHash));
  } else {
    console.log(c + ' -> Root: ' + fs.existsSync(rPath) + ' | Sub: ' + fs.existsSync(sPath));
  }
});
