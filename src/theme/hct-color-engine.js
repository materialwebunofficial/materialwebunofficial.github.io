/**
 * Material HCT and dynamic color adapter.
 * Algorithms: Google Material Color Utilities 0.4.0, Apache-2.0.
 * Dynamic palettes explicitly use the 2025 specification (phone platform).
 *
 * The palette variant is independent from the theme flavor. Tonal spot is the
 * Material dynamic color default (Android wallpaper default and the scheme
 * dynamicLightColorScheme/dynamicDarkColorScheme resolve to). MaterialExpressiveTheme
 * changes motion, not the palette variant; MCU SchemeExpressive is one of the
 * opt-in variants. See tools/material-color-utilities/README.md.
 */
import {
  Hct, TonalPalette as MaterialTonalPalette,
  SchemeContent, SchemeExpressive, SchemeFidelity, SchemeFruitSalad, SchemeMonochrome,
  SchemeNeutral, SchemeRainbow, SchemeTonalSpot, SchemeVibrant,
  argbFromHex, hexFromArgb, argbFromRgb, redFromArgb, greenFromArgb, blueFromArgb,
} from './material-color-utilities.js';
import { themeSetting } from './theme-context.js';

const DEFAULT_SEED = '#6750a4';
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const channel = value => clamp(Math.round(finite(value, 0)), 0, 255);
const unpack = argb => ({ r: redFromArgb(argb), g: greenFromArgb(argb), b: blueFromArgb(argb) });
const describe = hct => ({ hue: hct.hue, chroma: hct.chroma, tone: hct.tone });

export function hexToRgb(hex) {
  let value = typeof hex === 'string' ? hex.trim().replace(/^#/, '') : '';
  if (/^[0-9a-f]{3}$/i.test(value)) value = [...value].map(c => c + c).join('');
  return unpack(argbFromHex(/^[0-9a-f]{6}$/i.test(value) ? value : DEFAULT_SEED));
}

export function rgbToHex(r, g, b) {
  return hexFromArgb(argbFromRgb(channel(r), channel(g), channel(b)));
}

export function rgbToHct(r, g, b) {
  return describe(Hct.fromInt(argbFromRgb(channel(r), channel(g), channel(b))));
}

function sourceHct(source) {
  if (source && typeof source === 'object' && 'hue' in source) {
    return Hct.from(finite(source.hue, 0), Math.max(0, finite(source.chroma ?? 48, 48)),
      clamp(finite(source.tone ?? 40, 40), 0, 100));
  }
  const { r, g, b } = hexToRgb(source);
  return Hct.fromInt(argbFromRgb(r, g, b));
}

export function hctToRgb(hue, chroma, tone) {
  return unpack(sourceHct({ hue, chroma, tone }).toInt());
}

export function hctToHex(hue, chroma, tone) {
  return hexFromArgb(sourceHct({ hue, chroma, tone }).toInt());
}

/** Hex-returning compatibility wrapper; fractional tones retain their precision. */
export class TonalPalette {
  constructor(hue, chroma) {
    this.hue = hue;
    this.chroma = chroma;
  }
  tone(tone) {
    if (!this._palette || this._hue !== this.hue || this._chroma !== this.chroma) {
      this._hue = this.hue;
      this._chroma = this.chroma;
      this._palette = MaterialTonalPalette.fromHueAndChroma(finite(this.hue, 0), Math.max(0, finite(this.chroma, 0)));
    }
    return hexFromArgb(this._palette.tone(clamp(finite(tone, 0), 0, 100)));
  }
}

/** Official MCU dynamic scheme variants, keyed by their Material names. */
const VARIANTS = {
  'tonal-spot': SchemeTonalSpot, neutral: SchemeNeutral, vibrant: SchemeVibrant,
  expressive: SchemeExpressive, fidelity: SchemeFidelity, content: SchemeContent,
  monochrome: SchemeMonochrome, rainbow: SchemeRainbow, 'fruit-salad': SchemeFruitSalad,
};
export const PALETTE_VARIANTS = Object.freeze(Object.keys(VARIANTS));
export const DEFAULT_PALETTE_VARIANT = 'tonal-spot';

/** Normalizes a variant name; 'standard' is the former alias of tonal spot. */
export function resolvePaletteVariant(variant) {
  const name = String(variant ?? '').trim().toLowerCase().replace(/[\s_]+/g, '-');
  if (name === 'standard' || name === 'tonalspot') return DEFAULT_PALETTE_VARIANT;
  if (name === 'fruitsalad') return 'fruit-salad';
  return Object.hasOwn(VARIANTS, name) ? name : DEFAULT_PALETTE_VARIANT;
}

function dynamicScheme(source, isDark, variant, contrastLevel) {
  const Scheme = VARIANTS[resolvePaletteVariant(variant)];
  return new Scheme(sourceHct(source), isDark, clamp(finite(contrastLevel, 0), -1, 1), '2025', 'phone');
}

export function createTonalPalettes(source, variant = DEFAULT_PALETTE_VARIANT, isDark = false, contrastLevel = 0) {
  const scheme = dynamicScheme(source, isDark, variant, contrastLevel);
  const result = {};
  for (const role of ['primary', 'secondary', 'tertiary', 'neutral', 'neutralVariant', 'error']) {
    const palette = scheme[role + 'Palette'];
    result[role] = new TonalPalette(palette.hue, palette.chroma);
  }
  return { ...result, hct: describe(scheme.sourceColorHct), variant: resolvePaletteVariant(variant) };
}

const COLOR_ROLES = [
  'primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer', 'inversePrimary',
  'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer',
  'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer',
  'error', 'onError', 'errorContainer', 'onErrorContainer',
  'background', 'onBackground', 'surface', 'onSurface', 'surfaceVariant', 'onSurfaceVariant',
  'surfaceDim', 'surfaceBright', 'surfaceContainerLowest', 'surfaceContainerLow',
  'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest',
  'inverseSurface', 'inverseOnSurface', 'outline', 'outlineVariant', 'shadow', 'scrim', 'surfaceTint',
  ...['primary', 'secondary', 'tertiary'].flatMap(role => [
    role + 'Fixed', role + 'FixedDim',
    'on' + role[0].toUpperCase() + role.slice(1) + 'Fixed',
    'on' + role[0].toUpperCase() + role.slice(1) + 'FixedVariant',
  ]),
];

export function generateM3Scheme(source, isDark = false, variant = DEFAULT_PALETTE_VARIANT, contrastLevel = 0) {
  const scheme = dynamicScheme(source, isDark, variant, contrastLevel);
  const tokens = Object.fromEntries(COLOR_ROLES.map(role => [
    '--md-sys-color-' + role.replace(/[A-Z]/g, c => '-' + c.toLowerCase()), hexFromArgb(scheme[role]),
  ]));
  tokens['--preview-bg'] = tokens['--md-sys-color-background'];
  tokens['--preview-surface'] = tokens['--md-sys-color-surface-container'];
  tokens['--preview-border'] = tokens['--md-sys-color-outline-variant'];
  return tokens;
}

// Showcase seed suggestions, not an official Material preset catalog.
export const MD3_PRESETS = [
  { id: 'baseline', name: 'Baseline Purple', hex: '#6750A4' },
  { id: 'ocean', name: 'Ocean', hex: '#00639B' },
  { id: 'emerald', name: 'Forest Green', hex: '#386A20' },
  { id: 'sunset', name: 'Warm Amber', hex: '#7D5700' },
  { id: 'rose', name: 'Coral', hex: '#9C4146' },
].map(preset => ({ ...preset, ...describe(sourceHct(preset.hex)) }));

let globalActiveHct = describe(sourceHct(DEFAULT_SEED));

export function applyDynamicTheme(source, isDark = null, variant = null, target = null, contrastLevel = null) {
  if (!target && typeof document !== 'undefined') {
    target = document.documentElement;
  }
  if (!target) return {};

  // Resolve the nearest explicit setting, including across shadow boundaries.
  const setting = name => themeSetting(target, name,
    typeof document !== 'undefined' ? document.documentElement.getAttribute(name) : null);
  if (isDark === null) isDark = setting('data-theme') === 'dark';
  variant = resolvePaletteVariant(variant ?? setting('data-palette-variant'));
  if (contrastLevel === null) {
    const contrast = setting('data-contrast');
    contrastLevel = ({ reduced: -1, standard: 0, medium: 0.5, high: 1 })[contrast] ?? finite(contrast, 0);
  }

  const resolvedHct = describe(sourceHct(source ?? getActiveHct(target)));

  const isGlobalTarget = typeof document !== 'undefined' && (target === document.documentElement || target === document.body);
  if (isGlobalTarget) {
    globalActiveHct = { ...resolvedHct };
  }
  target._activeHct = { ...resolvedHct };

  const tokens = generateM3Scheme(resolvedHct, isDark, variant, contrastLevel);
  if (target.style) {
    for (const [key, value] of Object.entries(tokens)) {
      target.style.setProperty(key, value);
    }
  }

  const seedHex = hctToHex(resolvedHct.hue, resolvedHct.chroma, resolvedHct.tone);
  target.setAttribute('data-seed-color', seedHex);

  if (typeof window !== 'undefined') {
    const event = new CustomEvent('theme-color-change', {
      detail: { hct: resolvedHct, seedHex, isDark, variant, contrastLevel, tokens, target },
      bubbles: true,
      composed: true
    });
    target.dispatchEvent(event);
  }
  return tokens;
}

export function getActiveHct(target = null) {
  if (!target && typeof document !== 'undefined') target = document.documentElement;
  const seed = themeSetting(target, 'data-seed-color');
  if (seed) return describe(sourceHct(seed));
  return { ...globalActiveHct };
}

export function getActiveSeedHex(target = null) {
  const hct = getActiveHct(target);
  return hctToHex(hct.hue, hct.chroma, hct.tone);
}

