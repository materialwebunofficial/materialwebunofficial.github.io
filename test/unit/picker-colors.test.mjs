import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {datePickerColors,timePickerColors,datePickerDayColors,pickerCssColor,pickerPaletteStyle} from '../../src/components/picker-colors.js';
const directory=new URL('../fixtures/androidx/picker/',import.meta.url),bytes=fs.readFileSync(new URL('colors.json',directory)),reference=JSON.parse(bytes),meta=JSON.parse(fs.readFileSync(new URL('colors.meta.json',directory)));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(bytes),meta.sha256);
for(const source of meta.sources)assert.equal(hash(fs.readFileSync(new URL(source.file,directory))),source.sha256,source.file);
for(const host of meta.hosts)assert.equal(hash(fs.readFileSync(new URL('../../'+host.file,import.meta.url))),host.sha256,host.file);
const {dateTextFieldColors,...date}=reference.date;assert.equal(dateTextFieldColors.role,'outlined-text-field-factory');
assert.deepEqual(datePickerColors(),date);assert.deepEqual(timePickerColors(),reference.time);assert.deepEqual(timePickerColors(true),reference.vibrant);
for(const entry of reference.days){const {options,...expected}=entry;assert.deepEqual(datePickerDayColors(options),expected,JSON.stringify(options));}
assert.equal(pickerCssColor(date.disabledDayContentColor),'rgb(from var(--md-sys-color-on-surface) r g b / '+97/255+')');
for(const palette of [date,reference.time,reference.vibrant])assert(!/#|rgb\(\d/.test(pickerPaletteStyle(palette,'picker')),'Semantic role bindings contain no literal colors');
console.log('Picker original factories: '+Object.keys(date).length+' date roles, '+Object.keys(reference.time).length+' roles per time palette, '+reference.days.length+' day branches; pinned sources/host SHA verified');
