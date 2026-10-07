import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {TopAppBarState,TopAppBarScrollBehavior,TopAppBarSettling} from '../../src/components/top-app-bar-scroll.js';
import {topAppBarLayout} from '../../src/components/top-app-bar-layout.js';
const oracle=mode=>JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/app-bars/top-scroll-'+mode+'-oracle.json.gz',import.meta.url))));
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<=Math.max(.0001,Math.abs(b)*.000002),`${label}: ${a} vs ${b}`);
const check=(s,e)=>{for(const [property,key]of [['heightOffsetLimit','limit'],['heightOffset','offset'],['contentOffset','content'],['collapsedFraction','collapsed'],['overlappedFraction','overlapped']])near(s[property],e[key],property);};
const states=oracle('state');for(const c of states){
 const s=new TopAppBarState({heightOffsetLimit:c.limit,heightOffset:c.offset,contentOffset:c.content,isScrollingContentAtStart:()=>c.atStart});
 check(s,c.initial);assert.deepEqual(TopAppBarState.restore(s.save()).save(),s.save());s.heightOffset=c.offset;check(s,c.assigned);s.heightOffsetLimit=-32;check(s,c.limitOnly);s.heightOffset=-40;check(s,c.clamped);
}
const behavior=c=>new TopAppBarScrollBehavior({kind:['legacy','reverse'].includes(c.kind)?'legacy-enter-always':c.kind,reverseLayout:c.kind==='reverse',state:new TopAppBarState({heightOffsetLimit:c.limit,heightOffset:c.initial}),canScroll:()=>c.enabled,isScrollingContentAtStart:()=>c.atStart,snapAnimationSpec:null,flingAnimationSpec:null});
const nested=oracle('nested');for(const c of nested){
 const b=behavior(c),s=b.state;
 for(const step of c.steps){const pre=b.onPreScroll({x:17,y:step.pre});near(pre.x,0,'pre x');near(pre.y,step.preResult,'pre consumption');check(s,step.beforePost);const post=b.onPostScroll({x:9,y:step.consumed},{x:15,y:step.available});near(post.x,0,'post x');near(post.y,step.postResult,'post consumption');check(s,step.afterPost);}
 const motion=b.onPostFling({x:13,y:11},{x:9,y:30});assert.ok(motion.done);check(s,c.final);near(motion.returnedVelocity,c.returnedVelocity,'post fling velocity');
}
const options=specs=>({...(specs==='fling'||specs==='none'?{snapAnimationSpec:null}:{}),...(specs==='snap'||specs==='none'?{flingAnimationSpec:null}:{})});
let frames=0;for(const mode of ['settle','reduced','mutation'])for(const c of oracle(mode)){
 const s=new TopAppBarState({heightOffsetLimit:c.limit,heightOffset:c.offset}),motion=new TopAppBarSettling(s,c.velocity,options(c.specs));
 if(mode==='reduced')motion.finish();else{let mutated=false;for(const expected of c.frames){if(mode==='mutation'&&expected.phase==='snap'&&!mutated){s.heightOffsetLimit=-160;s.heightOffset=-120;mutated=true;}const actual=motion.sampleFrame(expected.absoluteTime);assert.ok(actual);assert.equal(actual.phase,expected.phase);assert.equal(actual.time,expected.time);assert.equal(actual.canceled,expected.canceled);near(actual.value,expected.value,'frame value');near(actual.velocity,expected.velocity,'frame velocity');near(s.heightOffset,expected.offset,'frame offset');frames++;}}
 assert.ok(motion.done);near(s.heightOffset,c.finalOffset,'final offset');near(motion.returnedVelocity,c.returnedVelocity,'remaining velocity');
}
const measured=new TopAppBarState({heightOffset:-20.25});measured.updateHeightOffsetLimit(31);assert.equal(measured.heightOffsetLimit,-51.25);assert.equal(measured.heightOffset,-20.25);
let coupledFrames=0;const coupled=oracle('coupled');for(const c of coupled){
 const state=new TopAppBarState();let previousHeight=-1,layout;
 const measure=()=>{layout=topAppBarLayout({height:64,minWidth:400,maxWidth:400,minHeight:c.minimum,maxHeight:c.maximum,scrolledOffset:state.heightOffset,navigationIcon:{width:4,height:0},actionIcons:{width:4,height:0},title:{width:108,height:c.titleHeight,baseline:20}});if(layout.size.height!==previousHeight){previousHeight=layout.size.height;state.updateHeightOffsetLimit(previousHeight);}};
 const checkLayout=e=>{assert.equal(layout.size.height,e.height);for(const [key,value]of Object.entries(e.title))assert.equal(layout.placements.title[key],value);};
 measure();state.heightOffset=Math.fround(state.heightOffsetLimit*c.fraction);measure();check(state,c.initial);checkLayout(c.initialLayout);
 const motion=new TopAppBarSettling(state,c.velocity);
 for(const expected of c.frames){const actual=motion.sampleFrame(expected.absoluteTime,measure);assert.equal(actual.phase,expected.phase);assert.equal(actual.canceled,expected.canceled);near(state.heightOffset,expected.offset,'coupled offset');near(state.heightOffsetLimit,expected.limit,'coupled measured limit');checkLayout(expected.layout);coupledFrames++;}
 assert.ok(motion.done);check(state,c.final);near(motion.returnedVelocity,c.returnedVelocity,'coupled remaining velocity');
}
const nan=new TopAppBarState({heightOffsetLimit:-80});nan.heightOffset=NaN;assert.ok(Number.isNaN(nan.heightOffset));nan.heightOffset=-0;assert.ok(Object.is(nan.heightOffset,-0));nan.heightOffsetLimit=2;assert.throws(()=>{nan.heightOffset=0;},RangeError);
console.log(`Top app bar scroll: ${states.length} unchanged Kotlin state cases, ${nested.length} nested-scroll traces, 4032 default/nullable-spec/zero-duration/mutated-state settling traces (${frames} frames), and ${coupled.length} bounded original measure/settle clocks (${coupledFrames} frames) passed.`);
