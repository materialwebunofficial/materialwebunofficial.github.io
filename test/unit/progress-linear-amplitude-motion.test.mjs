import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import zlib from 'node:zlib';
import {linearIndeterminateFractions,progressAmplitudeValue} from '../../src/components/progress-indicator-layout.js';
const directory=new URL('../fixtures/androidx/progress-indicators/',import.meta.url);
for(const kind of ['linear','amplitude']){
 const meta=JSON.parse(fs.readFileSync(new URL(kind+'-motion-oracle.meta.json',directory)));
 const bytes=zlib.gunzipSync(fs.readFileSync(new URL(kind+'-motion-oracle.json.gz',directory)));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),meta.sha256);
 for(const source of meta.sources)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../../'+source.file,import.meta.url))).digest('hex'),source.sha256);
 const rows=JSON.parse(bytes);assert.equal(rows.length,meta.count);
 for(const row of rows){
  if(kind==='linear')assert.deepEqual(linearIndeterminateFractions(row.nanos/1e6),row.fractions.map(Math.fround),'native head/tail keyframes '+row.nanos+'ns');
  else assert.equal(progressAmplitudeValue(row.from,row.to,row.nanos/1e6),Math.fround(row.value),'native amplitude '+row.from+'/'+row.to+' at '+row.nanos+'ns');
 }
 console.log(kind+' motion: '+rows.length+' exact original Float numeric frames passed.');
}
