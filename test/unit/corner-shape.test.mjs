import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {cornerShapeOutline, roundedOutlineContains} from '../../src/shapes/corner-shape.js';

const base = new URL('../fixtures/androidx/corner-shapes/', import.meta.url);
for (const source of JSON.parse(readFileSync(new URL('sources.json', base))).sources) {
  assert.equal(createHash('sha256').update(readFileSync(new URL(source.file, base))).digest('hex'), source.sha256, source.file);
}
const decode = value => {
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, decode(v)]));
  return ['NaN', 'Infinity', '-Infinity'].includes(value) ? Number(value) : value;
};
const cases = decode(JSON.parse(gunzipSync(readFileSync(new URL('outline-oracle.json.gz', base)))));
let valid = 0, invalid = 0, points = 0;
for (const c of cases) {
  const {shape, width, height, rtl, density} = c.input;
  const outline = () => cornerShapeOutline(shape, width, height, rtl, density);
  const label = JSON.stringify(c.input);
  if (c.error) { assert.throws(outline, RangeError, label); invalid++; continue; }
  const actual = outline();
  assert.deepEqual(actual, c.outline, label);
  for (const query of c.points) { assert.equal(roundedOutlineContains(actual, query.point), query.inside, label + ' ' + query.point); points++; }
  valid++;
}
console.log(`Corner shapes: ${valid} original rounded/cut/absolute/circle/rectangle outlines, ${invalid} source-invalid inputs and ${points} original RoundRect containment points passed.`);
