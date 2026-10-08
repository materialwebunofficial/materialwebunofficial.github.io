/* AndroidX AnimatedShapeState a095da93; uniform rounded corners, lazy sizing. */
import {SpringValue} from '../motion/selection-motion.js';
const f = Math.fround;
const same = (a, b) => a === b || a?.unit !== undefined && a.unit === b?.unit && Object.is(f(a.value), f(b.value));
const lerp = (a, b, t) => same(a, b) ? a : {start: a, end: b, fraction: f(t)};

export function buttonCornerRadius(shape, width, height) {
  if (shape.unit === 'percent') return f(f(Math.min(width, height)) * f(f(shape.value) / 100));
  if (shape.unit === 'px') return f(shape.value);
  const t = shape.fraction;
  const a = buttonCornerRadius(shape.start, width, height);
  const b = buttonCornerRadius(shape.end, width, height);
  return f(f(f(1 - t) * a) + f(t * b));
}

/** Source progress bookkeeping; frame/coroutine scheduling is a web host. */
export class ButtonShapeState {
  constructor(initial) {
    this.startShape = this.targetShape = initial;
    this.progress = new SpringValue(1);
    this.cachedProgress = -1;
    this.cachedShape = null;
  }

  getMorphedShape(now, frameProgress) {
    const p = frameProgress ?? this.progress.sample(now).position;
    if (p === this.cachedProgress && this.cachedShape) return this.cachedShape;
    this.cachedProgress = p;
    return this.cachedShape = lerp(this.startShape, this.targetShape, p);
  }

  animateToShape(target, spec, now) {
    if (same(this.targetShape, target)) return false;
    const current = this.progress.sample(now);
    let p, velocity;
    if (same(target, this.startShape)) {
      this.startShape = this.targetShape;
      this.targetShape = target;
      p = f(1 - current.position);
      velocity = f(-current.velocity);
    } else {
      this.startShape = current.position === 1 ? this.targetShape : current.position === 0 ? this.startShape : lerp(this.startShape, this.targetShape, current.position);
      this.targetShape = target;
      p = 0;
      velocity = 0;
    }
    this.cachedShape = null;
    this.progress.value = this.progress.target = p;
    this.progress.animation = null;
    this.progress.to(1, spec, {now, velocity});
    return true;
  }
}

const copyShape = shape => ({unit: shape.unit, value: f(shape.value)});
const copySpec = spec => ({stiffness: f(spec.stiffness), dampingRatio: f(spec.dampingRatio),
  visibilityThreshold: spec.visibilityThreshold == null ? null : f(spec.visibilityThreshold)});
const sameSpec = (a, b) => a.stiffness === b.stiffness && a.dampingRatio === b.dampingRatio &&
  Object.is(a.visibilityThreshold, b.visibilityThreshold);

/** Public Button/ToggleButton keys and remembered specs, for uniform corners. */
export class ButtonShapeComposition {
  update(shapes, pressed, animationSpec, now, checked = false) {
    const spec = copySpec(animationSpec);
    const target = pressed ? shapes.pressedShape : checked && shapes.checkedShape ? shapes.checkedShape : shapes.shape;
    if (!this.state || !same(this.shapes.shape, shapes.shape) ||
        !same(this.shapes.pressedShape, shapes.pressedShape) ||
        !same(this.shapes.checkedShape, shapes.checkedShape) || !sameSpec(this.spec, spec)) {
      this.shapes = {shape: copyShape(shapes.shape), pressedShape: copyShape(shapes.pressedShape)};
      if (shapes.checkedShape) this.shapes.checkedShape = copyShape(shapes.checkedShape);
      this.spec = spec;
      this.state = new ButtonShapeState(copyShape(target));
    } else {
      this.state.animateToShape(copyShape(target), this.spec, now);
    }
    return this.state;
  }
}
