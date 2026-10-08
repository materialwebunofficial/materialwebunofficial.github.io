import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {roundedPointerHit,capturedPointerOutOfBounds} from '../../src/motion/pointer-geometry.js';
const root=new URL('../fixtures/androidx/',import.meta.url);
for(const family of ['pointer','ripple'])for(const entry of JSON.parse(fs.readFileSync(new URL(`${family}/sources.json`,root))).sources){
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(`${family}/${entry.file}`,root))).digest('hex'),entry.sha256,entry.file);
}
const records=name=>JSON.parse(gunzipSync(fs.readFileSync(new URL(`pointer/${name}-oracle.json.gz`,root))));
const hits=records('hit');
for(const c of hits){
 assert.deepEqual(roundedPointerHit(c.input)??{selected:false,direct:false,inLayer:false,distance:null},
  {selected:c.selected,direct:c.direct,inLayer:c.inLayer,distance:c.distance},JSON.stringify(c.input));
}
let moves=0;
for(const c of records('pointer')){
 let pending=false;
 for(const frame of c.frames){
  // Original all-up is accepted before bounds testing. Only the native
  // non-consumed move branch independently establishes capture bounds here.
  if(pending&&frame.event==='move'){
   assert.equal(capturedPointerOutOfBounds({...c.size,density:c.density,type:c.type,x:frame.x,y:frame.y}),!frame.pending,JSON.stringify({c,frame}));moves++;
  }
  pending=frame.pending;
 }
}
console.log(`Pointer geometry: ${hits.length} original fitted rounded/coordinator/normal-leaf hit records and ${moves} original ClickableNode capture-bound moves passed; full native input trees and interaction emission remain separate.`);
