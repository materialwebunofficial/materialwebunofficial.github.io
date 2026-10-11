import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';
function snapshot(directory){
 const result={};
 const visit=folder=>{for(const item of fs.readdirSync(folder,{withFileTypes:true})){
  const file=path.join(folder,item.name);if(item.isDirectory())visit(file);
  else result[path.relative(directory,file).replaceAll('\\','/')]=createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 }};visit(directory);return result;
}
const before=snapshot('dist');
const siteBefore=Object.fromEntries(['assets/showcase.js','assets/showcase.css'].map(file=>[file,createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const built=spawnSync(process.execPath,['scripts/build.js'],{stdio:'inherit'});
assert.equal(built.status,0,'build succeeds');
assert.deepEqual(snapshot('dist'),before,'dist must match a fresh deterministic build; rebuild and include the generated files');
assert.deepEqual(Object.fromEntries(Object.keys(siteBefore).map(file=>[file,createHash('sha256').update(fs.readFileSync(file)).digest('hex')])),siteBefore,'showcase assets must match their sources');
console.log('Distribution matches source and canonical declarations');
