import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {sliderTrackLayout,sliderThumbOffset,sliderPointerValue,SliderPointerState,RangeSliderPointerState,snapSliderValue,sliderTrackPath} from '../../src/components/slider-layout.js';
const dir=new URL('../fixtures/androidx/sliders/',import.meta.url),read=name=>fs.readFileSync(new URL(name,dir),'utf8');
for(const s of JSON.parse(read('sources.json')).sources)assert.equal(crypto.createHash('sha256').update(read(s.file)).digest('hex'),s.sha256,s.file);
const cases=JSON.parse(read('drawing-oracle.json'),(key,value)=>typeof value==='number'?Math.fround(value):value);
const near=(a,b,label)=>assert.equal(a,b,label);
for(const [index,c]of cases.entries()){
 const layout=sliderTrackLayout({...c,range:c.mode==='range',centered:c.mode==='centered',vertical:c.mode==='vertical'});
 const paths=layout.paths.map(p=>['path',p.role,p.bounds.left,p.bounds.top,p.bounds.right,p.bounds.bottom,...p.radii.map(r=>r[0])]);
 const dots=layout.dots.map(d=>['circle',d.role,c.mode==='vertical'?8:d.position,c.mode==='vertical'?d.position:8,2]);
 const expectedPaths=c.records.filter(r=>r[0]==='path'),expectedDots=c.records.filter(r=>r[0]==='circle');
 assert.equal(paths.length,expectedPaths.length,'source path count '+index);assert.equal(dots.length,expectedDots.length,'source dot count '+index);
 for(const [actual,expected]of [[paths,expectedPaths],[dots,expectedDots]])actual.forEach((r,i)=>r.forEach((v,j)=>typeof v==='number'?near(v,expected[i][j],`source ${index}/${i}/${j}`):assert.equal(v,expected[i][j])));
 near(snapSliderValue(Math.fround(c.end*100),0,100,c.steps),c.snap,'source snap '+index);
 for(const p of layout.paths)assert.ok(!/NaN|Infinity/.test(sliderTrackPath(p)));
}
assert.equal(sliderThumbOffset(240,0,4),0);assert.equal(sliderThumbOffset(240,1,4),240);assert.equal(sliderThumbOffset(240,.2,4),53);
assert.equal(snapSliderValue(10,0,100,4),0,'first native anchor wins an exact tie');
const pointers=JSON.parse(read('pointer-oracle.json'),(key,value)=>typeof value==='number'?Math.fround(value):value);
for(const c of pointers)assert.equal(sliderPointerValue(c.coordinate,c.total,c.min,c.max,c.steps),c.value,'unchanged source pointer scaling '+JSON.stringify(c));
const histories=JSON.parse(read('input-state-oracle.json'),(key,value)=>typeof value==='number'?Math.fround(value):value);
let frames=0;
for(const [i,c]of histories.single.entries()){
 const state=new SliderPointerState(c.min,c.max,c.steps);state.total=c.total;
 let value=snapSliderValue(Math.fround(Math.fround(.5*c.min)+Math.fround(.5*c.max)),c.min,c.max,c.steps);
 for(const [j,row]of c.frames.entries()){
  const [kind,argument]=row;let changed=false;
  if(kind==='press')state.press(c.reverse?Math.fround(c.total-argument):argument);
  else{const next=state.drag(argument);changed=next!==value;if(changed)value=snapSliderValue(next,c.min,c.max,c.steps);}
  assert.deepEqual([kind,argument,state.rawOffset,state.pressOffset,value,changed],row,`source single state ${i}/${j}`);frames++;
 }
}
for(const [i,c]of histories.range.entries()){
 const state=new RangeSliderPointerState(c.min,c.max,c.steps);let start=c.start,end=c.end;
 for(const [j,row]of c.frames.entries()){
  let actual;
  if(row[0]==='update'){
   state.update(row[1],start,end,row[2]);
   actual=['update',row[1],row[2],state.rawOffsetStart,state.rawOffsetEnd,state.minPx,state.maxPx,start,end];
  }else{
   state.start=start;state.end=end;
   const next=state.drag(row[1],row[2]),changed=!Object.is(next[0],start)||!Object.is(next[1],end);
   if(changed){start=snapSliderValue(next[0],c.min,c.max,c.steps);end=snapSliderValue(next[1],c.min,c.max,c.steps);}
   actual=['drag',row[1],row[2],state.rawOffsetStart,state.rawOffsetEnd,start,end,changed];
  }
  assert.deepEqual(actual,row,`source range state ${i}/${j}`);frames++;
 }
}
console.log(`Slider parity: ${cases.length} exact Float Kotlin track/dot/snap cases, ${pointers.length} source pointer mappings and ${histories.single.length+histories.range.length} state histories (${frames} frames) passed.`);
