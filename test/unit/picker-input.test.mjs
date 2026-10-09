import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {PickerTimeState} from '../../src/components/picker-clock-state.js';
import {pickerInputTransform,pickerInputDigit} from '../../src/components/picker-input-state.js';
const directory=new URL('../fixtures/androidx/picker/',import.meta.url),bytes=fs.readFileSync(new URL('input.json',directory)),data=JSON.parse(bytes),meta=JSON.parse(fs.readFileSync(new URL('input.meta.json',directory))),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(bytes),meta.sha256);assert.equal(data.records.length,meta.count);
for(const entry of [...meta.sources,...meta.hosts])assert.equal(hash(fs.readFileSync(new URL('../../'+entry.file,import.meta.url))),entry.sha256,entry.file);
const digits=new Map(data.digits);for(let code=0;code<=0xffff;code++)assert.equal(pickerInputDigit(String.fromCharCode(code)),digits.get(code)??null,'JVM BMP digit '+code);
for(const row of data.records){
 const state=new PickerTimeState(row.hour,row.minute,row.is24,row.unit),{reverted,...result}=pickerInputTransform(state,row.unit,row,row.a11y);
 const actual={...result,hour:state.hour,minute:state.minute,hourInput:state.hourInput,minuteInput:state.minuteInput,selection:state.selection,hourValid:state.isHourInputValid,minuteValid:state.isMinuteInputValid};
 assert.deepEqual(actual,row.result,JSON.stringify(row));
}
console.log('Picker input: '+data.records.length+' original Foundation buffer/TimeInputTransformation snapshots, 65536 BMP digit boundaries, raw/canonical validity, cursor replacement, blank, PM and auto-advance checks; original/host SHA verified');
