import { TYPE_SCALE } from '../tokens/typography.js';

/** Rebind derived tokens at the theme scope. CSS custom properties containing
 * var() resolve where declared; inheriting a root shorthand freezes its font.
 */
export function typographyOverrides(fontFamily) {
  const styles = {};
  for (const suffix of ['', '-brand', '-plain']) styles['--md-sys-typescale-font-family' + suffix] = fontFamily;
  for (const [role, value] of Object.entries(TYPE_SCALE)) {
    const key = '--md-sys-typescale-' + role;
    styles[key + '-font'] = `var(--md-sys-typescale-font-family-${value.family})`;
    styles[key] = `var(${key}-weight, ${value.weight}) var(${key}-size, ${value.size}px)/var(${key}-line-height, ${value.lineHeight}px) var(${key}-font)`;
  }
  return styles;
}
