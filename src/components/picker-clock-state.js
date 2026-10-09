/* Copyright 2019,2023 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// AndroidX TimePickerStateImpl / AnalogTimePickerState scalar and angle policies.
// Keep Float arithmetic at native operation boundaries; layout uses Double trig.
const f=Math.fround;
export const PICKER_CLOCK={fullCircle:f(Math.PI*2),quarterCircle:Math.PI/2,outerRatio:f(101/256),innerRatio:f(69/256),maxDistance:74,handleSize:48};
const full=PICKER_CLOCK.fullCircle,half=f(full/2),quarter=f(Math.PI/2),perHour=f(full/12),perMinute=f(full/60);
const angleFor=(value,step)=>f(f(step*value)-f(full/4));
const toUnit=(angle,step,count)=>Math.trunc((angle+(f(step/2)+Math.PI/2))/step)%count;
const roundEven=value=>{const floor=Math.floor(value),fraction=value-floor;return fraction===.5?(floor%2===0?floor:floor+1):Math.round(value);};
export function pickerAtan(y,x){const ret=f(f(Math.atan2(f(y),f(x)))-quarter);return ret<0?f(ret+full):ret;}
export function pickerShortestAngle(current,target){let diff=f(current-target);while(diff>half)diff=f(diff-full);while(diff<=-half)diff=f(diff+full);return f(current-diff);}
const normalize=value=>{let angle=value%(2*Math.PI);if(angle<0)angle+=2*Math.PI;return f(angle);};

export class PickerTimeState{
 constructor(hour=0,minute=0,is24hour=false,selection='Hour'){
  if(!Number.isInteger(hour)||hour<0||hour>23)throw RangeError('initialHour should in [0..23] range');
  if(!Number.isInteger(minute)||minute<0||minute>59)throw RangeError('initialMinute should be in [0..59] range');
  this._hour=this._hourInput=hour;this._minute=this._minuteInput=minute;this.is24hour=is24hour;this.selection=selection;
 }
 get hour(){return this._hour;}set hour(value){this._hour=this._hourInput=value;}
 get minute(){return this._minute;}set minute(value){this._minute=this._minuteInput=value;}
 get hourInput(){return this._hourInput;}set hourInput(value){if(this.isValidHour(value))this.hour=value;this._hourInput=value;}
 get minuteInput(){return this._minuteInput;}set minuteInput(value){if(value>=0&&value<=59)this.minute=value;this._minuteInput=value;}
 get isPm(){return this.hour>=12;}
 isValidHour(value){return this.is24hour?value>=0&&value<=23:this.isPm?value>=12&&value<=23:value>=0&&value<=11;}
 get isHourInputValid(){return this.isValidHour(this.hourInput);}
 get isMinuteInputValid(){return this.minuteInput>=0&&this.minuteInput<=59;}
 get isInputValid(){return this.isHourInputValid&&this.isMinuteInputValid;}
 get hourForDisplay(){return this.is24hour?this.hour%24:this.hour%12===0?12:this.isPm?this.hour-12:this.hour;}
 save(){return[this.hour,this.minute,this.is24hour,this.selection==='Minute'?1:0];}
 static restore(values){return new PickerTimeState(values[0],values[1],values[2],values[3]===1?'Minute':'Hour');}
}

// Both DOM input modes retain the same native raw/canonical state. Recreating
// the dial or editor must not silently discard an invalid text-input value.
export function pickerTimeForHost(host){
 const state=host.state,hour=state.is24Hour?state.hours:state.hours%12+(state.period==='PM'?12:0),minute=state.minutes;
 host._pickerTime??=new PickerTimeState(Number.isInteger(hour)&&hour>=0&&hour<24?hour:7,Number.isInteger(minute)&&minute>=0&&minute<60?minute:30,state.is24Hour);
 host._pickerTime.is24hour=state.is24Hour;host._pickerTime.selection=state.activeUnit==='hours'?'Hour':'Minute';return host._pickerTime;
}

// The host supplies animation, mutation priority and abortable delay. These
// methods retain the original order (including the two angle conversions).
export class PickerAnalogState{
 constructor(state,animation,delay){this.state=state;this.animation=animation;this.delay=delay;this.currentDiameter=0;this.userOverride=false;this.onRemembered();}
 get hour(){return this.state.hour;}set hour(value){this.state.hour=value;}
 get minute(){return this.state.minute;}set minute(value){this.state.minute=value;}
 get isPm(){return this.state.isPm;}
 get is24hour(){return this.state.is24hour;}
 get selection(){return this.state.selection;}set selection(value){this.state.selection=value;}
 get currentAngle(){return this.animation.value;}
 onRemembered(){this.hourAngle=angleFor(this.hour%12,perHour);this.minuteAngle=angleFor(this.minute,perMinute);this.animation.replace(this.selection==='Hour'?this.hourAngle:this.minuteAngle);}
 get hourInput(){return this.hour;}set hourInput(value){this.hourAngle=angleFor(value%12,perHour);this.state.hour=value;if(this.selection==='Hour')this.animation.replace(this.hourAngle);}
 get minuteInput(){return this.minute;}set minuteInput(value){this.minuteAngle=angleFor(value,perMinute);this.state.minute=value;if(this.selection==='Minute')this.animation.replace(this.minuteAngle);}
 async animateToCurrent(job){const target=this.selection==='Hour'?this.hourAngle:this.minuteAngle;if(normalize(this.animation.targetValue)===normalize(target))return;await this.animation.animateTo(pickerShortestAngle(this.currentAngle,target),'PreventUserInput','DefaultSpatial',job);}
 async onGestureEnd(job){const target=this.selection==='Hour'?this.hourAngle:this.minuteAngle;await this.animation.animateTo(pickerShortestAngle(this.currentAngle,target),'PreventUserInput','DefaultSpatial',job);}
 async rotateTo(angle,animate=false,spec='DefaultSpatial',job,onMutation=null){
  angle=f(angle);this.userOverride=false;
  const mutate=context=>{
   if(this.selection==='Hour'){this.hourAngle=f((toUnit(angle,perHour,12)%12)*perHour);this.state.hourInput=toUnit(this.hourAngle,perHour,12)%12+(this.isPm?12:0);}
   else{this.minuteAngle=f(toUnit(angle,perMinute,60)*perMinute);this.state.minuteInput=toUnit(this.minuteAngle,perMinute,60);}
   onMutation?.();
   let target=f(angle+quarter);if(target<0)target=f(target+full);
   if(animate)return this.animation.animateTo(pickerShortestAngle(this.currentAngle,target),'UserInput',spec,context);
   return this.animation.snapTo(target,'UserInput',context);
  };
  if(this.animation.mutate)await this.animation.mutate('UserInput',mutate,job);else await mutate(job);
 }
 moveSelector(x,y,maxDist,center){
  if(this.selection!=='Hour'||!this.is24hour)return;
  const distance=f(Math.hypot(f(center.x-f(x)),f(center.y-f(y))));
  if(this.isPm)this.hour-=distance>=maxDist?12:0;else this.hour+=distance<maxDist?12:0;
 }
 async onTap(x,y,maxDist,autoSwitch,center,spec='DefaultSpatial',job,onMutation=null){
  x=f(x);y=f(y);maxDist=f(maxDist);
  let angle=pickerAtan(f(y-center.y),f(x-center.x));
  if(this.selection==='Minute')angle=f(f(f(roundEven(f(f(angle/perMinute)/5)))*5)*perMinute);
  else angle=f(roundEven(f(angle/perHour))*perHour);
  this.moveSelector(x,y,maxDist,center);await this.rotateTo(angle,true,spec,job,onMutation);
  if(this.selection==='Hour'&&autoSwitch)await this.delay(100,job);
  if(autoSwitch)this.selection='Minute';
 }
 get selectorPos(){
  const diameter=f(this.currentDiameter),scale=f(diameter/256),handle=f(24*scale),ratio=this.is24hour&&this.isPm&&this.selection==='Hour'?PICKER_CLOCK.innerRatio:PICKER_CLOCK.outerRatio;
  const length=f(Math.max(0,f(f(diameter*ratio)-handle))+handle);
  return{x:f(f(length*f(Math.cos(this.currentAngle)))+f(diameter/2)),y:f(f(length*f(Math.sin(this.currentAngle)))+f(diameter/2))};
 }
}

export function pickerCircularLayout(size,ratio,count=12,itemSize=48){
 const radius=f(size*f(ratio)),theta=f(full/count),center=Math.trunc(size/2)-Math.trunc(itemSize/2);
 return Array.from({length:count},(_,i)=>{const angle=f(theta*i)-Math.PI/2;return{x:Math.round(radius*Math.cos(angle)+center),y:Math.round(radius*Math.sin(angle)+center),width:itemSize,height:itemSize};});
}

export function pickerPostSlop(x,y,slop){
 x=f(x);y=f(y);const distance=f(Math.sqrt(f(f(x*x)+f(y*y))));if(!(distance>0&&distance>=slop))return null;
 return{x:f(x-f(f(x/distance)*slop)),y:f(y-f(f(y/distance)*slop))};
}
