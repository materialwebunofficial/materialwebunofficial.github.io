import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {packSrgb} from '../../src/theme/surface-color.js';
import {copySrgbAlpha,compositeSrgb} from '../../src/theme/color-alpha.js';
const native=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/fab-surface/surface-oracle.json',import.meta.url)));
const fixture=new URL('../fixtures/androidx/fab-surface/',import.meta.url);
for(const source of JSON.parse(fs.readFileSync(new URL('sources.json',fixture))).sources)
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(source.file,fixture))).digest('hex'),source.sha256,source.file);
for(const c of native.packing)assert.equal(copySrgbAlpha(packSrgb([...c.components.slice(0,3),1]),c.components[3]),c.result,'native Color constructor/alpha replacement');
for(const c of native.tonal.filter(c=>c.elevation!==0)){
  const f=Math.fround,alpha=f(f(f(4.5*f(Math.log(f(f(c.elevation)+1))))+2)/100);
  assert.equal(compositeSrgb(copySrgbAlpha(c.tint,alpha),c.surface),c.result,'original native packed Float compositeOver');
}
console.log(`Color alpha: ${native.packing.length} original native pack/copy inputs and ${native.tonal.filter(c=>c.elevation!==0).length} native Float composites passed; alpha replaces rather than multiplies.`);
