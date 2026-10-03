import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { ColorSpringVector, vectorColor } from '../../src/motion/color-motion.js';

const reference=new URL('../fixtures/androidx/color/',import.meta.url);
for(const[name,entry]of Object.entries(JSON.parse(fs.readFileSync(new URL('sources.json',reference)))))
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(name,reference))).digest('hex'),entry.sha256);

const cases=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/motion/color-vector-oracle.json',import.meta.url)));
for(const spec of cases){
  const vector=new ColorSpringVector(spec.from);
  if(spec.velocity.every(value=>value===0))vector.to(spec.to,spec,{now:0});
  else{
    vector.target=spec.to.map(Math.fround);
    vector.animation={start:0,duration:spec.duration,channels:spec.from.map((from,index)=>({
      from:Math.fround(from),to:Math.fround(spec.to[index]),velocity:Math.fround(spec.velocity[index]),
      stiffness:spec.stiffness,dampingRatio:spec.dampingRatio}))};
  }
  assert.equal(vector.animation?.duration??0,spec.duration);
  for(const expected of spec.samples){
    const actual=vector.sample(expected.time);
    for(const key of ['value','velocity'])actual[key].forEach((value,index)=>assert.ok(
      Math.abs(value-expected[key][index])<2e-6*Math.max(1,Math.abs(expected[key][index])),
      `${key}[${index}], ${spec.stiffness}/${expected.time}ms: ${value} != ${expected[key][index]}`));
  }
}
const spec={stiffness:1600,dampingRatio:1},vector=new ColorSpringVector([1,.5,.01,-.04]);
vector.to([1,.7,.04,.01],spec,{now:0});
const current=vector.sample(32);
vector.to([.38,.4,-.02,.05],spec,{now:32});
assert.deepEqual(vector.animation.channels.map(channel=>channel.from),current.value);
assert.deepEqual(vector.animation.channels.map(channel=>channel.velocity),current.velocity);
vector.sample(32).value.forEach((value,index)=>assert.ok(Math.abs(value-current.value[index])<2e-7));
assert.deepEqual(vector.sample(32).velocity,current.velocity);
const previous=vector.animation;vector.to([.38,.4,-.02,.05],spec,{now:40});assert.equal(vector.animation,previous);
vector.to([1,.8,.04,.01],spec,{now:48,snap:true});assert.equal(vector.animation,null);
assert.deepEqual(vector.sample(48),{value:[1,.8,.04,.01].map(Math.fround),velocity:[0,0,0,0]});
assert.equal(vectorColor([-1,2,-1,1]),'oklab(1 -0.5 0.5 / 0)');
console.log(`Color motion: ${cases.length} Kotlin four-channel trajectories, common duration, velocity continuity and drawing clamps passed.`);
