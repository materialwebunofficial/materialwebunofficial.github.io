import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
const root=process.cwd(),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'md3e-clean-'));
const tracked=spawnSync('git',['ls-files','-z'],{encoding:'utf8'});
assert.equal(tracked.status,0,tracked.stderr);
try{
 for(const relative of tracked.stdout.split('\0').filter(Boolean)){
  if(!fs.existsSync(relative))continue;
  const destination=path.resolve(temporary,relative);
  assert.ok(destination.startsWith(temporary+path.sep));
  fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(relative,destination);
 }
 // No workspace node_modules, ignored scripts, or parent-folder resolution.
 const npm=process.env.npm_execpath||path.resolve(path.dirname(process.execPath),
  process.platform==='win32'?'node_modules/npm/bin/npm-cli.js':'../lib/node_modules/npm/bin/npm-cli.js');
 for(const args of [['ci'],['test'],['run','build'],['run','test:types']]){
  const result=spawnSync(process.execPath,[npm,...args],{cwd:temporary,stdio:'inherit',env:{...process.env,NODE_PATH:''}});
  assert.equal(result.status,0,`clean checkout npm ${args.join(' ')}`);
 }
 console.log('Clean tracked-files checkout: install, unit tests, build and consumer types passed');
}finally{
 assert.ok(path.resolve(temporary).startsWith(path.resolve(os.tmpdir())+path.sep));
 assert.notEqual(path.resolve(temporary),path.resolve(root));
 fs.rmSync(temporary,{recursive:true,force:true});
}
