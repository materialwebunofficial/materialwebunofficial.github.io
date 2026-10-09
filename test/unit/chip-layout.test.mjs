import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {chipContentLayout,chipContentIntrinsic} from '../../src/components/chip-layout.js';
const fixture=new URL('../fixtures/androidx/chip/',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('layout.meta.json',fixture)));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
for(const entry of [...meta.sources,...meta.hosts])assert.equal(hash(fs.readFileSync(new URL('../../'+entry.file,import.meta.url))),entry.sha256,entry.file);
const bytes=gunzipSync(fs.readFileSync(new URL('layout.json.gz',fixture)));assert.equal(hash(bytes),meta.sha256);
const rows=JSON.parse(bytes);assert.equal(rows.length,meta.count);let intrinsics=0;
for(const row of rows){
 const actual=chipContentLayout(row.input),context=JSON.stringify(row.input);
 assert.deepEqual(actual.size,row.size,'size '+context);assert.deepEqual(actual.groups,row.groups,'groups '+context);
 // Atomic visibility host only exports outer group geometry; its layer/offset
 // drawing is a separate Transition boundary, so test settled ink here.
 if(row.input.sample===1)assert.deepEqual(actual.inks,row.inks,'inks '+context);
 for(const expected of row.intrinsics){const {available,...values}=expected;assert.deepEqual(chipContentIntrinsic(row.input,available),values,'intrinsics '+available+' '+context);intrinsics++;}
}
console.log('Chip content: '+rows.length+' independently executed original composable/native layout trees and '+intrinsics+' intrinsic query groups passed. Font, visibility runtime/layers and raster are explicit boundaries.');
