import { build } from 'esbuild';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const source = `${root}research/material-color-utilities-0.4.0/package/`;
await build({
  stdin: { contents: `
    export { Hct } from './hct/hct.js';
    export { TonalPalette } from './palettes/tonal_palette.js';
    export { SchemeExpressive } from './scheme/scheme_expressive.js';
    export { SchemeTonalSpot } from './scheme/scheme_tonal_spot.js';
    export { argbFromHex, hexFromArgb } from './utils/string_utils.js';
    export { argbFromRgb, redFromArgb, greenFromArgb, blueFromArgb } from './utils/color_utils.js';
  `, resolveDir: source },
  outfile: `${root}src/theme/material-color-utilities.js`,
  bundle: true, format: 'esm', target: 'es2022', legalComments: 'inline',
  banner: { js: '// Generated from @material/material-color-utilities 0.4.0 (Google, Apache-2.0).\n// Regenerate: python tools/material-color-utilities/generate.py. Do not edit.' },
});
fs.copyFileSync(`${source}LICENSE`, `${root}tools/material-color-utilities/LICENSE`);
