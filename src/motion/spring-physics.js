/**
 * Material Design 3 Expressive (M3 Expressive) JS Spring Physics Engine
 *
 * Implements Android Compose's:
 * - MotionScheme.expressive() — Underdamped spatial springs (bouncy overshoot)
 * - MotionScheme.standard()   — Damping ratio 0.9 for spatial motion
 *
 * Reference:
 * https://developer.android.com/reference/kotlin/androidx/compose/material3/MaterialExpressiveTheme.composable
 * https://developer.android.com/reference/kotlin/androidx/compose/material3/MotionScheme
 */

import { themeSetting } from '../theme/theme-context.js';

export const SPRING_SPECS = {
  // Spatial: Konum, boyut, shape morphing (Hafif esneme ve organik oturma)
  spatialDefault: { stiffness: 380, damping: 0.8 },
  spatialFast:    { stiffness: 800, damping: 0.6 },
  spatialSlow:    { stiffness: 200, damping: 0.8 },

  // Effects: Renk ve opaklık geçişleri
  effectsDefault: { stiffness: 1600, damping: 1.0 },
  effectsFast:    { stiffness: 3800, damping: 1.0 },
  effectsSlow:    { stiffness: 800,  damping: 1.0 }
};

/**
 * İkinci dereceden yay diferansiyel denklemi simülasyonu (rAF animatörü)
 */
export function animateSpring(from, to, spec = SPRING_SPECS.spatialDefault, onUpdate) {
  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    onUpdate(to);
    return () => {};
  }
  const start = performance.now();
  let rafId = null;
  function step(now) {
    const { position, velocity } = SpringPhysics.solve({ from, to,
      stiffness: spec.stiffness, dampingRatio: spec.damping,
      time: (now - start) / 1000 });
    onUpdate(position);
    if (Math.abs(position - to) > 0.001 || Math.abs(velocity) > 0.001) {
      rafId = requestAnimationFrame(step);
    } else {
      onUpdate(to);
    }
  }

  rafId = requestAnimationFrame(step);
  return () => cancelAnimationFrame(rafId);
}

export class SpringPhysics {
  static SCHEMES = {
    expressive: {
      spatialSlow: { dampingRatio: 0.8, stiffness: 200, mass: 1.0 },
      spatialMedium: { dampingRatio: 0.8, stiffness: 380, mass: 1.0 },
      spatialFast: { dampingRatio: 0.6, stiffness: 800, mass: 1.0 },
      effectSlow: { dampingRatio: 1.00, stiffness: 800, mass: 1.0 },
      effectMedium: { dampingRatio: 1.00, stiffness: 1600, mass: 1.0 },
      effectFast: { dampingRatio: 1.00, stiffness: 3800, mass: 1.0 }
    },
    standard: {
      spatialSlow: { dampingRatio: 0.9, stiffness: 300, mass: 1.0 },
      spatialMedium: { dampingRatio: 0.9, stiffness: 700, mass: 1.0 },
      spatialFast: { dampingRatio: 0.9, stiffness: 1400, mass: 1.0 },
      effectSlow: { dampingRatio: 1.00, stiffness: 800, mass: 1.0 },
      effectMedium: { dampingRatio: 1.00, stiffness: 1600, mass: 1.0 },
      effectFast: { dampingRatio: 1.00, stiffness: 3800, mass: 1.0 }
    }
  };

  static PRESETS = Object.fromEntries(Object.entries(this.SCHEMES).flatMap(([scheme, specs]) =>
    Object.entries(specs).map(([role, spec]) => [scheme + role[0].toUpperCase() + role.slice(1), spec])));
  static _animations = new WeakMap();

  static _activeScheme = 'expressive';

  static setScheme(schemeName) {
    if (this.SCHEMES[schemeName]) {
      this._activeScheme = schemeName;
    }
  }

  static getScheme(element = null) {
    if (element) {
      const local = themeSetting(element, 'data-motion-scheme') || themeSetting(element, 'data-theme-scheme');
      if (this.SCHEMES[local]) return local;
    }
    if (typeof document !== 'undefined') {
      const docScheme = document.documentElement.getAttribute('data-motion-scheme') ||
                        document.documentElement.getAttribute('data-theme-scheme');
      if (docScheme && this.SCHEMES[docScheme]) return docScheme;
    }
    return this._activeScheme;
  }

  static getPreset(name, element = null) {
    const currentScheme = this.getScheme(element);

    // Direct match first
    if (this.PRESETS[name]) {
      // If current scheme is standard and an expressive preset was requested, adapt to standard
      if (currentScheme === 'standard' && name.startsWith('expressive')) {
        const canonical = name.replace('expressive', 'standard');
        if (this.PRESETS[canonical]) return this.PRESETS[canonical];
      }
      return this.PRESETS[name];
    }

    // Default fallback
    return currentScheme === 'standard'
      ? this.PRESETS.standardSpatialMedium
      : this.PRESETS.expressiveSpatialMedium;
  }

  static solve({ from, to, velocity = 0, dampingRatio = 0.8, stiffness = 380, mass = 1.0, time }) {
    const x0 = from - to;
    const v0 = velocity;
    const omegaN = Math.sqrt(stiffness / mass);

    if (dampingRatio < 1.0) {
      // 1. Underdamped (oscillatory with decay)
      const omegaD = omegaN * Math.sqrt(1 - dampingRatio * dampingRatio);
      const alpha = dampingRatio * omegaN;
      const c1 = x0;
      const c2 = (v0 + alpha * x0) / omegaD;

      const envelope = Math.exp(-alpha * time);
      const position = envelope * (c1 * Math.cos(omegaD * time) + c2 * Math.sin(omegaD * time));
      const currentVelocity = envelope * (
        (-alpha * c1 + omegaD * c2) * Math.cos(omegaD * time) +
        (-alpha * c2 - omegaD * c1) * Math.sin(omegaD * time)
      );

      return { position: position + to, velocity: currentVelocity };
    } else if (Math.abs(dampingRatio - 1.0) < 1e-4) {
      // 2. Critically Damped
      const c1 = x0;
      const c2 = v0 + omegaN * x0;
      const decay = Math.exp(-omegaN * time);

      const position = (c1 + c2 * time) * decay;
      const currentVelocity = (c2 - omegaN * (c1 + c2 * time)) * decay;

      return { position: position + to, velocity: currentVelocity };
    } else {
      // 3. Overdamped (two real exponential decay roots)
      const omegaD = omegaN * Math.sqrt(dampingRatio * dampingRatio - 1);
      const r1 = -dampingRatio * omegaN + omegaD;
      const r2 = -dampingRatio * omegaN - omegaD;
      const c2 = (v0 - r1 * x0) / (r2 - r1);
      const c1 = x0 - c2;

      const position = c1 * Math.exp(r1 * time) + c2 * Math.exp(r2 * time);
      const currentVelocity = c1 * r1 * Math.exp(r1 * time) + c2 * r2 * Math.exp(r2 * time);

      return { position: position + to, velocity: currentVelocity };
    }
  }

  static generateKeyframes({ from = 0, to = 1, velocity = 0, dampingRatio = 0.8, stiffness = 380, mass = 1.0, fps = 120 }) {
    const keyframes = [];
    const dt = 1 / fps;
    let t = 0;
    const maxTime = 10;
    const threshold = 0.001;

    let position = from;
    let currentVelocity = velocity;

    while (t < maxTime) {
      const state = this.solve({ from, to, velocity, dampingRatio, stiffness, mass, time: t });
      position = state.position;
      currentVelocity = state.velocity;

      keyframes.push(position);

      if (Math.abs(position - to) < threshold && Math.abs(currentVelocity) < threshold && t > 0.08) {
        keyframes[keyframes.length - 1] = to;
        break;
      }

      t += dt;
    }

    keyframes[keyframes.length - 1] = to;
    return { keyframes, duration: Math.round((keyframes.length - 1) * dt * 1000) };
  }

  static animateProperty(element, property, from, to, presetName = 'expressiveSpatialMedium') {
    if (!element) return;
    const preset = this.getPreset(presetName, element);
    let states = this._animations.get(element);
    if (!states) this._animations.set(element, states = new Map());
    const previous = states.get(property);
    let velocity = 0;
    if (previous) {
      const time = Math.max(0, Number(previous.anim.currentTime ?? 0)) / 1000;
      const current = this.solve({ ...previous.spec, time });
      from = current.position;
      velocity = current.velocity;
      previous.anim.cancel();
    }
    const write = value => {
      if (property === 'scale') element.style.scale = value === 1 ? '' : String(value);
      else if (property === 'border-radius') element.style.borderRadius = `${Math.max(0, value)}px`;
      else element.style[property] = ['opacity', 'zIndex', 'flexGrow', 'flexShrink'].includes(property) ? String(value) : `${value}px`;
    };
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      write(to);
      states.delete(property);
      return;
    }
    const spec = { from, to, velocity, ...preset };
    const { keyframes, duration } = this.generateKeyframes({
      ...spec
    });

    const animationKeyframes = keyframes.map(val => {
      if (property === 'scale') return { scale: val.toFixed(5) };
      if (property === 'border-radius') return { borderRadius: `${Math.max(0, val).toFixed(3)}px` };
      const obj = {};
      obj[property] = ['opacity', 'zIndex', 'flexGrow', 'flexShrink'].includes(property) ? val : `${val}px`;
      return obj;
    });

    const anim = element.animate(animationKeyframes, {
      duration,
      easing: 'linear',
      fill: 'none'
    });

    element._activeSpringAnim = anim;
    states.set(property, { anim, spec });
    anim.oncancel = () => {
      if (states.get(property)?.anim === anim) states.delete(property);
      if (element._activeSpringAnim === anim) element._activeSpringAnim = null;
    };

    anim.onfinish = () => {
      if (states.get(property)?.anim !== anim) return;
      write(to);
      states.delete(property);
      if (element._activeSpringAnim === anim) element._activeSpringAnim = null;
    };

    return anim;
  }
}
