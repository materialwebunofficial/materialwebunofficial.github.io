import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {ChipRetainedContent} from '../../src/components/chip-retained-content.js';
const fixture=new URL('../fixtures/androidx/chip/',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('retained.meta.json',fixture))),bytes=fs.readFileSync(new URL('retained.json',fixture));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');assert.equal(hash(bytes),meta.sha256);
for(const entry of [...meta.sources,...meta.hosts])assert.equal(hash(fs.readFileSync(new URL('../../'+entry.file,import.meta.url))),entry.sha256,entry.file);
const rows=JSON.parse(bytes);assert.equal(rows.length,meta.count);let state;
for(const row of rows){
 if(row.frame===0)state=new ChipRetainedContent();
 const target=row.kind==='none'?null:{kind:row.kind,color:row.owner==='leading'&&row.kind==='avatar'?null:row.role};
 const retained=state.update(target),emitted=retained?retained.kind+':'+(retained.color??row.labelRole):null;
 assert.equal(emitted,row.emitted,JSON.stringify(row));
}
state.forget();assert.equal(state.value,null);assert.equal(state.update(null),null);
console.log('Chip retained content: '+rows.length+' complete original closure/captured-color/avatar-inheritance frames passed; visibility owner lifetime is separate.');
