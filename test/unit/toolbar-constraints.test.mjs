import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {toolbarFabConstraints} from '../../src/components/toolbar-layout.js';

const root=new URL('../fixtures/androidx/toolbar-constraints/',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root));
for(const e of JSON.parse(read('sources.json')).sources)assert.equal(crypto.createHash('sha256').update(read(e.file)).digest('hex'),e.sha256,e.file);
const cases=JSON.parse(read('layout-oracle.json'));
let rejected=0;
for(const c of cases){
  if(c.error){assert.throws(()=>toolbarFabConstraints(c.input),RangeError,JSON.stringify(c.input));rejected++;continue;}
  const actual=toolbarFabConstraints(c.input);
  assert.deepEqual(actual.size,c.size,JSON.stringify(c.input));
  assert.deepEqual(actual.requested,c.requested,JSON.stringify(c.input));
  assert.deepEqual(actual.placements,c.placements,JSON.stringify(c.input));
  assert.deepEqual(actual.scroll,c.scroll,JSON.stringify(c.input));
}
console.log(`Toolbar parent constraints: ${cases.length-rejected} original Kotlin measurement/placement/scroll cases and ${rejected} source-invalid constraints passed.`);
