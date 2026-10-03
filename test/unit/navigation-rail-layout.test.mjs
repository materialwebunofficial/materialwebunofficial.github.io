import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {measureAnimatedRailItem} from '../../src/components/navigation-rail-layout.js';
const cases=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/navigation-rail/geometry-oracle.json',import.meta.url)));
const manifest=JSON.parse(fs.readFileSync(new URL('../../tools/androidx-navigation/sources.json',import.meta.url)));
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../fixtures/androidx/navigation/NavigationItem.kt',import.meta.url))).digest('hex'),manifest['NavigationItem.kt'].sha256);
for(const c of cases){
 const g=measureAnimatedRailItem({labelWidth:c.labelWidth,labelHeight:c.labelHeight,
  positionProgress:c.p,selectedProgress:c.selection,topTarget:c.topTarget,maxWidth:c.maxWidth,minHeight:0});
 const context=JSON.stringify([c.labelWidth,c.labelHeight,c.p,c.selection,c.topTarget]);
 assert.equal(g.innerWidth,c.width,'measured width '+context);assert.equal(g.height,c.height,'height '+context);
 assert.equal(g.width,Math.min(c.maxWidth,Math.max(48,c.width)),'constrained box width '+context);
 const dx=Math.trunc((g.width-c.width)/2)||0;
 for(const name of ['indicator','ripple','icon','label']){
  for(const key of ['x','y','width','height'])assert.equal(g[name][key],c.placements[name][key]+(key==='x'?dx:0),`${name}.${key} ${context}`);
 }
 assert.ok(Math.abs(g.label.opacity-c.placements.label.opacity)<2e-6,'label alpha '+context);
}
console.log(`Rail geometry: ${cases.length} independent Kotlin policy/placement cases passed.`);
