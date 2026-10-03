/*
 * Copyright 2022 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0.
 * Adapted from Slider.kt at a095da93f8e98dea8748ceed79ea8427aade245f.
 * Density-1 browser adapter; drawing and integer thumb placement are separate.
 */
import { roundedOutlineRadii } from '../shapes/corner-shape.js';

const f = Math.fround;
const lerp = (a, b, t) => f(f(f(1 - t) * a) + f(t * b));
const scale = (a, b, value, min, max) => lerp(f(min), f(max), sliderValueFraction(value, a, b));
export const SLIDER_METRICS = Object.freeze({ track: 16, handle: 4, handleLength: 44, gap: 6, insideCorner: 2, stop: 4 });

export function sliderValueFraction(value, min, max) {
  const span = f(f(max) - f(min));
  return span === 0 ? 0 : f(Math.max(0, Math.min(1, f(f(f(value) - f(min)) / span))));
}

export function sliderTickFractions(steps) {
  return steps > 0 ? Array.from({ length: steps + 2 }, (_, i) => f(i / (steps + 1))) : [];
}

export function snapSliderValue(value, min, max, steps = 0) {
  const current = f(Math.max(min, Math.min(max, value)));
  if (!steps || max <= min) return current;
  // minByOrNull retains the first anchor on a tie, unlike Math.round.
  const fraction = f(f(current - min) / f(max - min));
  const lower = Math.max(0, Math.min(steps + 1, Math.floor(fraction * (steps + 1))));
  const a = lerp(f(min), f(max), f(lower / (steps + 1)));
  const b = lerp(f(min), f(max), f(Math.min(steps + 1, lower + 1) / (steps + 1)));
  return Math.abs(f(a - current)) <= Math.abs(f(b - current)) ? a : b;
}

export function sliderThumbOffset(length, fraction, steps = 0, corner = 8) {
  const p = f(fraction);
  return steps > 0 && p !== 0 && p !== 1
    ? Math.round(f(f(f(length - corner * 2) * p))) + corner
    : Math.round(f(length * p));
}

/** SliderState.dispatchRawDeltaInternal: snap in pixels, then scale to user values. */
export function sliderPointerValue(coordinate, total, min, max, steps = 0) {
  const maxPx = f(Math.max(f(total - 2), 0)), minPx = f(Math.min(2, maxPx));
  const offset = snapSliderValue(f(coordinate), minPx, maxPx, steps);
  return scale(minPx, maxPx, offset, min, max);
}

/** SliderState keeps unsnapped pixel offsets, even past an endpoint. */
export class SliderPointerState {
  constructor(min, max, steps = 0) {
    this.min = f(min); this.max = f(max); this.steps = steps;
    this.total = 0; this.rawOffset = 0; this.pressOffset = 0;
  }
  press(coordinate) { this.pressOffset = f(f(coordinate) - this.rawOffset); }
  drag(delta) {
    this.rawOffset = f(f(this.rawOffset + f(delta)) + this.pressOffset); this.pressOffset = 0;
    return sliderPointerValue(this.rawOffset, this.total, this.min, this.max, this.steps);
  }
}

/** RangeSliderState.onDrag/updateMinMaxPx; values are supplied by the owner. */
export class RangeSliderPointerState {
  constructor(min, max, steps = 0) {
    this.min = f(min); this.max = f(max); this.steps = steps;
    this.minPx = this.maxPx = this.rawOffsetStart = this.rawOffsetEnd = 0;
  }
  update(total, start, end, dragging = false) {
    this.start = f(start); this.end = f(end);
    const maxPx = f(Math.max(f(total - 2), 0)), minPx = f(Math.min(2, maxPx));
    if (!dragging && (this.minPx !== minPx || this.maxPx !== maxPx || this.start !== this.end)) {
      this.minPx = minPx; this.maxPx = maxPx;
      this.rawOffsetStart = scale(this.min, this.max, this.start, minPx, maxPx);
      this.rawOffsetEnd = scale(this.min, this.max, this.end, minPx, maxPx);
    }
  }
  drag(isStart, delta) {
    const {minPx, maxPx} = this;
    let start, end;
    if (isStart) {
      this.rawOffsetStart = f(this.rawOffsetStart + f(delta));
      this.rawOffsetEnd = scale(this.min, this.max, this.end, minPx, maxPx);
      end = this.rawOffsetEnd;
      start = Math.min(end, snapSliderValue(Math.max(minPx, Math.min(end, this.rawOffsetStart)), minPx, maxPx, this.steps));
    } else {
      this.rawOffsetEnd = f(this.rawOffsetEnd + f(delta));
      this.rawOffsetStart = scale(this.min, this.max, this.start, minPx, maxPx);
      start = this.rawOffsetStart;
      end = Math.max(start, snapSliderValue(Math.max(start, Math.min(maxPx, this.rawOffsetEnd)), minPx, maxPx, this.steps));
    }
    start = scale(minPx, maxPx, start, this.min, this.max);
    end = scale(minPx, maxPx, end, this.min, this.max);
    return isStart ? [Math.min(start, end), end] : [start, Math.max(start, end)];
  }
}

/** SliderDefaults.drawTrack, including the source's LTR/RTL thresholds. */
export function sliderTrackLayout({ length, thickness = 16, start = 0, end = .5, steps = 0,
  range = false, centered = false, vertical = false, rtl = false, reverse = false,
  gap = 6, insideCorner = 2, corner = thickness / 2, shrink = centered || vertical,
  stopIndicators = true }) {
  length = f(Math.max(0, length)); thickness = f(thickness); corner = f(corner); insideCorner = f(insideCorner);
  start = f(start); end = f(end);
  const ticks = sliderTickFractions(steps), rtlHorizontal = rtl && !vertical;
  const valuePosition = p => ticks.length && p !== 0 && p !== 1
    ? f(f(f(length - f(corner * 2)) * p) + corner) : f(length * p);
  const valueStart = valuePosition(start), valueEnd = valuePosition(end), center = f(length / 2);
  const startHandle = range || (centered && end <= .5) ? 4 : 0;
  const endHandle = !centered || end >= .5 ? 4 : 0;
  const startGap = (range || centered) && gap > 0 ? f(startHandle / 2 + gap) : 0;
  const endGap = gap > 0 ? f(endHandle / 2 + gap) : 0;
  const paths = [], dots = [];
  const axisPosition = p => (vertical ? reverse : rtlHorizontal) ? f(length - p) : p;
  const drawPath = (role, from, to, first, last) => {
    // Rect(offset, Size) adds the Float extent to its origin. Reflecting the
    // opposite endpoint directly changes the result by one Float ULP in RTL.
    const extent = f(to - from);
    const lo = rtlHorizontal ? f(length - to) : from;
    const hi = f(lo + extent);
    if ((vertical && reverse) || rtlHorizontal) [first, last] = [last, first];
    const bounds = vertical ? { left: 0, top: reverse ? f(length - hi) : lo, right: thickness, bottom: reverse ? f(length - lo) : hi }
      : { left: lo, top: 0, right: hi, bottom: thickness };
    const radii = (vertical ? [first, first, last, last] : [first, last, last, first]).map(r => [r, r]);
    paths.push({ role, bounds, radii });
  };
  const drawDot = (position, role, kind) => dots.push({ position: axisPosition(position), role, kind });
  let leftThreshold = startGap, rightThreshold = f(length - endGap);
  if (!shrink || ticks.length) { leftThreshold = f(leftThreshold + corner); rightThreshold = f(rightThreshold - corner); }
  const adjustedEnd = centered ? Math.min(valueEnd, center) : valueStart;
  const adjustedStart = centered ? Math.max(valueEnd, center) : valueEnd;
  if ((centered || range) && adjustedEnd > leftThreshold) {
    drawPath('inactive', 0, f(adjustedEnd - startGap), corner, insideCorner);
    if (stopIndicators) drawDot(corner, 'active', 'stop');
  }
  if (adjustedStart < rightThreshold) {
    drawPath('inactive', f(adjustedStart + endGap), length, insideCorner, corner);
    if (stopIndicators) drawDot(f(length - corner), 'active', 'stop');
  }
  const activeStart = centered ? f(adjustedEnd + (adjustedEnd < center ? startGap : 0)) : range ? f(valueStart + startGap) : 0;
  const activeEnd = centered ? f(adjustedStart - (adjustedStart > center ? endGap : 0)) : f(valueEnd - endGap);
  const activeWidth = rtlHorizontal && !centered && !range ? activeEnd : f(activeEnd - activeStart);
  const first = centered || range ? insideCorner : corner;
  const threshold = !shrink || ticks.length ? (rtlHorizontal || centered || range ? insideCorner : corner) : 0;
  if (activeWidth > threshold) drawPath('active', activeStart, activeEnd, first, insideCorner);
  const tickStart = corner, tickEnd = f(length - corner);
  const centerGap = centered ? (valueEnd > center ? startGap : endGap) : 0;
  const handleGap = centered ? (valueEnd > center ? endGap : startGap) : endGap;
  const inGap = (position, middle, size) => position >= f(middle - size) && position <= f(middle + size);
  ticks.forEach((tick, index) => {
    if (stopIndicators && ((centered || range) && index === 0 || index === ticks.length - 1)) return;
    const p = lerp(tickStart, tickEnd, tick);
    if ((centered && inGap(p, center, centerGap)) || (range && inGap(p, valueStart, startGap)) || inGap(p, valueEnd, handleGap)) return;
    drawDot(p, p >= activeStart && p <= activeEnd ? 'active-tick' : 'inactive-tick', 'tick');
  });
  return { length, thickness, paths, dots, valueStart, valueEnd };
}

/** Explicit SVG adapter for the source RoundRect; normalize overlapping radii. */
export function sliderTrackPath({ bounds: b, radii }) {
  const [tl, tr, br, bl] = roundedOutlineRadii({ bounds: b, radii }).map(r => r[0]);
  const { left: l, top: t, right: r, bottom: z } = b;
  const arc = (radius, x, y) => radius > 0 ? `A${radius} ${radius} 0 0 1 ${x} ${y}` : `L${x} ${y}`;
  return `M${l + tl} ${t}H${r - tr}${arc(tr, r, t + tr)}V${z - br}${arc(br, r - br, z)}H${l + bl}${arc(bl, l, z - bl)}V${t + tl}${arc(tl, l + tl, t)}Z`;
}
