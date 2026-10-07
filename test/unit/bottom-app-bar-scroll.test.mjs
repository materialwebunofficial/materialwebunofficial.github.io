import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {BottomAppBarState,BottomAppBarScrollBehavior,BottomAppBarSettling} from '../../src/components/bottom-app-bar-scroll.js';
import {bottomAppBarScrollLayout} from '../../src/components/bottom-app-bar-layout.js';
const oracle=mode=>JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/app-bars/bottom-scroll-'+mode+'-oracle.json.gz',import.meta.url))));
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<=Math.max(.0001,Math.abs(b)*.000002),`${label}: ${a} vs ${b}`);
const check=(s,e)=>{for(const[property,key]of [['heightOffsetLimit','limit'],['heightOffset','offset'],['contentOffset','content'],['collapsedFraction','collapsed']])near(s[property],e[key],property);};
const states=oracle('state');for(const c of states){
 const s=new BottomAppBarState({heightOffsetLimit:c.limit,heightOffset:c.offset,contentOffset:c.content});check(s,c.initial);assert.deepEqual(BottomAppBarState.restore(s.save()).save(),s.save());s.heightOffset=c.offset;check(s,c.assigned);s.heightOffsetLimit=-32;check(s,c.limitOnly);s.heightOffset=-40;check(s,c.clamped);
}
const nested=oracle('nested');for(const c of nested){
 const b=BottomAppBarScrollBehavior.exitAlways({state:new BottomAppBarState({heightOffsetLimit:c.limit,heightOffset:c.initial}),canScroll:()=>c.enabled,snapAnimationSpec:null,flingAnimationSpec:null}),s=b.state;
 for(const step of c.steps){assert.deepEqual(b.onPreScroll({x:17,y:step.pre}),{x:0,y:step.preResult});check(s,step.beforePost);assert.deepEqual(b.onPostScroll({x:9,y:step.consumed},{x:15,y:step.available}),{x:0,y:step.postResult});check(s,step.afterPost);}
 const motion=b.onPostFling({x:13,y:11},{x:9,y:30});assert.ok(motion.done);check(s,c.final);near(motion.returnedVelocity,c.returnedVelocity,'post fling');
}
const spring=scheme=>scheme==='standard'?{stiffness:1400,dampingRatio:.9}:{stiffness:800,dampingRatio:.6};
const options=c=>({snapAnimationSpec:c.specs==='fling'||c.specs==='none'?null:spring(c.scheme),...(c.specs==='snap'||c.specs==='none'?{flingAnimationSpec:null}:{})});
let frames=0,settlements=0;for(const mode of ['settle','reduced','mutation'])for(const c of oracle(mode)){
 const s=new BottomAppBarState({heightOffsetLimit:c.limit,heightOffset:c.offset}),motion=new BottomAppBarSettling(s,c.velocity,options(c));settlements++;
 if(mode==='reduced')motion.finish();else{let mutated=false;for(const expected of c.frames){if(mode==='mutation'&&expected.phase==='snap'&&!mutated){s.heightOffsetLimit=-160;s.heightOffset=-120;mutated=true;}const actual=motion.sampleFrame(expected.absoluteTime);assert.ok(actual);assert.equal(actual.phase,expected.phase);assert.equal(actual.time,expected.time);assert.equal(actual.canceled,expected.canceled);near(actual.value,expected.value,'frame value');near(actual.velocity,expected.velocity,'frame velocity');near(s.heightOffset,expected.offset,'frame offset');frames++;}}
 assert.ok(motion.done);near(s.heightOffset,c.finalOffset,'final offset');near(motion.returnedVelocity,c.returnedVelocity,'remaining velocity');
}
let coupledFrames=0;const coupled=oracle('coupled');for(const c of coupled){
 const state=new BottomAppBarState({contentOffset:77}),input={minWidth:390,maxWidth:390,minHeight:c.minimum,maxHeight:c.maximum,rtl:c.rtl,variant:c.variant,insets:{bottom:c.inset},actions:[{id:'action0',ink:{width:40,height:40,minimum:48}},{id:'action1',ink:{width:40,height:40,minimum:48}}],fabs:c.hasFab?[{id:'fab0',ink:{width:56,height:56,minimum:48}}]:[]};let layout;
 const measure=()=>{layout=bottomAppBarScrollLayout(input,state);};
 const checkLayout=e=>{const{node,...actual}=layout;assert.deepEqual(actual,e,'outer original bottom measure/Placeable tree: '+JSON.stringify(c));};
 measure();state.heightOffset=Math.fround(state.heightOffsetLimit*c.fraction);measure();check(state,c.initial);checkLayout(c.initialLayout);
 const motion=new BottomAppBarSettling(state,c.velocity,{snapAnimationSpec:spring(c.scheme)});
 for(const e of c.frames){const actual=motion.sampleFrame(e.absoluteTime,measure);assert.equal(actual.phase,e.phase);assert.equal(actual.canceled,e.canceled);near(state.heightOffset,e.offset,'coupled offset');near(state.heightOffsetLimit,e.limit,'coupled limit');checkLayout(e.layout);coupledFrames++;}
 assert.ok(motion.done);check(state,c.final);near(motion.returnedVelocity,c.returnedVelocity,'coupled remaining velocity');
}
const nan=new BottomAppBarState({heightOffsetLimit:-80});nan.heightOffset=NaN;assert.ok(Number.isNaN(nan.heightOffset));nan.heightOffset=-0;assert.ok(Object.is(nan.heightOffset,-0));nan.heightOffsetLimit=2;assert.throws(()=>{nan.heightOffset=0;},RangeError);
const measured=new BottomAppBarState({heightOffset:-20.25});measured.updateHeightOffsetLimit(80);assert.equal(measured.heightOffsetLimit,-80);assert.equal(measured.heightOffset,-20.25);
console.log(`Bottom app bar scroll: ${states.length} original state cases, ${nested.length} nested traces, ${settlements} Expressive/Standard nullable/reduced/mutation settle traces (${frames} frames), and ${coupled.length} original outer-measure/settle clocks (${coupledFrames} frames) passed.`);
