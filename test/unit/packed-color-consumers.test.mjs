import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {AnimateAsStateMotion} from '../../src/motion/animate-as-state.js';
import {ComposeColor} from '../../src/motion/compose-color.js';
import {BroadcastFrameClock} from '../../src/motion/broadcast-frame-clock.js';
const fixture=new URL('../fixtures/androidx/color/packed/',import.meta.url),bytes=fs.readFileSync(new URL('consumer-runtime.json',fixture)),rows=JSON.parse(bytes),meta=JSON.parse(fs.readFileSync(new URL('consumer-runtime.meta.json',fixture)));
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');assert.equal(hash(bytes),meta.sha256);
for(const source of [...meta.sources,...meta.hosts])assert.equal(hash(fs.readFileSync(new URL('../../'+source.file,import.meta.url))),source.sha256,source.file);
const color=value=>({packed:value.packed.toString(16).padStart(16,'0'),space:value.spaceId,vector:value.toVector()});
function compare(actual,expected,path){
 if(typeof expected==='number'){assert(Math.abs(actual-expected)<Math.max(1e-7,Math.abs(expected)*4e-7),path+' '+actual+' != '+expected);return;}
 if(expected&&typeof expected==='object'){assert.deepEqual(Object.keys(actual),Object.keys(expected),path);for(const key of Object.keys(expected))compare(actual[key],expected[key],path+'.'+key);return;}
 assert.equal(actual,expected,path);
}
const groups=new Map();for(const row of rows){const key=row.subject+'/'+row.space+'/'+row.role+'/'+row.scheme+'/'+row.scenario;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
let count=0;
for(const [name,records]of groups){
 let next=0,scale=1,finished=0;const frames=new Map(),tasks=[];
 const clock=new BroadcastFrameClock({requestFrame:callback=>{frames.set(++next,callback);return next;},cancelFrame:id=>frames.delete(id),queueTask:callback=>tasks.push(callback)});
 const initial=ComposeColor.fromPacked('0x'+records[0].value.packed),owner=new AnimateAsStateMotion(initial,{vector:true,converter:initial.spaceId,frameClock:clock,durationScale:()=>scale});
 const pump=()=>{while(tasks.length)tasks.shift()();};
 const snapshot=()=>({value:color(owner.value),velocity:owner.velocity,target:color(owner.state.targetValue),convertedVelocity:owner.state.velocityColor.toVector(),running:owner.state.isRunning,frames:clock.pendingFrames,finished,job:owner.job?{active:owner.job.active,cancelled:owner.job.cancelled,completed:owner.job.completed}:null});
 for(const row of records){
  if(row.action?.target){const target=ComposeColor.fromPacked('0x'+row.action.target.packed);owner.set(target,row.action.spec,{label:row.action.label,converter:target.spaceId,finishedListener:()=>finished++});}
  if(row.action?.scale!==undefined)scale=row.action.scale;
  if(row.action?.cancel)owner.dispose();
  if(row.event==='frame-delivery'){const batch=[...frames.values()];frames.clear();for(const callback of batch)callback(row.time);}
  if(row.event==='frame'||row.event.endsWith('-pump'))pump();
  const {subject:_subject,space:_,scheme:__,role:__role,scenario:___,time:____,event:_____,action:______,...expected}=row;compare(snapshot(),expected,name+'/'+row.time+'/'+row.event);count++;
  assert(frames.size<=1);
 }
 owner.dispose();pump();assert.equal(frames.size,0);assert.equal(clock.requests.size,0);
}
console.log('Packed Color consumer runtime: '+count+' original wrapper/packed value/converted velocity/job/frame snapshots passed');
