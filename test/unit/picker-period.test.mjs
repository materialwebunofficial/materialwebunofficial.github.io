import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {pickerPeriodShapes,pickerPeriodLayout} from '../../src/components/picker-period.js';
import {timePickerColors} from '../../src/components/picker-colors.js';
const directory=new URL('../fixtures/androidx/picker/',import.meta.url),bytes=fs.readFileSync(new URL('period.json',directory)),reference=JSON.parse(bytes),meta=JSON.parse(fs.readFileSync(new URL('period.meta.json',directory)));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');assert.equal(hash(bytes),meta.sha256);
for(const source of meta.sources)assert.equal(hash(fs.readFileSync(new URL('../../'+source.file,import.meta.url))),source.sha256,source.file);
for(const host of meta.hosts)assert.equal(hash(fs.readFileSync(new URL('../../'+host.file,import.meta.url))),host.sha256,host.file);
for(const row of reference){
 if(row.type==='layout'){const {result,type,...input}=row;assert.deepEqual(pickerPeriodLayout(input),result,JSON.stringify(input));}
 else{
  assert.deepEqual(pickerPeriodShapes(),row.result.shapes);const colors=timePickerColors(row.vibrant);
  assert.deepEqual(colors[row.result.checked?'periodSelectorSelectedContainerColor':'periodSelectorContainerColor'],row.result.container);
  assert.deepEqual(colors[row.result.checked?'periodSelectorSelectedContentColor':'periodSelectorContentColor'],row.result.content);
  assert.equal(row.result.fill,true);assert.equal(row.result.selected,row.result.checked);assert.equal(row.result.padding,0);
 }
}
console.log('Picker period: '+reference.length+' original layout and ToggleItem records, exact shape/role/constraint comparisons; pinned sources and hosts verified');
