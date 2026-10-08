/*
 * Copyright 2021 The Android Open Source Project. Apache-2.0.
 * FloatTweenSpec / internal Elevation / Material3 Ripple state-layer adaptation.
 * Pinned sources and independently executed cases: test/fixtures/androidx/ripple.
 */
import {drawerEasing, fastCbrt} from './drawer-motion.js';

const f = Math.fround;

// Specialization of the native cubic root/evaluation for (.4,0,.6,1).
// Like FastOutSlowIn, this curve has one real root. Preserve Float boundaries.
export function outgoingElevationEasing(fraction) {
  if (fraction <= 0 || fraction >= 1) return fraction;
  const progress = Math.max(f(fraction), f(1.1920929e-7));
  const p0 = f(-progress), p1 = f(f(.4) - progress);
  const p2 = f(f(.6) - progress), p3 = f(1 - progress);
  const divisor = -p0 + 3 * f(p1 - p2) + p3;
  const a = 3 * (p0 - 2 * p1 + p2) / divisor;
  const b = 3 * f(p1 - p0) / divisor, c = p0 / divisor;
  const o3 = (3 * b - a * a) / 9;
  const q2 = (2 * a * a * a - 9 * a * b + 27 * c) / 54;
  const root = Math.sqrt(q2 * q2 + o3 * o3 * o3);
  const t = f(f(fastCbrt(f(-q2 + root)) - fastCbrt(f(q2 + root))) - a / 3);
  const value = f(f(3 * f(f(f(f(f(f(1 / 3) - 1) * t) + 1) * t))) * t);
  return Math.max(0, Math.min(1, value));
}

export function elevationSpec(from, to) {
  const known = kind => ['hover', 'focus', 'press', 'drag'].includes(kind);
  if (to !== null) return {duration: known(to) ? 120 : 0, easing: 'incoming'};
  return {duration: known(from) ? from === 'hover' ? 120 : 150 : 0, easing: 'outgoing'};
}

export function stateLayerSpec(from, to) {
  return {duration: to === 'focus' || to === 'drag' ? 45 : to === null && from === 'drag' ? 150 : 15, easing: 'linear'};
}

export function interactionTween(from, to, elapsed, spec) {
  from = f(from); to = f(to);
  const time = Math.max(0, Math.trunc(elapsed));
  if (!spec.duration) return to;
  const fraction = f(Math.min(time, spec.duration) / spec.duration);
  const factor = spec.easing === 'incoming' ? drawerEasing(fraction)
    : spec.easing === 'outgoing' ? outgoingElevationEasing(fraction) : fraction;
  return f(f(f(1 - factor) * from) + f(to * factor));
}

// InteractionSource has independent objects. Browser enter/focus/bindPress
// each have one active interaction; repeated activation retains its order.
export class InteractionOrder {
  constructor() { this.active = []; this.identities = []; }
  set(kind, active, identity = kind) {
    const index = this.identities.indexOf(identity);
    if (active && index < 0) { this.active.push(kind); this.identities.push(identity); }
    else if (!active && index >= 0) { this.active.splice(index, 1); this.identities.splice(index, 1); }
    else return false;
    return true;
  }
  latest(includePress = true) {
    return this.active.filter(kind => includePress || kind !== 'press').at(-1) ?? null;
  }
  clear() { this.active.length = 0; this.identities.length = 0; }
}
