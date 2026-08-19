/**
 * Unit tests for HCT Color Engine and Tonal Palette Generation
 */

import {
  rgbToHct,
  hctToRgb,
  hctToHex,
  hexToRgb,
  rgbToHex,
  generateM3Scheme,
  createTonalPalettes,
  MD3_PRESETS,
  TonalPalette
} from '../../src/theme/hct-color-engine.js';

console.log('================================================================');
console.log('🎨 HCT COLOR ENGINE & TONAL PALETTE UNIT TEST SUITE');
console.log('================================================================\n');

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    pass++;
  } catch (e) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${e.message}`);
    fail++;
  }
}

test('hexToRgb converts 6-digit hex correctly', () => {
  const rgb = hexToRgb('#6750A4');
  if (rgb.r !== 103 || rgb.g !== 80 || rgb.b !== 164) {
    throw new Error(`Unexpected RGB: ${JSON.stringify(rgb)}`);
  }
});

test('rgbToHex converts RGB correctly', () => {
  const hex = rgbToHex(103, 80, 164);
  if (hex.toUpperCase() !== '#6750A4') {
    throw new Error(`Unexpected Hex: ${hex}`);
  }
});

test('rgbToHct and hctToRgb round-trip accuracy', () => {
  const hct = rgbToHct(103, 80, 164);
  if (typeof hct.hue !== 'number' || typeof hct.chroma !== 'number' || typeof hct.tone !== 'number') {
    throw new Error(`Invalid HCT structure: ${JSON.stringify(hct)}`);
  }
  const rgb = hctToRgb(hct.hue, hct.chroma, hct.tone);
  if (Math.abs(rgb.r - 103) > 3 || Math.abs(rgb.g - 80) > 3 || Math.abs(rgb.b - 164) > 3) {
    throw new Error(`Round-trip divergence too high: ${JSON.stringify(rgb)}`);
  }
});

test('TonalPalette generates 0-100 tones accurately', () => {
  const palette = new TonalPalette(270, 48);
  const tone100 = palette.tone(100);
  const tone0 = palette.tone(0);
  if (tone100.toUpperCase() !== '#FFFFFF') throw new Error(`Tone 100 should be #FFFFFF, got ${tone100}`);
  if (tone0.toUpperCase() !== '#000000') throw new Error(`Tone 0 should be #000000, got ${tone0}`);
});

test('generateM3Scheme produces full light and dark schemes', () => {
  const lightScheme = generateM3Scheme('#6750A4', false, 'expressive');
  const darkScheme = generateM3Scheme('#6750A4', true, 'expressive');
  if (!lightScheme || !darkScheme) throw new Error('Scheme missing light or dark output');
  if (!lightScheme['--md-sys-color-primary'] || !darkScheme['--md-sys-color-primary']) {
    throw new Error('Scheme missing primary color token');
  }
  if (!lightScheme['--md-sys-color-surface-container-high'] || !darkScheme['--md-sys-color-surface-container-high']) {
    throw new Error('Scheme missing surface container high token');
  }
});

test('MD3_PRESETS contains standard presets', () => {
  if (!Array.isArray(MD3_PRESETS) || MD3_PRESETS.length === 0) {
    throw new Error('Missing expected MD3 presets array');
  }
  const baseline = MD3_PRESETS.find(p => p.id === 'baseline');
  if (!baseline || baseline.hex.toUpperCase() !== '#6750A4') {
    throw new Error('Missing or invalid baseline preset');
  }
});

console.log('\n================================================================');
console.log(`📊 THEME TEST SUMMARY: ${pass} PASSED, ${fail} FAILED`);
console.log('================================================================');

if (fail > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
