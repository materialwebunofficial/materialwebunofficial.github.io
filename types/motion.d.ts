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
  keyframes: number[];
  duration: number;
}

export class SpringPhysics {
  static setScheme(schemeName: 'expressive' | 'standard'): void;
  static getScheme(element?: Element | null): string;
  static getPreset(name: string, element?: Element | null): { dampingRatio: number; stiffness: number; mass: number };
  static solve(options: SpringOptions): SpringResult;
  static generateKeyframes(options: SpringOptions): SpringKeyframesResult;
  static animateProperty(element: HTMLElement, property: string, from: number, to: number, presetName?: string): Animation | undefined;
}
