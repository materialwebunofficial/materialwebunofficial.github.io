import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {SpringValue} from '../../src/motion/selection-motion.js';
import {ColorSpringVector} from '../../src/motion/color-motion.js';
import {SpringPhysics} from '../../src/motion/spring-physics.js';
import {buttonBorderStroke} from '../../src/components/button-border.js';
const root=new URL('../fixtures/androidx/',import.meta.url);
for(const [directory,manifest]of [['toggle-button/','toggle-button/sources.json'],['motion/','../../../tools/androidx-motion/sources.json'],['color/','color/sources.json'],['toolbar-size-motion/','toolbar-size-motion/sources.json']]){
  const data=JSON.parse(fs.readFileSync(new URL(manifest,root)));
  const entries=data.sources??Object.entries(data).map(([file,v])=>({file,...v}));
  for(const {file,sha256}of entries)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(directory+file,root))).digest('hex'),sha256,file);
}
const cases=JSON.parse(fs.readFileSync(new URL('toggle-button/border-oracle.json',root)),(_,v)=>typeof v==='number'?Math.fround(v):v);
export const convertedColor=values=>values.map((value,i)=>Math.max(i<2?0:-.5,Math.min(i<2?1:.5,value)));
let frames=0,strokes=0;
for(const c of cases){
  let checked=c.initialChecked,enabled=c.initialEnabled,palette=0,scheme=c.scheme,effectsSpec=null,at=0;
  const targetColor=()=>checked?[0,0,0,0]:c.palettes[palette].map((v,i)=>i===0&&!enabled?Math.fround(.1):v);
  const width=new SpringValue(checked?0:1),color=new ColorSpringVector(targetColor());
  const render=time=>{width.to(checked?0:1,SpringPhysics.SCHEMES[scheme].spatialFast,{now:time});color.to(targetColor(),effectsSpec??SpringPhysics.SCHEMES[scheme].effectMedium,{now:time});};
  for(const expected of c.frames){
    while(at<c.events.length&&c.events[at].time<=expected.time){const e=c.events[at++];checked=e.checked??checked;enabled=e.enabled??enabled;palette=e.palette??palette;scheme=e.scheme??scheme;effectsSpec=e.effectsSpec??effectsSpec;render(expected.time);}
    render(expected.time);const w=width.sample(expected.time),v=color.sample(expected.time);
    for(const [key,actual]of [['width',w.position],['widthVelocity',w.velocity]])assert.ok(Math.abs(actual-expected[key])<2e-5,`${c.name}/${c.scheme} ${key}@${expected.time}: ${actual} != ${expected[key]}`);
    for(const [key,actual]of [['color',convertedColor(v.value)],['colorVelocity',v.velocity]])actual.forEach((value,i)=>assert.ok(Math.abs(value-expected[key][i])<2e-5,`${c.name}/${c.scheme} ${key}[${i}]@${expected.time}: ${value} != ${expected[key][i]}`));
    assert.equal(w.position>0,expected.visible,'original non-positive-width border omission');
    assert.equal(width.animation?.duration??null,expected.widthDuration,`${c.name}/${c.scheme}@${expected.time} original explicit FastSpatial .01 threshold/duration`);
    assert.equal(color.animation?.duration??null,expected.colorDuration,`${c.name}/${c.scheme}@${expected.time} original color-vector common duration`);frames++;
    for(const paint of expected.strokes){
      const actual=buttonBorderStroke(w.position,...paint.size,paint.density);
      assert.ok(Math.abs(actual-paint.stroke)<1e-6,`${c.name}/${c.scheme}@${expected.time} native pixel-ceiled stroke ${paint.size}@${paint.density}: ${actual} != ${paint.stroke}`);strokes++;
    }
  }
}
console.log(`Toggle border: ${cases.length} original border/animate*AsState histories/${frames} width/color frames and ${strokes} native pixel-ceiled strokes at three densities, zero/tiny/natural bounds; retarget velocities, common duration, cold targets and same-target spec retention passed.`);
