/**
 * Material Design 3 Expressive (M3 Expressive) JS Spring Physics Engine
 *
 * Implements Android Compose's:
 * - MotionScheme.expressive() — Underdamped spatial springs (bouncy overshoot)
 * - MotionScheme.standard()   — Critically damped standard springs (no overshoot)
 *
 * Reference:
 * https://developer.android.com/reference/kotlin/androidx/compose/material3/MaterialExpressiveTheme.composable
 * https://developer.android.com/reference/kotlin/androidx/compose/material3/MotionScheme
 */

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
  let current = from;
  let velocity = 0;
  const k = spec.stiffness;
  const c = 2 * spec.damping * Math.sqrt(k);
  let lastTime = performance.now();
  let rafId = null;

  function step(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.032);
    lastTime = now;

    const displacement = current - to;
    const springForce = -k * displacement;
    const dampingForce = -c * velocity;
    const acceleration = springForce + dampingForce;

    velocity += acceleration * dt;
    current += velocity * dt;

    onUpdate(current);

    if (Math.abs(current - to) > 0.1 || Math.abs(velocity) > 0.1) {
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
      spatialSlow: { dampingRatio: 0.70, stiffness: 250, mass: 1.0 },
      spatialMedium: { dampingRatio: 0.70, stiffness: 450, mass: 1.0 },
      spatialFast: { dampingRatio: 0.75, stiffness: 800, mass: 1.0 },
      effectSlow: { dampingRatio: 1.00, stiffness: 800, mass: 1.0 },
      effectFast: { dampingRatio: 1.00, stiffness: 1400, mass: 1.0 }
    },
    standard: {
      spatialSlow: { dampingRatio: 1.00, stiffness: 300, mass: 1.0 },
      spatialMedium: { dampingRatio: 1.00, stiffness: 700, mass: 1.0 },
      spatialFast: { dampingRatio: 1.00, stiffness: 1400, mass: 1.0 },
      effectSlow: { dampingRatio: 1.00, stiffness: 1600, mass: 1.0 },
      effectFast: { dampingRatio: 1.00, stiffness: 3800, mass: 1.0 }
    }
  };

  static PRESETS = {
    expressiveSpatialSlow: { dampingRatio: 0.70, stiffness: 250, mass: 1.0 },
    expressiveSpatialMedium: { dampingRatio: 0.70, stiffness: 450, mass: 1.0 },
    expressiveSpatialFast: { dampingRatio: 0.75, stiffness: 800, mass: 1.0 },
    expressiveEffectSlow: { dampingRatio: 1.00, stiffness: 800, mass: 1.0 },
    expressiveEffectFast: { dampingRatio: 1.00, stiffness: 1400, mass: 1.0 },
    standardSpatialSlow: { dampingRatio: 1.00, stiffness: 300, mass: 1.0 },
    standardSpatialMedium: { dampingRatio: 1.00, stiffness: 700, mass: 1.0 },
    standardSpatialFast: { dampingRatio: 1.00, stiffness: 1400, mass: 1.0 }
  };

  static _activeScheme = 'expressive';

  static setScheme(schemeName) {
    if (this.SCHEMES[schemeName]) {
      this._activeScheme = schemeName;
    }
  }

  static getScheme() {
    if (typeof document !== 'undefined') {
      const docScheme = document.documentElement.getAttribute('data-motion-scheme') ||
                        document.documentElement.getAttribute('data-theme-scheme');
      if (docScheme && this.SCHEMES[docScheme]) return docScheme;
    }
    return this._activeScheme;
  }

  static getPreset(name) {
    const currentScheme = this.getScheme();

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

  static solve({ from, to, velocity = 0, dampingRatio = 0.7, stiffness = 450, mass = 1.0, time }) {
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

  static generateKeyframes({ from = 0, to = 1, velocity = 0, dampingRatio = 0.7, stiffness = 450, mass = 1.0, fps = 60 }) {
    const keyframes = [];
    const dt = 1 / fps;
    let t = 0;
    const maxTime = 1.2;
    const threshold = 0.001;

    let position = from;
    let currentVelocity = velocity;

    while (t < maxTime) {
      const state = this.solve({ from, to, velocity, dampingRatio, stiffness, mass, time: t });
      position = state.position;
      currentVelocity = state.velocity;

      keyframes.push(position);

      if (Math.abs(position - to) < threshold && Math.abs(currentVelocity) < threshold && t > 0.08) {
        keyframes.push(to);
        break;
      }

      t += dt;
    }

    return { keyframes, duration: Math.max(120, Math.round(t * 1000)) };
  }

  static animateProperty(element, property, from, to, presetName = 'expressiveSpatialMedium') {
    if (!element) return;
    const preset = this.getPreset(presetName);
    const { keyframes, duration } = this.generateKeyframes({
      from,
      to,
      dampingRatio: preset.dampingRatio,
      stiffness: preset.stiffness,
      mass: preset.mass
    });

    const animationKeyframes = keyframes.map(val => {
      if (property === 'scale') return { transform: `scale(${val.toFixed(4)})` };
      if (property === 'border-radius') return { borderRadius: `${val.toFixed(2)}px` };
      const obj = {};
      obj[property] = val;
      return obj;
    });

    if (element._activeSpringAnim) {
      try { element._activeSpringAnim.cancel(); } catch (_) {}
    }

    const anim = element.animate(animationKeyframes, {
      duration,
      easing: 'linear',
      fill: 'none'
    });

    element._activeSpringAnim = anim;

    anim.onfinish = () => {
      if (property === 'scale') {
        if (to === 1.0) {
          element.style.transform = '';
        } else {
          element.style.transform = `scale(${to})`;
        }
      } else if (property === 'border-radius') {
        element.style.borderRadius = `${to}px`;
      } else {
        element.style[property] = typeof to === 'number' ? `${to}px` : to;
      }
      element._activeSpringAnim = null;
    };

    return anim;
  }
}
