import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {PickerTimeState,PickerAnalogState,pickerAtan,pickerCircularLayout,pickerPostSlop} from '../../src/components/picker-clock-state.js';
import {SpringValue} from '../../src/motion/selection-motion.js';
const directory=new URL('../fixtures/androidx/picker/',import.meta.url),bytes=fs.readFileSync(new URL('clock.json',directory)),reference=JSON.parse(bytes),meta=JSON.parse(fs.readFileSync(new URL('clock.meta.json',directory)));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');assert.equal(hash(bytes),meta.sha256);
for(const source of [...meta.sources,...meta.hosts])assert.equal(hash(fs.readFileSync(new URL('../../'+source.file,import.meta.url))),source.sha256,source.file);
function compare(actual,expected,path=''){
 if(typeof expected==='number'){assert(Math.abs(actual-expected)<=Math.max(1e-5,Math.abs(expected)*1e-7),path+': '+actual+' != '+expected);return;}
 if(Array.isArray(expected)){assert.equal(actual.length,expected.length,path);expected.forEach((v,i)=>compare(actual[i],v,path+'['+i+']'));return;}
 if(expected&&typeof expected==='object'){assert.deepEqual(Object.keys(actual),Object.keys(expected),path);for(const key of Object.keys(expected))compare(actual[key],expected[key],path+'.'+key);return;}
 // Kotlin Float.toString is a decimal representation, not a bit dump.
 if(typeof expected==='string'&&/^(animate|snap):/.test(expected)){
  const a=actual.split(':'),e=expected.split(':');assert.equal(a[0],e[0]);compare(+a[1],+e[1],path);assert.equal(a[2],e[2]);return;
 }
 assert.equal(actual,expected,path);
}
for(const row of reference){
 if(row.type==='spring'){const channel=new SpringValue(Math.fround(row.from));channel.to(Math.fround(row.to),{stiffness:row.stiffness,dampingRatio:row.dampingRatio},{now:0,velocity:Math.fround(row.velocity)});assert(Math.abs(channel.animation.duration-row.duration)<=1);for(const sample of row.samples)compare(channel.sample(sample.time),{position:sample.position,velocity:sample.velocity},'spring '+JSON.stringify(row)+' '+sample.time);continue;}
 if(row.type==='layout'){assert.deepEqual(pickerCircularLayout(row.size,row.ratio),row.result);continue;}
 if(row.type==='slop'){compare(pickerPostSlop(row.x,row.y,row.slop),row.result,'slop');continue;}
 const base=new PickerTimeState(row.hour,row.minute??17,row.is24,row.selection??'Hour');
 if(row.type==='inputState'){base.hourInput=row.value;base.minuteInput=row.value;assert.deepEqual({hour:base.hour,minute:base.minute,hourInput:base.hourInput,minuteInput:base.minuteInput,valid:base.isInputValid},row.result);continue;}
 const operations=[],animation={value:0,targetValue:0,replace(value){this.value=this.targetValue=value;},snapTo(value,priority){operations.push('priority:'+priority,'snap:'+value);this.value=this.targetValue=value;},async animateTo(value,priority){operations.push('priority:'+priority,'animate:'+value+':DefaultSpatial');this.value=this.targetValue=value;}};
 const state=new PickerAnalogState(base,animation,async delay=>operations.push('delay:'+delay));state.currentDiameter=row.diameter??256;
 const snapshot=()=>({hour:state.hour,minute:state.minute,hourInput:base.hourInput,minuteInput:base.minuteInput,selection:state.selection,angle:state.currentAngle,...state.selectorPos,operations:[...operations]});
 const context=JSON.stringify({...row,result:undefined,tapped:undefined,switched:undefined,dragged:undefined,ended:undefined});
 if(row.type==='initial')compare(snapshot(),row.result,context);
 else if(row.type==='tap'){
  const center={x:Math.trunc(state.currentDiameter/2),y:Math.trunc(state.currentDiameter/2)};
  await state.onTap(row.x,row.y,Math.fround(74*Math.fround(state.currentDiameter/256)),true,center);compare(snapshot(),row.tapped,context+' tapped');
  operations.length=0;await state.animateToCurrent();compare(snapshot(),row.switched,context+' switched');
 }else{
  await state.rotateTo(pickerAtan(Math.fround(Math.fround(row.y)-128),Math.fround(Math.fround(row.x)-128)));state.moveSelector(row.x,row.y,74,{x:128,y:128});compare(snapshot(),row.dragged,context+' dragged');
  operations.length=0;state.selection='Minute';await state.onGestureEnd();compare(snapshot(),row.ended,context+' ended');
 }
}
for(const values of [[7,30,false],[19,59,true,1]])assert.deepEqual(PickerTimeState.restore(values).save(),[values[0],values[1],values[2],values[3]??0]);
console.log('Picker clock: '+reference.length+' original state/Float angle/tap/drag/selector/layout/slop records, pinned source and host hashes verified');
