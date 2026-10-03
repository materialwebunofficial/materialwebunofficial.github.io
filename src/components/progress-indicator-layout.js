/*
 * Copyright 2024 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy at https://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed
 * under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 *
 * Adapted from AndroidX ProgressIndicator.kt and LinearWavyProgressModifiers.kt,
 * revision a095da93f8e98dea8748ceed79ea8427aade245f. Canvas path measurement is
 * a browser adapter, not Android's Skia PathMeasure rasterization.
 */
import {cubicBezier} from '../motion/easing.js';

const f = Math.fround;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const phase = (ms, period) => ((Math.max(0, ms) % period) + period) % period;

/** Source keyframes, including their delays and the easing on each lower key. */
export function linearIndeterminateFractions(elapsed) {
  const t = Math.floor(phase(elapsed, 1750));
  const sample = (delay, duration) => f(cubicBezier(.3, 0, .8, .15, f(clamp((t - delay) / duration, 0, 1))));
  return [sample(250, 1000), sample(0, 1000), sample(900, 850), sample(650, 850)];
}

export function circularIndeterminateState(elapsed) {
  const elapsedCycle = phase(elapsed, 6000), t = Math.floor(elapsedCycle);
  // Keyframes without an explicit lower-key easing use LinearEasing. The source's
  // decelerate easing is attached to the subsequent hold, not the 300ms ramp.
  const step = Math.floor(t / 1500), ramp = Math.min(1, (t % 1500) / 300);
  const additional = f((step + ramp) * 90);
  const progress = t <= 3000 ? f(f(.1) + f(f(f(.87)-f(.1))*f(t/3000)))
    : f(f(.87) + f(f(f(.1)-f(.87))*f(cubicBezier(.2, 0, 0, 1, f((t-3000)/3000)))));
  return {progress, rotation: f(f(f(elapsedCycle/6000)*1080) + additional)};
}

export function standardLinearLayout({width, height, progress, fractions, gap = 4, stop = 4, cap = 'round'}) {
  progress=f(progress);
  const w = f(width), h = f(height), butt = cap === 'butt' || h > w;
  const gapFraction = f(f(butt ? gap : f(gap + h)) / w);
  const tracks = [], active = [];
  const line = (out, start, end) => {
    if (start === end) return;
    out.push([butt ? f(start * w) : clamp(f(start * w), h / 2, w - h / 2),
      butt ? f(end * w) : clamp(f(end * w), h / 2, w - h / 2)]);
  };
  if (fractions) {
    const [t1, h1, t2, h2] = fractions;
    if (h1 < f(1 - gapFraction)) line(tracks, h1 > 0 ? f(h1 + gapFraction) : 0, 1);
    if (h1 - t1 > 0) line(active, h1, t1);
    if (t1 > gapFraction) line(tracks, h2 > 0 ? f(h2 + gapFraction) : 0, t1 < 1 ? f(t1 - gapFraction) : 1);
    if (h2 - t2 > 0) line(active, h2, t2);
    if (t2 > gapFraction) line(tracks, 0, t2 < 1 ? f(t2 - gapFraction) : 1);
  } else {
    const start = f(progress + Math.min(progress, gapFraction));
    if (start <= 1) line(tracks, start, 1);
    line(active, 0, progress);
  }
  const size = Math.min(stop, h), offset = Math.min((h - size) / 2, 6);
  return {tracks, active, cap: butt ? 'butt' : cap,
    stop: fractions || size <= 0 ? null : {x: w - size / 2 - offset, y: h / 2, size}};
}

export function standardCircularLayout({size, stroke = 4, progress, rotation = 270, gap = 4, cap = 'round'}) {
  progress=f(progress);
  const sweep = f(progress * 360);
  const gapSweep = f(f(f((cap === 'butt' ? gap : f(gap + stroke)) / f(Math.PI * size)) * 360));
  const adaptive = Math.min(sweep, gapSweep);
  return {radius: f(f(size - stroke) / 2), start: rotation, sweep,
    trackStart: f(f(rotation + sweep) + adaptive), trackSweep: f(f(360 - sweep) - f(2 * adaptive))};
}

export function linearWavyLayout({width, height, stroke = 4, trackStroke = stroke, fractions, gap = 4, stop = 4, cap = 'round', trackCap = cap}) {
  const capWidth = (cap === 'butt' && trackCap === 'butt') || height > width ? 0 : Math.max(stroke / 2, trackStroke / 2);
  const clampX = x => clamp(x, capWidth, width - capWidth);
  const active = [], tracks = [];
  let nextEnd = width - capWidth, adaptiveGap = gap, visible = false;
  for (let i = 0; i < fractions.length; i += 2) {
    const tail = fractions[i] * width, head = fractions[i + 1] * width;
    if (i === 0) { adaptiveGap = head < capWidth ? 0 : Math.min(head - capWidth, gap); visible = head >= capWidth; }
    const start = clampX(tail), end = clampX(head);
    if (end > start) active.push([start, end]);
    const spacing = visible ? adaptiveGap + capWidth * 2 : adaptiveGap;
    if (nextEnd > end + spacing) tracks.push([nextEnd, Math.max(capWidth, end + spacing)]);
    if (head > tail) nextEnd = Math.max(capWidth, start - spacing);
  }
  if (nextEnd > capWidth) tracks.push([nextEnd, capWidth]);
  let size = Math.min(trackStroke, stop), x = width - size - (size === trackStroke ? 0 : trackStroke / 4);
  const progressX = width * fractions[1] + capWidth;
  if (x <= progressX) { size = Math.max(0, size - (progressX - x)); x = progressX; }
  return {active, tracks, capWidth, stop: fractions.length > 2 || size <= 0 ? null : {x: x + size / 2, y: height / 2, size}};
}

// The native linear path consists of quadratic half-waves. Every half-wave has
// equal length. Measure the original maximum-height path before scaling Y.
function halfWaveMeasure(dx, dy) {
  const b = 2 * Math.abs(dy);
  if (b === 0) return {length: dx, at: t => t * dx};
  const primitive = u => .5 * (u * Math.hypot(dx, b * u) + dx * dx / b * Math.asinh(b * u / dx));
  const total = primitive(1);
  return {length: total, at: t => (total - primitive(1 - 2 * t)) / 2};
}
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
function split(points, t) {
  const a = mix(points[0], points[1], t), b = mix(points[1], points[2], t), c = mix(a, b, t);
  return [[points[0], a, c], [c, b, points[2]]];
}

export function linearWaveSegments(start, end, {height, stroke = 4, wavelength, amplitude = 1, offset = 0}) {
  if (end <= start) return [];
  if (!amplitude) return [[[start, height / 2], [(start + end) / 2, height / 2], [end, height / 2]]];
  const dx = wavelength / 2, dy = height - stroke, measure = halfWaveMeasure(dx, dy), scale = measure.length / dx;
  const shift = offset * wavelength, from = (start + shift) * scale, to = (end + shift) * scale, result = [];
  const inverse = distance => {
    if (distance <= 0) return 0; if (distance >= measure.length) return 1;
    let lo = 0, hi = 1;
    for (let i = 0; i < 25; i++) { const t = (lo + hi) / 2; if (measure.at(t) < distance) lo = t; else hi = t; }
    return (lo + hi) / 2;
  };
  const first = Math.floor(from / measure.length), last = Math.ceil(to / measure.length);
  for (let i = first; i < last; i++) {
    const a = inverse(Math.max(0, from - i * measure.length)), b = inverse(Math.min(measure.length, to - i * measure.length));
    if (b <= a) continue;
    let points = [[i * dx, 0], [(i + .5) * dx, (i % 2 ? -1 : 1) * dy], [(i + 1) * dx, 0]];
    if (b < 1) points = split(points, b)[0];
    if (a > 0) points = split(points, a / b)[1];
    result.push(points.map(([x, y]) => [x - shift, height / 2 + y * amplitude]));
  }
  return result;
}
