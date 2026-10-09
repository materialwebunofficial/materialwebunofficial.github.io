import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {textFieldCutout} from '../../src/components/text-field-cutout.js';
const directory=new URL('../fixtures/androidx/text-field/',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('cutout.meta.json',directory))),bytes=fs.readFileSync(new URL('cutout.json',directory)),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(bytes),meta.sha256);for(const file of [...meta.sources,...meta.hosts])assert.equal(hash(fs.readFileSync(new URL('../../'+file.path,import.meta.url))),file.sha256);
const rows=JSON.parse(bytes),float=new Float32Array(1),bits=new Uint32Array(float.buffer);assert.equal(rows.length,meta.count);
for(const row of rows){const actual=textFieldCutout(row);if(row.clip===null)assert.equal(actual,null);else{
 assert.deepEqual(actual.map(value=>{float[0]=value;return bits[0];}),row.clipBits,'unchanged original clip Float bits '+JSON.stringify(row));
 }assert.equal(row.draws,1,'original drawContent executes exactly once');}
console.log('TextField cutout: '+rows.length+' unchanged original clip/alignment records passed with exact Float bits, including fractional widths, logical direction, bias, asymmetric padding, tiny/zero/oversize labels and signed zero. Modifier/cache/raster remain separate.');
