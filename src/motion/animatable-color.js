/* Copyright 2019-2021 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0; obtain a copy at
 * https://www.apache.org/licenses/LICENSE-2.0 . Distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND. See the License for details.
 */
import {AnimationClock} from './animation-clock.js';
import {ColorSpringVector} from './color-motion.js';
import {springDuration} from './spring-duration.js';
import {FrameAnimationWriter} from './frame-animation-writer.js';
const convert=vector=>vector.map((value,index)=>Math.fround(Math.max(index<2?0:-.5,Math.min(index<2?1:.5,value))));

// Animatable retains raw velocityVector, but animateTo's default initialVelocity
// passes through Color.VectorConverter in both directions before the new spring.
export class FrameColorAnimatable extends FrameAnimationWriter{
 constructor(value,platform){super(value.map(Math.fround),platform);}
 zeroVelocity(){return[0,0,0,0];}
 prepare(target,spec){
  const from=[...this.value],velocity=convert(this.velocity);target=target.map(Math.fround);
  const clock=new AnimationClock();clock.startNanos=this.lastFrameTimeNanos;
  const vector=new ColorSpringVector(from),snap=spec==='Snap';
  if(!snap){
   const channels=target.map((to,index)=>({from:from[index],to,velocity:velocity[index],stiffness:Math.fround(spec.stiffness),dampingRatio:Math.fround(spec.dampingRatio)}));
   vector.target=target;vector.animation={channels,start:0,duration:Math.max(...channels.map(channel=>springDuration(channel)))};
  }
  const durationNanos=snap?0:(vector.animation?.duration??0)*1e6;
  return {clock,vector,target,velocity,spec,snap,durationNanos};
 }
 sample(operation,play,finished){
  if(finished){this.value=[...operation.target];this.velocity=this.zeroVelocity();}
  else{const sample=operation.vector.sample(Math.trunc(play/1e6));this.value=convert(sample.value);this.velocity=sample.velocity;}
 }
 snapTo(value){super.snapTo(value.map(Math.fround));}
}
