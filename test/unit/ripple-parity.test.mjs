import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {rippleFrame,rippleRadii,RIPPLE_TIMING} from '../../src/motion/ripple-state.js';
import {elevationSpec,stateLayerSpec,interactionTween,InteractionOrder} from '../../src/motion/interaction-tween.js';
const dir=new URL('../fixtures/androidx/ripple/',import.meta.url);
for(const s of JSON.parse(fs.readFileSync(new URL('sources.json',dir))).sources)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(s.file,dir))).digest('hex'),s.sha256,s.file);
const source=fs.readFileSync(new URL('M3RippleAnimation.kt',dir),'utf8');
for(const [token,property]of [['FadeInDuration','fadeIn'],['RadiusDuration','expand'],['FadeOutDuration','fadeOut']])assert.equal(RIPPLE_TIMING[property],Number(source.match(new RegExp(token+' = (\\d+)'))[1]));
const cases=JSON.parse(fs.readFileSync(new URL('drawing-oracle.json',dir)),(key,value)=>typeof value==='number'?Math.fround(value):value);
for(const [i,c]of cases.entries()){
 const frame=rippleFrame(c,c.time,c.finishAt);
 assert.deepEqual([frame.radius,frame.x,frame.y,Math.fround(Math.fround(.1)*frame.alpha)],c.circle,'unchanged Material3 draw/tween '+i);
}
assert.equal(rippleFrame({width:56,height:56},1000).alpha,1,'held ripple persists');
assert.equal(rippleFrame({width:56,height:56},1000).settled,true,'settled held ripple does not need continuous frames');
assert.equal(rippleFrame({width:56,height:56},225,16).alpha,1,'early release waits for expansion');
assert.equal(rippleFrame({width:56,height:56},375,16).done,true,'early release ends after expand plus fade');
assert.equal(rippleFrame({width:56,height:56},650,500).done,true,'held release fades for 150ms');
assert.deepEqual(rippleRadii(0,0),{start:0,end:10});
console.log(`Ripple parity: ${cases.length} exact Float current Material3 native draw/tween cases passed.`);
const interactions=JSON.parse(fs.readFileSync(new URL('interaction-oracle.json',dir)),(key,value)=>typeof value==='number'?Math.fround(value):value);
let frames=0;
for(const [records,select]of [[interactions.elevations,elevationSpec],[interactions.layers,stateLayerSpec]])for(const c of records){
 const spec=select(c.fromKind,c.toKind);assert.equal(spec.duration,c.spec.duration,'unchanged native spec duration');
 if(c.spec.duration)assert.equal(spec.easing,c.spec.easing,'unchanged native easing selection');
 for(const [time,expected]of c.frames){assert.equal(interactionTween(c.from,c.to,time,spec),expected,`native interaction tween ${c.fromKind}/${c.toKind}/${time}`);frames++;}
}
for(const history of interactions.orders){const order=new InteractionOrder();for(const c of history){
 const owner=c.event.slice(0,-1);order.set(owner.replace(/\d+$/,''),c.event.endsWith('+'),owner);
 assert.equal(order.latest()??'null',c.fab,'unchanged FAB recent interaction');
 assert.equal(order.latest(false)??'null',c.layer,'unchanged state-layer recent interaction excludes presses');
 assert.equal(order.latest()==='hover'?8:6,c.target,'unchanged FAB target calculation');
}}
for(const c of interactions.interrupted)for(const [time,expected]of c.frames){assert.equal(interactionTween(c.from,6,time,elevationSpec('hover','press')),expected,'native interrupted elevation tween');frames++;}
console.log(`FAB interactions: ${frames} exact Float native spec/tween frames and ${interactions.orders.length} native ordering histories passed.`);
