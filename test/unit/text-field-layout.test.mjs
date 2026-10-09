import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import zlib from 'node:zlib';
import {measureTextField} from '../../src/components/text-field-layout.js';
const directory=new URL('../fixtures/androidx/text-field/',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('layout.meta.json',directory))),bytes=zlib.gunzipSync(fs.readFileSync(new URL('layout.json.gz',directory))),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(bytes),meta.sha256);for(const source of meta.sources)assert.equal(hash(fs.readFileSync(new URL('../../'+source.path,import.meta.url))),source.sha256);for(const host of meta.hosts.filter(host=>!host.path.startsWith('research/')))assert.equal(hash(fs.readFileSync(new URL('../../'+host.path,import.meta.url))),host.sha256);
const rows=JSON.parse(bytes);assert.equal(rows.length,meta.count);let valid=0,rejected=0;
for(const row of rows){
 if(row.error){assert.throws(()=>measureTextField(row),error=>{assert.equal(error.message,row.error);assert.deepEqual(error.measurements,row.measurements);return true;});rejected++;}
 else{const actual=measureTextField({...row,intrinsicQuery:{width:320,height:100}}),expected={result:row.result,measurements:row.measurements,placements:Object.fromEntries(Object.entries(row.placements).map(([id,value])=>[id,{...value,alpha:Math.fround(value.alpha)}])),labelMeasured:row.labelMeasured,intrinsic:row.intrinsic};assert.deepEqual(actual,expected,'complete original field measure/place '+JSON.stringify({kind:row.kind,above:row.above,singleLine:row.singleLine,rtl:row.rtl,g:row.progress,c:row.constraints,leaves:row.leaves}));valid++;}
}
console.log('TextField layout: '+valid+' complete original measurement/order/constraint/placement/intrinsic records and '+rejected+' original rejected-bound histories passed. Static leaf/font and placement hosts remain separate from the full composable/native text/input/runtime/raster.');
