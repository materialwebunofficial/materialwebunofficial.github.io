import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {toolbarRowLayout} from '../../src/components/toolbar-layout.js';

const root=new URL('../fixtures/androidx/toolbar-inner-alignment/',import.meta.url),read=name=>fs.readFileSync(new URL(name,root));
for(const e of JSON.parse(read('sources.json')).sources)assert.equal(createHash('sha256').update(read(e.file)).digest('hex'),e.sha256,e.file);
const all=JSON.parse(gunzipSync(read('inner-oracle.json.gz')));
const find=(node,id)=>node.id===id?node:node.children.map(p=>find(p.node,id)).find(Boolean);
for(const c of all){
 const i=c.input,convert=p=>({main:i.vertical?Math.max(p.native?48:0,p.height):Math.max(p.native?48:0,p.width),cross:i.vertical?Math.max(p.native?48:0,p.width):Math.max(p.native?48:0,p.height),ink:p.native?{width:p.width,height:p.height}:null,weight:p.weight,fill:p.fill,align:p.align==='default'?null:p.align,line:p.line??null});
 const main=i.main.map(convert),leading=i.presence&1?i.leading.map(convert):[],trailing=i.presence&2?i.trailing.map(convert):[];
 const layout=toolbarRowLayout({...i,sample:i.sample<0?undefined:i.sample,main,leading,trailing,hasVisibleLeading:!!(i.presence&1)&&i.expanded,hasVisibleTrailing:!!(i.presence&2)&&i.expanded,
  leadingComposed:i.composed,trailingComposed:i.composed,leadingSettled:i.settled,trailingSettled:i.settled,leadingCurrent:i.leadCurrent,trailingCurrent:i.trailCurrent,
  leadingSample:i.sample<0?undefined:i.sample,trailingSample:i.sample<0?undefined:i.sample,leadingCross:i.sample<0?undefined:i.cross,trailingCross:i.sample<0?undefined:i.cross});
 assert.deepEqual(layout.size,c.size,JSON.stringify(i));assert.deepEqual(layout.lines,c.lines,JSON.stringify(i));
 for(const[id,box]of Object.entries(c.placements)){
  const match=id.match(/^(leading|main|trailing)-row-(\d+)(-body|-touch)?$/);
  const mapped=match?match[1]+match[2]+(match[3]==='-body'?'-body':''):id;let actual=layout.placements[mapped];
  if(match&&!match[3]&&i[match[1]][+match[2]].native){const node=find(layout.node,mapped);actual={...actual,x:actual.x-node.offset.x,y:actual.y-node.offset.y,...node.size};}
  assert.deepEqual(actual,box,id+' '+JSON.stringify(i));
 }
}
console.log(`Toolbar omitted composable defaults: ${all.length} original policy-factory/Top/logical Start/explicit Scope.align/relative-line/native modifier trees passed.`);
