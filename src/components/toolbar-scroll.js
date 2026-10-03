/*
 * Copyright 2024 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * FloatingToolbar scroll/state/settling port from AndroidX
 * a095da93f8e98dea8748ceed79ea8427aade245f. Browser input routing is separate.
 */
import {AndroidFlingDecay} from '../motion/android-fling.js';
import {SpringValue} from '../motion/selection-motion.js';
const f=Math.fround;
export class FloatingToolbarState {
 constructor({offsetLimit=-3.4028234663852886e38,offset=0,contentOffset=0}={}){this.offsetLimit=f(offsetLimit);this._offset=f(offset);this.contentOffset=f(contentOffset);}
 get offsetLimit(){return this._offsetLimit;}
 set offsetLimit(value){this._offsetLimit=f(value);}
 get contentOffset(){return this._contentOffset;}
 set contentOffset(value){this._contentOffset=f(value);}
 get offset(){return this._offset;}
 set offset(value){if(this.offsetLimit>0)throw new RangeError('offsetLimit must be nonpositive');this._offset=f(Math.max(this.offsetLimit,Math.min(0,f(value))));}
 get collapsedFraction(){return this.offsetLimit!==0?f(this.offset/this.offsetLimit):0;}
 postScroll(consumedY){consumedY=f(consumedY);this.contentOffset=f(this.contentOffset+consumedY);this.offset=f(this.offset+consumedY);return{x:0,y:0};}
 drag(delta,direction='bottom',rtl=false){let amount=f(delta);if(rtl&&(direction==='start'||direction==='end'))amount=f(-amount);this.offset=f(this.offset+((direction==='start'||direction==='top')?amount:f(-amount)));}
 updateLimit({direction='bottom',rtl=false,x,y,width,height,parentWidth,parentHeight}){
  const limit=direction==='start'?(rtl?f(parentWidth-f(x)):f(width+f(x))):direction==='end'?(rtl?f(width+f(x)):f(parentWidth-f(x))):direction==='top'?f(height+f(y)):f(parentHeight-f(y));
  this.offsetLimit=f(-f(limit-this.offset));
 }
 placement(direction='bottom',rtl=false){const offset=rtl&&(direction==='start'||direction==='end')?f(-this.offset):this.offset,n=Math.round(offset)||0;
  return{x:(direction==='start'?n:direction==='end'?-n:0)||0,y:(direction==='top'?n:direction==='bottom'?-n:0)||0};}
}
export class ToolbarScrollExpansion {
 constructor({expanded=false,reverseLayout=false,expandThreshold=40,collapseThreshold=40,density=1,onExpand=()=>{},onCollapse=()=>{}}={}){
  Object.assign(this,{expanded,reverseLayout,expandThreshold:f(expandThreshold),collapseThreshold:f(collapseThreshold),density:f(density),onExpand,onCollapse});this.contentOffset=0;this.updateThreshold();
 }
 updateThreshold(){this.threshold=f(this.contentOffset+(this.expanded?f(-f(this.collapseThreshold*this.density)):f(this.expandThreshold*this.density)));}
 update({expanded=this.expanded,reverseLayout=this.reverseLayout,expandThreshold=this.expandThreshold,collapseThreshold=this.collapseThreshold,onExpand=this.onExpand,onCollapse=this.onCollapse}={}){
  if(this.expandThreshold!==f(expandThreshold)||this.collapseThreshold!==f(collapseThreshold)){this.expandThreshold=f(expandThreshold);this.collapseThreshold=f(collapseThreshold);this.updateThreshold();}
  this.reverseLayout=reverseLayout;this.onExpand=onExpand;this.onCollapse=onCollapse;if(this.expanded!==expanded){this.expanded=expanded;this.updateThreshold();}
 }
 postScroll(consumedY){const delta=f(f(consumedY)*(this.reverseLayout?-1:1));this.contentOffset=f(this.contentOffset+delta);
  if(delta<0&&this.contentOffset<=this.threshold){this.threshold=f(this.contentOffset+f(this.expandThreshold*this.density));this.onCollapse();}
  else if(delta>0&&this.contentOffset>=this.threshold){this.threshold=f(this.contentOffset-f(this.collapseThreshold*this.density));this.onExpand();}
  return{x:0,y:0};
 }
}
export class FloatingToolbarScrollBehavior {
 constructor({exitDirection='bottom',state=new FloatingToolbarState(),snapSpec={stiffness:1600,dampingRatio:1},decay=new AndroidFlingDecay()}={}){
  this.exitDirection=['start','end','top','bottom'].includes(exitDirection)?exitDirection:'bottom';this.state=state;this.snapSpec=snapSpec;this.decay=decay;
 }
 onPostScroll(consumed){return this.state.postScroll(consumed.y);}
 onPostFling(available){if(available.y>0&&(this.state.offset===0||this.state.offset===this.state.offsetLimit))this.state.contentOffset=0;return this.settle(available.y);}
 settle(velocity){return new ToolbarSettling(this.state,velocity,{snapSpec:this.snapSpec,decay:this.decay});}
}
export class ToolbarSettling {
 constructor(state,velocity,{snapSpec={stiffness:1600,dampingRatio:1},decay=new AndroidFlingDecay()}={}){
  this.state=state;this.velocity=f(velocity);this.remainingVelocity=this.velocity;this.snapSpec=snapSpec;this.decay=decay;this.phase='done';this.start=null;this.lastValue=0;this.returnedVelocity=0;
  if(state.collapsedFraction<f(.01)||state.collapsedFraction===1)return;
  this.phase=Math.abs(this.velocity)>1?'decay':'snap';this._chooseSnap();
 }
 _chooseSnap(){
  if(this.phase!=='snap')return;
  if(!(this.state.offset<0&&this.state.offset>this.state.offsetLimit)){this._complete();return;}
  // AnimationState(initialValue) and animateTo(target) capture these before
  // waiting for the first frame, independently of later hoisted-state writes.
  this.snapFrom=this.state.offset;this.snapTarget=this.state.collapsedFraction<.5?0:this.state.offsetLimit;
 }
 _complete(){this.phase='done';this.returnedVelocity=this.remainingVelocity;}
 get done(){return this.phase==='done';}
 sampleFrame(now){
  if(this.done)return null;
  if(this.start===null){this.start=now;if(this.phase==='snap'){this.snap=new SpringValue(this.snapFrom);this.snap.to(this.snapTarget,this.snapSpec,{now,velocity:0});}}
  const phase=this.phase,time=now-this.start;let sample,canceled=false;
  if(phase==='decay'){
   const duration=this.decay.info(this.velocity).duration,ended=time>=duration;
   sample=ended?{position:this.decay.target(0,this.velocity),velocity:0}:this.decay.sample(time,0,this.velocity);
   const delta=f(sample.position-this.lastValue),initialOffset=this.state.offset;this.state.offset=f(initialOffset+delta);
   const consumed=Math.abs(f(initialOffset-this.state.offset));this.lastValue=sample.position;this.remainingVelocity=sample.velocity;
   // Keep the original signed comparison, including cancellation for negative
   // deltas. This is what the pinned source executes, before its snap phase.
   canceled=Math.abs(f(delta-consumed))>.5;
   if(canceled||ended){this.phase='snap';this.start=null;this._chooseSnap();}
  }else{
   sample=this.snap.sample(now);this.state.offset=sample.position;if(!this.snap.animation)this._complete();
  }
  return{phase,time,value:sample.position,velocity:sample.velocity,offset:this.state.offset,canceled};
 }
 finish(){
  if(this.done)return;
  // Compose durationScale=0 evaluates the decay at its duration before snapping.
  if(this.phase==='decay'){const target=this.decay.target(0,this.velocity);this.state.offset=f(this.state.offset+f(target-this.lastValue));this.remainingVelocity=0;this.phase='snap';this._chooseSnap();if(this.done)return;}
  this.state.offset=this.snapTarget;this._complete();
 }
}
