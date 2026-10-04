import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {CONTENT_COLOR_ROLES,packSrgb,tonalSurfaceColor,matchingContentColor} from '../../src/theme/surface-color.js';
const fixture=new URL('../fixtures/androidx/fab-surface/',import.meta.url),read=name=>fs.readFileSync(new URL(name,fixture));
for(const source of JSON.parse(read('sources.json')).sources)assert.equal(crypto.createHash('sha256').update(read(source.file)).digest('hex'),source.sha256,source.file);
const data=JSON.parse(read('surface-oracle.json'));
for(const c of data.packing)assert.equal(packSrgb(c.components),c.result,JSON.stringify(c));
for(const c of data.tonal)assert.equal(tonalSurfaceColor(c.surface,c.tint,c.elevation),c.result,JSON.stringify(c));
const css=name=>name.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
assert.deepEqual(CONTENT_COLOR_ROLES,data.roles.map(pair=>pair.map(css)),'native ordered role matching');
const names=[...new Set(data.roles.flat().concat('surfaceTint'))];
for(const c of data.matches){
 const[a,b]=c.duplicate,scheme={};
 for(const[name,i]of names.map((name,i)=>[name,i])){
  const index=data.roles.findIndex(pair=>pair[0]===name);
  scheme[css(name)]=index<0?0xff000000+i:index===b?a+1:index+1;
 }
 assert.equal(matchingContentColor(scheme[CONTENT_COLOR_ROLES[b][0]],scheme),c.result,JSON.stringify(c));
}
assert.equal(matchingContentColor(0x12345678,{primary:0xff000000,'on-primary':0xffffffff}),undefined);
console.log(`FAB Surface native sRGB: ${data.tonal.length} tonal composites, ${data.matches.length} ordered role collisions and ${data.packing.length} channel packings passed.`);
