/* Copyright 2019,2023 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0; obtain a copy at
 * https://www.apache.org/licenses/LICENSE-2.0 . Distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND. See the License for details.
 */
import {FrameFloatAnimatable,MotionMutatorMutex,MotionJob,MotionCancelled} from '../motion/animatable-float.js';
import {SpringPhysics} from '../motion/spring-physics.js';
import {compositionFrameClock} from '../motion/broadcast-frame-clock.js';

// Native AnalogTimePickerState owns a Foundation mutex outside Animatable's
// internal writer. Replacing the Animatable field leaves the previous native
// job alive; its frames cannot become the newly displayed field's value.
export class PickerClockAnimation{
 constructor(owner,platform={}){
  this.owner=owner;this.frameClock=platform.frameClock??compositionFrameClock;this.platform={...this.frameClock.platformBindings,...platform};this.mutex=new MotionMutatorMutex();this.animations=new Set();this.jobs=new Set();this.delays=new Set();this.disposed=false;
  this.media=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  this.replace(0);
 }
 get value(){return this.anim.value;}get targetValue(){return this.anim.targetValue;}
 get motion(){return this.anim;}
 replace(value){
  const animation=new FrameFloatAnimatable(value,{...this.platform,durationScale:this.platform.durationScale??(()=>this.media?.matches?0:1),draw:()=>{if(this.anim===animation)this.owner.draw();}});
  this.anim=animation;this.animations.add(animation);this.owner.draw();
 }
 mutate(priority,block,job){
  if(!job){const own=new MotionJob();return this.launch(own,()=>this.mutate(priority,block,own));}
  return this.mutex.mutate(priority,job,()=>block(job));
 }
 animateTo(value,priority,spec='DefaultSpatial',job){
  const animate=context=>this.anim.animateTo(value,spec==='Snap'?'Snap':this.platform.getSpec?.()??SpringPhysics.getPreset('expressiveSpatialMedium',this.owner.host),context);
  return job&&this.mutex.current?.job===job?animate(job):this.mutate(priority,animate,job);
 }
 snapTo(value,priority,job){return job&&this.mutex.current?.job===job?this.anim.snapTo(value):this.mutate(priority,()=>this.anim.snapTo(value),job);}
 launch(job,work){
  this.jobs.add(job);const result=new Promise((resolve,reject)=>this.platform.dispatch(()=>{try{job.check();resolve(work(job));}catch(error){reject(error);}}));
  return Promise.resolve(result).catch(error=>{if(error instanceof MotionCancelled)job.cancel();throw error;}).finally(()=>{job.complete();this.jobs.delete(job);this.collect();});
 }
 run(work){const job=new MotionJob();return this.launch(job,work);}
 delay(millis,job){
  job?.check();
  return new Promise((resolve,reject)=>{
   const entry={timer:null,removeCancel:null};const clear=this.platform.clearTimer??clearTimeout;
   entry.timer=(this.platform.setTimer??setTimeout)(()=>{this.delays.delete(entry);entry.removeCancel?.();resolve();},millis);
   this.delays.add(entry);entry.removeCancel=job?.onCancel(()=>{clear(entry.timer);this.delays.delete(entry);reject(new MotionCancelled());});
  });
 }
 collect(){for(const animation of this.animations)if(animation!==this.anim&&!animation.isRunning){animation.dispose();this.animations.delete(animation);}}
 cancel(){for(const job of [...this.jobs])job.cancel();for(const animation of this.animations)animation.stop();}
 dispose(){if(this.disposed)return;this.disposed=true;this.cancel();for(const animation of this.animations)animation.dispose();this.animations.clear();}
}
