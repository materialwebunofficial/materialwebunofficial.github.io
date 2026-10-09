import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {ComposeColor,composeFloatToHalf,composeHalfToFloat,floatBits,floatFromBits} from '../../src/motion/compose-color.js';
const fixture=new URL('../fixtures/androidx/color/packed/',import.meta.url),bytes=fs.readFileSync(new URL('values.json',fixture)),rows=JSON.parse(bytes),meta=JSON.parse(fs.readFileSync(new URL('values.meta.json',fixture)));
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');assert.equal(hash(bytes),meta.sha256);
for(const source of [...meta.sources,...meta.hosts,meta.generated])assert.equal(hash(fs.readFileSync(new URL('../../'+source.file,import.meta.url))),source.sha256,source.file);
const packed=color=>({packed:color.packed.toString(16).padStart(16,'0'),space:color.spaceId,bits:color.components.map(floatBits)});
let count=0;
for(const row of rows){const path=row.type+'/'+count;
 if(row.type==='half'){assert.equal(floatBits(composeHalfToFloat(row.half)),row.bits,path);assert.equal(composeFloatToHalf(composeHalfToFloat(row.half)),row.roundTrip,path);}
 else if(row.type==='float')assert.equal(composeFloatToHalf(floatFromBits(row.bits)),row.half,path);
 else if(row.type==='color'){const c=new ComposeColor(...row.input.map(floatFromBits),row.space);assert.deepEqual(packed(c),row.value,path);assert.deepEqual(c.toVector().map(floatBits),row.vector,path);}
 else if(row.type==='convert'){const c=ComposeColor.fromPacked('0x'+row.input.packed).convert(row.destination,row.intent);assert.deepEqual(packed(c),row.value,path);}
 else if(row.type==='vector'){const c=ComposeColor.fromVector(row.input.map(floatFromBits),row.space);assert.deepEqual(packed(c),row.value,path);assert.deepEqual(c.toVector().map(floatBits),row.roundTrip,path);}
 count++;
}
console.log('Compose Color: '+count+' exact native packed/channel/vector/space records, all half patterns/rounding boundaries,20 spaces and4 intents passed');
