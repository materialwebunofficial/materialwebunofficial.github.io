import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {rippleFrame} from '../../src/motion/ripple-state.js';
const dir=new URL('../fixtures/androidx/ripple/',import.meta.url);
for(const s of JSON.parse(fs.readFileSync(new URL('sources.json',dir))).sources)
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(s.file,dir))).digest('hex'),s.sha256,s.file);
const cases=['selection-drawing-oracle.json','checkbox-drawing-oracle.json'].flatMap(file=>JSON.parse(fs.readFileSync(new URL(file,dir)),(_,v)=>typeof v==='number'?Math.fround(v):v));
for(const [i,c]of cases.entries()){
  const frame=rippleFrame(c,c.time,c.finishAt);
  assert.deepEqual([frame.radius,frame.x,frame.y,Math.fround(Math.fround(.1)*frame.alpha)],c.circle,'native explicit-radius draw/tween '+i);
}
// These callsite/default checks are source inspection, not execution of a
// complete composable, its layout coordinator or its input tree.
const selection=new URL('../fixtures/androidx/selection/',import.meta.url);
for(const [file,s]of Object.entries(JSON.parse(fs.readFileSync(new URL('sources.json',selection)))))
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(file.replace('tokens/',''),selection))).digest('hex'),s.sha256,file);
for(const name of ['Checkbox','RadioButton','Switch']){
  const source=fs.readFileSync(new URL(name+'.kt',selection),'utf8');
  assert.match(source,new RegExp(`bounded = false,[\\s\\S]*?radius = ${name}Tokens.StateLayerSize / 2`));
  assert.match(fs.readFileSync(new URL(name+'Tokens.kt',selection),'utf8'),/StateLayerSize:[^\n]*\n\s*get\(\) = 40\.0\.dp/);
}
const rippleSource=fs.readFileSync(new URL('M3Ripple.kt',dir),'utf8');
assert.match(rippleSource,/override fun ContentDrawScope\.draw\(\) \{\s*drawContent\(\)\s*drawRipples\(\)\s*drawStateLayers\(\)/);
const colorSource=fs.readFileSync(new URL('Material3Ripple.kt',dir),'utf8');
assert.match(colorSource,/currentValueOf\(LocalContentColor\)/);
console.log(`Selection indication: ${cases.length} exact native Float fixed-radius draw/tween records and SHA-verified callsites/default color/draw order passed. Layout/raster equivalence is separate.`);
