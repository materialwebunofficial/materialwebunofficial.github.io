import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import zlib from 'node:zlib';
import {progressWaveOffset} from '../../src/components/progress-indicator-layout.js';
const directory=new URL('../fixtures/androidx/progress-indicators/',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('offset-motion-oracle.meta.json',directory)));
const bytes=zlib.gunzipSync(fs.readFileSync(new URL('offset-motion-oracle.json.gz',directory)));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),meta.sha256);
for(const source of meta.sources)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../../'+source.file,import.meta.url))).digest('hex'),source.sha256);
const rows=JSON.parse(bytes);assert.equal(rows.length,meta.count);
for(const row of rows)assert.equal(progressWaveOffset(row.from,row.nanos/1e6,row.duration),Math.fround(row.value),'native offset '+row.from+'/'+row.duration+' at '+row.nanos+'ns');
console.log('Wave offset: '+rows.length+' exact original FloatTween/infinite offset samples,5 periods,4 retained starts, fractional boundaries and4 cycles passed. Job cancellation/restart ownership remains separate.');
