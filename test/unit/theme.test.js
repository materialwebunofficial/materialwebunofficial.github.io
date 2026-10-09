/**
 * Unit tests for HCT Color Engine and Tonal Palette Generation
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  rgbToHct,
  hctToRgb,
  hctToHex,
  hexToRgb,
  rgbToHex,
  generateM3Scheme,
  createTonalPalettes,
  MD3_PRESETS,
  TonalPalette,
  PALETTE_VARIANTS,
  resolvePaletteVariant
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

test('MD3_PRESETS contains showcase seed suggestions', () => {
  if (!Array.isArray(MD3_PRESETS) || MD3_PRESETS.length === 0) {
    throw new Error('Missing expected MD3 presets array');
  }
  const baseline = MD3_PRESETS.find(p => p.id === 'baseline');
  if (!baseline || baseline.hex.toUpperCase() !== '#6750A4') {
    throw new Error('Missing or invalid baseline preset');
  }
});

test('576 dynamic schemes (9 variants) match published MCU 0.4.0 / spec 2025', () => {
  const fixture = JSON.parse(fs.readFileSync(new URL('../fixtures/material-color-utilities/schemes.json', import.meta.url)));
  assert.equal(fixture.cases.length, 576);
  for (const sample of fixture.cases) {
    const actual = generateM3Scheme(sample.seed, sample.dark, sample.variant, sample.contrast);
    const rgb = hexToRgb(sample.seed);
    assert.deepEqual(rgbToHct(rgb.r, rgb.g, rgb.b), sample.hct);
    for (const [role, value] of Object.entries(sample.colors)) {
      const key = '--md-sys-color-' + role.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
      assert.equal(actual[key], value, `${sample.seed}/${sample.variant}/${sample.dark}/${sample.contrast}/${role}`);
    }
    assert.equal(Object.keys(actual).length, Object.keys(sample.colors).length + 3);
  }
});

test('Tonal spot is the default palette variant, independent of theme scheme', () => {
  assert.deepEqual(generateM3Scheme('#6750a4', false), generateM3Scheme('#6750a4', false, 'tonal-spot'));
  assert.deepEqual(generateM3Scheme('#6750a4', true, 'standard'), generateM3Scheme('#6750a4', true, 'tonal-spot'));
  assert.equal(resolvePaletteVariant('Fruit Salad'), 'fruit-salad');
  assert.equal(resolvePaletteVariant('unknown'), 'tonal-spot');
  assert.deepEqual(PALETTE_VARIANTS, ['tonal-spot','neutral','vibrant','expressive','fidelity','content','monochrome','rainbow','fruit-salad']);
  assert.notEqual(generateM3Scheme('#6750a4', false, 'expressive')['--md-sys-color-secondary-container'],
    generateM3Scheme('#6750a4', false)['--md-sys-color-secondary-container']);
});

test('HCT resolves saturated RGB without the previous Lab clipping', () => {
  for (let r = 0; r <= 255; r += 51) for (let g = 0; g <= 255; g += 51) for (let b = 0; b <= 255; b += 51) {
    const hct = rgbToHct(r,g,b);
    assert.deepEqual(hctToRgb(hct.hue,hct.chroma,hct.tone),{r,g,b});
  }
  const red = rgbToHct(255,0,0);
  assert.ok(Math.abs(red.hue - 27.408) < 0.001);
  assert.ok(Math.abs(red.chroma - 113.357) < 0.001);
});

test('Fractional palette tones and invalid seed fallback are deterministic', () => {
  const palette = new TonalPalette(270,48);
  assert.notEqual(palette.tone(40.4),palette.tone(40));
  assert.deepEqual(hexToRgb('#abc'),{r:170,g:187,b:204});
  for (const bad of ['#12345g','red','',null,'123456garbage']) {
    assert.deepEqual(hexToRgb(bad),{r:103,g:80,b:164});
  }
  const palettes = createTonalPalettes('#6750a4');
  assert.equal(palettes.hct.hue,rgbToHct(103,80,164).hue);
  for (const preset of MD3_PRESETS) assert.equal(hctToHex(preset.hue,preset.chroma,preset.tone),preset.hex.toLowerCase());
});

console.log('\n================================================================');
console.log(`📊 THEME TEST SUMMARY: ${pass} PASSED, ${fail} FAILED`);
console.log('================================================================');

if (fail > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
