import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {hitPointerTree} from '../../src/motion/pointer-tree.js';
const directory=new URL('../fixtures/androidx/pointer-tree/',import.meta.url),root=new URL('../../',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('sources.json',directory))),sha=data=>crypto.createHash('sha256').update(data).digest('hex');
for(const entry of [...manifest.sources,...manifest.hosts])assert.equal(sha(fs.readFileSync(new URL(entry.file,root))),entry.sha256,entry.file);
const retention=JSON.parse(fs.readFileSync(new URL('retention-sources.json',directory)));
for(const entry of retention.sources)assert.equal(sha(fs.readFileSync(new URL(entry.file,directory))),entry.sha256,entry.file);
const bytes=gunzipSync(fs.readFileSync(new URL('tree-oracle.json.gz',directory)));assert.equal(sha(bytes),manifest.output,'original tree fixture provenance');
const cases=JSON.parse(bytes);assert.equal(cases.length,manifest.cases);
for(const c of cases){
 assert.deepEqual(hitPointerTree(c.tree,c),{path:c.path,direct:c.direct},`${c.label}/${c.type}/${c.x}/${c.y}`);
 for(const [id,count]of Object.entries(c.activation))assert.equal(count,!c.disabledLeaf&&id===c.path.at(-1)?1:0,'original consumed Main/Final down/up '+c.label+'/'+id);
}
console.log(`Pointer tree: ${cases.length} independent original normal-node sibling/ancestor/clip/density/z-order paths and direct ClickableNode consumption records passed. Explicit platform hosts and wider input/path/scheduler boundaries remain documented.`);
