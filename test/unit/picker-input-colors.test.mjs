import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {timeInputColors,timeInputTextFieldColors,pickerPaletteStyle} from '../../src/components/picker-colors.js';
const directory=new URL('../fixtures/androidx/picker/',import.meta.url),bytes=fs.readFileSync(new URL('input-colors.json',directory)),rows=JSON.parse(bytes),meta=JSON.parse(fs.readFileSync(new URL('input-colors.meta.json',directory)));
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');assert.equal(hash(bytes),meta.sha256);
for(const entry of [...meta.sources,...meta.hosts])assert.equal(hash(fs.readFileSync(new URL('../../'+entry.file,import.meta.url))),entry.sha256,entry.file);
for(const row of rows){
 if(row.kind==='palette'){assert.deepEqual(timeInputColors(row.vibrant),row.values);assert(!/#|rgb\(\d/.test(pickerPaletteStyle(timeInputColors(row.vibrant),'input')));continue;}
 const actual=timeInputTextFieldColors(row);
 for(const [key,value]of Object.entries(row.values))assert.deepEqual(actual[key],value,JSON.stringify({row,key}));
 assert.deepEqual(actual.container,row.background);assert.deepEqual(actual.indicator,row.borderColor);
 assert.equal(row.borderWidth,row.enabled&&row.focused?2:1);
 assert.deepEqual(row.animations.map(({kind,spec})=>({kind,spec})),row.enabled?[{kind:'color',spec:'FastEffects'},{kind:'dp',spec:'FastSpatial'},{kind:'color',spec:'FastEffects'}]:[{kind:'color',spec:'FastEffects'}]);
}
console.log('TimeInput colors: '+rows.length+' complete native factory/copy/getter/outlined Container records; role overrides, disabled precedence and motion specs verified');
