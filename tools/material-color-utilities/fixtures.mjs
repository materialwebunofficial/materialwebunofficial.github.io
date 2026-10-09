// Run after generate.py. Fixtures use the published upstream exports directly,
// without importing the web adapter or its role table.
import { build } from 'esbuild';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const oracle = `${root}research/material-color-utilities-oracle.mjs`;
await build({ entryPoints: [`${root}research/material-color-utilities-0.4.0/package/index.js`],
  outfile: oracle, bundle: true, format: 'esm', platform: 'node' });
const m = await import(pathToFileURL(oracle));
const roles = Object.getOwnPropertyNames(m.DynamicScheme.prototype).filter(name => {
  const descriptor = Object.getOwnPropertyDescriptor(m.DynamicScheme.prototype, name);
  return descriptor.get && !name.endsWith('PaletteKeyColor') && !['primaryDim','secondaryDim','tertiaryDim','errorDim'].includes(name);
});
const variants = {'tonal-spot':m.SchemeTonalSpot,neutral:m.SchemeNeutral,vibrant:m.SchemeVibrant,
  expressive:m.SchemeExpressive,fidelity:m.SchemeFidelity,content:m.SchemeContent,
  monochrome:m.SchemeMonochrome,rainbow:m.SchemeRainbow,'fruit-salad':m.SchemeFruitSalad};
const cases = [];
for (const seed of ['#6750a4','#ff0000','#00ff00','#0000ff','#000000','#ffffff','#888888','#ffcc00']) {
  for (const [variant,Scheme] of Object.entries(variants)) for (const dark of [false,true]) for (const contrast of [-1,0,0.5,1]) {
    const hct = m.Hct.fromInt(m.argbFromHex(seed));
    const scheme = new Scheme(hct,dark,contrast,'2025','phone');
    cases.push({seed,variant,dark,contrast,
      hct: {hue:hct.hue,chroma:hct.chroma,tone:hct.tone},
      colors: Object.fromEntries(roles.map(role=>[role,m.hexFromArgb(scheme[role])]))});
  }
}
fs.mkdirSync(`${root}test/fixtures/material-color-utilities`,{recursive:true});
fs.writeFileSync(`${root}test/fixtures/material-color-utilities/schemes.json`,JSON.stringify({
  package:'@material/material-color-utilities',version:'0.4.0',specVersion:'2025',platform:'phone',cases,
},null,2)+'\n');
