import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {chipColors,chipBorder,chipElevation,chipShapeRole,chipPadding,chipSpacing,chipArrange} from '../../src/components/chip-state.js';
const directory=new URL('../fixtures/androidx/chip/',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('foundation.meta.json',directory))),bytes=fs.readFileSync(new URL('foundation.json',directory)),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(bytes),meta.sha256);for(const source of meta.sources)assert.equal(hash(fs.readFileSync(new URL(source.file,directory))),source.sha256);for(const host of meta.hosts)assert.equal(hash(fs.readFileSync(new URL('../../'+host.file,import.meta.url))),host.sha256);
const rows=JSON.parse(bytes);assert.equal(rows.length,meta.count);let colors=0,borders=0,geometry=0;
const normalize=descriptor=>({...descriptor,alpha:descriptor.alpha===null?null:Math.fround(descriptor.alpha)});
for(const row of rows){
 if(row.kind==='state'){assert.deepEqual(chipColors(row),Object.fromEntries(Object.entries(row.colors).map(([name,descriptor])=>[name,normalize(descriptor)])),JSON.stringify(row));assert.deepEqual(chipBorder(row),row.border?{...row.border,color:normalize(row.border.color)}:null);assert.deepEqual(chipElevation(row),row.elevation);colors+=4;borders++;}
 else if(row.kind==='shape')assert.equal(chipShapeRole({family:'filter',...row}),row.role);
 else{assert.deepEqual(chipPadding(row),row.padding);assert.equal(chipSpacing(row).spacing,row.spacing);assert.deepEqual(chipArrange(row),row.positions);geometry++;}
}
console.log('Chip foundation: '+colors+' complete original role/alpha-copy selections, '+borders+' border/elevation factories, '+geometry+' original input-padding/compact-arrangement records and 4 original expressive shape-priority branches passed. Symbolic role/shape, density/static-child/elevation/animated-shape hosts; full native layout/runtime/motion/raster remain separate.');
