import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {standardLinearLayout,standardCircularLayout,linearIndeterminateFractions,circularIndeterminateState,linearWavyLayout,linearWaveSegments} from '../../src/components/progress-indicator-layout.js';
import {circularProgressCubics,centerProgressCubics,measureProgressPath,progressPathSegment} from '../../src/components/progress-indicator-path.js';
const dir=new URL('../fixtures/androidx/progress-indicators/',import.meta.url),read=name=>fs.readFileSync(new URL(name,dir),'utf8');
const manifest=JSON.parse(read('sources.json'));
for(const source of manifest.sources)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(source.file,dir))).digest('hex'),source.sha256,source.file);
const near=(a,b,label,tolerance=.00002)=>assert.ok(Math.abs(a-b)<=tolerance,`${label}: ${a} vs ${b}`);
const oracle=JSON.parse(read('standard-drawing-oracle.json'),(key,value)=>typeof value==='number'?Math.fround(value):value);
for(const [index,c]of oracle.entries()){
  const cap=c.cap.toLowerCase();
  if(c.kind==='linear'){
    const actual=standardLinearLayout({width:c.width,height:4,progress:c.progress,gap:c.gap,cap});
    for(const [role,key]of [['track','tracks'],['active','active']]){
      const expected=c.records.filter(r=>r[0]==='line'&&r[1]===role&&(r[7]!=='Butt'||r[2]!==r[4]));
      assert.equal(actual[key].length,expected.length,'source line count '+index+'/'+role);
      actual[key].forEach((line,i)=>{near(line[0],expected[i][2],'source start '+index);near(line[1],expected[i][4],'source end '+index);assert.equal(actual.cap,expected[i][7].toLowerCase());});
    }
    const stop=c.records.find(r=>r[0]==='circle'||r[0]==='rect');assert.ok(stop);
    near(actual.stop.x,stop[0]==='circle'?stop[2]:stop[2]+stop[4]/2,'source stop x');near(actual.stop.size,stop[0]==='circle'?stop[4]*2:stop[4],'source stop size');
  }else{
    const actual=standardCircularLayout({size:c.width,progress:c.progress,gap:c.gap,cap});
    const track=c.records.find(r=>r[1]==='track'),active=c.records.find(r=>r[1]==='active');
    near(actual.start,active[2],'source active angle');near(actual.sweep,active[3],'source active sweep');near(actual.radius,active[4],'source radius');near(actual.trackStart,track[2],'source track start');near(actual.trackSweep,track[3],'source track sweep');
  }
}
assert.match(read('ProgressIndicatorTokens.kt'),/TrackColor[^]*SecondaryContainer/);
assert.match(read('ProgressIndicator.kt'),/circularIndeterminateTrackColor[^]*Color.Transparent/);
assert.match(read('LinearProgressIndicatorTokens.kt'),/ActiveWaveWavelength[^]*40.0.dp/);
assert.match(read('CircularProgressIndicatorTokens.kt'),/WaveSize[^]*48.0.dp/);

// Boundary samples catch the lower-key easing placement, cycle length and head/tail delays.
assert.deepEqual(linearIndeterminateFractions(0),[0,0,0,0]);
assert.deepEqual(linearIndeterminateFractions(1750),[0,0,0,0]);
assert.equal(linearIndeterminateFractions(1000)[1],1);assert.equal(linearIndeterminateFractions(1250)[0],1);
assert.equal(linearIndeterminateFractions(1500)[3],1);assert.ok(linearIndeterminateFractions(1000)[2]>0);
assert.deepEqual(linearIndeterminateFractions(1000.9),linearIndeterminateFractions(1000),'native keyframes use integer milliseconds');
near(circularIndeterminateState(150).rotation,72,'first rotation ramp uses linear lower key');
near(circularIndeterminateState(300).rotation,144,'first hold');
near(circularIndeterminateState(1500).rotation,360,'second ramp begins');
near(circularIndeterminateState(3000).progress,Math.fround(.87),'maximum sweep');
near(circularIndeterminateState(6000).progress,Math.fround(.1),'cycle restart');

// Native quadratic half-waves have a flat track and a shrinking stop at completion.
const wavy=linearWavyLayout({width:240,height:10,fractions:[0,.75]});
assert.deepEqual(wavy.tracks,[[238,188]]);assert.deepEqual(wavy.active,[[2,180]]);
const half=linearWaveSegments(0,20,{height:10,wavelength:40});
assert.equal(half.length,1);near(half[0][1][1],11,'source max-height quadratic control');near(half[0][2][0],20,'quadratic endpoint');
assert.deepEqual(linearWaveSegments(0,20,{height:10,wavelength:40,amplitude:0}),[[[0,5],[10,5],[20,5]]]);
assert.equal(linearWavyLayout({width:240,height:10,fractions:[0,1]}).stop,null);
assert.ok(linearWavyLayout({width:240,height:10,fractions:[0,.98]}).stop.size<4);
for(const n of [5,7,9,11,32,128,256])for(const amplitude of [0,.5,1]){
  const cubics=centerProgressCubics(circularProgressCubics(n,amplitude,true),48,4),path=measureProgressPath(cubics);
  assert.ok(path.length>100&&path.length<300,'bounded source path length');
  const segment=progressPathSegment(path,.8*path.length,1.3*path.length);assert.ok(segment.length>0);
  for(const point of segment.flat())assert.ok(point.every(Number.isFinite),'finite measured source path');
}
console.log(`Progress parity: ${oracle.length} unchanged Kotlin drawing cases, source token roles, keyframe boundaries and browser path adapter checks passed.`);
