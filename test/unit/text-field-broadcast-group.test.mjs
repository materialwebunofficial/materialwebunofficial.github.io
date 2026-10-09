import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {AnimateAsStateMotion} from '../../src/motion/animate-as-state.js';
import {BroadcastFrameClock} from '../../src/motion/broadcast-frame-clock.js';
const directory=new URL('../fixtures/androidx/text-field/',import.meta.url),bytes=fs.readFileSync(new URL('container-broadcast-group-runtime.json',directory)),meta=JSON.parse(fs.readFileSync(new URL('container-broadcast-group-runtime.meta.json',directory))),native=JSON.parse(bytes),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(bytes),meta.sha256);for(const file of [...meta.sources,...meta.hosts])assert.equal(hash(fs.readFileSync(new URL('../../'+file.file,import.meta.url))),file.sha256,file.file);
const names=['width','container','border'],external=new Set(['initial','start','start-pump','frame-delivery','frame-pump','between-frames','cancel-all','cancel-all-pump','scope-cancel','scope-cancel-pump','forget-unused','forget-unused-pump']);
const close=(actual,expected,path='')=>{
 if(typeof expected==='number'){assert.ok(Math.abs(actual-expected)<8e-6*Math.max(1,Math.abs(expected)),path+' '+actual+' != '+expected);return;}
 if(expected===null||typeof expected!=='object'){assert.equal(actual,expected,path);return;}
 assert.deepEqual(Object.keys(actual),Object.keys(expected),path);for(const key of Object.keys(expected))close(actual[key],expected[key],path+'/'+key);
};
let checks=0;
for(const scheme of ['expressive','standard'])for(const scenario of ['finish','finish-restart','cancel-sibling','spawn-sibling','cancel-all','forget-unused']){
 const rows=native.filter(row=>row.scheme===scheme&&row.scenario===scenario),initial=rows[0].fields,start=native.find(row=>row.scheme===scheme&&row.scenario==='finish'&&row.event==='start').fields;
 const frames=new Map(),tasks=[],clock=new BroadcastFrameClock({requestFrame:callback=>{const id=frames.size+1;frames.set(id,callback);return id;},cancelFrame:id=>frames.delete(id),queueTask:callback=>tasks.push(callback)}),actual=[],owners={},targets=[0,0,0],finished=[];
 let time=0,ready=false,hook=false;
 const values=()=>Object.fromEntries(names.map(name=>[name,Array.isArray(owners[name].value)?owners[name].value:[owners[name].value]]));
 const snapshot=(event,action=null,write=false)=>actual.push({scheme,scenario,time,event,action,...(write?{values:values()}:{fields:Object.fromEntries(names.map(name=>{const owner=owners[name];return[name,{value:Array.isArray(owner.value)?owner.value:[owner.value],velocity:Array.isArray(owner.velocity)?owner.velocity:[owner.velocity],target:Array.isArray(owner.state.targetValue)?owner.state.targetValue:[owner.state.targetValue],running:owner.state.isRunning,job:owner.job?{active:owner.job.active,cancelled:owner.job.cancelled,completed:owner.job.completed}:null}];}))}),frames:clock.pendingFrames,finished:[...finished]});
 const commit=()=>names.forEach((name,i)=>owners[name].set(i===0?(targets[i]===0?initial[name].value[0]:start[name].target[0]):targets[i]===0?initial[name].value:start[name].target,i===0?{stiffness:scheme==='expressive'?800:1400,dampingRatio:scheme==='expressive'?.6:.9}:{stiffness:3800,dampingRatio:1},{finishedListener:()=>{
  finished.push(name);snapshot('finish:'+name);
  if(scenario==='finish-restart'&&i===1&&!hook){hook=true;targets[0]=0;targets[2]=0;commit();snapshot('finish-restart',{targets:[0,1,0]});}
 }}));
 for(const name of names)owners[name]=new AnimateAsStateMotion(name==='width'?initial[name].value[0]:initial[name].value,{vector:name!=='width',label:name,frameClock:clock,draw:()=>{
  if(!ready)return;snapshot('write:'+name,null,true);
  if(name==='container'&&time===64&&!hook){if(scenario==='cancel-sibling'){hook=true;owners.border.dispose();}else if(scenario==='spawn-sibling'){hook=true;targets[2]=1;commit();}}
 }});
 ready=true;
 for(const row of rows.filter(row=>external.has(row.event))){
  time=row.time;
  if(row.action?.targets){targets.splice(0,targets.length,...row.action.targets);commit();}
  if(row.action?.cancel)for(const owner of Object.values(owners))owner.dispose();
  if(row.event==='frame-delivery'){const waiting=[...frames.values()];frames.clear();for(const callback of waiting)callback(time);}
  if(row.event.endsWith('pump'))while(tasks.length)tasks.shift()();
  snapshot(row.event,row.action);
 }
 assert.equal(actual.length,rows.length,scheme+'/'+scenario+' event count');for(let i=0;i<rows.length;i++){close(actual[i],rows[i],scheme+'/'+scenario+'/'+i);checks++;}
 assert.equal(frames.size,0);assert.equal(clock.pendingFrames,0);assert.equal(clock.requests.size,0);assert.ok(clock.awaiters.every(entry=>entry.callback===null),'Cancelled awaiters retain draw closures');await Promise.resolve();await Promise.resolve();
}
console.log('Shared field broadcast clock: '+checks+' original remembered-scope/awaiter/frame/finished-callback records passed, including same-frame sibling cancellation/spawn, completion retarget and forgotten scopes');
