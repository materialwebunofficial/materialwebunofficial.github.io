import fs from 'node:fs';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {measureSelectionLayout} from '../../src/motion/selection-layout.js';
const fixture=new URL('../fixtures/androidx/selection/',import.meta.url),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
for(const [name,entry]of Object.entries(JSON.parse(fs.readFileSync(new URL('sources.json',fixture)))))assert.equal(sha(fs.readFileSync(new URL(name.replace('tokens/',''),fixture))),entry.sha256,name);
const row=new URL('../fixtures/androidx/toolbar-row/',import.meta.url);
for(const entry of JSON.parse(fs.readFileSync(new URL('sources.json',row))).sources)assert.equal(sha(fs.readFileSync(new URL(entry.file,row))),entry.sha256,entry.file);
const payload=gunzipSync(fs.readFileSync(new URL('layout-oracle.json.gz',fixture))),provenance=JSON.parse(fs.readFileSync(new URL('layout-provenance.json',fixture)));
assert.equal(sha(payload),provenance.output);
const cases=JSON.parse(payload);assert.equal(cases.length,provenance.cases);
for(const c of cases){const {kind,minimum,clickable,rtl,constraints,size,requested,placements,measured}=c;assert.deepEqual(measureSelectionLayout({kind,minimum,clickable,rtl,constraints}),{size,requested,placements,measured},JSON.stringify({kind,minimum,clickable,rtl,constraints}));}
console.log(`Selection layout: ${cases.length} independent original modifier-chain/minimum/wrap/padding/required-size measurements and placements, finite/zero/required bounds, fractional reservation, clickable/enabled and RTL passed. Composition and input-node attachment are explicit hosts.`);
