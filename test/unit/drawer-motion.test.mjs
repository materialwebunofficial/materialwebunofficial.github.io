import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { DrawerOffset, drawerTarget, drawerDecaySample, drawerDecayTarget, drawerTweenSample } from '../../src/motion/drawer-motion.js';
import { leastSquaresVelocity, PointerVelocityTracker } from '../../src/motion/velocity-tracker.js';
import { HorizontalTouchSlop, pointerSlop } from '../../src/motion/touch-slop.js';
const root = new URL('../fixtures/androidx/navigation-drawer/', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('sources.json', root)));
for (const [name, entry] of Object.entries(manifest.files)) {
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(name, root))).digest('hex'), entry.sha256, name);
}
const cases = JSON.parse(fs.readFileSync(new URL('settle-oracle.json', root)));
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) <= Math.max(.00001, Math.abs(expected) * 2e-6), `${label}: ${actual} != ${expected}`);
for (const c of cases) {
  near(drawerDecayTarget(c.from, c.velocity), c.projected, 'projected decay target');
  const channel = new DrawerOffset(c.from);
  channel.settle(c.to, c.velocity, 0);
  assert.equal(channel.animation.kind, c.kind);
  assert.equal(channel.animation.duration, c.duration);
  for (const s of c.samples) {
    const state = c.kind === 'decay' ? drawerDecaySample(c.from, c.velocity, s.time) : drawerTweenSample(c.from, c.to, c.velocity, s.time);
    near(state.position, s.position, `${c.kind} ${s.time} position`);
    near(state.velocity, s.velocity, `${c.kind} ${s.time} velocity`);
    const actual = channel.sample(s.time);
    const crossed = c.kind === 'decay' && (c.velocity > 0 ? s.position >= c.to : s.position <= c.to);
    near(actual.position, crossed || s.time >= c.duration ? c.to : s.position, 'bounded settlement');
  }
  channel.finish();
  assert.deepEqual(channel.sample(5000), {position: c.to, velocity: 0});
}
for (const [offset, velocity, target] of [[-180,0,-360],[-180,1,0],[-180,-1,-360],[-290,399,-360],[-290,400,0],[-70,-399,0],[-70,-400,-360],[0,-900,0],[-360,900,-360]]) {
  assert.equal(drawerTarget(offset,360,velocity),target);
}
const channel = new DrawerOffset(-160);
channel.settle(0,6250,0);
const prior = channel.sample(16);
channel.to(-360,{stiffness:3800,dampingRatio:1},{now:16});
assert.deepEqual(channel.sample(16), prior, 'programmatic spring retarget retains decay position and velocity');
console.log(`Drawer motion: ${cases.length} independent Kotlin tween/decay trajectories, thresholds and interruptions passed.`);
const velocityCases=JSON.parse(fs.readFileSync(new URL('velocity-oracle.json',root))).filter(c=>c.minimumSampleFix);
for(const c of velocityCases)near(leastSquaresVelocity(c.samples),c.velocity,'Kotlin Lsq2 velocity');
assert.match(fs.readFileSync(new URL('ComposeUiFlags.kt',root),'utf8'),/isVelocityTrackerMinSampleSizeFixEnabled: Boolean = true/);
assert.match(fs.readFileSync(new URL('AndroidComposeUiFlags.android.kt',root),'utf8'),/isFrameworkVelocityTrackerEnabled: Boolean = false/);
const tracker=new PointerVelocityTracker();tracker.down(0,400);tracker.move(32,600);
const twoPoint=velocityCases.find(c=>c.samples.length===2&&c.samples[1].position===600);
near(tracker.up(72),twoPoint.velocity,'UP excludes its position and permits40ms pause');
assert.equal(tracker.up(73),0,'41ms stationary pause resets tracker');
tracker.down(80,0);tracker.move(96,10);tracker.move(112,40);
assert.equal(tracker.samples.length,3);assert.ok(tracker.up(112)>2000,'quadratic acceleration changes final velocity');
console.log(`Pointer velocity: ${velocityCases.length} independent Kotlin Lsq2 histories, source flags and UP pause/reset passed.`);
const slopCases=JSON.parse(fs.readFileSync(new URL('slop-oracle.json',root)));
for(const c of slopCases){
  near(pointerSlop(c.pointerType,c.touchSlop),c.slop,'source mouse/touch slop');
  const detector=new HorizontalTouchSlop(pointerSlop(c.pointerType,c.touchSlop));
  for(const s of c.samples){const actual=detector.add(s.delta);
    if(s.postSlop===null)assert.equal(actual,null);else near(actual,s.postSlop,'Float accumulated post-slop offset');}
}
assert.match(fs.readFileSync(new URL('ComposeFoundationFlags.kt',root),'utf8'),/isDraggableVelocityTrackerFixEnabled: Boolean = true/);
assert.match(fs.readFileSync(new URL('ComposeFoundationFlags.kt',root),'utf8'),/isDraggableInitialPassConsumptionFixEnabled: Boolean = true/);
console.log(`Touch slop: ${slopCases.length} independent Kotlin mouse/touch/stylus threshold and post-slop cases passed.`);
