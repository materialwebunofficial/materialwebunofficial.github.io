/**
 * TypeScript definitions for Spring Physics Motion Engine
 */

export interface SpringOptions {
  from?: number;
  to: number;
  velocity?: number;
  dampingRatio?: number;
  stiffness?: number;
  mass?: number;
  time?: number;
}

export interface SpringResult {
  position: number;
  velocity: number;
}

export interface SpringKeyframesResult {
  keyframes: Array<{ transform?: string; borderRadius?: string; offset: number }>;
  duration: number;
}

export class SpringPhysics {
  static solve(options: SpringOptions): SpringResult;
  static generateKeyframes(options: SpringOptions): SpringKeyframesResult;
  static animate(element: HTMLElement, keyframes: Keyframe[], options?: KeyframeAnimationOptions): Animation;
}
