import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {AndroidFlingDecay} from '../../src/motion/android-fling.js';
import {FloatingToolbarState,FloatingToolbarScrollBehavior,ToolbarScrollExpansion} from '../../src/components/toolbar-scroll.js';
const read=name=>fs.readFileSync(new URL('../fixtures/androidx/toolbar-scroll/'+name,import.meta.url),'utf8'),json=name=>JSON.parse(read(name));
for(const e of json('sources.json').sources)assert.equal(crypto.createHash('sha256').update(read(e.file)).digest('hex'),e.sha256);
const near=(a,b,label)=>{if(b==='nan'){assert.ok(Number.isNaN(a));return;}assert.ok(Math.abs(a-b)<=Math.max(.0001,Math.abs(b)*.000002),`${label}: ${a} vs ${b}`);};
const spline=json('spline-oracle.json');for(const c of spline){const decay=new AndroidFlingDecay({density:c.density});assert.equal(decay.info(c.velocity).duration,c.duration);near(decay.target(c.from,c.velocity),c.target,'target');for(const s of c.samples){const actual=decay.sample(s.time,c.from,c.velocity);near(actual.position,s.value,'spline value');near(actual.velocity,s.velocity,'spline velocity');}}
const expansion=json('expansion-oracle.json');for(const c of expansion){let event;const n=new ToolbarScrollExpansion({...c,reverseLayout:c.reverse,onExpand:()=>event='expand',onCollapse:()=>event='collapse'});
 for(const[index,s]of c.steps.entries()){event=null;n.postScroll(s.delta);assert.equal(event,s.event);near(n.contentOffset,s.offset,'contentOffset');near(n.threshold,s.thresholdBeforeUpdate,'threshold');if(event)n.update({expanded:event==='expand'});if(index===5)n.update({reverseLayout:!n.reverseLayout,expandThreshold:15,collapseThreshold:31});assert.equal(n.expanded,s.expanded);}}
const exit=json('exit-oracle.json');for(const c of exit){const state=new FloatingToolbarState({offsetLimit:-300,offset:c.offset,contentOffset:7});assert.deepEqual(state.placement(c.direction,c.rtl),c.placement);
 state.updateLimit({...c,x:c.x+c.placement.x,y:c.y+c.placement.y,width:224,height:80,parentWidth:500,parentHeight:400});near(state.offsetLimit,c.limit,'limit');state.drag(15.5,c.direction,c.rtl);near(state.offset,c.dragged,'drag');state.postScroll(-7.25);near(state.offset,c.scrolled,'scroll');near(state.contentOffset,c.contentOffset,'content');}
const settle=json('settle-oracle.json');let frameCount=0;for(const c of settle){const state=new FloatingToolbarState({offsetLimit:c.limit,offset:c.offset,contentOffset:77}),motion=new FloatingToolbarScrollBehavior({state}).onPostFling({x:0,y:c.velocity});
 for(const s of c.frames){const actual=motion.sampleFrame(s.absoluteTime);assert.ok(actual);assert.equal(actual.phase,s.phase);assert.equal(actual.time,s.time);assert.equal(actual.canceled,s.canceled);near(actual.value,s.value,'settle value');near(actual.velocity,s.velocity,'settle velocity');near(state.offset,s.offset,'settle offset');frameCount++;}
 assert.ok(motion.done);near(state.offset,c.finalOffset,'final');near(state.contentOffset,c.contentOffset,'content reset');near(motion.returnedVelocity,c.returnedVelocity,'returnedVelocity');}
const reduced=json('settle-reduced-oracle.json');for(const c of reduced){const state=new FloatingToolbarState({offsetLimit:c.limit,offset:c.offset,contentOffset:77}),motion=new FloatingToolbarScrollBehavior({state}).onPostFling({x:0,y:c.velocity});motion.finish();assert.ok(motion.done);near(state.offset,c.finalOffset,'durationScale=0 offset');near(motion.returnedVelocity,c.returnedVelocity,'durationScale=0 velocity');near(state.contentOffset,c.contentOffset,'durationScale=0 content reset');}
const mutations=json('snap-mutation-oracle.json');for(const c of mutations){const state=new FloatingToolbarState({offsetLimit:c.limit,offset:c.offset,contentOffset:77}),motion=new FloatingToolbarScrollBehavior({state}).onPostFling({x:0,y:c.velocity});let mutated=false;
 for(const s of c.frames){if(s.phase==='snap'&&!mutated){state.offsetLimit=-160;state.offset=-120;mutated=true;}const actual=motion.sampleFrame(s.absoluteTime);assert.equal(actual.phase,s.phase);near(actual.value,s.value,'captured snap value');near(state.offset,s.offset,'captured snap offset');}
 assert.ok(motion.done);near(state.offset,c.finalOffset,'captured snap final');near(motion.returnedVelocity,c.returnedVelocity,'captured snap velocity');}
// Updating the limit alone does not call the source offset setter, and initial
// offsets are supplied directly. A later assignment clamps against the new limit.
const state=new FloatingToolbarState({offsetLimit:-80,offset:-100});assert.equal(state.offset,-100);state.offset=-100;assert.equal(state.offset,-80);
assert.match(read('FloatingToolbar.kt'),/abs\(delta - consumed\) > 0.5f/);
assert.match(read('ViewConfiguration.java'),/SCROLL_FRICTION = 0.015f/);
console.log(`Toolbar scroll source parity: ${spline.length} Android splines, ${expansion.length} expansion traces, ${exit.length} exit layouts, ${settle.length} settling traces (${frameCount} frames), ${reduced.length} reduced-motion traces and ${mutations.length} snap-state mutation traces passed.`);
