import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {checkboxPoints,checkboxPath,checkboxBox} from '../../src/motion/selection-motion.js';
const dir=new URL('../fixtures/androidx/selection/',import.meta.url);
for(const [file,s]of Object.entries(JSON.parse(fs.readFileSync(new URL('sources.json',dir)))))
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(file.replace('tokens/',''),dir))).digest('hex'),s.sha256,file);
const native=JSON.parse(fs.readFileSync(new URL('md3-checkbox-drawing-oracle.json',dir)),(_,v)=>typeof v==='number'?Math.fround(v):v);
let points=0,boxes=0;
for(const c of native.marks.filter(c=>c.md3)){
  assert.deepEqual(checkboxPoints(c.gravity,c.width),c.points,'unchanged native MD3 control points');points++;
  const path=checkboxPath(c.fraction,c.gravity,c.width);
  if(c.fraction<=0)assert.equal(path,'');
  else if(c.fraction>=1){
    const coords=path.match(/-?[\d.]+(?:e[+-]?\d+)?/g).map(Number);
    c.points.flat().forEach((v,i)=>assert.ok(Math.abs(coords[i]-v)<1e-12,'full native polyline endpoint'));
    assert.equal(path,checkboxPath(1,c.gravity,c.width),'overshoot clips rather than repeating');
  }
}
for(const c of native.boxes){
  const geometry=checkboxBox(c.width,c.stroke,2,c.filled);
  const rects=[geometry.fill,...geometry.outline?[geometry.outline]:[]];
  assert.equal(rects.length,c.rects.length);
  rects.forEach((r,i)=>assert.deepEqual([r.x,r.y,r.width,r.height,r.radius,r.stroke??0],
    [...c.rects[i].offset,...c.rects[i].size,c.rects[i].radius,c.rects[i].stroke],'unchanged native drawBox geometry'));
  boxes++;
}
assert.match(fs.readFileSync(new URL('CheckboxTokens.kt',dir),'utf8'),/ContainerSize:[^\n]*\n\s*get\(\) = 18\.0\.dp/);
assert.match(fs.readFileSync(new URL('ComposeMaterial3Flags.kt',dir),'utf8'),/When `false`, it uses older Material Design 2 styling/);
const webDir=new URL('../fixtures/material-web/checkbox/',import.meta.url);
for(const source of JSON.parse(fs.readFileSync(new URL('sources.json',webDir))).sources)
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(source.file,webDir))).digest('hex'),source.sha256,source.file);
const spec=JSON.parse(fs.readFileSync(new URL('current-spec-decisions.json',webDir)));
const table=fs.readFileSync(new URL('checkbox-v0_192.scss',webDir),'utf8').replace(/\s+/g,' ');
const roleName=name=>name.replace(/([a-z])([A-Z])/g,'$1-$2').toLowerCase();
for(const [profile,decisions]of Object.entries(spec.states))for(const [kind,key]of [['hover','stateLayer'],['focus','stateLayer'],['pressed','press']]){
  const token=profile==='error'?`error-${kind}-state-layer-color`:`${profile}-${kind}-state-layer-color`;
  assert.ok(table.includes(`'${token}': map.get($deps, 'md-sys-color', '${roleName(decisions[key])}')`),'current visible spec role corroborated by pinned Google token mapping: '+token);
}
console.log(`Checkbox MD3: ${points} exact native Float control-point/segment inputs and ${boxes} drawBox geometry records passed; token size18 and disabled markSurface are native profile decisions. PathMeasure/raster/layout remain separate.`);
