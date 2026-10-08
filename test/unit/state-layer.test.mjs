import assert from 'node:assert/strict';
import fs from 'node:fs';
import {StateLayerMotion} from '../../src/motion/state-layer.js';
const native=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/ripple/interaction-oracle.json',import.meta.url)),(_,v)=>typeof v==='number'?Math.fround(v):v);
let frames=0;
for(const c of native.layers){
 if(c.fromKind===c.toKind)continue;
 const motion=new StateLayerMotion(c.from,c.fromKind);motion.update(c.toKind,c.to,0);
 assert.deepEqual(motion.spec,c.spec);
 for(const [time,value]of c.frames){assert.equal(motion.sample(time),value,`${c.fromKind}/${c.toKind}@${time}`);frames++;}
 assert.equal(motion.running(200),false);
}
const motion=new StateLayerMotion();motion.update('focus',.1,10);motion.sample(20);
const before={from:motion.from,target:motion.target,start:motion.start,spec:motion.spec};
assert.equal(motion.update('focus',.16,20),false,'same interaction does not restart or reread alpha');assert.deepEqual({from:motion.from,target:motion.target,start:motion.start,spec:motion.spec},before);
motion.finish();assert.equal(motion.sample(20),Math.fround(.1));assert.equal(motion.running(20),false);
console.log(`State layer motion: ${frames} independent original incoming/outgoing Float alpha frames and retained interaction/reduced-motion target passed.`);
