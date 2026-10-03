import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {rowColumnLayout,rowColumnIntrinsic,minimumInteractiveLayout} from '../../src/components/row-column-layout.js';
import {toolbarRowLayout} from '../../src/components/toolbar-layout.js';
const root=new URL('../fixtures/androidx/toolbar-row/',import.meta.url),read=name=>fs.readFileSync(new URL(name,root));
for(const e of JSON.parse(read('sources.json')).sources)assert.equal(crypto.createHash('sha256').update(read(e.file)).digest('hex'),e.sha256,e.file);
const cases=JSON.parse(gunzipSync(read('row-oracle.json.gz')));
for(const c of cases){const actual=rowColumnLayout(c.input);assert.deepEqual(actual,{size:c.size,requested:c.requested,placements:c.placements},JSON.stringify(c.input));for(const i of c.intrinsic){const{available,...expected}=i;assert.deepEqual(rowColumnIntrinsic(c.input,available),expected,JSON.stringify(c.input));}}
console.log(`Row/Column source parity: ${cases.length} measurement/placement cases and ${cases.length*3} intrinsic query groups passed.`);
const toolbar=JSON.parse(gunzipSync(read('toolbar-oracle.json.gz')));
for(const c of toolbar){const actual=toolbarRowLayout(c.input);assert.deepEqual(actual.size,c.size,JSON.stringify(c.input));assert.deepEqual(actual.placements,c.placements,JSON.stringify(c.input));}
console.log(`Toolbar no-FAB source measurement: ${toolbar.length} SizeNode/padding/Row/Column/visibility/balanced-padding tree cases passed.`);
const icons=JSON.parse(gunzipSync(read('icon-oracle.json.gz')));
for(const c of icons)assert.deepEqual(minimumInteractiveLayout(c.input),{size:c.size,requested:c.requested,body:c.body,lines:c.lines},JSON.stringify(c.input));
console.log(`Minimum interactive size: ${icons.length} unchanged Kotlin SizeNode/touch-layout/body-placement/alignment-line cases passed.`);
