import assert from 'node:assert/strict';
import fs from 'node:fs';
import { springDuration } from '../../src/motion/spring-duration.js';
import { SpringValue, SelectionMotion, checkboxPath } from '../../src/motion/selection-motion.js';

const cases = JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/motion/spring-oracle.json', import.meta.url)));
for (const spec of cases) {
  assert.equal(springDuration(spec), spec.duration, `duration ${JSON.stringify(spec)}`);
  for (const expected of spec.samples) {
    const channel = new SpringValue(spec.from);
    channel.target = spec.to;
    channel.animation = { ...spec, dampingRatio: Math.fround(spec.dampingRatio), start: 0 };
    const actual = channel.sample(expected.time);
    for (const key of ['position', 'velocity']) assert.ok(
      Math.abs(actual[key] - expected[key]) < 2e-6 * Math.max(1, Math.abs(expected[key])),
      `${key} at ${expected.time}ms: ${actual[key]} != ${expected[key]}`);
  }
}
const spatial = { stiffness: 800, dampingRatio: .6 };
const interrupted = new SpringValue(0);
interrupted.to(6, spatial, { now: 0 });
const current = interrupted.sample(80);
interrupted.to(0, spatial, { now: 80 });
assert.equal(interrupted.animation.from, current.position);
assert.equal(interrupted.animation.velocity, current.velocity);
assert.deepEqual(interrupted.sample(80), current);
const delayed = new SpringValue(1);
delayed.to(0, spatial, { now: 0, snap: true, delay: 100 });
assert.equal(delayed.sample(99).position, 1);
assert.equal(delayed.sample(100).position, 0);
assert.equal(delayed.animation, null);
const interruptedSnap = new SpringValue(0);
interruptedSnap.to(1, spatial, { now: 0 });
const mid = interruptedSnap.sample(80);
interruptedSnap.to(0, spatial, { now: 80, snap: true, delay: 100, transition: true });
assert.equal(interruptedSnap.animation.snap, false);
assert.equal(interruptedSnap.animation.stiffness, 1500);
assert.equal(interruptedSnap.animation.dampingRatio, 1);
assert.equal(interruptedSnap.animation.velocity, mid.velocity);
const sameTarget = interruptedSnap.animation;
interruptedSnap.to(0, spatial, { now: 96, snap: true, transition: true });
assert.equal(interruptedSnap.animation, sameTarget);
const dragged=new SpringValue(0),dragSpec={stiffness:380,dampingRatio:.8};
dragged.to(0,dragSpec,{now:0,velocity:-900});
assert.equal(dragged.animation.from,0);assert.equal(dragged.animation.velocity,-900);
const dragOracle=cases.find(c=>c.from===0&&c.to===0&&c.velocity===-900&&c.stiffness===380&&c.dampingRatio===.8);
assert.equal(dragged.animation.duration,dragOracle.duration);
for(const expected of dragOracle.samples){const actual=dragged.sample(expected.time);
  for(const key of ['position','velocity'])assert.ok(Math.abs(actual[key]-expected[key])<2e-6*Math.max(1,Math.abs(expected[key])));}
assert.equal(checkboxPath(0, 0), '');
assert.equal(checkboxPath(1, 1), 'M 4.5 9 L 9 9 L 13.5 9');
assert.equal(checkboxPath(.5, 1), 'M 4.5 9 L 9 9');
assert.equal(checkboxPath(1.1, 0), checkboxPath(1, 0), 'overshoot must not repeat the path');
assert.equal(springDuration({from:0,to:1,dampingRatio:0}),9223372036854);
const jobs = new Map(); let nextJob = 0;
const previousRaf = Object.getOwnPropertyDescriptor(globalThis, 'requestAnimationFrame'), previousCancel = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame');
globalThis.requestAnimationFrame = callback => { const id = ++nextJob; jobs.set(id, callback); return id; };
globalThis.cancelAnimationFrame = id => jobs.delete(id);
let disposable;
disposable = new SelectionMotion(null, {scale: 0}, () => disposable?.dispose());
disposable.channels.scale.to(1, spatial, {now: 0}); disposable.tick(16);
assert.equal(jobs.size, 0, 'disposing during draw must not schedule another frame');
assert.equal(disposable.raf, null);
if (previousRaf) Object.defineProperty(globalThis, 'requestAnimationFrame', previousRaf); else delete globalThis.requestAnimationFrame;
if (previousCancel) Object.defineProperty(globalThis, 'cancelAnimationFrame', previousCancel); else delete globalThis.cancelAnimationFrame;
console.log(`Selection motion: ${cases.length} Kotlin spring duration/trajectory cases, retargeting, snap delay and path segmentation passed.`);
