const fs = require('fs');
const path = require('path');

const diffFiles = [
  'src/components/md-bottom-sheet.js',
  'src/components/md-chip.js',
  'src/components/md-progress-indicator.js',
  'src/components/md-text-field.js',
  'src/theme/hct-color-engine.js'
];

const rootBase = 'C:/Users/sagla/OneDrive/Belgeler/MD3E for web';
const subBase = 'C:/Users/sagla/OneDrive/Belgeler/MD3E for web/material-design-3-expressive-unofficial';

diffFiles.forEach(rel => {
  console.log('\n================================================================');
  console.log('FILE: ' + rel);
  console.log('================================================================');
  const rootText = fs.readFileSync(path.join(rootBase, rel), 'utf8');
  const subText = fs.readFileSync(path.join(subBase, rel), 'utf8');
  
  const rootLines = rootText.split(/\r?\n/);
  const subLines = subText.split(/\r?\n/);

  console.log(`Root Line Count: ${rootLines.length} | Sub Line Count: ${subLines.length}`);

  // Find continuous blocks of difference
  let r = 0, s = 0;
  while (r < rootLines.length || s < subLines.length) {
    if (rootLines[r] !== subLines[s]) {
      console.log(`\n--- Difference around Root L${r + 1} / Sub L${s + 1} ---`);
      
      // Lookahead to find next match
      let lookaheadR = -1, lookaheadS = -1;
      for (let offset = 1; offset < 25; offset++) {
        if (r + offset < rootLines.length && rootLines[r + offset] === subLines[s]) {
          lookaheadR = r + offset;
          break;
        }
        if (s + offset < subLines.length && rootLines[r] === subLines[s + offset]) {
          lookaheadS = s + offset;
          break;
        }
      }

      if (lookaheadR !== -1) {
        console.log(`[ROOT EXTRA / MODIFIED LINES]:`);
        for (let k = r; k < lookaheadR; k++) {
          console.log(`+ ${rootLines[k]}`);
        }
        r = lookaheadR;
      } else if (lookaheadS !== -1) {
        console.log(`[SUB EXTRA / MODIFIED LINES]:`);
        for (let k = s; k < lookaheadS; k++) {
          console.log(`- ${subLines[k]}`);
        }
        s = lookaheadS;
      } else {
        console.log(`ROOT: ${rootLines[r]}`);
        console.log(`SUB:  ${subLines[s]}`);
        r++;
        s++;
      }
    } else {
      r++;
      s++;
    }
  }
});
