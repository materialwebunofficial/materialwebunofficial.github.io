/** AndroidX AppBar.kt a095da93: Float state, nested scroll and settleAppBar. */
import {AndroidFlingDecay} from '../motion/android-fling.js';
import {SpringValue} from '../motion/selection-motion.js';

const f=Math.fround,MAX_FLOAT=3.4028234663852886e38;
const zero=()=>({x:0,y:0}),y=v=>f(v?.y??0);
const clamp=(value,minimum)=>{
 if(minimum>0)throw new RangeError('heightOffsetLimit must be nonpositive');
 // Kotlin coerceIn preserves NaN and signed zero (Math.min/max do not).
 return value<minimum?minimum:value>0?0:value;
};

export class TopAppBarState{
 constructor({heightOffsetLimit=-MAX_FLOAT,heightOffset=0,contentOffset=0,isScrollingContentAtStart=()=>true}={}){
  this._listeners=new Set();this._heightOffsetLimit=f(heightOffsetLimit);this._heightOffset=f(heightOffset);this._contentOffset=f(contentOffset);this.isScrollingContentAtStart=isScrollingContentAtStart;
 }
 _set(key,value){value=f(value);if(Object.is(this[key],value))return;this[key]=value;for(const listener of this._listeners)listener(this);}
 subscribe(listener){this._listeners.add(listener);return()=>this._listeners.delete(listener);}
 get heightOffsetLimit(){return this._heightOffsetLimit;}set heightOffsetLimit(v){this._set('_heightOffsetLimit',v);}
 get heightOffset(){return this._heightOffset;}set heightOffset(v){this._set('_heightOffset',clamp(f(v),this.heightOffsetLimit));}
 get contentOffset(){return this._contentOffset;}set contentOffset(v){this._set('_contentOffset',v);}
 get collapsedFraction(){return this.heightOffsetLimit!==0?f(this.heightOffset/this.heightOffsetLimit):0;}
 get overlappedFraction(){
  if(!this.isScrollingContentAtStart()&&this.contentOffset===0)return 1;
  return this.heightOffsetLimit!==0?f(1-f(clamp(f(this.heightOffsetLimit+Math.abs(this.contentOffset)),this.heightOffsetLimit)/this.heightOffsetLimit)):0;
 }
 updateHeightOffsetLimit(height){this.heightOffsetLimit=f(-f(f(height)-this.heightOffset));}
 save(){return[this.heightOffsetLimit,this.heightOffset,this.contentOffset];}
 static restore(values){return new TopAppBarState({heightOffsetLimit:values[0],heightOffset:values[1],contentOffset:values[2]});}
}

export class TopAppBarScrollBehavior{
 constructor({kind='enter-always',state=new TopAppBarState(),canScroll=()=>true,isScrollingContentAtStart,reverseLayout=false,snapAnimationSpec={stiffness:1600,dampingRatio:1},flingAnimationSpec=new AndroidFlingDecay()}={}){
  if(!['pinned','enter-always','exit-until-collapsed','legacy-enter-always'].includes(kind))throw new RangeError('Unknown top app bar scroll behavior');
  this.kind=kind;this.state=state;this.canScroll=canScroll;this.reverseLayout=reverseLayout;this.isPinned=kind==='pinned';
  this.snapAnimationSpec=this.isPinned?null:snapAnimationSpec;this.flingAnimationSpec=this.isPinned?null:flingAnimationSpec;
  if(isScrollingContentAtStart!=null&&(kind==='pinned'||kind==='enter-always'))state.isScrollingContentAtStart=isScrollingContentAtStart;
  this.nestedScrollConnection=this;
 }
 static pinned(options={}){return new TopAppBarScrollBehavior({...options,kind:'pinned'});}
 static enterAlways(options={}){return new TopAppBarScrollBehavior({...options,kind:'enter-always'});}
 static exitUntilCollapsed(options={}){return new TopAppBarScrollBehavior({...options,kind:'exit-until-collapsed'});}
 static legacyEnterAlways(options={}){return new TopAppBarScrollBehavior({...options,kind:'legacy-enter-always'});}
 onPreScroll(available){
  const amount=y(available);if(this.isPinned||!this.canScroll()||(this.kind==='exit-until-collapsed'&&amount>0))return zero();
  const previous=this.state.heightOffset;this.state.heightOffset=f(previous+amount);
  return previous!==this.state.heightOffset&&!(this.kind==='legacy-enter-always'&&this.reverseLayout)?{x:0,y:amount}:zero();
 }
 onPostScroll(consumed,available={x:0,y:0}){
  if(!this.canScroll())return zero();const amount=y(consumed),remaining=y(available),s=this.state;s.contentOffset=f(s.contentOffset+amount);
  if(this.kind==='legacy-enter-always'&&!this.reverseLayout)s.heightOffset=f(s.heightOffset+amount);
  if(this.kind==='exit-until-collapsed'){
   if(remaining<0||amount<0){const before=s.heightOffset;s.heightOffset=f(before+amount);return{x:0,y:f(s.heightOffset-before)};}
   if(remaining>0){const before=s.heightOffset;s.heightOffset=f(before+remaining);return{x:0,y:f(s.heightOffset-before)};}
  }
  return zero();
 }
 onPostFling(consumed={x:0,y:0},available={x:0,y:0}){
  const velocity=y(available),s=this.state;
  if(velocity>0&&(this.kind!=='legacy-enter-always'||s.heightOffset===0||s.heightOffset===s.heightOffsetLimit))s.contentOffset=0;
  return this.isPinned?TopAppBarSettling.complete(s):this.settle(velocity);
 }
 settle(velocity=0){return new TopAppBarSettling(this.state,velocity,{snapAnimationSpec:this.snapAnimationSpec,flingAnimationSpec:this.flingAnimationSpec});}
}

export class TopAppBarSettling{
 constructor(state,velocity,{snapAnimationSpec={stiffness:1600,dampingRatio:1},flingAnimationSpec=new AndroidFlingDecay()}={}){
  this.state=state;this.velocity=f(velocity);this.remainingVelocity=this.velocity;this.snapAnimationSpec=snapAnimationSpec;this.decay=flingAnimationSpec;this.phase='done';this.start=null;this.lastValue=0;this.returnedVelocity=0;
  if(state.collapsedFraction<f(.01)||state.collapsedFraction===1)return;
  this.phase=this.decay!==null&&Math.abs(this.velocity)>1?'decay':'snap';this._chooseSnap();
 }
 static complete(state){const motion=new TopAppBarSettling(state,0,{snapAnimationSpec:null,flingAnimationSpec:null});motion.phase='done';motion.returnedVelocity=0;return motion;}
 _complete(){this.phase='done';this.returnedVelocity=this.remainingVelocity;}
 _chooseSnap(){
  if(this.phase!=='snap')return;
  if(this.snapAnimationSpec===null||!(this.state.heightOffset<0&&this.state.heightOffset>this.state.heightOffsetLimit)){this._complete();return;}
  this.snapFrom=this.state.heightOffset;this.snapTarget=this.state.collapsedFraction<.5?0:this.state.heightOffsetLimit;
 }
 get done(){return this.phase==='done';}
 sampleFrame(now,afterOffsetWrite=()=>{}){
  if(this.done)return null;
  if(this.start===null){this.start=now;if(this.phase==='snap'){this.snap=new SpringValue(this.snapFrom);this.snap.to(this.snapTarget,this.snapAnimationSpec,{now,velocity:0});}}
  const phase=this.phase,time=now-this.start;let sample,canceled=false;
  if(phase==='decay'){
   const ended=time>=this.decay.info(this.velocity).duration;
   sample=ended?{position:this.decay.target(0,this.velocity),velocity:0}:this.decay.sample(time,0,this.velocity);
   const delta=f(sample.position-this.lastValue),before=this.state.heightOffset;this.state.heightOffset=f(before+delta);
   const consumed=Math.abs(f(before-this.state.heightOffset));this.lastValue=sample.position;this.remainingVelocity=sample.velocity;
   canceled=Math.abs(f(delta-consumed))>.5;
   // A platform host can publish onSizeChanged before the next animation
   // captures its snap target. The callback never reassigns the current offset.
   afterOffsetWrite();
   if(canceled||ended){this.phase='snap';this.start=null;this._chooseSnap();}
  }else{sample=this.snap.sample(now);this.state.heightOffset=sample.position;afterOffsetWrite();if(!this.snap.animation)this._complete();}
  return{phase,time,value:sample.position,velocity:sample.velocity,offset:this.state.heightOffset,canceled};
 }
 finish(){
  if(this.done)return;
  if(this.phase==='decay'){this.state.heightOffset=f(this.state.heightOffset+f(this.decay.target(0,this.velocity)-this.lastValue));this.remainingVelocity=0;this.phase='snap';this._chooseSnap();if(this.done)return;}
  this.state.heightOffset=this.snapTarget;this._complete();
 }
}
