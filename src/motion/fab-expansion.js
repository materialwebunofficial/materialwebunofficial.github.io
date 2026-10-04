import { SpringValue } from './selection-motion.js';
import { SpringPhysics } from './spring-physics.js';

class SizeValue extends SpringValue {
  sample(now) {
    const state = super.sample(now);
    return {...state, position: Math.max(0, Math.round(state.position))};
  }
}

// The new sized Extended FABs animate a Float fraction. The baseline overload
// instead animates AnimatedVisibility's IntSize, with different enter/exit specs.
export class FabExpansion {
  constructor(expanded, {baseline = false, labelWidth = 0, element = null} = {}) {
    this.baseline = baseline;
    this.element = element;
    this.expanded = expanded;
    this.composed = expanded;
    this.segment = expanded ? 'steady' : 'enter';
    this.width = new (baseline ? SizeValue : SpringValue)(expanded ? baseline ? labelWidth : 1 : 0);
    this.alpha = new SpringValue(expanded ? 1 : 0);
  }

  set(expanded, labelWidth, now) {
    const changed = expanded !== this.expanded;
    const entering = !this.composed;
    const widthTarget = expanded ? this.baseline ? labelWidth : 1 : 0;
    if (!changed && widthTarget === this.width.target) return;
    this.expanded = expanded;
    if (changed) this.segment = expanded ? entering ? 'enter' : 'reverse' : 'exit';
    if (expanded) this.composed = true;
    const defaultSpring = {stiffness: 400, dampingRatio: 1};
    const widthSpec = this.baseline && (this.segment === 'reverse' || this.segment === 'steady')
      ? defaultSpring
      : SpringPhysics.getPreset(this.baseline && !expanded ? 'expressiveSpatialMedium' : 'expressiveSpatialFast', this.element);
    const alphaSpec = this.baseline && (this.segment === 'reverse' || this.segment === 'steady')
      ? defaultSpring
      : SpringPhysics.getPreset(this.baseline && expanded ? 'expressiveEffectMedium' : 'expressiveEffectFast', this.element);
    this.width.to(widthTarget, {...widthSpec, visibilityThreshold: this.baseline && (this.segment === 'reverse' || this.segment === 'steady') ? 1 : .01}, {now, roundInitial: this.baseline});
    this.alpha.to(expanded ? 1 : 0, alphaSpec, {now});
  }

  sample(now) {
    const width = this.width.sample(now).position;
    const alpha = this.alpha.sample(now).position;
    const running = Boolean(this.width.animation || this.alpha.animation);
    if (!running) this.segment = 'steady';
    if (!this.expanded && !running) this.composed = false;
    return {width, alpha: Math.max(0, Math.min(1, alpha)), running, composed: this.composed};
  }

  finish() { this.width.finish(); this.alpha.finish(); }
}

// androidx.compose.ui.util.lerp(Int, Int, Float) uses a Double product and only
// rounds that product. Spatial overshoot is retained before layout constraints.
export function fabWidth(minimum, intrinsic, progress) {
  return minimum + Math.round((intrinsic - minimum) * Math.fround(progress));
}
