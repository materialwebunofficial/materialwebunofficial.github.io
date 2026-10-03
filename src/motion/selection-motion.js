import { SpringPhysics } from './spring-physics.js';
import { springDuration } from './spring-duration.js';

// Internal scalar timeline. Preserve the physical (unclipped) value and velocity
// when retargeting; clipping belongs to the drawing operation, not the spring.
export class SpringValue {
  constructor(value) { this.value = this.target = value; this.animation = null; }

  sample(now) {
    const a = this.animation;
    if (!a) return { position: this.value, velocity: 0 };
    const elapsed = Math.max(0, now - a.start);
    if (elapsed >= a.duration) {
      this.value = this.target; this.animation = null;
      return { position: this.value, velocity: 0 };
    }
    if (a.snap) return { position: a.from, velocity: a.velocity };
    const state = SpringPhysics.solve({ ...a, from: Math.fround(a.from - a.to), to: 0,
      time: Math.floor(elapsed) / 1000 });
    return { position: Math.fround(state.position + a.to), velocity: Math.fround(state.velocity) };
  }

  to(target, spec, { now = performance.now(), snap = false, delay = 0, transition = false, velocity = null, roundInitial = false } = {}) {
    if (target === this.target && velocity === null) return;
    const current = this.sample(now);
    // Transition.updateAnimation replaces interrupted non-spring specs with its
    // default spring (1500/1), including a Checkbox's delayed snap. A channel
    // already headed to the same target is left alone by updateTargetValue.
    if (transition && snap && this.animation) {
      spec = { stiffness: 1500, dampingRatio: 1 };
      snap = false;
    }
    this.target = target;
    // IntSize transitions retarget from the converted (rounded) current value,
    // while keeping the previous animation's Float velocity vector.
    const a = { from: roundInitial ? Math.round(current.position) : current.position, to: target, velocity: Math.fround(velocity ?? current.velocity),
      stiffness: Math.fround(spec.stiffness), dampingRatio: Math.fround(spec.dampingRatio),
      visibilityThreshold: Math.fround(spec.visibilityThreshold ?? .01),
      start: now, snap };
    a.duration = snap ? delay : springDuration(a);
    this.animation = a;
    this.sample(now);
  }

  finish() { this.value = this.target; this.animation = null; }
}

// One RAF and one preference observer per control, only while connected.
export class SelectionMotion {
  constructor(element, initial, draw) {
    this.element = element;
    this.channels = Object.fromEntries(Object.entries(initial).map(([key, value]) => [key, new SpringValue(value)]));
    this.draw = draw;
    this.raf = null;
    this.disposed = false;
    this.media = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.onPreference = () => { if (this.media.matches) this.finish(); };
    this.media?.addEventListener('change', this.onPreference);
    this.render(performance.now());
  }

  set(updates) {
    if (this.disposed) return;
    const now = performance.now();
    for (const [key, { value, role = 'expressiveSpatialMedium', ...options }] of Object.entries(updates)) {
      this.channels[key].to(value, SpringPhysics.getPreset(role, this.element), { ...options, now });
    }
    if (this.media?.matches) this.finish();
    else this.tick(now);
  }

  render(now) {
    if (this.disposed) return;
    this.draw(Object.fromEntries(Object.entries(this.channels).map(([key, channel]) => [key, channel.sample(now).position])));
  }

  tick(now) {
    if (this.disposed) return;
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.render(now);
    if (Object.values(this.channels).some(channel => channel.animation)) {
      this.raf = requestAnimationFrame(time => this.tick(time));
    }
  }

  finish() {
    if (this.disposed) return;
    for (const channel of Object.values(this.channels)) channel.finish();
    this.tick(performance.now());
  }

  dispose() {
    this.disposed = true;
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.media?.removeEventListener('change', this.onPreference);
  }
}

// Compose drawCheck builds one polyline, then takes its length-limited segment.
// SVG dash patterns would repeat when the spatial spring overshoots; explicit
// segmentation also avoids square-cap artifacts at a zero-length path.
export function checkboxPath(fraction, gravitation) {
  const points = [[4, 10], [8 + 2 * gravitation, 14 - 4 * gravitation], [16, 6 + 4 * gravitation]];
  const lengths = [Math.hypot(points[1][0] - 4, points[1][1] - 10),
    Math.hypot(points[2][0] - points[1][0], points[2][1] - points[1][1])];
  let remaining = Math.max(0, Math.min(1, fraction)) * (lengths[0] + lengths[1]);
  if (remaining <= 0) return '';
  let path = 'M 4 10';
  for (let i = 0; i < 2; i++) {
    const portion = Math.min(1, remaining / lengths[i]);
    path += ` L ${points[i][0] + (points[i + 1][0] - points[i][0]) * portion} ${points[i][1] + (points[i + 1][1] - points[i][1]) * portion}`;
    remaining -= lengths[i];
    if (remaining <= 0) break;
  }
  return path;
}
