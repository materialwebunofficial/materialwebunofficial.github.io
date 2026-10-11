import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {build} from 'esbuild';

const bundle=await build({entryPoints:['src/index.js'],bundle:true,write:false,format:'esm',metafile:true});
const runtime=Object.values(bundle.metafile.outputs)[0].exports.sort();
const types=fs.readFileSync('types/index.d.ts','utf8').replaceAll('\r\n','\n');
const declared=[...types.matchAll(/^export (?:class|function|const) (\w+)/gm)].map(match=>match[1]).sort();
assert.deepEqual(declared,runtime,'Every runtime value export has one matching declaration');
assert.equal(fs.readFileSync('dist/index.d.ts','utf8'),types,'dist declarations are built from the canonical source');
const fixture=path.resolve('test/types/consumer.mts');
const compiled=spawnSync(process.execPath,['node_modules/typescript/bin/tsc','--noEmit','--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',fixture],{encoding:'utf8'});
assert.equal(compiled.status,0,compiled.stdout+compiled.stderr);
const {generateM3Scheme}=await import('../src/theme/hct-color-engine.js');
assert.ok(generateM3Scheme('#6750A4',false),'pure theme computation imports in Node without DOM globals');
console.log(`Package contract: ${runtime.length} exports, strict TypeScript root/component/theme consumer and Node theme import passed`);
