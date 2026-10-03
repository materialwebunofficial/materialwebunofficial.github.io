/*
 * Copyright 2020-2024 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Web adaptation of FloatExponentialDecaySpec / FloatTweenSpec and
 * AnchoredDraggableState.animateToWithDecay at a095da93f8e98dea8748ceed79ea8427aade245f.
 */
import { SpringValue } from './selection-motion.js';

const f = Math.fround;
const friction = f(-4.2);
const threshold = f(.1);
const bits = new DataView(new ArrayBuffer(4));
function fastCbrt(value) {
  bits.setFloat32(0, value); const raw = bits.getUint32(0);
  const signedMask = raw + (raw >= 0x80000000 ? 0x100000000 : 0);
  bits.setUint32(0, (0x2a510554 + Math.trunc(signedMask / 3)) >>> 0);
  let estimate = bits.getFloat32(0);
  for (let i = 0; i < 2; i++) estimate = f(estimate - f(f(estimate - f(value / f(estimate * estimate))) * f(1 / 3)));
  return estimate;
}

// Specialization of CubicBezierEasing / findFirstCubicRoot for the source's
// FastOutSlowIn (0.4,0,0.2,1). Its cubic has one real root; retain Float rounding
// and fastCbrt, including the final Float u-v subtraction before Double a/3.
export function drawerEasing(fraction) {
  if (fraction <= 0 || fraction >= 1) return fraction;
  const progress = Math.max(f(fraction), f(1.1920929e-7));
  const p0 = f(-progress), p1 = f(f(.4) - progress), p2 = f(f(.2) - progress), p3 = f(1 - progress);
  const divisor = -p0 + 3 * f(p1 - p2) + p3;
  const a = 3 * (p0 - 2 * p1 + p2) / divisor;
  const b = 3 * f(p1 - p0) / divisor, c = p0 / divisor;
  const o3 = (3 * b - a * a) / 9, q2 = (2 * a * a * a - 9 * a * b + 27 * c) / 54;
  const root = Math.sqrt(q2 * q2 + o3 * o3 * o3);
  const t = f(f(fastCbrt(f(-q2 + root)) - fastCbrt(f(q2 + root))) - a / 3);
  const value = f(f(3 * f(f(f(f(f(f(1 / 3) - 1) * t) + 1) * t))) * t);
  return Math.max(0, Math.min(1, value));
}

export function drawerTarget(offset, width, velocity) {
  if (offset >= 0) return 0;
  if (offset <= -width) return -width;
  if (Math.abs(velocity) >= 400) return velocity > 0 ? 0 : -width;
  if (offset === -width * .5) return velocity > 0 ? 0 : -width;
  return offset > -width * .5 ? 0 : -width;
}

export function drawerDecayTarget(from, velocity) {
  from=f(from);velocity=f(velocity);
  if (Math.abs(velocity) <= threshold) return from;
  const duration = Math.log(Math.abs(f(threshold / velocity))) / friction * 1000;
  const ratio = f(velocity / friction);
  return f(f(from - ratio) + f(ratio * f(Math.exp(friction * duration / 1000))));
}

export function drawerDecaySample(from, velocity, elapsed) {
  from=f(from);velocity=f(velocity);
  const millis = Math.floor(Math.max(0, elapsed)), ratio = f(velocity / friction);
  const position = f(f(from - ratio) + f(ratio * f(Math.exp(f(f(friction * millis) / 1000)))));
  const speed = f(velocity * f(Math.exp(f(f(millis / 1000) * friction))));
  return { position, velocity: speed };
}

export function drawerTweenSample(from, to, velocity, elapsed) {
  from=f(from);to=f(to);velocity=f(velocity);
  const value = time => {
    const fraction = f(Math.max(0, Math.min(256, time)) / 256);
    const eased = drawerEasing(fraction);
    return f(f(f(1 - eased) * from) + f(eased * to));
  };
  const time = Math.max(0, Math.min(256, elapsed)), position = value(time);
  return { position, velocity: time === 0 ? velocity : f(f(position - value(time - 1)) * 1000) };
}

// Programmatic changes retain SpringValue's spatial/effects spring. A gesture
// uses the spec captured by DrawerState's constructor: TweenSpec(256), followed
// by exponential decay when its projected value can reach the target anchor.
export class DrawerOffset extends SpringValue {
  settle(target, velocity, now = performance.now()) {
    const from = f(this.sample(now).position);
    this.value = from; this.target = target; this.animation = null;
    if (from === target) { this.value = target; return; }
    velocity = f(velocity);
    const projected = drawerDecayTarget(from, velocity);
    const canDecay = velocity !== 0 && velocity * (target - from) >= 0 &&
      (velocity > 0 ? projected >= target : projected <= target);
    this.animation = { kind: canDecay ? 'decay' : 'tween', from, to: target, velocity,
      start: now, duration: canDecay ? Math.max(0, Math.trunc(f(f(1000 * f(Math.log(f(threshold / Math.abs(velocity))))) / friction))) : 256 };
  }

  sample(now) {
    const a = this.animation;
    if (!a?.kind) return super.sample(now);
    const elapsed = Math.max(0, now - a.start);
    const state = a.kind === 'decay' ? drawerDecaySample(a.from, a.velocity, elapsed) :
      drawerTweenSample(a.from, a.to, a.velocity, elapsed);
    const crossed = a.kind === 'decay' && (a.velocity > 0 ? state.position >= a.to : state.position <= a.to);
    if (crossed || elapsed >= a.duration) {
      this.value = this.target; this.animation = null;
      return { position: this.value, velocity: 0 };
    }
    return state;
  }
}
