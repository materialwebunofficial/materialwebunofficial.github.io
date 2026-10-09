/**
 * TypeScript definitions for Dynamic HCT Color Engine
 */

export interface HctColor {
  hue: number;
  chroma: number;
  tone: number;
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface M3SchemeTokens {
  [cssVariableName: string]: string;
}

export interface M3Preset {
  id: string;
  name: string;
  hex: string;
  hue: number;
  chroma: number;
}

export class TonalPalette {
  hue: number;
  chroma: number;
  constructor(hue: number, chroma: number);
  tone(tone: number): string;
}

export function hexToRgb(hex: string): RgbColor;
export function rgbToHex(r: number, g: number, b: number): string;
export function rgbToHct(r: number, g: number, b: number): HctColor;
export function hctToRgb(hue: number, chroma: number, tone: number): RgbColor;
export function hctToHex(hue: number, chroma: number, tone: number): string;

export type PaletteVariant = 'tonal-spot' | 'neutral' | 'vibrant' | 'expressive' | 'fidelity' | 'content' | 'monochrome' | 'rainbow' | 'fruit-salad';
export const PALETTE_VARIANTS: readonly PaletteVariant[];
export const DEFAULT_PALETTE_VARIANT: 'tonal-spot';
export function resolvePaletteVariant(variant?: string | null): PaletteVariant;

export function createTonalPalettes(source: string | HctColor, variant?: PaletteVariant | 'standard', isDark?: boolean, contrastLevel?: number): {
  primary: TonalPalette;
  secondary: TonalPalette;
  tertiary: TonalPalette;
  neutral: TonalPalette;
  neutralVariant: TonalPalette;
  error: TonalPalette;
  hct: HctColor;
  variant: PaletteVariant;
};

export function generateM3Scheme(source: string | HctColor, isDark?: boolean, variant?: PaletteVariant | 'standard', contrastLevel?: number): M3SchemeTokens;
export function applyDynamicTheme(source: string | HctColor, isDark?: boolean | null, variant?: PaletteVariant | 'standard' | null, target?: HTMLElement | null, contrastLevel?: number | null): M3SchemeTokens;

export const MD3_PRESETS: M3Preset[];
export function getActiveSeedHex(target?: HTMLElement | null): string;
export function getActiveHct(target?: HTMLElement | null): HctColor;
