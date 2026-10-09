import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {AnimateAsStateMotion} from '../../src/motion/animate-as-state.js';
const directory=new URL('../fixtures/androidx/text-field/',import.meta.url);let checks=0;
for(const profile of ['container-runtime','container-android-runtime','container-broadcast-runtime']){
const queued=profile!=='container-runtime',bytes=fs.readFileSync(new URL(profile+'.json',directory)),meta=JSON.parse(fs.readFileSync(new URL(profile+'.meta.json',directory))),rows=JSON.parse(bytes),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(bytes),meta.sha256);for(const file of [...meta.sources,...meta.hosts])assert.equal(hash(fs.readFileSync(new URL('../../'+file.file,import.meta.url))),file.sha256,file.file);
const close=(actual,expected,key,row)=>{assert.equal(actual.length,expected.length);actual.forEach((value,i)=>assert.ok(Math.abs(value-expected[i])<4e-6*Math.max(1,Math.abs(expected[i])),key+'['+i+'] '+JSON.stringify({row,value,expected:expected[i]})));if(row.scenario==='signed-zero'&&['value','target'].includes(key))actual.forEach((value,i)=>assert.equal(Object.is(value,-0),Object.is(expected[i],-0),key+' zero sign'));};
let owner,key,scale,finished,jobs,index,dispatches;
for(const row of rows){
 const nextKey=[row.kind,row.scheme,row.scenario].join('/');
 if(key!==nextKey){key=nextKey;dispatches=[];scale=1;finished=0;jobs=new Map();index=0;owner=new AnimateAsStateMotion(row.kind==='color'?row.value:row.value[0],{vector:row.kind==='color',label:'FieldAnimation',converter:row.kind,requestFrame:callback=>{const id=++index;jobs.set(id,callback);return id;},cancelFrame:id=>jobs.delete(id),durationScale:()=>scale,dispatch:queued?callback=>dispatches.push(callback):callback=>callback()});}
 if(row.event===(queued?'frame-delivery':'frame')){const pending=[...jobs.values()];jobs.clear();for(const callback of pending)callback(row.time);}
 if(row.action?.target)owner.set(row.kind==='color'?row.action.target:row.action.target[0],row.action.spec,{label:row.action.label,converter:row.action.converter,finishedListener:()=>finished++});
 if(row.action?.scale!==undefined)scale=row.action.scale;
 if(row.action?.cancel)owner.dispose();
 if(queued&&(row.event.endsWith('pump')||row.event==='frame'))while(dispatches.length)dispatches.shift()();
 // Coroutine continuation delivery maps to the web promise microtask boundary.
 await Promise.resolve();await Promise.resolve();await Promise.resolve();
 close(Array.isArray(owner.value)?owner.value:[owner.value],row.value,'value',row);close(Array.isArray(owner.velocity)?owner.velocity:[owner.velocity],row.velocity,'velocity',row);close(Array.isArray(owner.state.targetValue)?owner.state.targetValue:[owner.state.targetValue],row.target,'target',row);
 assert.equal(owner.state.isRunning,row.running,JSON.stringify(row));assert.equal(jobs.size,row.frames,JSON.stringify(row));assert.equal(finished,row.finished,JSON.stringify(row));
 assert.deepEqual(owner.job?{active:owner.job.active,cancelled:owner.job.cancelled,completed:owner.job.completed}:null,row.job,JSON.stringify(row));checks++;
}
}
console.log('Field animate-as-state runtime: '+checks+' native wrapper/job/frame snapshots, first frame, retained values, cancellation, same/spec/label/color-space updates, rapid restarts, Snap and duration scales passed');

// The web reduced-motion binding finishes the requested target even while the
// native writer is waiting for cancellation to release mutex admission.
for(const vector of [false,true]){
 const dispatches=[],frames=new Map();let id=0;
 const initial=vector?[1,.5,.01,-.04]:1,target=vector?[.3,.95,.4,-.4]:2;
 const owner=new AnimateAsStateMotion(initial,{vector,dispatch:callback=>dispatches.push(callback),requestFrame:callback=>{frames.set(++id,callback);return id;},cancelFrame:id=>frames.delete(id)});
 owner.set(target,{stiffness:800,dampingRatio:.6});const pending=[...frames.values()];frames.clear();for(const callback of pending)callback(16);while(dispatches.length)dispatches.shift()();
 owner.set(initial,{stiffness:800,dampingRatio:.6});owner.finish();
 assert.deepEqual(owner.value,Array.isArray(initial)?initial.map(Math.fround):initial);assert.deepEqual(owner.state.targetValue,owner.value);assert.equal(frames.size,0);
 while(dispatches.length)dispatches.shift()();await Promise.resolve();await Promise.resolve();assert.deepEqual(owner.state.targetValue,owner.value);assert.equal(owner.state.isRunning,false);owner.dispose();
}
