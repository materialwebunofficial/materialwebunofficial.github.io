/*
 * Copyright 2020 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// Port of SpringEstimation.kt at AndroidX a095da93f8e98dea8748ceed79ea8427aade245f.
// Float normalization follows FloatSpringSpec.getDurationNanos. This helper is
// used by selection motion; legacy CSS/WAAPI duration generation is separate.
export function springDuration({ from, to, velocity = 0, stiffness = 380,
  dampingRatio = .8, visibilityThreshold = .01 }) {
  const f = Math.fround;
  const displacement = f(f(f(from) - f(to)) / f(visibilityThreshold));
  const initialVelocity = f(f(velocity) / f(visibilityThreshold));
  const damping = f(dampingRatio), k = f(stiffness);
  if (damping === 0) return 9223372036854;
  if (displacement === 0 && initialVelocity === 0) return 0;
  const b = 2 * damping * Math.sqrt(k);
  const partial = b * b - 4 * k;
  const real = partial < 0 ? 0 : Math.sqrt(partial);
  const imaginary = partial < 0 ? Math.sqrt(Math.abs(partial)) : 0;
  const r1 = (-b + real) * .5, r2 = (-b - real) * .5;
  const p = Math.abs(displacement), v = displacement < 0 ? -initialVelocity : initialVelocity;
  let seconds;
  if (damping < 1) {
    const c2 = (v - r1 * p) / (imaginary * .5);
    seconds = Math.log(1 / Math.sqrt(p * p + c2 * c2)) / r1;
  } else if (damping === 1) {
    const c1 = p, c2 = v - r1 * p;
    const t1 = Math.log(Math.abs(1 / c1)) / r1;
    const guess = Math.log(Math.abs(1 / c2));
    let t = guess;
    for (let i = 0; i < 6; i++) t = guess - Math.log(Math.abs(t / r1));
    let current = finiteMax(t1, t / r1);
    const inflection = -(r1 * c1 + c2) / (r1 * c2);
    const x = c1 * Math.exp(r1 * inflection) + c2 * inflection * Math.exp(r1 * inflection);
    let delta = -1;
    if (!(Number.isNaN(inflection) || inflection <= 0)) {
      if (inflection > 0 && -x < 1) {
        if (c2 < 0 && c1 > 0) current = 0;
      } else { current = -2 / r1 - c1 / c2; delta = 1; }
    }
    seconds = newton(current,
      t => (c1 + c2 * t) * Math.exp(r1 * t) + delta,
      t => (c2 * (r1 * t + 1) + c1 * r1) * Math.exp(r1 * t));
  } else {
    const c2 = (r1 * p - v) / (r1 - r2), c1 = p - c2;
    let current = finiteMax(Math.log(Math.abs(1 / c1)) / r1, Math.log(Math.abs(1 / c2)) / r2);
    const inflection = Math.log((c1 * r1) / (-c2 * r2)) / (r2 - r1);
    const x = c1 * Math.exp(r1 * inflection) + c2 * Math.exp(r2 * inflection);
    let delta = -1;
    if (!(Number.isNaN(inflection) || inflection <= 0)) {
      if (inflection > 0 && -x < 1) {
        if (c2 > 0 && c1 < 0) current = 0;
      } else { current = Math.log(-(c2 * r2 * r2) / (c1 * r1 * r1)) / (r1 - r2); delta = 1; }
    }
    const derivative = t => c1 * r1 * Math.exp(r1 * t) + c2 * r2 * Math.exp(r2 * t);
    seconds = Math.abs(derivative(current)) < .0001 ? current : newton(current,
      t => c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t) + delta, derivative);
  }
  // VectorizedSpringSpec clamps a negative component duration to zero.
  return Number.isNaN(seconds) ? 0 : Math.max(0, Math.trunc(seconds * 1000));
}

function finiteMax(a, b) { return !Number.isFinite(a) ? b : !Number.isFinite(b) ? a : Math.max(a, b); }
function newton(current, value, derivative) {
  let difference = Infinity;
  for (let i = 0; difference > .001 && i < 100; i++) {
    const previous = current;
    current -= value(current) / derivative(current);
    difference = Math.abs(previous - current);
  }
  return current;
}
