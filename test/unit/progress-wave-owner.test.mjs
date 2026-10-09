import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import zlib from 'node:zlib';
import {ProgressWaveMotion} from '../../src/components/progress-wave-motion.js';
const directory=new URL('../fixtures/androidx/progress-runtime/',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('phase-owners.meta.json',directory)));
const bytes=zlib.gunzipSync(fs.readFileSync(new URL('phase-owners.json.gz',directory)));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),meta.sha256);
for(const source of [...meta.sources,...meta.hosts])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../../'+source.file,import.meta.url))).digest('hex'),source.sha256);
const rows=JSON.parse(bytes);assert.equal(rows.length,meta.count);
let motion=null,key=null,previous=null,restarts=0;
for(const row of rows){
 const identity=[row.type,row.initialWavelength,row.initialSpeed].join('/');
 if(identity!==key){key=identity;motion=new ProgressWaveMotion({circular:row.type==='circular',wavelength:row.initialWavelength,speed:row.initialSpeed,amplitude:0});previous=null;}
 const run=motion.run;
 switch(row.action){
  case'attach':motion.attach();break;
  case'detach':motion.detach();break;
  case'frame':motion.frame(row.number);break;
  case'wavelength':motion.setWavelength(row.number);break;
  case'speed':motion.setSpeed(row.number);break;
  case'amplitude':motion.setAmplitude(row.number);break;
  case'cache':motion.cache(row.number);break;
  default:throw Error('Unknown source action '+row.action);
 }
 assert.equal(motion.value,Math.fround(row.value),'original owner offset '+key+'/'+row.action+'/'+row.number);
 assert.equal(motion.active,row.active,'original owner job active '+key+'/'+row.action+'/'+row.number);
 if(previous?.active&&row.active&&row.changed){assert.notEqual(motion.run,run,'original replacement cancels previous running job');restarts++;}
 if(previous?.active&&row.active&&!row.changed)assert.equal(motion.run,run,'original job remains active without a replacement');
 previous=row;
}
assert.ok(restarts>=24);
console.log('Wave owner: '+rows.length+' strict original Dp/Float/coroutine setter, frame, cache, zero-amplitude/speed, cancellation/restart and detach/reattach states; '+restarts+' active replacements passed. Explicit cache/node/state hosts, no full Compose cache scheduling or determinate amplitude-owner claim.');
