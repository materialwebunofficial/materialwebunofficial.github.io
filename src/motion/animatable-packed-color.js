/* Copyright 2019-2021 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0; obtain a copy at
 * https://www.apache.org/licenses/LICENSE-2.0 . Distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND. See the License for details.
 */
import {AnimationClock} from './animation-clock.js';
import {ColorSpringVector} from './color-motion.js';
import {springDuration} from './spring-duration.js';
import {FrameAnimationWriter} from './frame-animation-writer.js';
import {ComposeColor} from './compose-color.js';

export class FramePackedColorAnimatable extends FrameAnimationWriter{
 constructor(value,{colorSpace=value.spaceId,...platform}={}){super(value,platform);this.colorSpace=colorSpace;}
 zeroVelocity(){return[0,0,0,0];}
 get velocityColor(){return ComposeColor.fromVector(this.velocity,this.colorSpace);}
 prepare(target,spec){
  // Animatable's default initialVelocity is a converted Color. Both the value
  // and that velocity pass through real packed Color/space conversion again.
  const from=this.value.toVector(),velocity=this.velocityColor.toVector(),clock=new AnimationClock();clock.startNanos=this.lastFrameTimeNanos;
  const vector=new ColorSpringVector(from),snap=spec==='Snap',destination=target.toVector();
  if(!snap){const channels=destination.map((to,index)=>({from:from[index],to,velocity:velocity[index],stiffness:Math.fround(spec.stiffness),dampingRatio:Math.fround(spec.dampingRatio)}));vector.target=destination;vector.animation={channels,start:0,duration:Math.max(...channels.map(channel=>springDuration(channel)))};}
  return{clock,vector,target,velocity,spec,snap,durationNanos:snap?0:(vector.animation?.duration??0)*1e6};
 }
 sample(operation,play,finished){
  if(finished){this.value=operation.target;this.velocity=this.zeroVelocity();}
  else{const sample=operation.vector.sample(Math.trunc(play/1e6));this.value=ComposeColor.fromVector(sample.value,this.colorSpace);this.velocity=sample.velocity;}
 }
}
