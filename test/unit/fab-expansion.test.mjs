import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {FabExpansion, fabWidth} from '../../src/motion/fab-expansion.js';
import {SpringPhysics} from '../../src/motion/spring-physics.js';
const fixture = new URL('../fixtures/androidx/fab/', import.meta.url);
for (const entry of JSON.parse(fs.readFileSync(new URL('sources.json', fixture))).sources) {
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(entry.file, fixture))).digest('hex'), entry.sha256);
}
const cases = JSON.parse(fs.readFileSync(new URL('expansion-oracle.json', fixture)), (key, value) => typeof value === 'number' ? Math.fround(value) : value);
let count = 0;
for (const c of cases) {
  SpringPhysics.setScheme(c.scheme);
  const motion = new FabExpansion(c.initial, {baseline: c.baseline, labelWidth: c.labelWidth});
  let nextEvent = 0, expanded = c.initial;
  for (const [time, width, alpha, pixels, composed, running] of c.frames) {
    motion.sample(time);
    if (nextEvent < c.events.length && c.events[nextEvent][0] === time) {
      expanded = c.events[nextEvent++][1]; motion.set(expanded, c.labelWidth, time);
    }
    const actual = motion.sample(time), context = `${c.scheme}/${c.baseline}/${c.labelWidth}/${JSON.stringify(c.events)}/${time}`;
    if (c.baseline) assert.equal(actual.width, width, context + ' native converted IntSize');
    else assert.ok(Math.abs(actual.width - width) < 2e-6, context + ' native Float width');
    assert.ok(Math.abs(actual.alpha - Math.max(0, Math.min(1, alpha))) < 2e-6, context + ' native Float alpha');
    const rendered = c.baseline
      ? Math.max(expanded ? 80 : 56, (expanded ? 60 : 24) + actual.width)
      : Math.max(0, fabWidth(c.minimum, c.minimum + c.labelWidth, actual.width));
    assert.equal(rendered, pixels, context + ' native integer layout');
    assert.equal(actual.composed, composed, context + ' retained label');
    assert.equal(actual.running, running, context + ' native completion');
    count++;
  }
}
SpringPhysics.setScheme('expressive');
console.log(`FAB expansion: ${cases.length} native histories / ${count} frames, integer layout, interruptions and label retention passed.`);
