/* Copyright 2019-2021 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0; obtain a copy at
 * https://www.apache.org/licenses/LICENSE-2.0 . Distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND. See the License for details.
 * Finite Float paths from Animatable/TargetBasedAnimation/SuspendAnimation;
 * RAF, delay delivery and AbortController are web platform bindings.
 */
import {AnimationClock} from './animation-clock.js';
import {SpringPhysics} from './spring-physics.js';
import {springDuration} from './spring-duration.js';
const f=Math.fround;

import {FrameAnimationWriter} from './frame-animation-writer.js';
import {MotionCancelled} from './motion-job.js';
export {MotionJob,MotionCancelled} from './motion-job.js';

// Foundation mutex admission precedes the body. Interrupting a writer cancels
// its whole job, including the pending Animatable continuation. A completed
// mutation releases admission before its caller enters a later delay.
export class MotionMutatorMutex{
 constructor(){this.current=null;this.writer=null;}
 mutate(priority,job,block){
  job.check();const levels={Default:0,UserInput:1,PreventUserInput:2},previous=this.current;
  if(previous&&levels[priority]<levels[previous.priority]){job.cancel();return Promise.reject(new MotionCancelled());}
  // Foundation's currentMutator is replaced before cancelling the old child;
  // its separate Mutex still keeps the new block outside until cleanup ends.
  const writer={priority,job};this.current=writer;previous?.job.cancel();
  const enter=()=>{job.check();writer.entered=true;this.writer=writer;return block();};
  let result;try{result=this.writer?this.writer.result.catch(()=>{}).then(enter):enter();}catch(error){result=Promise.reject(error);}
  // Native withLock's finally only belongs to an admitted block. A cancelled
  // waiter leaves currentMutator's priority until a later eligible replacement.
  writer.result=Promise.resolve(result).finally(()=>{if(writer.entered&&this.current===writer)this.current=null;if(this.writer===writer)this.writer=null;});
  return writer.result;
 }
}

export class FrameFloatAnimatable extends FrameAnimationWriter{
 constructor(value,platform){super(f(value),platform);}
 zeroVelocity(){return 0;}
 prepare(target,spec){
  const from=this.value,velocity=this.velocity;target=f(target);
  const clock=new AnimationClock();clock.startNanos=this.lastFrameTimeNanos;
  const snap=spec==='Snap',durationNanos=snap?0:springDuration({from,to:target,velocity,...spec})*1e6;
  return {from,target,velocity,spec,snap,durationNanos,clock};
 }
 sample(operation,play,finished){
  if(finished){this.value=operation.target;this.velocity=0;}
  else{const sample=SpringPhysics.solve({from:operation.from,to:operation.target,velocity:operation.velocity,...operation.spec,time:Math.trunc(play/1e6)/1000});this.value=f(sample.position);this.velocity=f(sample.velocity);}
 }
 snapTo(value){super.snapTo(f(value));}
}
