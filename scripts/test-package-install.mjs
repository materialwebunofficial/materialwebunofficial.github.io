import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';import {gzipSync} from 'node:zlib';import {build} from 'esbuild';
const root=process.cwd(),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'md3e-consumer-'));
const npm=process.env.npm_execpath||path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
function run(args,cwd=root){const result=spawnSync(process.execPath,[npm,...args],{cwd,encoding:'utf8'});assert.equal(result.status,0,result.stdout+result.stderr);return result.stdout;}
try{
 const packed=JSON.parse(run(['pack','--ignore-scripts','--json','--pack-destination',temporary]))[0];
 const files=new Set(packed.files.map(file=>file.path));
 assert.ok(files.has('src/shapes/corner-shape.js'),'selective components include shape dependencies');
 for(const file of files)assert.ok(!/material-symbols-(?:outlined|rounded\.full)\.woff2$/.test(file),'unused full icon font omitted');
 assert.ok(![...files].some(file=>file.endsWith('.map')),'default package omits debug maps');
 fs.writeFileSync(path.join(temporary,'package.json'),'{"type":"module","private":true}');
 run(['install','--ignore-scripts','--package-lock=false','--no-audit','--no-fund',path.join(temporary,packed.filename)],temporary);
 fs.copyFileSync('test/types/consumer.mts',path.join(temporary,'consumer.mts'));
 const types=spawnSync(process.execPath,[path.join(root,'node_modules/typescript/bin/tsc'),'--noEmit','--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','consumer.mts'],{cwd:temporary,encoding:'utf8'});
 assert.equal(types.status,0,types.stdout+types.stderr);
 const installed=path.join(temporary,'node_modules/@materialwebunofficial/md3e-web');
 for(const file of files)if(file.endsWith('.css')){
  const css=fs.readFileSync(path.join(installed,file),'utf8');
  for(const match of css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)){
   if(/^(?:data:|https?:|#)/.test(match[1]))continue;
   assert.ok(fs.existsSync(path.resolve(installed,path.dirname(file),match[1])),`${file}: packaged CSS asset ${match[1]}`);
  }
 }
 const metrics={archiveBytes:packed.size,unpackedBytes:packed.unpackedSize,fileCount:files.size,imports:{}};
 assert.ok(metrics.archiveBytes<3*1024*1024,'default archive stays below 3 MiB');
 assert.ok(metrics.unpackedBytes<8*1024*1024,'default installation stays below 8 MiB');
 for(const [name,entry]of Object.entries({root:"import {MdButton} from '@materialwebunofficial/md3e-web'; console.log(MdButton);",button:"import {MdButton} from '@materialwebunofficial/md3e-web/components/md-button.js'; console.log(MdButton);"})){
  const bundle=await build({stdin:{contents:entry,resolveDir:temporary,sourcefile:'consumer.js'},bundle:true,minify:true,format:'esm',write:false,metafile:true});
  metrics.imports[name]={bytes:bundle.outputFiles[0].contents.length,gzipBytes:gzipSync(bundle.outputFiles[0].contents).length};
 }
 assert.ok(metrics.imports.button.bytes<metrics.imports.root.bytes*.5,'selective component import avoids full registration bundle');
 assert.ok(metrics.imports.button.gzipBytes<80*1024,'selective button gzip stays below 80 KiB');
 const server=spawnSync(process.execPath,['--input-type=module','-e',"import {generateM3Scheme} from '@materialwebunofficial/md3e-web/theme'; if(!generateM3Scheme('#6750A4',false))process.exit(1);"],{cwd:temporary,encoding:'utf8'});
 assert.equal(server.status,0,server.stderr);
 fs.mkdirSync('artifacts/project-audit',{recursive:true});fs.writeFileSync('artifacts/project-audit/implementation-package.json',JSON.stringify(metrics,null,2)+'\n');
 console.log('Installed archive: strict root/component/theme types, CSS assets, selective bundling and server theme import passed');console.log(JSON.stringify(metrics));
}finally{
 assert.ok(path.resolve(temporary).startsWith(path.resolve(os.tmpdir())+path.sep));
 fs.rmSync(temporary,{recursive:true,force:true});
}
