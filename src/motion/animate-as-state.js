/* Copyright 2026 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0; obtain a copy at
 * https://www.apache.org/licenses/LICENSE-2.0 . Distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND. See the License for details.
 */
import {FrameFloatAnimatable,MotionJob,MotionCancelled} from './animatable-float.js';
import {FrameColorAnimatable} from './animatable-color.js';
import {FramePackedColorAnimatable} from './animatable-packed-color.js';
import {ComposeColor} from './compose-color.js';
import {resolveComposeColor,composeColorCSS} from './compose-color-css.js';
import {SpringPhysics} from './spring-physics.js';
import {compositionFrameClock} from './broadcast-frame-clock.js';
const equal=(a,b)=>a instanceof ComposeColor?b instanceof ComposeColor&&a.packed===b.packed:Array.isArray(a)?a.every((value,index)=>Object.is(value,b[index])):Object.is(a,b);
const converted=value=>value instanceof ComposeColor?value:Array.isArray(value)?value.map(Math.fround):Math.fround(value);

// AnimateAsState restarts an undispatched job. AndroidUiDispatcher queues the
// old job's cleanup, so the new animateTo captures its retained value, converted
// velocity and last frame origin before waiting for the internal mutex.
export class AnimateAsStateMotion{
 constructor(value,{vector=false,label='ValueAnimation',converter=vector?'color':'float',draw=()=>{},frameClock=compositionFrameClock,...platform}={}){
  this.vector=vector;this.label=label;this.converter=converter;this.draw=draw;this.frameClock=frameClock;this.platform={...frameClock.platformBindings,...platform};this.job=null;this.disposed=false;this.finishedListener=null;this.animationSpec=null;
  this.requestedTarget=converted(value);this.state=this.createState(this.requestedTarget);this.draw(this.state.value);
 }
 createState(value,converter=this.converter){const Packed=value instanceof ComposeColor;return new (Packed?FramePackedColorAnimatable:this.vector?FrameColorAnimatable:FrameFloatAnimatable)(value,{...this.platform,...(Packed?{colorSpace:typeof converter==='number'?converter:value.spaceId}:{}),draw:value=>this.draw(value)});}
 set(target,spec,{label=this.label,converter=this.converter,visibilityThreshold=null,finishedListener=this.finishedListener}={}){
  if(this.disposed)return;target=converted(target);this.requestedTarget=target;let restart=false;
  if(converter!==this.converter||label!==this.label){const previous=this.state;this.state=this.createState(previous.value,converter);restart=true;}
  this.converter=converter;this.label=label;this.finishedListener=finishedListener;
  this.animationSpec=spec==='Snap'?spec:{...spec,visibilityThreshold:Math.fround(visibilityThreshold??spec.visibilityThreshold??.01)};
  if(!equal(target,this.state.targetValue))restart=true;
  if(!restart)return;
  this.job?.cancel();
  if(equal(target,this.state.targetValue))return;
  const job=this.job=new MotionJob();
  this.state.animateTo(target,this.animationSpec,job,error=>{
   try{if(!error&&!this.disposed)this.finishedListener?.(this.state.value);}catch(failure){job.cancel();this.platform.dispatch(()=>{throw failure;});}finally{job.complete();}
  }).catch(error=>{if(!(error instanceof MotionCancelled))throw error;});
 }
 get value(){return this.state.value;}
 get velocity(){return this.state.velocity;}
 get raf(){return this.state.raf;}
 finish(){if(this.disposed)return;this.job?.cancel();this.state.snapTo(this.requestedTarget);}
 dispose(){if(this.disposed)return;this.disposed=true;this.job?.cancel();this.state.dispose();}
}

// CSS parsing and browser reduced-motion preference are explicit web bindings.
export class AsStateColorMotion{
 constructor(element,probe,color,draw,{role='expressiveEffectMedium'}={}){
  this.element=element;this.probe=probe;this.color=color;this.draw=draw;this.role=role;this.disposed=false;
  this.media=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');this.onPreference=()=>{if(this.media.matches)this.finish();};this.media?.addEventListener('change',this.onPreference);
  const initial=resolveComposeColor(probe,color);this.owner=new AnimateAsStateMotion(initial,{vector:true,converter:initial.spaceId,label:'ColorAnimation',draw:value=>this.draw(composeColorCSS(value))});
  const motion=this;this.vector={sample:()=>({value:motion.owner.value.toVector(),velocity:[...motion.owner.velocity]}),get animation(){return motion.owner.state.operation;}};
 }
 get raf(){return this.owner.raf;}
 set(color,{snap=false}={}){if(this.disposed)return;this.color=color;const target=resolveComposeColor(this.probe,color);this.owner.set(target,SpringPhysics.getPreset(this.role,this.element),{converter:target.spaceId});if(snap||this.media?.matches)this.finish();}
 finish(){if(!this.disposed)this.owner.finish();}
 dispose(){if(this.disposed)return;this.disposed=true;this.owner.dispose();this.media?.removeEventListener('change',this.onPreference);}
}
