import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {toggleButtonLayout} from '../../src/components/button-layout.js';

for(const name of ['toggle-button','button','tooltip','toolbar-row','toolbar-alignment']){
 const directory=new URL(`../fixtures/androidx/${name}/`,import.meta.url);
 for(const {file,sha256}of JSON.parse(fs.readFileSync(new URL('sources.json',directory))).sources)
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(file,directory))).digest('hex'),sha256,file);
}
const native=JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/toggle-button/layout-oracle.json.gz',import.meta.url))));
for(const [i,test]of native.cases.entries()){
 const actual=toggleButtonLayout(test.input),context=`${i}: ${JSON.stringify(test.input)}`;
 assert.deepEqual(actual.size,test.size,'size '+context);
 assert.deepEqual(actual.requested,test.requested,'requested '+context);
 assert.deepEqual(actual.placements,test.placements,'placements '+context);
}
console.log(`Toggle layout: ${native.cases.length} independent original Row/icon Box/Spacer/defaultMin/padding trees, finite/zero/required bounds and RTL passed.`);
