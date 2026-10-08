import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {CardElevationMotion,cardElevationValues,cardElevationDefinition} from '../../src/motion/card-elevation.js';
import {InteractionOrder} from '../../src/motion/interaction-tween.js';
const bytes=gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/card/elevation-oracle.json.gz',import.meta.url))),provenance=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/card/elevation-provenance.json',import.meta.url)));
assert.equal(createHash('sha256').update(bytes).digest('hex'),provenance.output);
assert.equal(provenance.output,'0760815c63274878f13b0d9f0446151b53645b9778757976d91758546fcf377b');
const native=JSON.parse(bytes);let frames=0;
for(const c of native){
 if(c.kind==='null-source'){const model=new CardElevationMotion(c.values,false,false);assert.equal(model.value,c.initial);model.update([9,8,7,6,4,5],null,true,32);assert.equal(model.value,c.changed);assert.equal(c.remembered,true);continue;}
 if(c.kind==='factory-override'){assert.deepEqual(cardElevationValues(c.configuration,{defaultElevation:c.defaultElevation}),c.values);continue;}
 if(['filled','elevated','outlined'].includes(c.configuration))assert.deepEqual(cardElevationValues(c.configuration),c.values[c.configuration]);
 const values=Object.fromEntries(Object.entries(c.values).map(([key,array])=>[key,array.map(Math.fround)])),model=new CardElevationMotion(values[c.configuration],c.initialEnabled),order=new InteractionOrder();let config=c.configuration,enabled=c.initialEnabled,at=0;
 for(const expected of c.frames){
  while(at<c.events.length&&c.events[at].time<=expected.time){const event=c.events[at++];if(event.enabled!==undefined)enabled=event.enabled;if(event.config)config=event.config;if(event.event){const id=event.event.slice(0,-1),kind=id.startsWith('press')?'press':id.startsWith('drag')?'drag':id;order.set(kind,event.event.endsWith('+'),id);}model.update(values[config],order.latest(),enabled,event.time);}
  model.update(values[config],order.latest(),enabled,expected.time);
  const actual={value:model.sample(expected.time),velocity:model.velocity(expected.time),target:model.target,from:model.from,start:model.start,duration:model.spec?.duration??0,easing:model.spec?.easing??'null',launches:model.launches,snaps:model.snaps,order:order.active};
  const floatExpected=JSON.parse(JSON.stringify(expected),(_,value)=>typeof value==='number'?Math.fround(value):value);delete floatExpected.time;
  assert.deepEqual(actual,floatExpected,`${c.configuration}/${c.name}@${expected.time}`);frames++;
 }
}
assert.deepEqual(cardElevationValues('outlined',{defaultElevation:4}),[4,4,4,4,0,6]);
assert.equal(Object.isFrozen(cardElevationDefinition({hoveredElevation:4})),true);assert.throws(()=>cardElevationDefinition({hoveredElevation:Infinity}));assert.throws(()=>cardElevationDefinition(null));
console.log(`Card elevation: ${native.length} complete original class/default/null-source histories and ${frames} exact Float/velocity/target/spec/order frames passed; no full composable/layout/raster claim.`);
