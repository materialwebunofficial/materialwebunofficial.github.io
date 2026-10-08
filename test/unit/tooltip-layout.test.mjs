import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {tooltipLayout} from '../../src/components/tooltip-layout.js';
for(const name of ['tooltip','toolbar-row','toolbar-alignment','snackbar']){
  const directory=new URL('../fixtures/androidx/'+name+'/',import.meta.url);
  for(const {file,sha256}of JSON.parse(fs.readFileSync(new URL('sources.json',directory))).sources)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(file,directory))).digest('hex'),sha256,`${name}/${file}`);
}
const cases=JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/tooltip/layout-oracle.json.gz',import.meta.url))));
for(const {input,size,requested,placements}of cases){const actual=tooltipLayout(input);assert.deepEqual({size:actual.size,requested:actual.requested,placements:actual.placements},{size,requested,placements},JSON.stringify(input));}
console.log(`Tooltip layout: ${cases.length} original plain/rich bodies with native Box/Column/Size/Padding/baseline/coercion/RTL trees passed.`);
