import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {ButtonShapeState,ButtonShapeComposition,buttonCornerRadius} from '../../src/components/button-shape.js';
import {SpringPhysics} from '../../src/motion/spring-physics.js';
const directory=new URL('../fixtures/androidx/button/',import.meta.url);
for(const {file,sha256}of JSON.parse(fs.readFileSync(new URL('sources.json',directory))).sources)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(file,directory))).digest('hex'),sha256,file);
const cases=JSON.parse(fs.readFileSync(new URL('shape-oracle.json',directory)),(_,v)=>typeof v==='number'?Math.fround(v):v);
const shape=id=>id==='round'?{unit:'percent',value:50}:{unit:'px',value:Number(id)};
let frames=0;
for(const c of cases){
  const state=new ButtonShapeState(shape('round')),spec=SpringPhysics.SCHEMES[c.scheme].effectMedium;let at=0;
  for(const expected of c.frames){
    while(at<c.events.length&&c.events[at].time<=expected.time){state.animateToShape(shape(c.events[at].shape),spec,expected.time);at++;}
    const actual=state.progress.sample(expected.time),radius=buttonCornerRadius(state.getMorphedShape(expected.time),expected.time>=144?120:160,expected.time>=144?80:40);
    for(const [field,value]of [['progress',actual.position],['velocity',actual.velocity],['radius',radius]])assert.ok(Math.abs(value-expected[field])<2e-5,`${JSON.stringify(c.events)} ${field}@${expected.time}: ${value} != ${expected[field]}`);
    frames++;
  }
}
console.log(`Button shape: ${cases.length} original AnimatedShapeState histories/${frames} native progress, reversal velocity, third-target reset and lazy resized corners passed.`);

const composition=JSON.parse(fs.readFileSync(new URL('composition-oracle.json',directory)),(_,v)=>typeof v==='number'?Math.fround(v):v);
let composedFrames=0;
for(const c of composition){
  const memory=new ButtonShapeComposition(),roles={small:shape('8'),medium:shape('12'),large:shape('16'),'extra-large':shape('28')};
  let size='s',square=false,pressed=false,spec=SpringPhysics.SCHEMES[c.scheme].effectMedium,at=0,generation=0,previous;
  const render=time=>{
    const [base,press]={xs:['medium','small'],s:['medium','small'],m:['large','medium'],l:['extra-large','large'],xl:['extra-large','large']}[size];
    const state=memory.update({shape:square?roles[base]:shape('round'),pressedShape:roles[press]},pressed,spec,time);
    if(state!==previous){generation++;previous=state;}return state;
  };
  render(0);
  for(const expected of c.frames){
    while(at<c.events.length&&c.events[at].time<=expected.time){
      const e=c.events[at++];size=e.size??size;square=e.square??square;pressed=e.pressed??pressed;
      if(e.spec)spec=e.spec;else if(e.scheme)spec=SpringPhysics.SCHEMES[e.scheme].effectMedium;
      if(e.role)roles[e.role]={unit:e.percent?'percent':'px',value:e.value};
      render(expected.time);
    }
    const state=render(expected.time),actual=state.progress.sample(expected.time);
    const radius=buttonCornerRadius(state.getMorphedShape(expected.time),expected.time>=144?240:320,expected.time>=144?180:160);
    assert.equal(generation,expected.generation,`${c.name}/${c.scheme} remembered state@${expected.time}`);
    for(const [field,value]of [['progress',actual.position],['velocity',actual.velocity],['radius',radius]])assert.ok(Math.abs(value-expected[field])<2e-5,`${c.name}/${c.scheme} ${field}@${expected.time}: ${value} != ${expected[field]}`);
    composedFrames++;
  }
}
console.log(`Button composition: ${composition.length} original public shape/default/remember histories/${composedFrames} frames passed, including shape-pair/spec replacement and equal-value retention.`);

const toggleDirectory=new URL('../fixtures/androidx/toggle-button/',import.meta.url);
for(const {file,sha256}of JSON.parse(fs.readFileSync(new URL('sources.json',toggleDirectory))).sources)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(file,toggleDirectory))).digest('hex'),sha256,file);
const toggles=JSON.parse(fs.readFileSync(new URL('composition-oracle.json',toggleDirectory)),(_,v)=>typeof v==='number'?Math.fround(v):v);
let toggleFrames=0;
for(const c of toggles){
  const memory=new ButtonShapeComposition(),roles={small:shape('8'),medium:shape('12'),large:shape('16'),'extra-large':shape('28')};
  let size='s',square=false,pressed=false,checked=false,spec=SpringPhysics.SCHEMES[c.scheme].spatialFast,at=0,generation=0,previous;
  const render=time=>{
    const [base,press]={xs:['medium','small'],s:['medium','small'],m:['large','medium'],l:['extra-large','large'],xl:['extra-large','large']}[size];
    const state=memory.update({shape:square?roles[base]:shape('round'),pressedShape:size==='s'?shape('6'):roles[press],checkedShape:square?shape('round'):roles[base]},pressed,spec,time,checked);
    if(state!==previous){generation++;previous=state;}return state;
  };
  render(0);
  for(const expected of c.frames){
    while(at<c.events.length&&c.events[at].time<=expected.time){
      const e=c.events[at++];size=e.size??size;square=e.square??square;pressed=e.pressed??pressed;checked=e.checked??checked;
      if(e.scheme)spec=SpringPhysics.SCHEMES[e.scheme].spatialFast;
      if(e.role)roles[e.role]={unit:e.percent?'percent':'px',value:e.value};render(expected.time);
    }
    const state=render(expected.time),actual=state.progress.sample(expected.time),radius=buttonCornerRadius(state.getMorphedShape(expected.time),expected.time>=144?240:320,expected.time>=144?180:160);
    assert.equal(generation,expected.generation,`${c.name}/${c.scheme} Toggle remembered state@${expected.time}`);
    for(const [field,value]of [['progress',actual.position],['velocity',actual.velocity],['radius',radius]])assert.ok(Math.abs(value-expected[field])<2e-5,`${c.name}/${c.scheme} Toggle ${field}@${expected.time}: ${value} != ${expected[field]}`);
    if(radius<0)assert.equal(expected.outlineRadius,null,'complete native outline precondition rejects negative extrapolated corners');
    else assert.ok(Math.abs(expected.outlineRadius-Math.min(radius,expected.time>=144?90:80))<2e-5,'complete native outline normalizes uniform corner sums');
    toggleFrames++;
  }
}
console.log(`ToggleButton composition: ${toggles.length} original three-shape/FastSpatial/default/remember histories/${toggleFrames} frames passed, including checked changes during press and key/spec replacement.`);
