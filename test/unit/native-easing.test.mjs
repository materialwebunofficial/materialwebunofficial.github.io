import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import zlib from 'node:zlib';
import {CubicBezierEasing} from '../../src/motion/native-easing.js';
const directory=new URL('../fixtures/androidx/progress-indicators/',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('native-easing-oracle.meta.json',directory)));
const bytes=zlib.gunzipSync(fs.readFileSync(new URL('native-easing-oracle.json.gz',directory)));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),meta.sha256);
const records=JSON.parse(bytes);let count=0;
for(const record of records){const easing=new CubicBezierEasing(...record.curve);for(const sample of record.samples){
 assert.equal(easing.transform(sample.fraction),Math.fround(sample.value),'unchanged native Float Easing '+record.curve.join('/')+' at '+sample.fraction);count++;
}}
assert.equal(count,meta.count);assert.equal(records.length,meta.curves);
console.log('Native easing: '+count+' exact Float Easing/Bezier frames across '+records.length+' source/linear/degenerate/multiple-root/overshoot curves passed.');
