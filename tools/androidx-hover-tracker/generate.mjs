import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';import {gzipSync,gunzipSync} from 'node:zlib';
const cache='research/hover-tracker-reproduction',fixture='test/fixtures/androidx/hover-tracker';fs.mkdirSync(cache,{recursive:true});
const runtime=path.resolve('research/kotlin-runtime'),sha=value=>createHash('sha256').update(value).digest('hex');
const provenance=JSON.parse(fs.readFileSync(`${fixture}/sources.json`,'utf8'));
const inherited=[];
for(const [family,file] of [['pointer','PointerEvent.kt'],['ripple','FoundationClickable.kt']]){
 const parent=JSON.parse(fs.readFileSync(`test/fixtures/androidx/${family}/sources.json`,'utf8')).sources.find(entry=>entry.file===file);
 const input=`test/fixtures/androidx/${family}/${file}`;
 if(!parent||sha(fs.readFileSync(input))!==parent.sha256)throw Error('Native parent source changed: '+input);
 inherited.push({...parent,file:input});
}
const generated=[];
for(const {file,sha256} of provenance.sources) {
 const source=fs.readFileSync(`${fixture}/${file}`,'utf8');if(sha(source)!==sha256)throw Error(file);
 const text=source.replace(/^import androidx\.(?!compose\.ui\.(ComposeUiFlags|ExperimentalComposeUiApi)$).*\r?\n/gm,'').replace('package androidx.compose.ui.input.pointer.util','package androidx.compose.ui.input.pointer').replace(/\bactual\s+/g,'');
 const target=`${cache}/Jvm-${file}`;fs.writeFileSync(target,text);generated.push(target);
}
const pointer=fs.readFileSync('test/fixtures/androidx/pointer/PointerEvent.kt','utf8'),marker='public fun PointerInputChange.isOutOfBounds(size: IntSize): Boolean';
const start=pointer.indexOf(marker),end=pointer.indexOf('\n}',start)+2;if(start<0||end<2)throw Error(marker);
const target=`${cache}/Bounds.kt`;fs.writeFileSync(target,'package androidx.compose.ui.input.pointer\n'+pointer.slice(start,end)+'\n');generated.push(target);
function block(source,marker){const start=source.indexOf(marker),open=source.indexOf('{',start);if(start<0)throw Error(marker);let depth=0;for(let end=open;end<source.length;end++){depth+=(source[end]==='{')-(source[end]==='}');if(!depth)return source.slice(start,end+1);}throw Error(marker);}
const clickable=fs.readFileSync('test/fixtures/androidx/ripple/FoundationClickable.kt','utf8'),base=clickable.slice(clickable.indexOf('internal abstract class AbstractClickableNode('));
const actorBodies=['override fun onPointerEvent(','override fun onCancelPointerInput()','private fun emitHoverEnter()','private fun emitHoverExit()','protected fun disposeInteractions()','protected fun updateCommon('].map(marker=>block(base,marker));
const actor=`${cache}/Actor.kt`;fs.writeFileSync(actor,'package androidx.compose.ui.input.pointer\ninternal class OriginalHoverActor:HoverActorHost(){\n'+actorBodies.join('\n')+'\nfun updateEnabled(value:Boolean){updateCommon(interactionSource,indicationNodeFactory,useLocalIndication,value,onClickLabel,role,onClick)}\n}\n');generated.push(actor);
const eventType=`${cache}/EventType.kt`;fs.writeFileSync(eventType,'package androidx.compose.ui.input.pointer\nimport androidx.compose.ui.ExperimentalComposeUiApi\n@JvmInline\n'+block(pointer,'public value class PointerEventType private constructor')+'\n');generated.push(eventType);
const hosts=['TrackerHost.kt','PlatformHost.kt','AndroidHost.kt','AndroidVersionHost.kt','HoverActorHost.kt'].map(file=>`tools/androidx-hover-tracker/${file}`),jar=path.resolve(cache,'tracker.jar'),stdlib=path.join(runtime,'stdlib.jar');
const compile=spawnSync('java',['-cp',path.join(runtime,'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',stdlib,'-jvm-target','1.8','-d',jar,...generated,...hosts],{encoding:'utf8'});
if(compile.status)throw Error(compile.stderr||compile.error?.message||'compiler failed');
const run=spawnSync('java',['-cp',jar+path.delimiter+stdlib,'androidx.compose.ui.input.pointer.TrackerHostKt'],{encoding:'utf8',maxBuffer:16*1024*1024});if(run.status)throw Error(run.stderr||run.error?.message||'native controller failed');
const records=JSON.parse(run.stdout),json=JSON.stringify(records)+'\n';fs.writeFileSync(`${cache}/tracker-oracle.json`,json);
const output=`${fixture}/tracker-oracle.json.gz`;
const manifest={...provenance,inherited,generated:generated.map(file=>({file:path.basename(file),sha256:sha(fs.readFileSync(file))})),hosts:hosts.map(file=>({file,sha256:sha(fs.readFileSync(file))})),cases:records.length,output:sha(json),scope:'Complete original HitPathTracker/NodeParent/Node, PointerIdArray, Android InternalPointerEvent, PointerEventType and rectangular isOutOfBounds bodies. Complete original AbstractClickableNode onPointerEvent/onCancelPointerInput/emitHoverEnter/emitHoverExit/disposeInteractions/updateCommon methods. JVM import/package/actual-declaration adaptation only. Supplied collections/modifier/affine coordinates/Android event records plus synchronous coroutine emitter and focus/indication/gesture-delegation hosts; the complete AbstractClickableNode class is not executed. Scripted already-routed single-pointer Mouse/Touch/Pen paths, root bounds, cancellation/removal/re-entry and enabled changes. No complete OS processor, gesture recognition, full collector/coroutine, multi-pointer scheduling, arbitrary matrices or raster claim.'};
if(process.argv.includes('--check')){
 if(gunzipSync(fs.readFileSync(output)).toString()!==json)throw Error('native tracker fixture differs');
 if(JSON.stringify(JSON.parse(fs.readFileSync(`${fixture}/provenance.json`,'utf8')))!==JSON.stringify(manifest))throw Error('native provenance differs');
}else{fs.writeFileSync(output,gzipSync(json));fs.writeFileSync(`${fixture}/provenance.json`,JSON.stringify(manifest,null,2)+'\n');}
console.log(`${records.length} complete original HitPathTracker histories; SHA-256 ${sha(json)}. Collection/coordinate/modifier/Android event hosts supplied; no complete OS processor/raster claim.`);
