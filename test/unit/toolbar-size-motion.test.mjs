import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { SpringValue } from '../../src/motion/selection-motion.js';
import { retargetIntSize, toolbarGroupComposed } from '../../src/motion/size-motion.js';
import { toolbarRowLayout } from '../../src/components/toolbar-layout.js';

const fixture = new URL('../fixtures/androidx/toolbar-size-motion/', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('sources.json', fixture)));
for (const source of manifest.sources) {
  assert.equal(createHash('sha256').update(fs.readFileSync(new URL(source.file, fixture))).digest('hex'), source.sha256, source.file);
}
const oracle = JSON.parse(gunzipSync(fs.readFileSync(new URL('size-oracle.json.gz', fixture))));
let frames = 0;
for (const c of oracle.vectors) {
  const channels = c.from.map(value => new SpringValue(value));
  // The original vector's explicit initial velocity is a host input.
  channels.forEach((channel, i) => { channel.sample = now => ({ position: c.from[i], velocity: c.velocity[i] }); });
  retargetIntSize(channels, c.to, c, 0);
  channels.forEach(channel => { delete channel.sample; });
  assert.equal(channels[0].animation.duration, c.firstDuration);
  assert.equal(channels[1].animation.duration, c.firstDuration);
  if (c.interrupt) retargetIntSize(channels, c.target, c, c.interrupt);
  assert.equal(channels[0].animation?.duration ?? 0, c.duration);
  for (const sample of c.samples) {
    const actual = channels.map(channel => channel.sample(c.interrupt + sample.ms));
    assert.deepEqual(actual.map(s => Math.max(0, Math.round(s.position))), sample.size, JSON.stringify(c));
    actual.forEach((s, i) => assert.ok(Math.abs(s.velocity - sample.velocity[i]) < .002, `velocity${i} at${sample.ms}: ${s.velocity} vs${sample.velocity[i]}`));
    assert.equal(channels.every(channel => !channel.animation), sample.finished);
    frames++;
  }
}
// Normal toolbar calls do not seek, force visibility or supply pending/initial
// handoffs. The original complete gate table retains those independent inputs.
let gates = 0;
for (const c of oracle.composition) {
  if (c.pending !== null || c.seeking || c.initial || c.force) continue;
  if (c.current !== (c.childCurrent === 'Visible')) continue;
  if (c.childTarget !== (c.target ? 'Visible' : c.childCurrent === 'PreEnter' ? 'PreEnter' : 'PostExit')) continue;
  const finished = c.childCurrent === c.childTarget;
  assert.equal(toolbarGroupComposed(c.target, c.childCurrent, !finished && c.current), c.composed, JSON.stringify(c));
  gates++;
}
console.log(`Toolbar IntSize source parity: ${oracle.vectors.length} original vector/TargetBasedAnimation/Transition trajectories (${frames} frames), ${oracle.composition.length} original composition gates and ${gates} ordinary host states passed.`);

const layoutCases = JSON.parse(gunzipSync(fs.readFileSync(new URL('layout-oracle.json.gz', fixture))));
const find = (node, id) => node.id === id ? node : node.children.map(p => find(p.node, id)).find(Boolean);
for (const c of layoutCases) {
  const i = c.input, native = body => ({ main: Math.max(48, body), cross: Math.max(48, body), ink: { width: body, height: body } });
  const layout = toolbarRowLayout({ ...i, main: [native(40)], leading: [native(i.body)], trailing: i.presence === 3 ? [native(56)] : [],
    padding: Number(!i.expanded), hasVisibleLeading: i.expanded, hasVisibleTrailing: i.presence === 3 && i.expanded,
    leadingSample: i.sample, trailingSample: i.sample, leadingCross: i.cross, trailingCross: i.cross,
    leadingCurrent: i.leadCurrent, trailingCurrent: i.trailCurrent, leadingSettled: i.settled, trailingSettled: i.settled,
    leadingComposed: i.composed, trailingComposed: i.composed });
  assert.deepEqual(layout.size, c.size, JSON.stringify(i));
  for (const [id, box] of Object.entries(c.placements)) {
    const match = id.match(/^(leading|main|trailing)-row-(\d+)(-body|-touch)?$/);
    const mapped = match ? match[1] + match[2] + (match[3] === '-body' ? '-body' : '') : id;
    let actual = layout.placements[mapped];
    if (match && !match[3]) { const node = find(layout.node, mapped); actual = { ...actual, x: actual.x - node.offset.x, y: actual.y - node.offset.y, ...node.size }; }
    assert.deepEqual(actual, box, id + ' ' + JSON.stringify(i));
  }
  if (!i.composed) assert.equal(layout.placements.leading, undefined);
}
console.log(`Toolbar composition/source geometry: ${layoutCases.length} native initial/Visible/exiting/disposed/re-entering modifier trees passed.`);
