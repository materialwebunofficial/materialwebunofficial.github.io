/**
 * Material Design 3 Expressive (M3 Expressive) HCT Color Engine
 *
 * Spec: Google Material Color Utilities (HCT: Hue, Chroma, Tone)
 * Computes CAM16 / CIELAB perceptual color spaces, generates Core Tonal Palettes,
 * and dynamically calculates all Material Design 3 system color tokens for Light and Dark modes.
 *
 * Supports both:
 * 1. SchemeExpressive (MaterialExpressiveTheme):
 *    - Higher primary chroma (vibrant)
 *    - Triadic tertiary rotation (+120°) with expressive accent pop
 *    - Richly tinted neutral surfaces
 * 2. SchemeTonalSpot (MaterialTheme Standard):
 *    - Balanced, classic baseline chroma
 *    - Analogous tertiary rotation (+60°)
 *    - Calm neutral surfaces
 */

// ---- 1. Color Math & Conversions (sRGB <-> CIELAB / HCT) ----

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c) {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return clamp(Math.round(v * 255), 0, 255);
}

export function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return { r: 103, g: 80, b: 164 };
  hex = hex.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const intVal = parseInt(hex, 16);
  if (isNaN(intVal)) return { r: 103, g: 80, b: 164 };
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255
  };
}

export function rgbToHex(r, g, b) {
  const toHex = (c) => clamp(Math.round(c), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHct(r, g, b) {
  const rL = srgbToLinear(r);
  const gL = srgbToLinear(g);
  const bL = srgbToLinear(b);

  // sRGB to CIE XYZ D65
  const x = 0.4124564 * rL + 0.3575761 * gL + 0.1804375 * bL;
  const y = 0.2126729 * rL + 0.7151522 * gL + 0.0721750 * bL;
  const z = 0.0193339 * rL + 0.1191920 * gL + 0.9503041 * bL;

  // CIE XYZ to Lab
  const xn = 0.95047;
  const yn = 1.0;
  const zn = 1.08883;

  const f = (t) => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27) * t / 116 + 16 / 116;
  const fx = f(x / xn);
  const fy = f(y / yn);
  const fz = f(z / zn);

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);

  // Exact grayscale detection to prevent floating-point hue drift
  if (r === g && g === b) {
    return {
      hue: 0,
      chroma: 0,
      tone: Math.round(L * 10) / 10
    };
  }

  // Lab to LCH
  let chroma = Math.sqrt(a * a + bVal * bVal);
  if (chroma < 0.2) chroma = 0;

  let hue = Math.atan2(bVal, a) * (180 / Math.PI);
  if (hue < 0) hue += 360;

  return {
    hue: Math.round(hue * 10) / 10,
    chroma: Math.round(chroma * 10) / 10,
    tone: Math.round(L * 10) / 10
  };
}

export function hctToRgb(hue, chroma, tone) {
  tone = clamp(tone, 0, 100);
  chroma = Math.max(0, chroma);

  if (tone <= 0.001) return { r: 0, g: 0, b: 0 };
  if (tone >= 99.999) return { r: 255, g: 255, b: 255 };

  // Exact Grayscale Shortcut when chroma is 0
  if (chroma <= 0.01) {
    const fy = (tone + 16) / 116;
    const fInv = (t) => {
      const t3 = t * t * t;
      return t3 > 216 / 24389 ? t3 : (t - 16 / 116) * 116 / (24389 / 27);
    };
    const y = fInv(fy) * 1.0;
    const gray = linearToSrgb(y);
    return { r: gray, g: gray, b: gray };
  }

  const hRad = (hue * Math.PI) / 180;

  // LCH to Lab
  const L = tone;
  const a = chroma * Math.cos(hRad);
  const bVal = chroma * Math.sin(hRad);

  // Lab to XYZ
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - bVal / 200;

  const fInv = (t) => {
    const t3 = t * t * t;
    return t3 > 216 / 24389 ? t3 : (t - 16 / 116) * 116 / (24389 / 27);
  };

  const xn = 0.95047;
  const yn = 1.0;
  const zn = 1.08883;

  const x = fInv(fx) * xn;
  const y = fInv(fy) * yn;
  const z = fInv(fz) * zn;

  // XYZ to sRGB Linear
  const rL = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  const gL = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z;
  const bL = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;

  return {
    r: linearToSrgb(rL),
    g: linearToSrgb(gL),
    b: linearToSrgb(bL)
  };
}

export function hctToHex(hue, chroma, tone) {
  const { r, g, b } = hctToRgb(hue, chroma, tone);
  return rgbToHex(r, g, b);
}

// ---- 2. Material 3 Tonal Palette Engine ----

export class TonalPalette {
  constructor(hue, chroma) {
    this.hue = hue;
    this.chroma = chroma;
    this._cache = new Map();
  }

  tone(tone) {
    tone = Math.round(tone);
    if (!this._cache.has(tone)) {
      this._cache.set(tone, hctToHex(this.hue, this.chroma, tone));
    }
    return this._cache.get(tone);
  }
}

export function createTonalPalettes(source, schemeType = 'expressive') {
  let hct;
  if (typeof source === 'object' && source !== null && 'hue' in source) {
    hct = {
      hue: ((source.hue % 360) + 360) % 360,
      chroma: Math.max(0, source.chroma !== undefined ? source.chroma : 48),
      tone: source.tone !== undefined ? source.tone : 40
    };
  } else {
    const rgb = hexToRgb(String(source));
    hct = rgbToHct(rgb.r, rgb.g, rgb.b);
  }

  const isExpressive = schemeType === 'expressive';
  const userChroma = hct.chroma;
  const primaryHue = hct.hue;

  // When userChroma is 0 (monochrome), all secondary/tertiary/neutral chromas become 0!
  const primaryChroma = userChroma;
  const secondaryHue = isExpressive ? (primaryHue + 15) % 360 : primaryHue;
  const secondaryChroma = userChroma * 0.45;

  // Expressive: Triadic +120° high energy contrast; Standard: Analogous +60° calm
  const tertiaryHue = isExpressive ? (primaryHue + 120) % 360 : (primaryHue + 60) % 360;
  const tertiaryChroma = userChroma * 0.65;

  const neutralHue = isExpressive ? (primaryHue + 15) % 360 : primaryHue;
  const neutralChroma = Math.min(userChroma * 0.15, 8);

  const neutralVariantHue = isExpressive ? (primaryHue + 15) % 360 : primaryHue;
  const neutralVariantChroma = Math.min(userChroma * 0.25, 12);

  const errorHue = 25;
  const errorChroma = Math.min(userChroma * 1.2 + 20, 84);

  return {
    primary: new TonalPalette(primaryHue, primaryChroma),
    secondary: new TonalPalette(secondaryHue, secondaryChroma),
    tertiary: new TonalPalette(tertiaryHue, tertiaryChroma),
    neutral: new TonalPalette(neutralHue, neutralChroma),
    neutralVariant: new TonalPalette(neutralVariantHue, neutralVariantChroma),
    error: new TonalPalette(errorHue, errorChroma),
    hct,
    schemeType
  };
}

// ---- 3. Material Design 3 Dynamic Token Generator (Official M3 Tone Mappings with Smooth Tone Modulation) ----

export function generateM3Scheme(source, isDark = false, schemeType = 'expressive') {
  const palettes = createTonalPalettes(source, schemeType);
  const { primary, secondary, tertiary, neutral, neutralVariant, error, hct } = palettes;
  const delta = ((hct.tone !== undefined ? hct.tone : 40) - 40);

  if (isDark) {
    const pTone = clamp(80 + delta * 0.25, 60, 95);
    const onPTone = clamp(20 + delta * 0.15, 10, 30);
    const pContTone = clamp(30 + delta * 0.35, 15, 52);
    const onPContTone = clamp(90 + delta * 0.15, 80, 98);

    const sTone = clamp(80 + delta * 0.25, 60, 95);
    const onSTone = clamp(20 + delta * 0.15, 10, 30);
    const sContTone = clamp(30 + delta * 0.35, 15, 52);
    const onSContTone = clamp(90 + delta * 0.15, 80, 98);

    const tTone = clamp(80 + delta * 0.25, 60, 95);
    const onTTone = clamp(20 + delta * 0.15, 10, 30);
    const tContTone = clamp(30 + delta * 0.35, 15, 52);
    const onTContTone = clamp(90 + delta * 0.15, 80, 98);

    const errTone = clamp(80 + delta * 0.25, 60, 95);
    const onErrTone = clamp(20 + delta * 0.15, 10, 30);
    const errContTone = clamp(30 + delta * 0.35, 15, 52);
    const onErrContTone = clamp(90 + delta * 0.15, 80, 98);

    const bgTone = clamp(6 + delta * 0.12, 3, 14);
    const onBgTone = clamp(90 + delta * 0.15, 80, 98);

    const surfTone = clamp(6 + delta * 0.12, 3, 14);
    const onSurfTone = clamp(90 + delta * 0.15, 80, 98);
    const surfVarTone = clamp(30 + delta * 0.25, 18, 45);
    const onSurfVarTone = clamp(80 + delta * 0.2, 70, 92);

    const surfDimTone = clamp(6 + delta * 0.12, 3, 14);
    const surfBrightTone = clamp(24 + delta * 0.25, 14, 36);
    const surfLowestTone = clamp(4 + delta * 0.1, 2, 10);
    const surfLowTone = clamp(10 + delta * 0.15, 5, 18);
    const surfContTone = clamp(12 + delta * 0.18, 6, 22);
    const surfHighTone = clamp(17 + delta * 0.2, 9, 28);
    const surfHighestTone = clamp(22 + delta * 0.22, 12, 34);

    const outlineTone = clamp(60 + delta * 0.25, 45, 75);
    const outlineVarTone = clamp(30 + delta * 0.2, 18, 45);

    return {
      '--md-sys-color-primary': primary.tone(pTone),
      '--md-sys-color-on-primary': primary.tone(onPTone),
      '--md-sys-color-primary-container': primary.tone(pContTone),
      '--md-sys-color-on-primary-container': primary.tone(onPContTone),

      '--md-sys-color-secondary': secondary.tone(sTone),
      '--md-sys-color-on-secondary': secondary.tone(onSTone),
      '--md-sys-color-secondary-container': secondary.tone(sContTone),
      '--md-sys-color-on-secondary-container': secondary.tone(onSContTone),

      '--md-sys-color-tertiary': tertiary.tone(tTone),
      '--md-sys-color-on-tertiary': tertiary.tone(onTTone),
      '--md-sys-color-tertiary-container': tertiary.tone(tContTone),
      '--md-sys-color-on-tertiary-container': tertiary.tone(onTContTone),

      '--md-sys-color-error': error.tone(errTone),
      '--md-sys-color-on-error': error.tone(onErrTone),
      '--md-sys-color-error-container': error.tone(errContTone),
      '--md-sys-color-on-error-container': error.tone(onErrContTone),

      '--md-sys-color-background': neutral.tone(bgTone),
      '--md-sys-color-on-background': neutral.tone(onBgTone),

      '--md-sys-color-surface': neutral.tone(surfTone),
      '--md-sys-color-on-surface': neutral.tone(onSurfTone),
      '--md-sys-color-surface-variant': neutralVariant.tone(surfVarTone),
      '--md-sys-color-on-surface-variant': neutralVariant.tone(onSurfVarTone),

      '--md-sys-color-surface-dim': neutral.tone(surfDimTone),
      '--md-sys-color-surface-bright': neutral.tone(surfBrightTone),
      '--md-sys-color-surface-container-lowest': neutral.tone(surfLowestTone),
      '--md-sys-color-surface-container-low': neutral.tone(surfLowTone),
      '--md-sys-color-surface-container': neutral.tone(surfContTone),
      '--md-sys-color-surface-container-high': neutral.tone(surfHighTone),
      '--md-sys-color-surface-container-highest': neutral.tone(surfHighestTone),

      '--md-sys-color-outline': neutralVariant.tone(outlineTone),
      '--md-sys-color-outline-variant': neutralVariant.tone(outlineVarTone),
      '--md-sys-color-inverse-surface': neutral.tone(90),
      '--md-sys-color-inverse-on-surface': neutral.tone(20),
      '--md-sys-color-inverse-primary': primary.tone(40),

      // Preview Background & Surfaces
      '--preview-bg': neutral.tone(bgTone),
      '--preview-surface': neutral.tone(surfContTone),
      '--preview-border': neutralVariant.tone(outlineVarTone)
    };
  } else {
    const pTone = clamp(40 + delta * 0.35, 20, 65);
    const onPTone = 100;
    const pContTone = clamp(90 + delta * 0.15, 75, 96);
    const onPContTone = clamp(10 + delta * 0.15, 5, 25);

    const sTone = clamp(40 + delta * 0.35, 20, 65);
    const onSTone = 100;
    const sContTone = clamp(90 + delta * 0.15, 75, 96);
    const onSContTone = clamp(10 + delta * 0.15, 5, 25);

    const tTone = clamp(40 + delta * 0.35, 20, 65);
    const onTTone = 100;
    const tContTone = clamp(90 + delta * 0.15, 75, 96);
    const onTContTone = clamp(10 + delta * 0.15, 5, 25);

    const errTone = clamp(40 + delta * 0.35, 20, 65);
    const onErrTone = 100;
    const errContTone = clamp(90 + delta * 0.15, 75, 96);
    const onErrContTone = clamp(10 + delta * 0.15, 5, 25);

    const bgTone = clamp(98 + delta * 0.05, 92, 100);
    const onBgTone = clamp(10 + delta * 0.15, 5, 25);

    const surfTone = clamp(98 + delta * 0.05, 92, 100);
    const onSurfTone = clamp(10 + delta * 0.15, 5, 25);
    const surfVarTone = clamp(90 + delta * 0.15, 75, 96);
    const onSurfVarTone = clamp(30 + delta * 0.25, 18, 45);

    const surfDimTone = clamp(87 + delta * 0.15, 75, 94);
    const surfBrightTone = clamp(98 + delta * 0.05, 92, 100);
    const surfLowestTone = 100;
    const surfLowTone = clamp(96 + delta * 0.1, 88, 99);
    const surfContTone = clamp(94 + delta * 0.12, 85, 98);
    const surfHighTone = clamp(92 + delta * 0.15, 82, 96);
    const surfHighestTone = clamp(90 + delta * 0.15, 80, 95);

    const outlineTone = clamp(50 + delta * 0.25, 35, 68);
    const outlineVarTone = clamp(80 + delta * 0.2, 65, 90);

    return {
      '--md-sys-color-primary': primary.tone(pTone),
      '--md-sys-color-on-primary': primary.tone(onPTone),
      '--md-sys-color-primary-container': primary.tone(pContTone),
      '--md-sys-color-on-primary-container': primary.tone(onPContTone),

      '--md-sys-color-secondary': secondary.tone(sTone),
      '--md-sys-color-on-secondary': secondary.tone(onSTone),
      '--md-sys-color-secondary-container': secondary.tone(sContTone),
      '--md-sys-color-on-secondary-container': secondary.tone(onSContTone),

      '--md-sys-color-tertiary': tertiary.tone(tTone),
      '--md-sys-color-on-tertiary': tertiary.tone(onTTone),
      '--md-sys-color-tertiary-container': tertiary.tone(tContTone),
      '--md-sys-color-on-tertiary-container': tertiary.tone(onTContTone),

      '--md-sys-color-error': error.tone(errTone),
      '--md-sys-color-on-error': error.tone(onErrTone),
      '--md-sys-color-error-container': error.tone(errContTone),
      '--md-sys-color-on-error-container': error.tone(onErrContTone),

      '--md-sys-color-background': neutral.tone(bgTone),
      '--md-sys-color-on-background': neutral.tone(onBgTone),

      '--md-sys-color-surface': neutral.tone(surfTone),
      '--md-sys-color-on-surface': neutral.tone(onSurfTone),
      '--md-sys-color-surface-variant': neutralVariant.tone(surfVarTone),
      '--md-sys-color-on-surface-variant': neutralVariant.tone(onSurfVarTone),

      '--md-sys-color-surface-dim': neutral.tone(surfDimTone),
      '--md-sys-color-surface-bright': neutral.tone(surfBrightTone),
      '--md-sys-color-surface-container-lowest': neutral.tone(surfLowestTone),
      '--md-sys-color-surface-container-low': neutral.tone(surfLowTone),
      '--md-sys-color-surface-container': neutral.tone(surfContTone),
      '--md-sys-color-surface-container-high': neutral.tone(surfHighTone),
      '--md-sys-color-surface-container-highest': neutral.tone(surfHighestTone),

      '--md-sys-color-outline': neutralVariant.tone(outlineTone),
      '--md-sys-color-outline-variant': neutralVariant.tone(outlineVarTone),
      '--md-sys-color-inverse-surface': neutral.tone(20),
      '--md-sys-color-inverse-on-surface': neutral.tone(95),
      '--md-sys-color-inverse-primary': primary.tone(80),

      // Preview Background & Surfaces
      '--preview-bg': neutral.tone(bgTone),
      '--preview-surface': neutral.tone(surfContTone),
      '--preview-border': neutralVariant.tone(outlineVarTone)
    };
  }
}

// ---- 4. Official Material 3 Presets ----

export const MD3_PRESETS = [
  { id: 'baseline', name: 'Baseline Purple', hex: '#6750A4', hue: 305, chroma: 52 },
  { id: 'ocean', name: 'Expressive Ocean', hex: '#00639B', hue: 266, chroma: 37 },
  { id: 'emerald', name: 'Forest Green', hex: '#386A20', hue: 132, chroma: 47 },
  { id: 'sunset', name: 'Warm Amber', hex: '#7D5700', hue: 79, chroma: 49 },
  { id: 'rose', name: 'Vibrant Coral', hex: '#9C4146', hue: 23, chroma: 42 }
];

let globalActiveHct = { hue: 305, chroma: 52, tone: 40 };

export function applyDynamicTheme(source, isDark = null, schemeType = null, target = null) {
  if (!target && typeof document !== 'undefined') {
    target = document.documentElement;
  }
  if (!target) return {};

  if (isDark === null) {
    const doc = typeof document !== 'undefined' ? document.documentElement : null;
    isDark = target.getAttribute('data-theme') === 'dark' || (doc && doc.getAttribute('data-theme') === 'dark');
  }
  if (schemeType === null) {
    const doc = typeof document !== 'undefined' ? document.documentElement : null;
    schemeType = target.getAttribute('data-theme-scheme') || (doc && doc.getAttribute('data-theme-scheme')) || 'expressive';
  }

  let resolvedHct = { ...globalActiveHct };
  if (typeof source === 'object' && source !== null && 'hue' in source) {
    resolvedHct = {
      hue: ((source.hue % 360) + 360) % 360,
      chroma: Math.max(0, source.chroma !== undefined ? source.chroma : 48),
      tone: clamp(source.tone !== undefined ? source.tone : 40, 0, 100)
    };
  } else if (typeof source === 'string') {
    const rgb = hexToRgb(source);
    resolvedHct = rgbToHct(rgb.r, rgb.g, rgb.b);
  }

  const isGlobalTarget = typeof document !== 'undefined' && (target === document.documentElement || target === document.body);
  if (isGlobalTarget) {
    globalActiveHct = { ...resolvedHct };
  }
  target._activeHct = { ...resolvedHct };

  const tokens = generateM3Scheme(resolvedHct, isDark, schemeType);
  if (isGlobalTarget && typeof document !== 'undefined') {
    let themeStyle = document.getElementById('md3e-dynamic-theme-vars');
    if (!themeStyle) {
      themeStyle = document.createElement('style');
      themeStyle.id = 'md3e-dynamic-theme-vars';
      document.head.appendChild(themeStyle);
    }
    const cssLines = Object.entries(tokens).map(([k, v]) => `  ${k}: ${v};`).join('\n');
    themeStyle.textContent = `:root {\n${cssLines}\n}`;
  } else if (target && target.style) {
    for (const [key, value] of Object.entries(tokens)) {
      target.style.setProperty(key, value);
    }
  }

  const seedHex = hctToHex(resolvedHct.hue, resolvedHct.chroma, resolvedHct.tone);
  target.setAttribute('data-seed-color', seedHex);

  if (typeof window !== 'undefined') {
    const event = new CustomEvent('theme-color-change', {
      detail: { hct: resolvedHct, seedHex, isDark, schemeType, tokens, target },
      bubbles: true,
      composed: true
    });
    window.dispatchEvent(event);
    target.dispatchEvent(event);
  }
  return tokens;
}

export function getActiveHct(target = null) {
  if (target && target._activeHct) {
    return { ...target._activeHct };
  }
  return { ...globalActiveHct };
}

export function getActiveSeedHex(target = null) {
  const hct = getActiveHct(target);
  return hctToHex(hct.hue, hct.chroma, hct.tone);
}

