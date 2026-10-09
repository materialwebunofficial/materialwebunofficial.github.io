import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import zlib from 'node:zlib';
import {circularIndeterminateState} from '../../src/components/progress-indicator-layout.js';
const directory=new URL('../fixtures/androidx/progress-indicators/',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('circular-motion-oracle.meta.json',directory)));
for(const source of meta.sources)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../../'+source.file,import.meta.url))).digest('hex'),source.sha256,'native source '+source.file);
const bytes=zlib.gunzipSync(fs.readFileSync(new URL('circular-motion-oracle.json.gz',directory)));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),meta.sha256);
const records=JSON.parse(bytes);assert.equal(records.length,meta.count);
for(const record of records){const actual=circularIndeterminateState(record.nanos/1e6);
 assert.equal(actual.progress,Math.fround(record.progress),'original Float keyframe progress at '+record.nanos+'ns');
 assert.equal(actual.rotation,Math.fround(record.rotation),'original Float tween/keyframe/repetition rotation at '+record.nanos+'ns');
}
console.log('Circular motion: '+records.length+' exact original Float tween/keyframe/repetition progress/rotation frames, fractional nanoseconds, boundaries and repeated cycles passed.');
