import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {ChipElevationMotion} from '../../src/motion/chip-elevation.js';
import {InteractionOrder} from '../../src/motion/interaction-tween.js';
const directory=new URL('../fixtures/androidx/chip/',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('elevation.meta.json',directory))),bytes=fs.readFileSync(new URL('elevation.json',directory)),hash=value=>crypto.createHash('sha256').update(value).digest('hex');
assert.equal(hash(bytes),meta.sha256);for(const source of [...meta.sources,...meta.hosts])assert.equal(hash(fs.readFileSync(new URL('../../'+source.file,import.meta.url))),source.sha256,source.file);
assert.equal(hash(fs.readFileSync(new URL('foundation.json',directory))),meta.foundation);
const rows=JSON.parse(bytes);let frames=0;
for(const row of rows){
 const order=new InteractionOrder(),motion=new ChipElevationMotion(row.values[row.configuration],row.initialEnabled);
 let enabled=row.initialEnabled,configuration=row.configuration,at=0;
 for(const frame of row.frames){
  motion.sample(frame.time);
  while(at<row.events.length&&row.events[at].time<=frame.time){
   const event=row.events[at++];enabled=event.enabled??enabled;configuration=event.config??configuration;
   if(event.event){const identity=event.event.slice(0,-1),kind=identity.startsWith('press')?'press':identity.startsWith('drag')?'drag':identity;order.set(kind,event.event.endsWith('+'),identity);}
   motion.update(row.values[configuration],order.latest(),enabled,frame.time);
  }
  const value=motion.sample(frame.time);
  assert.ok(Math.abs(value-frame.value)<2e-5,row.configuration+'/'+row.name+' value@'+frame.time+': '+value+' vs '+frame.value);
  assert.equal(motion.target,frame.target);assert.equal(motion.spec?.duration??0,frame.duration);
  assert.equal(motion.launches,frame.launches);assert.equal(motion.snaps,frame.snaps);
  assert.equal(motion.lastInteraction??'null',frame.lastInteraction,row.configuration+'/'+row.name+' completed interaction@'+frame.time);
  assert.deepEqual(order.active,frame.order);frames++;
 }
}
assert.equal(rows.length,meta.count);
console.log('Chip elevation: '+rows.length+' complete original classes/effect histories, '+frames+' native FloatTween/target/spec/last-completed-interaction/order frames passed. Explicit sequential frame/value/continuation hosts; full runtime scheduling remains separate.');
