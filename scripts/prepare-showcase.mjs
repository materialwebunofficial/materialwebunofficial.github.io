import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {buildShowcaseAssets} from './build-showcase-assets.mjs';
await buildShowcaseAssets();
const root=process.cwd(),destination=path.resolve(root,'artifacts/showcase-site');
assert.ok(destination.startsWith(root+path.sep));
fs.rmSync(destination,{recursive:true,force:true});fs.mkdirSync(destination,{recursive:true});
for(const relative of ['index.html','styles','assets','dist','demo','src/showcase.js','src/utils/resize-observer.js']){
 if(!fs.existsSync(relative))continue;
 const target=path.join(destination,relative);fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.cpSync(relative,target,{recursive:true});
}
fs.writeFileSync(path.join(destination,'.nojekyll'),'');
console.log('Showcase artifact prepared without node_modules, tests or development tools');
