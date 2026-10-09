import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {calculateExposedMenuPosition,calculateExposedMenuMaxHeight} from '../../src/components/menu-layout.js';
const folder=new URL('../fixtures/androidx/exposed-dropdown/',import.meta.url);
for(const source of JSON.parse(fs.readFileSync(new URL('sources.json',folder),'utf8')).sources){
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(source.file,folder))).digest('hex'),source.sha256,source.file+' unchanged source');
}
const positions=JSON.parse(fs.readFileSync(new URL('position-oracle.json',folder),'utf8'));
for(const record of positions){
 const actual=calculateExposedMenuPosition(record.input);assert.equal(actual.x,record.x);assert.equal(actual.y,record.y);
 assert.equal(actual.origin.x,Math.fround(record.origin.x));assert.equal(actual.origin.y,Math.fround(record.origin.y));
}
const heights=JSON.parse(fs.readFileSync(new URL('height-oracle.json',folder),'utf8'));
for(const record of heights)assert.equal(calculateExposedMenuMaxHeight(record.input),record.height);
console.log('Exposed dropdown: '+positions.length+' unchanged native provider positions/origins and '+heights.length+' original Float max-height cases passed.');
