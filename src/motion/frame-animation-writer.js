/* Copyright 2019-2021 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0; obtain a copy at
 * https://www.apache.org/licenses/LICENSE-2.0 . Distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND. See the License for details.
 */
import {MotionCancelled} from './motion-job.js';

// Animatable's internal mutex has one admitted writer. A new animation captures
// its initial value, converted velocity and frame origin before cancelling the
// previous mutator. Dispatch controls when cancellation releases admission.
export class FrameAnimationWriter{
 constructor(value,{draw=()=>{},requestFrame=callback=>requestAnimationFrame(callback),cancelFrame=id=>cancelAnimationFrame(id),durationScale=()=>1,dispatch=callback=>callback()}={}){
  this.value=this.targetValue=value;this.velocity=this.zeroVelocity();this.lastFrameTimeNanos=null;this.isRunning=false;this.raf=null;this.disposed=false;
  this.draw=draw;this.requestFrame=requestFrame;this.cancelFrame=cancelFrame;this.durationScale=durationScale;this.dispatch=dispatch;this.operation=null;this.mutator=null;this.pending=null;
 }
 animateTo(target,spec,job,onSettled=null){
  job.check();const operation=this.prepare(target,spec);operation.job=job;operation.onSettled=onSettled;
  return new Promise((resolve,reject)=>{
   Object.assign(operation,{resolve,reject,cancelled:false,settled:false,removeCancel:null});
   this.mutator?.job.cancel();this.mutator=operation;
   operation.removeCancel=job.onCancel(()=>this.cancelOperation(operation));
   if(this.operation)this.pending=operation;else this.start(operation);
  });
 }
 start(operation){
  if(operation.cancelled||this.disposed)return;
  this.operation=operation;this.targetValue=operation.target;this.velocity=operation.velocity;this.isRunning=true;
  if(operation.clock.startNanos===null)this.schedule();else this.frame(operation.clock.startNanos/1e6,this.durationScale(),false);
 }
 schedule(){
  if(this.disposed||!this.operation||this.operation.cancelled||this.raf!==null)return;
  const scale=this.durationScale();this.raf=this.requestFrame(time=>{this.raf=null;this.frame(time,scale,true);});
 }
 frame(milliseconds,scale=this.durationScale(),delivered=false){
  const operation=this.operation;if(!operation||operation.cancelled||this.disposed)return;
  const play=operation.clock.frame(milliseconds,scale,operation.durationNanos),finished=play>=operation.durationNanos;
  this.lastFrameTimeNanos=operation.clock.frameNanos;this.sample(operation,play,finished);this.draw(this.value);
  if(operation.cancelled)return;
  const continuation=()=>{
   operation.frameContinuation=false;
   if(this.operation!==operation)return;
   if(operation.cancelled){this.cancelCleanup(operation);return;}
   if(finished){this.clear(operation);this.settle(operation);this.admitPending();}else this.schedule();
  };
  // AndroidUiFrameClock draws within the frame callback, then resumes the
  // coroutine through AndroidUiDispatcher's trampoline after frame delivery.
  if(delivered){operation.frameContinuation=true;this.dispatch(continuation);}else continuation();
 }
 cancelOperation(operation){
  if(operation.cancelled||operation.settled)return;operation.cancelled=true;
  if(this.operation===operation&&this.raf!==null){this.cancelFrame(this.raf);this.raf=null;}
  // A frame continuation already queued by the clock consumes cancellation in
  // its existing trampoline position (CancellableContinuation prompt cancel).
  if(!operation.frameContinuation)this.dispatch(()=>this.cancelCleanup(operation));
 }
 cancelCleanup(operation){
  if(this.operation===operation)this.clear(operation);
  if(this.pending===operation)this.pending=null;
  this.settle(operation,new MotionCancelled());this.admitPending();
 }
 clear(operation){
  if(this.operation!==operation)return;this.operation=null;this.isRunning=false;this.velocity=this.zeroVelocity();this.lastFrameTimeNanos=null;
 }
 settle(operation,error){
  if(operation.settled)return;operation.settled=true;operation.removeCancel?.();
  if(this.mutator===operation)this.mutator=null;
  operation.onSettled?.(error);
  if(error)operation.reject(error);else operation.resolve();
 }
 admitPending(){
  const operation=this.pending;if(!operation||this.operation)return;
  this.dispatch(()=>{if(this.pending!==operation||this.operation)return;this.pending=null;this.start(operation);});
 }
 stop(){this.mutator?.job.cancel();}
 snapTo(value){
  this.stop();const operation=this.operation;if(operation)this.clear(operation);
  this.pending=null;this.value=this.targetValue=value;this.draw(this.value);
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.stop();}
}
