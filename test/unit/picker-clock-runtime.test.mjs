import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {PickerTimeState,PickerAnalogState} from '../../src/components/picker-clock-state.js';
import {PickerClockAnimation} from '../../src/components/picker-clock-animation.js';
import {MotionJob,MotionCancelled} from '../../src/motion/animatable-float.js';
const directory=new URL('../fixtures/androidx/picker/',import.meta.url),bytes=fs.readFileSync(new URL('clock-runtime.json',directory)),rows=JSON.parse(bytes),meta=JSON.parse(fs.readFileSync(new URL('clock-runtime.meta.json',directory)));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');assert.equal(hash(bytes),meta.sha256);
for(const source of [...meta.sources,...meta.hosts])assert.equal(hash(fs.readFileSync(new URL('../../'+source.file,import.meta.url))),source.sha256,source.file);
const drain=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
function compare(actual,expected,path){
 if(typeof expected==='number'){assert(Math.abs(actual-expected)<=Math.max(2e-5,Math.abs(expected)*2e-7),path+': '+actual+' != '+expected);return;}
 if(expected&&typeof expected==='object'){assert.deepEqual(Object.keys(actual),Object.keys(expected),path);for(const key of Object.keys(expected))compare(actual[key],expected[key],path+'.'+key);return;}
 assert.equal(actual,expected,path);
}
let checks=0;
for(const scenario of [...new Set(rows.map(row=>row.scenario))]){
 let now=0,next=0;const frames=new Map(),timers=new Map();
 const platform={dispatch:callback=>callback(),requestFrame:callback=>{const id=++next;frames.set(id,callback);return id;},cancelFrame:id=>frames.delete(id),setTimer:(callback,delay)=>{const id=++next;timers.set(id,{callback,due:now+delay});return id;},clearTimer:id=>timers.delete(id),getSpec:()=>({dampingRatio:.8,stiffness:380}),durationScale:()=>1};
 const animation=new PickerClockAnimation({draw(){}},platform),time=new PickerTimeState(7,17,true),state=new PickerAnalogState(time,animation,(millis,job)=>animation.delay(millis,job));state.currentDiameter=256;
 const jobs=new Map(),errors=[];
 const start=(name,work)=>{const job=new MotionJob();jobs.set(name,job);animation.launch(job,()=>work(job)).catch(error=>{if(!(error instanceof MotionCancelled))errors.push(error);});};
 const advance=async value=>{for(;;){const due=[...timers.entries()].sort((a,b)=>a[1].due-b[1].due)[0];if(!due||due[1].due>value)break;timers.delete(due[0]);now=due[1].due;due[1].callback();await drain();}now=value;};
 const snapshot=()=>({hour:state.hour,minute:state.minute,selection:state.selection,angle:animation.value,velocity:animation.anim.velocity,target:animation.targetValue,running:animation.anim.isRunning,...state.selectorPos,frames:frames.size,delays:timers.size,jobs:Object.fromEntries([...jobs].map(([name,job])=>[name,{active:job.active,cancelled:job.cancelled,completed:job.completed}]))});
 for(const row of rows.filter(row=>row.scenario===scenario)){
  if(row.event==='start'){
   if(scenario==='tap'||scenario.startsWith('tap-')||scenario==='cancel')start('first',job=>state.onTap(229,128,74,true,{x:128,y:128},'DefaultSpatial',job));
   else if(scenario==='snap'){state.selection='Minute';start('first',job=>state.onTap(229,128,74,false,{x:128,y:128},'Snap',job));}
   else{state.selection='Minute';start('first',job=>state.animateToCurrent(job));}
  }else if(row.event==='frame'){await advance(row.time);const pending=[...frames.values()];frames.clear();for(const callback of pending)callback(row.time);}
  else if(row.event==='between-frames')await advance(row.time);
  else if(row.event==='after-action'){
   if(row.time===64){
    if(scenario==='tap-interrupt')start('second',job=>state.onTap(128,27,74,true,{x:128,y:128},'DefaultSpatial',job));
    if(scenario==='priority-reject')start('second',job=>state.rotateTo(1,false,'DefaultSpatial',job));
    if(scenario==='external-replace')state.minuteInput=23;
    if(scenario==='cancel')jobs.get('first').cancel();
   }
   if(row.time===432&&scenario==='tap-delay-overlap')start('second',job=>state.onTap(128,27,74,true,{x:128,y:128},'DefaultSpatial',job));
  }else if(row.event==='scope-cancel')animation.cancel();
  await drain();const {scenario:_,time:__,event:___,...expected}=row;compare(snapshot(),expected,scenario+' '+row.time+' '+row.event);checks++;
 }
 assert.deepEqual(errors,[]);animation.dispose();assert.equal(frames.size,0);assert.equal(timers.size,0);
}
console.log('Picker clock runtime: '+checks+' native coroutine/frame snapshots, retained values, first frame, double-mutex priorities, zero-velocity interruption,100ms delay, replacement and cancellation passed');
