import fs from 'node:fs';import path from 'node:path';
import {sha256} from '../androidx-motion/finite-runtime.mjs';
export function preparePackedColorRuntime(root,cache){
 fs.mkdirSync(cache,{recursive:true});const sources=[],files=[],read=file=>fs.readFileSync(path.join(root,file),'utf8').replaceAll('\r\n','\n'),save=(file,contents)=>{const full=path.join(cache,file);fs.writeFileSync(full,contents);files.push(full);};
 const manifest=JSON.parse(read('test/fixtures/androidx/color/packed/sources.json'));
 for(const source of manifest.sources){const file='test/fixtures/androidx/color/packed/'+source.file;if(sha256(fs.readFileSync(path.join(root,file)))!==source.sha256)throw Error('Original SHA '+file);sources.push({...source,file});
  let body=read(file);
  // Bind common expect declarations to the complete original JVM actual bodies.
  // Declaration keywords alone are adapted; no numerical body is substituted.
  if(source.file==='UtilInlineClassHelper.kt')body=body.replace(/^public expect fun [^\n]+\n/gm,'');
  if(source.file==='InlineClassHelper.jvmAndAndroid.kt')body=body.replace(/\bactual\s+/g,'');
  save(source.file,body);
 }
 for(const [name,source]of Object.entries(JSON.parse(read('test/fixtures/androidx/color/sources.json')))){const file='test/fixtures/androidx/color/'+name;if(sha256(fs.readFileSync(path.join(root,file)))!==source.sha256)throw Error('Original SHA '+file);sources.push({...source,file});save(name,read(file));}
 const runtimeManifest=JSON.parse(read('test/fixtures/androidx/progress-runtime/sources.json'));
 for(const name of ['AnimationVectors.kt','VectorConverters.kt']){const entry=runtimeManifest.sources.find(source=>source.file===name),file='test/fixtures/androidx/progress-runtime/'+name;if(!entry||sha256(fs.readFileSync(path.join(root,file)))!==entry.sha256)throw Error('Original SHA '+file);sources.push({...entry,file});const original=read(file);
  if(name==='AnimationVectors.kt')save(name,original);else save('TwoWayConverter.kt',original.slice(0,original.indexOf('package '))+'package androidx.compose.animation.core\n'+original.slice(original.indexOf('public interface TwoWayConverter'),original.indexOf('internal inline fun lerp')));
 }
 return{sources,files,read,save};
}
