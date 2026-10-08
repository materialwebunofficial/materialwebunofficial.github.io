/*
 * Copyright 2019-2025 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0.
 * AndroidX a095da93: LegacyOneRowSnackbar and alignmentLineOffsetMeasure.
 * Text shaping and the measured content's alignment lines are host inputs.
 */
import {layoutPlaceable, measureRowColumn} from './row-column-layout.js';

const INF = 2147483647, UNSPECIFIED = -2147483648;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const div = value => Math.trunc(value / 2) || 0;
const bounds = c => ({minWidth: 0, maxWidth: INF, minHeight: 0, maxHeight: INF, ...c});
const relative = (x, node, width, rtl) => rtl && width !== 0 ? width - node.size.width - x : x;
function placements(node, x = 0, y = 0, out = {}) {
  x = (x + node.offset.x) | 0; y = (y + node.offset.y) | 0;
  out[node.id] = {x, y, ...node.requested};
  for (const child of node.children) placements(child.node, (x + child.x) | 0, (y + child.y) | 0, out);
  return out;
}
function leaf(id, input, c) {
  const requested = input.required ? {width: input.width, height: input.height} : {width: clamp(input.width, c.minWidth, c.maxWidth), height: clamp(input.height, c.minHeight, c.maxHeight)};
  return layoutPlaceable(id, requested, c, [], {first: input.first ?? UNSPECIFIED, last: input.last ?? UNSPECIFIED});
}

/** The complete legacy one-row measure policy, before its outer padding. */
export function legacySnackbarRow({constraints, text, action = null, dismiss = null, rtl = false}) {
  const c = bounds(constraints), width = Math.min(c.maxWidth, 600);
  const a = action ? leaf('action', action, c) : null, d = dismiss ? leaf('dismiss', dismiss, c) : null;
  const aw = a?.size.width ?? 0, ah = a?.size.height ?? 0, dw = d?.size.width ?? 0, dh = d?.size.height ?? 0;
  const textConstraints = {...c, minHeight: 0, maxWidth: Math.max(c.minWidth, width - aw - dw - (dw === 0 ? 8 : 0))};
  const t = leaf('text', text, textConstraints), first = t.first, last = t.last;
  const oneLine = first === last || first === UNSPECIFIED || last === UNSPECIFIED;
  let height, ty, ay;
  if (oneLine) {
    height = Math.max(48, ah, dh); ty = div(height - t.size.height);
    ay = a && a.first !== UNSPECIFIED ? (ty + first - a.first) | 0 : 0;
  } else {
    ty = 30 - first; height = Math.max(68, ty + t.size.height);
    ay = a ? div(height - a.size.height) : 0;
  }
  const children = [{node: t, x: relative(0, t, width, rtl), y: ty}];
  if (a) children.push({node: a, x: relative(width - dw - aw, a, width, rtl), y: ay});
  if (d) children.push({node: d, x: relative(width - dw, d, width, rtl), y: div(height - d.size.height)});
  const root = layoutPlaceable('row', {width, height}, c, children);
  return {node: root, size: root.size, requested: root.requested, placements: placements(root), textConstraints, oneLine};
}

/** Original horizontal alignment-line offset modifier, with explicit leaf lines. */
export function snackbarBaselinePadding({constraints, content, line = 'first', before = null, after = null, rtl = false}) {
  const c = bounds(constraints), child = leaf('content', content, {...c, minHeight: 0});
  const position = child[line] === UNSPECIFIED ? 0 : child[line], height = child.size.height;
  const top = clamp((before ?? 0) - position, 0, c.maxHeight - height);
  const bottom = clamp((after ?? 0) - height + position, 0, c.maxHeight - height - top);
  const requested = {width: child.size.width, height: Math.max(top + height + bottom, c.minHeight)};
  const y = before !== null ? top : requested.height - bottom - height;
  const root = layoutPlaceable('padding', requested, c, [{node: child, x: relative(0, child, requested.width, rtl), y}]);
  return {size: root.size, requested, placements: placements(root)};
}

// Default separate-line modifier tree. These coordinates use measured Text /
// action boxes; font shaping and arbitrary Compose children are host boundaries.
export function legacySnackbarNewLine({constraints, text, action, dismiss = null, rtl = false}) {
  const c = bounds(constraints);
  const lineLeaf = (id, input, incoming) => {
    const node = leaf(id, input, incoming);
    for (const name of ['first', 'last']) node[name] = node[name] === UNSPECIFIED ? UNSPECIFIED : (node[name] + node.offset.y) | 0;
    return node;
  };
  const wrap = (id, requested, incoming, child, x, y) => {
    const node = layoutPlaceable(id, requested, incoming, [{node: child, x, y}]);
    for (const name of ['first', 'last']) node[name] = child[name] === UNSPECIFIED || child[name] === undefined ? UNSPECIFIED : (child[name] + y + child.offset.y + node.offset.y) | 0;
    return node;
  };
  const padding = (id, incoming, start, end, bottom, measure) => {
    const dx = start + end, dy = bottom;
    const inner = {minWidth: Math.max(0, incoming.minWidth - dx), maxWidth: incoming.maxWidth === INF ? INF : Math.max(0, incoming.maxWidth - dx), minHeight: Math.max(0, incoming.minHeight - dy), maxHeight: incoming.maxHeight === INF ? INF : Math.max(0, incoming.maxHeight - dy)};
    const child = measure(inner);
    return wrap(id, {width: clamp(child.size.width + dx, incoming.minWidth, incoming.maxWidth), height: clamp(child.size.height + dy, incoming.minHeight, incoming.maxHeight)}, incoming, child, rtl ? end : start, 0);
  };
  const baseline = (id, incoming, first, measure) => {
    const child = measure({...incoming, minHeight: 0}), line = child[first ? 'first' : 'last'];
    const position = line === UNSPECIFIED ? 0 : line;
    const top = clamp((first ? 30 : 0) - position, 0, incoming.maxHeight - child.size.height);
    const bottom = clamp((first ? 0 : 12) - child.size.height + position, 0, incoming.maxHeight - child.size.height - top);
    const requested = {width: child.size.width, height: Math.max(top + child.size.height + bottom, incoming.minHeight)};
    return wrap(id, requested, incoming, child, relative(0, child, requested.width, rtl), first ? top : requested.height - bottom - child.size.height);
  };
  const limited = {...c, minWidth: clamp(0, c.minWidth, c.maxWidth), maxWidth: clamp(600, c.minWidth, c.maxWidth)};
  const filled = limited.maxWidth === INF ? limited : {...limited, minWidth: limited.maxWidth};
  const content = padding('outer-padding', filled, 16, 0, 2, inner => measureRowColumn({id: 'column', vertical: true, rtl, minMain: inner.minHeight, maxMain: inner.maxHeight, minCross: inner.minWidth, maxCross: inner.maxWidth, crossAlignment: 'start', children: [{id: 'text'}, {id: 'controls', align: 'end'}]}, (input, childConstraints) => {
    if (input.id === 'text') return baseline('first-padding', childConstraints, true, afterFirst => baseline('last-padding', afterFirst, false, afterLast => padding('text-end', afterLast, 0, 8, 0, inside => lineLeaf('text', text, inside))));
    return padding('action-end', childConstraints, 0, dismiss === null ? 8 : 0, 0, inside => measureRowColumn({id: 'action-row', rtl, minMain: inside.minWidth, maxMain: inside.maxWidth, minCross: inside.minHeight, maxCross: inside.maxHeight, crossAlignment: 'start', children: [...(action ? [{id: 'action', input: action}] : []), ...(dismiss ? [{id: 'dismiss', input: dismiss}] : [])]}, (control, b) => leaf(control.id, control.input, b)));
  }));
  const fill = layoutPlaceable('fill', content.size, limited, [{node: content, x: 0, y: 0}]);
  const root = layoutPlaceable('snackbar', fill.size, c, [{node: fill, x: 0, y: 0}]);
  return {node: root, size: root.size, requested: root.requested, placements: placements(root)};
}

/** Default SnackbarData's padding(12.dp), outside the visual Surface. */
export function snackbarPresenterLayout({constraints, text, action = null, dismiss = null, newLine = false, rtl = false}) {
  const c = bounds(constraints);
  const pad = (id, incoming, start, end, top, bottom, measure) => {
    const dx = start + end, dy = top + bottom;
    const inner = {minWidth: Math.max(0, incoming.minWidth - dx), maxWidth: incoming.maxWidth === INF ? INF : Math.max(0, incoming.maxWidth - dx), minHeight: Math.max(0, incoming.minHeight - dy), maxHeight: incoming.maxHeight === INF ? INF : Math.max(0, incoming.maxHeight - dy)};
    const child = measure(inner), requested = {width: clamp(child.size.width + dx, incoming.minWidth, incoming.maxWidth), height: clamp(child.size.height + dy, incoming.minHeight, incoming.maxHeight)};
    return layoutPlaceable(id, requested, incoming, [{node: child, x: rtl ? end : start, y: top}]);
  };
  const root = pad('presentation', c, 12, 12, 12, 12, incoming => newLine && action !== null ?
    legacySnackbarNewLine({constraints: incoming, text, action, dismiss, rtl}).node :
    pad('snackbar', incoming, 16, dismiss === null ? 8 : 0, 0, 0, inner => legacySnackbarRow({constraints: inner, text, action, dismiss, rtl}).node));
  return {node: root, size: root.size, requested: root.requested, placements: placements(root)};
}
