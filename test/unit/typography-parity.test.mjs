import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TYPE_SCALE } from '../../src/tokens/typography.js';

const source = fs.readFileSync(new URL('../fixtures/androidx/TypeScaleTokens.kt',import.meta.url),'utf8');
const css = fs.readFileSync(new URL('../../src/tokens/typography.css',import.meta.url),'utf8');
const expected = {};
for (const [,name,raw] of source.matchAll(/inline val (\w+):[^\n]+\n\s*get\(\) = ([^\r\n]+)/g)) {
  const [,role,field] = name.match(/(.+?)(Font|LineHeight|Size|Weight|Tracking)$/);
  const key = role.replace(/[A-Z]/g,(c,index)=>(index?'-':'')+c.toLowerCase());
  const property = {Font:'family',LineHeight:'lineHeight',Size:'size',Weight:'weight',Tracking:'tracking'}[field];
  const value = field === 'Font' ? raw.split('.').at(-1).toLowerCase() : field === 'Weight'
    ? {WeightRegular:400,WeightMedium:500,WeightBold:700}[raw.split('.').at(-1)] : Number(raw.replace('.sp',''));
  (expected[key] ??= {})[property] = value;
  const suffix = {Font:'font',LineHeight:'line-height',Size:'size',Weight:'weight',Tracking:'tracking'}[field];
  const actual = css.match(new RegExp(`--md-sys-typescale-${key}-${suffix}: ([^;]+);`))[1];
  assert.equal(actual,field === 'Font' ? `var(--md-sys-typescale-font-family-${value})` : `${value}${field === 'Weight'?'':'px'}`);
}
assert.equal(Object.keys(expected).length,30);
assert.deepEqual(TYPE_SCALE,expected);
const font = fs.readFileSync(new URL('../../src/fonts/roboto-variable.woff2',import.meta.url));
assert.equal(font.subarray(0,4).toString(),'wOF2');
assert.ok(!css.includes('fonts.googleapis.com'));
console.log('Typography: all 30 roles / 150 source fields match AndroidX; local WOFF2 is present.');
