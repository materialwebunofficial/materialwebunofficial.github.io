import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {PickerTimeState,PickerAnalogState} from '../../src/components/picker-clock-state.js';
import {PickerClockAnimation} from '../../src/components/picker-clock-animation.js';
import {MotionJob,MotionCancelled} from '../../src/motion/animatable-float.js';
import {BroadcastFrameClock} from '../../src/motion/broadcast-frame-clock.js';
const directory=new URL('../fixtures/androidx/picker/',import.meta.url),bytes=fs.readFileSync(new URL('clock-broadcast-runtime.json',directory)),rows=JSON.parse(bytes),meta=JSON.parse(fs.readFileSync(new URL('clock-broadcast-runtime.meta.json',directory)));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');assert.equal(hash(bytes),meta.sha256);
for(const source of [...meta.sources,...meta.hosts])assert.equal(hash(fs.readFileSync(new URL('../../'+source.file,import.meta.url))),source.sha256,source.file);
function compare(actual,expected,path){
 if(typeof expected==='number'){assert(Math.abs(actual-expected)<=Math.max(2e-5,Math.abs(expected)*2e-7),path+': '+actual+' != '+expected);return;}
 if(expected&&typeof expected==='object'){assert.deepEqual(Object.keys(actual),Object.keys(expected),path);for(const key of Object.keys(expected))compare(actual[key],expected[key],path+'.'+key);return;}
 assert.equal(actual,expected,path);
}
let checks=0;
for(const scheme of ['expressive','standard'])for(const scenario of [...new Set(rows.map(row=>row.scenario))]){
 let now=0,next=0,scale=1;const frames=new Map(),timers=new Map(),tasks=[];
 const clock=new BroadcastFrameClock({requestFrame:callback=>{const id=++next;frames.set(id,callback);return id;},cancelFrame:id=>frames.delete(id),queueTask:callback=>tasks.push(callback)});
 const platform={frameClock:clock,...clock.platformBindings,setTimer:(callback,delay)=>{const id=++next;timers.set(id,{callback,due:now+delay});return id;},clearTimer:id=>timers.delete(id),getSpec:()=>scheme==='expressive'?{dampingRatio:.8,stiffness:380}:{dampingRatio:.9,stiffness:700},durationScale:()=>scale};
 const animation=new PickerClockAnimation({draw(){}},platform),time=new PickerTimeState(7,17,true),state=new PickerAnalogState(time,animation,(millis,job)=>animation.delay(millis,job));state.currentDiameter=256;
 const jobs=new Map(),errors=[];
 const start=(name,work)=>{const job=new MotionJob();jobs.set(name,job);animation.launch(job,()=>work(job)).catch(error=>{if(!(error instanceof MotionCancelled))errors.push(error);});};
 const second=(name='second')=>start(name,job=>state.onTap(128,27,74,true,{x:128,y:128},'DefaultSpatial',job));
 const pump=async()=>{for(let i=0;i<40;i++){while(tasks.length)tasks.shift()();await Promise.resolve();}};
 const advance=async value=>{for(;;){const due=[...timers.entries()].sort((a,b)=>a[1].due-b[1].due)[0];if(!due||due[1].due>value)break;timers.delete(due[0]);now=due[1].due;due[1].callback();await pump();}now=value;};
 const snapshot=()=>({hour:state.hour,minute:state.minute,selection:state.selection,angle:animation.value,velocity:animation.anim.velocity,target:animation.targetValue,running:animation.anim.isRunning,...state.selectorPos,frames:clock.pendingFrames,delays:timers.size,jobs:Object.fromEntries([...jobs].map(([name,job])=>[name,{active:job.active,cancelled:job.cancelled,completed:job.completed}]))});
 for(const row of rows.filter(row=>row.scenario===scenario&&row.scheme===scheme)){
  if(row.event==='start'){
   if(scenario==='snap'){state.selection='Minute';start('first',job=>state.onTap(229,128,74,false,{x:128,y:128},'Snap',job));}
   else if(['switch','priority-reject','external-replace'].includes(scenario)){state.selection='Minute';start('first',job=>state.animateToCurrent(job));}
   else start('first',job=>state.onTap(229,128,74,true,{x:128,y:128},'DefaultSpatial',job));
  }else if(row.event==='cancel-before-launch')jobs.get('first').cancel();
  else if(row.event.endsWith('-pump')||row.event==='frame')await pump();
  else if(row.event==='frame-delivery'){await advance(row.time);const pending=[...frames.values()];frames.clear();for(const callback of pending)callback(row.time);}
  else if(row.event==='between-frames')await advance(row.time);
  else if(row.event==='before-frame'||row.event==='rapid-1')second();
  else if(row.event==='rapid-2')start('third',job=>state.onTap(27,128,74,true,{x:128,y:128},'DefaultSpatial',job));
  else if(row.event==='after-action'){
   if(row.time===64){
    if(scenario==='tap-interrupt')second();
    if(['tap-rapid','tap-separated'].includes(scenario))second('fourth');
    if(scenario==='priority-reject')start('second',job=>state.rotateTo(1,false,'DefaultSpatial',job));
    if(scenario.startsWith('pending-cancel-')){state.selection='Minute';start('second',job=>state.animateToCurrent(job));start('third',()=>jobs.get('second').cancel());}
    if(scenario==='external-replace')state.minuteInput=23;
    if(scenario==='cancel')jobs.get('first').cancel();
    if(scenario==='forget')animation.cancel();
    if(scenario==='scale-zero')scale=0;
    if(scenario==='scale-change')scale=.5;
   }
   if(row.time===432&&scenario==='tap-delay-overlap')second();
  }else if(row.event==='pending-retry'){
   if(scenario==='pending-cancel-priority')start('fourth',job=>state.rotateTo(1,false,'DefaultSpatial',job));else start('fourth',job=>state.animateToCurrent(job));
  }else if(row.event==='scope-cancel')animation.cancel();
  const {scheme:_,scenario:__,time:___,event:____,...expected}=row;compare(snapshot(),expected,scheme+' '+scenario+' '+row.time+' '+row.event);checks++;
  assert(frames.size<=1,'one shared RAF');
 }
 assert.deepEqual(errors,[]);animation.dispose();await pump();assert.equal(frames.size,0);assert.equal(timers.size,0);assert.equal(clock.requests.size,0);
}
console.log('Picker applying/broadcast runtime: '+checks+' native launch/frame/mutex/cancellation/Delay snapshots passed');
