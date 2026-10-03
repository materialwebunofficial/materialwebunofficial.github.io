import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {toolbarRowLayout} from '../../src/components/toolbar-layout.js';
const root=new URL('../fixtures/androidx/toolbar-alignment/',import.meta.url),read=name=>fs.readFileSync(new URL(name,root));
for(const e of JSON.parse(read('sources.json')).sources)assert.equal(crypto.createHash('sha256').update(read(e.file)).digest('hex'),e.sha256,e.file);
const options=i=>({...i,main:i.main.map(p=>({main:i.vertical?Math.max(p.native?48:0,p.height):Math.max(p.native?48:0,p.width),cross:i.vertical?Math.max(p.native?48:0,p.width):Math.max(p.native?48:0,p.height),weight:p.weight,fill:p.fill,align:p.align,ink:p.native?{width:p.width,height:p.height}:null})),leading:i.presence&1?[{main:48,cross:48}]:[],trailing:i.presence&2?[{main:48,cross:48}]:[],hasVisibleLeading:!!(i.presence&1)&&i.expanded,hasVisibleTrailing:!!(i.presence&2)&&i.expanded});
const find=(node,id)=>node.id===id?node:node.children.map(p=>find(p.node,id)).find(Boolean);
const cases=JSON.parse(gunzipSync(read('alignment-oracle.json.gz')));
for(const c of cases){
 const layout=toolbarRowLayout(options(c.input));
 assert.deepEqual(layout.size,c.size,JSON.stringify(c.input));assert.deepEqual(layout.lines,c.lines,JSON.stringify(c.input));
 for(const[id,box]of Object.entries(c.placements)){
  const m=id.match(/^main-row-(\d+)(-body|-touch)?$/),mapped=m?'main'+m[1]+(m[2]==='-body'?'-body':''):id;
  let actual=layout.placements[mapped];
  if(m&&!m[2]&&c.input.main[+m[1]].native){const node=find(layout.node,mapped);actual={...actual,x:actual.x-node.offset.x,y:actual.y-node.offset.y,...node.size};}
  assert.deepEqual(actual,box,id+' '+JSON.stringify(c.input));
 }
}
console.log(`Toolbar automatic alignment: ${cases.length} unchanged Kotlin coordinator/merger/native Row/Column/balanced-padding cases passed.`);
