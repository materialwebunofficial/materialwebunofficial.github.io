import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { toolbarRowLayout, toolbarFabConstraints } from '../../src/components/toolbar-layout.js';
import { normalizeToolbarPadding, serializeToolbarPadding, resolveToolbarPadding } from '../../src/components/toolbar-padding.js';

const root = new URL('../fixtures/androidx/toolbar-padding/', import.meta.url), read = name => fs.readFileSync(new URL(name, root));
for (const e of JSON.parse(read('sources.json')).sources) assert.equal(createHash('sha256').update(read(e.file)).digest('hex'), e.sha256, e.file);
const oracle = name => JSON.parse(gunzipSync(read(name + '-oracle.json.gz')));
const values = oracle('values'), rows = oracle('row'), fabs = oracle('fab');
for (const c of values) {
  if (c.error) assert.throws(() => resolveToolbarPadding(c.input.contentPadding, c.input.rtl), RangeError);
  else assert.deepEqual(resolveToolbarPadding(c.input.contentPadding, c.input.rtl), c.resolved, JSON.stringify(c.input));
}
for (const value of [8, 0, '5 17 11 3', 'absolute 5px 17px 11px 3px', { start: 2.5, top: .5, end: 10.49 }, { left: 2.5, top: .5, right: 10.49 }]) {
  const serialized = serializeToolbarPadding(value);
  assert.deepEqual(normalizeToolbarPadding(serialized), normalizeToolbarPadding(value));
}
assert.throws(() => normalizeToolbarPadding({ start: 1, left: 2 }), TypeError);
for (const value of ['', '1 2 3 4 5', 'var(--padding)', '10%', '-1']) assert.throws(() => normalizeToolbarPadding(value), RangeError);

const find = (node, id) => node.id === id ? node : node.children.map(p => find(p.node, id)).find(Boolean);
for (const c of rows) {
  const i = c.input, convert = p => ({ main: i.vertical ? Math.max(p.native ? 48 : 0, p.height) : Math.max(p.native ? 48 : 0, p.width), cross: i.vertical ? Math.max(p.native ? 48 : 0, p.width) : Math.max(p.native ? 48 : 0, p.height), ink: p.native ? { width: p.width, height: p.height } : null, weight: p.weight, fill: p.fill, align: p.align === 'default' ? null : p.align, line: p.line ?? null });
  const main = i.main.map(convert), leading = i.presence & 1 ? i.leading.map(convert) : [], trailing = i.presence & 2 ? i.trailing.map(convert) : [];
  const layout = toolbarRowLayout({ ...i, sample: i.sample < 0 ? undefined : i.sample, main, leading, trailing,
    hasVisibleLeading: !!(i.presence & 1) && i.expanded, hasVisibleTrailing: !!(i.presence & 2) && i.expanded,
    leadingComposed: i.composed, trailingComposed: i.composed, leadingSettled: i.settled, trailingSettled: i.settled, leadingCurrent: i.leadCurrent, trailingCurrent: i.trailCurrent,
    leadingSample: i.sample < 0 ? undefined : i.sample, trailingSample: i.sample < 0 ? undefined : i.sample, leadingCross: i.sample < 0 ? undefined : i.cross, trailingCross: i.sample < 0 ? undefined : i.cross });
  assert.deepEqual(layout.size, c.size, JSON.stringify(i)); assert.deepEqual(layout.lines, c.lines, JSON.stringify(i));
  for (const [id, box] of Object.entries(c.placements)) {
    const m = id.match(/^(leading|main|trailing)-row-(\d+)(-body|-touch)?$/), mapped = m ? m[1] + m[2] + (m[3] === '-body' ? '-body' : '') : id;
    let actual = layout.placements[mapped];
    if (m && !m[3] && i[m[1]][+m[2]].native) { const node = find(layout.node, mapped); actual = { ...actual, x: actual.x - node.offset.x, y: actual.y - node.offset.y, ...node.size }; }
    assert.deepEqual(actual, box, id + ' ' + JSON.stringify(i));
  }
}
let invalid = 0;
for (const c of fabs) {
  if (c.error) { assert.throws(() => toolbarFabConstraints(c.input), RangeError); invalid++; continue; }
  const layout = toolbarFabConstraints(c.input), p = resolveToolbarPadding(c.input.contentPadding, c.input.rtl);
  assert.equal(c.intrinsic, c.input.contentAxis + (c.input.vertical ? p.vertical : p.horizontal));
  for (const name of ['size', 'requested', 'placements', 'scroll']) assert.deepEqual(layout[name], c[name], name + ' ' + JSON.stringify(c.input));
}
console.log(`Toolbar content padding: ${values.length} original logical/absolute validation/Float-rounding cases, ${rows.length} native no-FAB trees, ${fabs.length - invalid} original intrinsic/padding/scroll/FAB trees and ${invalid} source-invalid constraints passed.`);
