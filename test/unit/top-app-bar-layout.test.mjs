import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {topAppBarLayout,topAppBarContentLayout} from '../../src/components/top-app-bar-layout.js';
import {topAppBarTitleAlpha,topAppBarColorFraction} from '../../src/motion/top-app-bar-motion.js';
const root=new URL('../fixtures/androidx/app-bars/',import.meta.url),read=name=>fs.readFileSync(new URL(name,root));
for(const e of JSON.parse(read('sources.json')).sources)assert.equal(crypto.createHash('sha256').update(read(e.file)).digest('hex'),e.sha256,e.file);
const cases=JSON.parse(gunzipSync(read('top-layout-oracle.json.gz')));
for(const c of cases){
 const {node,...actual}=topAppBarLayout(c.input);
 assert.deepEqual(actual,{size:c.size,requested:c.requested,placements:c.placements},JSON.stringify(c.input));
}
console.log(`Top app bar source measurement: ${cases.length} unchanged Kotlin slot/constraint/padding/RTL/baseline/offset cases passed.`);
for(const c of JSON.parse(read('top-motion-oracle.json'))){
 assert.ok(Math.abs(topAppBarTitleAlpha(c.fraction)-c.alpha)<1e-7,JSON.stringify(c));
 assert.ok(Math.abs(topAppBarColorFraction(c.fraction)-c.color)<1e-7,JSON.stringify(c));
}
console.log('Top app bar title alpha/container-color easing: 1031 original CubicBezierEasing cases passed.');
const trees=JSON.parse(gunzipSync(read('top-tree-oracle.json.gz')));
for(const c of trees){const {node,...actual}=topAppBarContentLayout(c.input);assert.deepEqual(actual,{size:c.size,requested:c.requested,placements:c.placements},JSON.stringify(c.input));}
console.log(`Top app bar composition: ${trees.length} source Box/Column/Row/padding/minimum-size tree cases passed (baseline host unspecified).`);
