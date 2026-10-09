/* Copyright 2021-2025 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0; obtain a copy at
 * https://www.apache.org/licenses/LICENSE-2.0 . Distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND. See the License for details.
 */

// Web binding of BroadcastFrameClock/AwaiterQueue and the applying dispatcher's
// trampoline. One RAF delivers every current awaiter before continuations run.
export class BroadcastFrameClock{
 constructor({requestFrame=callback=>requestAnimationFrame(callback),cancelFrame=id=>cancelAnimationFrame(id),queueTask=callback=>queueMicrotask(callback)}={}){
  this.platform={requestFrame,cancelFrame,queueTask};this.awaiters=[];this.requests=new Map();this.tasks=[];this.version=0;this.nextId=0;this.pendingFrames=0;this.ticket=null;this.queued=false;
  this.requestFrame=this.requestFrame.bind(this);this.cancelFrame=this.cancelFrame.bind(this);this.dispatch=this.dispatch.bind(this);
 }
 requestFrame(callback){
  const entry={id:++this.nextId,callback,version:this.version,cancelled:false};this.awaiters.push(entry);this.requests.set(entry.id,entry);this.pendingFrames++;
  if(this.ticket===null)this.ticket=this.platform.requestFrame(time=>this.sendFrame(time));return entry.id;
 }
 cancelFrame(id){
  const entry=this.requests.get(id);if(!entry||entry.cancelled)return;entry.cancelled=true;entry.callback=null;this.requests.delete(id);
  if(entry.version===this.version)this.pendingFrames--;
  if(this.pendingFrames===0&&this.ticket!==null){this.platform.cancelFrame(this.ticket);this.ticket=null;}
 }
 sendFrame(time){
  this.ticket=null;const current=this.awaiters;this.awaiters=[];this.version=(this.version+1)&15;this.pendingFrames=0;
  for(const entry of current){this.requests.delete(entry.id);if(!entry.cancelled)entry.callback(time);}
 }
 dispatch(callback){
  this.tasks.push(callback);if(this.queued)return;this.queued=true;
  this.platform.queueTask(()=>{try{while(this.tasks.length){const task=this.tasks.shift();try{task();}catch(error){this.platform.queueTask(()=>{throw error;});}}}finally{this.queued=false;}});
 }
 get platformBindings(){return{requestFrame:this.requestFrame,cancelFrame:this.cancelFrame,dispatch:this.dispatch};}
}

export const compositionFrameClock=new BroadcastFrameClock();
