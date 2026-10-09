import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {textFieldColors,textFieldTransition,textFieldPhase} from '../../src/components/text-field-state.js';
const directory=new URL('../fixtures/androidx/text-field/',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('states.meta.json',directory))),bytes=fs.readFileSync(new URL('states.json',directory)),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(bytes),meta.sha256);
for(const source of meta.sources)assert.equal(hash(fs.readFileSync(new URL(source.file,directory))),source.sha256);
for(const host of meta.hosts)assert.equal(hash(fs.readFileSync(new URL('../../'+host.file,import.meta.url))),host.sha256);
const rows=JSON.parse(bytes);assert.equal(rows.length,meta.count);let colors=0,transitions=0;
for(const row of rows){
 if(row.kind==='colors'){
  const actual=textFieldColors(row),expected=Object.fromEntries(Object.entries(row.values).map(([name,value])=>[name,{...value,alpha:Math.fround(value.alpha)}]));
  assert.deepEqual(actual,expected,'unchanged original Color getters and factory '+JSON.stringify(row));colors+=Object.keys(actual).length;
 }else{assert.deepEqual(textFieldTransition(row.initial,row.target,row.expanded),row.values,'unchanged original transition target/spec branches');transitions+=3;}
}
assert.equal(textFieldPhase(true,true),'Focused');assert.equal(textFieldPhase(false,true),'UnfocusedEmpty');assert.equal(textFieldPhase(false,false),'UnfocusedNotEmpty');
console.log('TextField state: '+colors+' original role/alpha-copy selections and '+transitions+' original label/placeholder/affix transition target/spec branches passed. Symbolic color and descriptor Transition hosts; frame scheduling and native measurement remain separate.');
