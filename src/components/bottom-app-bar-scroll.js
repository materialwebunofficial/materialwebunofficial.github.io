/** AndroidX AppBar.kt a095da93: BottomAppBarState/ExitAlways/settleAppBarBottom. */
import {AndroidFlingDecay} from '../motion/android-fling.js';
import {SpringPhysics} from '../motion/spring-physics.js';
import {TopAppBarSettling} from './top-app-bar-scroll.js';
const f=Math.fround,MAX_FLOAT=3.4028234663852886e38,zero=()=>({x:0,y:0});

export class BottomAppBarState{
 constructor({heightOffsetLimit=-MAX_FLOAT,heightOffset=0,contentOffset=0}={}){
  this._listeners=new Set();this._heightOffsetLimit=f(heightOffsetLimit);this._heightOffset=f(heightOffset);this._contentOffset=f(contentOffset);
 }
 _set(key,value){value=f(value);if(Object.is(this[key],value))return;this[key]=value;for(const listener of this._listeners)listener(this);}
 subscribe(listener){this._listeners.add(listener);return()=>this._listeners.delete(listener);}
 get heightOffsetLimit(){return this._heightOffsetLimit;}set heightOffsetLimit(value){this._set('_heightOffsetLimit',value);}
 get heightOffset(){return this._heightOffset;}set heightOffset(value){
  if(this.heightOffsetLimit>0)throw new RangeError('heightOffsetLimit must be nonpositive');
  value=f(value);this._set('_heightOffset',value<this.heightOffsetLimit?this.heightOffsetLimit:value>0?0:value);
 }
 get contentOffset(){return this._contentOffset;}set contentOffset(value){this._set('_contentOffset',value);}
 get collapsedFraction(){return this.heightOffsetLimit!==0?f(this.heightOffset/this.heightOffsetLimit):0;}
 updateHeightOffsetLimit(height){this.heightOffsetLimit=f(-height);}
 save(){return[this.heightOffsetLimit,this.heightOffset,this.contentOffset];}
 static restore(values){return new BottomAppBarState({heightOffsetLimit:values[0],heightOffset:values[1],contentOffset:values[2]});}
}

// The two unchanged source settling bodies are identical apart from their state
// type/name. Share their frame implementation; bottom defaults remain separate.
export class BottomAppBarSettling extends TopAppBarSettling{
 constructor(state,velocity,options={}){
  super(state,velocity,{snapAnimationSpec:options.snapAnimationSpec===undefined?SpringPhysics.getPreset('expressiveSpatialFast',options.element??null):options.snapAnimationSpec,flingAnimationSpec:options.flingAnimationSpec===undefined?new AndroidFlingDecay():options.flingAnimationSpec});
 }
 static complete(state){const motion=new BottomAppBarSettling(state,0,{snapAnimationSpec:null,flingAnimationSpec:null});motion.phase='done';motion.returnedVelocity=0;return motion;}
}
export class BottomAppBarScrollBehavior{
 constructor(options={}){
  this.state=options.state??new BottomAppBarState();this.canScroll=options.canScroll??(()=>true);this.isPinned=false;
  this._element=options.element??null;this._defaultSnap=options.snapAnimationSpec===undefined;this._snap=options.snapAnimationSpec;
  this.flingAnimationSpec=options.flingAnimationSpec===undefined?new AndroidFlingDecay():options.flingAnimationSpec;this.nestedScrollConnection=this;
 }
 static exitAlways(options={}){return new BottomAppBarScrollBehavior(options);}
 setElement(element){if(this._element===null)this._element=element;}
 get snapAnimationSpec(){return this._defaultSnap?SpringPhysics.getPreset('expressiveSpatialFast',this._element):this._snap;}
 set snapAnimationSpec(value){this._defaultSnap=false;this._snap=value;}
 onPreScroll(){return zero();}
 onPostScroll(consumed,available={x:0,y:0}){
  if(!this.canScroll())return zero();const amount=f(consumed?.y??0),s=this.state;s.contentOffset=f(s.contentOffset+amount);s.heightOffset=f(s.heightOffset+amount);return zero();
 }
 onPostFling(consumed={x:0,y:0},available={x:0,y:0}){
  const velocity=f(available?.y??0),s=this.state;if(velocity>0&&(s.heightOffset===0||s.heightOffset===s.heightOffsetLimit))s.contentOffset=0;
  return this.settle(velocity);
 }
 settle(velocity=0){return new BottomAppBarSettling(this.state,velocity,{snapAnimationSpec:this.snapAnimationSpec,flingAnimationSpec:this.flingAnimationSpec});}
}
