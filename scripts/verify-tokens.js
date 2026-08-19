/**
 * Material Design 3 Expressive (M3 Expressive) Automated Token Verification Test
 * Verifies all 26 typescale styles (13 baseline + 13 emphasized), tracking, fonts, colors, shapes, and motion.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tokensDir = path.join(__dirname, '../src/tokens');

console.log('🔍 Starting M3 Expressive Token System Automated Verification...\n');

let errorCount = 0;
let passCount = 0;

function assertTokenExists(filePath, tokenName) {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes(tokenName)) {
    console.log(`  ✅ Verified token: ${tokenName}`);
    passCount++;
  } else {
    console.error(`  ❌ MISSING TOKEN: ${tokenName} in ${path.basename(filePath)}`);
    errorCount++;
  }
}

// 1. Color System Verification
console.log('🎨 Verifying Color Tokens (colors.css)...');
const colorsFile = path.join(tokensDir, 'colors.css');
assertTokenExists(colorsFile, '--md-sys-color-primary');
assertTokenExists(colorsFile, '--md-sys-color-on-primary');
assertTokenExists(colorsFile, '--md-sys-color-primary-container');
assertTokenExists(colorsFile, '--md-sys-color-surface-container-high');
assertTokenExists(colorsFile, '[data-theme="dark"]');

// 2. Typography Verification (Official Android TypeScaleTokens.kt Parity: 26 styles)
console.log('\n📐 Verifying Typescale Tokens & Fonts (typography.css)...');
const typographyFile = path.join(tokensDir, 'typography.css');

// 2.1 Font Families
assertTokenExists(typographyFile, '--md-sys-typescale-font-family');
assertTokenExists(typographyFile, '--md-sys-typescale-font-family-brand');
assertTokenExists(typographyFile, '--md-sys-typescale-font-family-plain');

// 2.2 Baseline 13 Styles
const baselineStyles = [
  'display-large', 'display-medium', 'display-small',
  'headline-large', 'headline-medium', 'headline-small',
  'title-large', 'title-medium', 'title-small',
  'body-large', 'body-medium', 'body-small',
  'label-large', 'label-medium', 'label-small'
];

baselineStyles.forEach(style => {
  assertTokenExists(typographyFile, `--md-sys-typescale-${style}-size`);
  assertTokenExists(typographyFile, `--md-sys-typescale-${style}-weight`);
  assertTokenExists(typographyFile, `--md-sys-typescale-${style}-line-height`);
  assertTokenExists(typographyFile, `--md-sys-typescale-${style}-tracking`);
  assertTokenExists(typographyFile, `--md-sys-typescale-${style}:`);
  assertTokenExists(typographyFile, `.md-typescale-${style}`);
  assertTokenExists(typographyFile, `.md-${style}`);
});

// 2.3 Emphasized 13 Styles (M3 Expressive)
const emphasizedStyles = [
  'display-large-emphasized', 'display-medium-emphasized', 'display-small-emphasized',
  'headline-large-emphasized', 'headline-medium-emphasized', 'headline-small-emphasized',
  'title-large-emphasized', 'title-medium-emphasized', 'title-small-emphasized',
  'body-large-emphasized', 'body-medium-emphasized', 'body-small-emphasized',
  'label-large-emphasized', 'label-medium-emphasized', 'label-small-emphasized'
];

emphasizedStyles.forEach(style => {
  assertTokenExists(typographyFile, `--md-sys-typescale-${style}-size`);
  assertTokenExists(typographyFile, `--md-sys-typescale-${style}-weight`);
  assertTokenExists(typographyFile, `--md-sys-typescale-${style}-line-height`);
  assertTokenExists(typographyFile, `--md-sys-typescale-${style}-tracking`);
  assertTokenExists(typographyFile, `--md-sys-typescale-${style}:`);
  assertTokenExists(typographyFile, `.md-typescale-${style}`);
  assertTokenExists(typographyFile, `.md-${style}`);
});

// 3. Expressive Shapes Verification
console.log('\n🔷 Verifying Expressive Shapes Tokens (shapes.css)...');
const shapesFile = path.join(tokensDir, 'shapes.css');
assertTokenExists(shapesFile, '--md-sys-shape-expressive-asymmetric-1');
assertTokenExists(shapesFile, '--md-sys-shape-expressive-fab-default');
assertTokenExists(shapesFile, '--md-sys-shape-mask-clover');

// 4. Motion System & Spring Physics Verification
console.log('\n⚡ Verifying Motion System Tokens (motion.css)...');
const motionFile = path.join(tokensDir, 'motion.css');
assertTokenExists(motionFile, '--md-sys-motion-expressive-spatial-medium-damping');
assertTokenExists(motionFile, '--md-sys-motion-expressive-spatial-medium-stiffness');
assertTokenExists(motionFile, '--md-sys-motion-easing-expressive-spatial');

console.log('\n==================================================');
if (errorCount === 0) {
  console.log(`🎉 ALL VERIFICATION CHECKS PASSED SUCCESSFULLY! (${passCount} checks verified)`);
  process.exit(0);
} else {
  console.error(`💥 VERIFICATION FAILED WITH ${errorCount} ERRORS!`);
  process.exit(1);
}
