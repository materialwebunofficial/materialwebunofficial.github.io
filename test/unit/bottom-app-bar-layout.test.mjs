import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {bottomAppBarLayout} from '../../src/components/bottom-app-bar-layout.js';
const root=new URL('../fixtures/androidx/app-bars/',import.meta.url),read=name=>fs.readFileSync(new URL(name,root));
for(const e of JSON.parse(read('sources.json')).sources)assert.equal(crypto.createHash('sha256').update(read(e.file)).digest('hex'),e.sha256,e.file);
const cases=JSON.parse(gunzipSync(read('bottom-layout-oracle.json.gz')));
for(const c of cases){
 const {node,...actual}=bottomAppBarLayout(c.input);
 assert.deepEqual(actual,{size:c.size,requested:c.requested,placements:c.placements},JSON.stringify(c.input));
 const constraints={},visit=n=>{if(n.id in c.constraints)constraints[n.id]=n.constraints;for(const child of n.children)visit(child.node);};visit(node);
 assert.deepEqual(constraints,c.constraints,'original leaf incoming constraints: '+JSON.stringify(c.input));
}
console.log(`Bottom app bar composition: ${cases.length} original constrained/weighted Row, Box, Fill, Size, Padding, minimum-interactive and Placeable trees passed.`);
