import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {ComposeColor,floatBits,floatFromBits} from '../../src/motion/compose-color.js';
const fixture=new URL('../fixtures/androidx/color/packed/',import.meta.url),bytes=fs.readFileSync(new URL('operations.json',fixture)),rows=JSON.parse(bytes),meta=JSON.parse(fs.readFileSync(new URL('operations.meta.json',fixture))),hash=value=>crypto.createHash('sha256').update(value).digest('hex');
assert.equal(hash(bytes),meta.sha256);for(const source of [...meta.sources,...meta.hosts])assert.equal(hash(fs.readFileSync(new URL('../../'+source.file,import.meta.url))),source.sha256,source.file);
const read=record=>ComposeColor.fromPacked('0x'+record.packed),snapshot=value=>({packed:value.packed.toString(16).padStart(16,'0'),space:value.spaceId,bits:value.components.map(floatBits)});
for(const row of rows){const result=row.type==='copy'?read(row.input).copy({alpha:floatFromBits(row.alpha)}):ComposeColor.lerp(read(row.start),read(row.stop),floatFromBits(row.fraction));assert.deepEqual(snapshot(result),row.value,row.type+'/'+row.value.space);}
console.log('Packed Color operations: '+rows.length+' exact native Color.copy alpha/Color.lerp records across20 spaces, cross-space pairs, packed rounding and clamped fractions passed');
