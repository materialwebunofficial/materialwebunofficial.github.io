import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {toolbarFabContentLayout,toolbarRowLayout} from '../../src/components/toolbar-layout.js';
import {rowColumnIntrinsic} from '../../src/components/row-column-layout.js';

const base=new URL('../fixtures/androidx/toolbar-fab-content/',import.meta.url);
for(const source of JSON.parse(readFileSync(new URL('sources.json',base))).sources){
  assert.equal(createHash('sha256').update(readFileSync(new URL(source.file,base))).digest('hex'),source.sha256,source.file);
}
const read=name=>JSON.parse(gunzipSync(readFileSync(new URL(name+'-oracle.json.gz',base))));
const inputs=(values,vertical)=>values.map(i=>({main:vertical?i.height:i.width,cross:vertical?i.width:i.height,
  ...i.native?{main:Math.max(48,vertical?i.height:i.width),cross:Math.max(48,vertical?i.width:i.height),ink:{width:i.width,height:i.height}}:{},
  weight:i.weight,fill:i.fill,align:i.align==='default'?null:i.align,line:i.line}));
let queries=0,valid=0,invalid=0;
for(const c of read('intrinsic')){
  assert.deepEqual(rowColumnIntrinsic({vertical:c.vertical,children:inputs(c.main,c.vertical)},c.available),c.values,JSON.stringify(c));queries++;
}
for(const c of read('layout')){
  const o={...c.input,main:inputs(c.input.main,c.input.vertical)};
  if(c.error){assert.throws(()=>toolbarFabContentLayout(o),RangeError);invalid++;continue;}
  const actual=toolbarFabContentLayout(o),message=JSON.stringify(c.input);
  assert.equal(actual.intrinsic,c.intrinsic,message);assert.deepEqual(actual.size,c.size,message);
  assert.deepEqual(actual.requested,c.requested,message);assert.deepEqual(actual.scroll,c.scroll,message);
  for(const[id,p]of Object.entries(c.placements)){
    if(['root','policy'].includes(id))continue;
    const nativeIndex=/^content-(\d+)$/.exec(id),native=nativeIndex&&c.input.main[Number(nativeIndex[1])]?.native;
    if(native){
      const leaf=actual.node.children[Number(nativeIndex[1])].node,box=actual.placements[id];
      assert.deepEqual({x:box.x-leaf.offset.x,y:box.y-leaf.offset.y,...leaf.size},p,id+' '+message);
    }else{
      const key=id.endsWith('-touch')?id.slice(0,-6):id;
      assert.deepEqual(actual.placements[key],p,id+' '+message);
    }
  }
  valid++;
}
console.log(`Toolbar native with-FAB: ${queries} original native/default-modifier intrinsic groups, ${valid} original centered Row/Column/body/padding/scroll trees and ${invalid} source-invalid constraints passed.`);
const noFabCases=read('no-fab');
for(const c of noFabCases){
  const actual=toolbarRowLayout({...c.input,main:inputs(c.input.main,c.input.vertical),leading:[],trailing:[],padding:1,hasVisibleLeading:false,hasVisibleTrailing:false});
  assert.deepEqual(actual.size,c.size,JSON.stringify(c.input));
  for(const[id,p]of Object.entries(c.placements)){
    if(/^main-row-\d+$/.test(id)&&c.input.main[Number(id.split('-').at(-1))].native)continue;
    const key=id.replace(/^main-row-(\d+)-touch$/,'main$1').replace(/^main-row-(\d+)-body$/,'main$1-body').replace(/^main-row-(\d+)$/,'main$1');
    assert.deepEqual(actual.placements[key],p,id+' '+JSON.stringify(c.input));
  }
}
console.log(`Toolbar no-FAB entry: ${noFabCases.length} original natural balanced-padding constructor/default Row/Column trees passed.`);
