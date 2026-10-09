// Compile complete original Chip content bodies and their native layout policies.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {gzipSync} from 'node:zlib';
const root=fileURLToPath(new URL('../../',import.meta.url)),here=fileURLToPath(new URL('./',import.meta.url));
const fixture=path.join(root,'test/fixtures/androidx/chip'),base=path.join(root,'research/toolbar-row-generator'),cache=path.join(root,'research/chip-layout-generator'),runtime=path.join(root,'research/kotlin-runtime');
fs.mkdirSync(cache,{recursive:true});
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const sources=[];
for(const directory of ['chip','toolbar-row'])for(const manifest of directory==='chip'?['sources.json','layout-sources.json']:['sources.json']){
 const data=JSON.parse(fs.readFileSync(path.join(root,'test/fixtures/androidx',directory,manifest)));
 for(const entry of data.sources){const file=path.join(root,'test/fixtures/androidx',directory,entry.file);if(hash(fs.readFileSync(file))!==entry.sha256)throw Error('Original SHA '+file);sources.push({...entry,file:'test/fixtures/androidx/'+directory+'/'+entry.file});}
}
const run=(command,args)=>{const r=spawnSync(command,args,{cwd:root,encoding:'utf8',maxBuffer:128*1024*1024});if(r.status!==0)throw Error(r.stderr||r.stdout);return r.stdout;};
// This only assembles the same licensed policies; it neither compiles nor rewrites old fixtures.
run('python',['tools/androidx-toolbar-row/generate.py','--policies-only']);
const read=(directory,file)=>fs.readFileSync(path.join(directory,file),'utf8').replaceAll('\r\n','\n');
function block(source,marker){const start=source.indexOf(marker);if(start<0)throw Error(marker);const first=source.indexOf('{',start);let depth=0;for(let i=first;i<source.length;i++){if(source[i]==='{')depth++;else if(source[i]==='}'&&--depth===0)return source.slice(start,i+1);}throw Error('Unclosed '+marker);}
const chip=read(fixture,'Chip.kt'),intrinsic=read(fixture,'Intrinsic.kt'),box=read(fixture,'Box.kt'),size=read(path.join(root,'test/fixtures/androidx/toolbar-row'),'Size.kt');
const fullBodies=[block(chip,'private fun ChipContent('),block(chip,'private fun AnimatingChipContent('),chip.slice(chip.indexOf('private fun leadingContent('),chip.indexOf('/**\n * Represents the elevation used in a selectable chip'))];
const layoutBodies=[block(intrinsic,'private class IntrinsicWidthNode('),block(intrinsic,'private abstract class IntrinsicSizeModifier'),block(size,'private class UnspecifiedConstraintsNode('),block(box,'private data class BoxMeasurePolicy('),block(box,'private fun Placeable.PlacementScope.placeInBox('),block(chip,'private class ChipArrangement(')];
fs.writeFileSync(path.join(cache,'OriginalContent.kt'),chip.slice(0,chip.indexOf('package '))+'package androidx.compose.material3\nimport kotlin.math.*\n'+fullBodies.join('\n')+'\n'+layoutBodies.map(body=>body.replace('private class','class').replace('private abstract class','abstract class').replace('private data class','data class')).join('\n')+'\n'+read(here,'LayoutHost.kt').replace('package androidx.compose.material3\nimport kotlin.math.*\n',''));
let tree=read(base,'Tree.kt').replace('object Modifier{open class Node','open class Modifier(val nodes:List<LayoutModifierNode> = emptyList(),val data:Any?=null){companion object:Modifier();open class Node');
tree=tree.replace('fun Placeable.place(x:Int,y:Int)=','fun Placeable.place(position:IntOffset)=place(position.x,position.y)\n  fun Placeable.placeRelative(position:IntOffset)=placeRelative(position.x,position.y)\n  fun Placeable.place(x:Int,y:Int)=');
fs.writeFileSync(path.join(cache,'Tree.kt'),tree);
let adapter=read(path.join(root,'tools/androidx-toolbar-row'),'Adapter.kt');
for(const kind of ['min','max'])for(const axis of ['Width','Height']){
 const argument=axis==='Width'?'height':'width',method=kind+'Intrinsic'+axis;
 adapter=adapter.replace('fun IntrinsicMeasureScope.'+method+'(measurables:List<IntrinsicMeasurable>,'+argument+':Int):Int','fun IntrinsicMeasureScope.'+method+'(measurables:List<IntrinsicMeasurable>,'+argument+':Int):Int=chipDefaultIntrinsic(this@MeasurePolicy,measurables,'+argument+','+(axis==='Width')+','+(kind==='min')+')');
}
fs.writeFileSync(path.join(cache,'Adapter.kt'),adapter);
const cp=path.join(runtime,'stdlib.jar');
run('java',['-cp',path.join(runtime,'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-jvm-target','1.8','-d',path.join(cache,'reference.jar'),path.join(base,'Constraints.kt'),path.join(base,'Policy.kt'),path.join(cache,'Tree.kt'),path.join(cache,'Adapter.kt'),path.join(cache,'OriginalContent.kt')]);
const records=JSON.parse(run('java',['-cp',path.join(cache,'reference.jar')+path.delimiter+cp,'androidx.compose.material3.OriginalContentKt'])),bytes=Buffer.from(JSON.stringify(records)+'\n');
const hosts=['tools/androidx-chip/generate-layout.mjs','tools/androidx-chip/LayoutHost.kt','tools/androidx-toolbar-row/generate.py','tools/androidx-toolbar-row/Adapter.kt','tools/androidx-toolbar-row/VisibilityAdapter.kt','tools/androidx-toolbar-constraints/Adapter.kt'].map(file=>({file,sha256:hash(fs.readFileSync(path.join(root,file)))}));
const meta={revision:'a095da93f8e98dea8748ceed79ea8427aade245f',count:records.length,sha256:hash(bytes),sources,hosts,scope:'Complete original ChipContent and AnimatingChipContent bodies execute in a recording composable DSL. Complete original Row/Column, Box measure/place, ChipArrangement, IntrinsicWidth/IntrinsicSizeModifier, UnspecifiedConstraintsNode, SizeNode, PaddingValuesModifier, Constraints/Alignment and Placeable arithmetic execute. Fixed/wrapping leaf and default-intrinsic proxy, composition locals and atomic visibility samples are explicit host boundaries. No Android text/font/raster, full Compose composition/Transition or real event scheduling.'};
for(const [file,value]of [['layout.json.gz',gzipSync(bytes,{mtime:0})],['layout.meta.json',Buffer.from(JSON.stringify(meta,null,2)+'\n')]]){
 const target=path.join(fixture,file);if(process.argv.includes('--check')){if(!fs.readFileSync(target).equals(value))throw Error('Reference drift '+file);}else fs.writeFileSync(target,value);
}
console.log('Original Chip content trees: '+records.length+' cases, SHA '+hash(bytes));
const retained=JSON.parse(run('java',['-cp',path.join(cache,'reference.jar')+path.delimiter+cp,'androidx.compose.material3.OriginalContentKt','retained'])),retainedBytes=Buffer.from(JSON.stringify(retained)+'\n');
const retainedMeta={revision:meta.revision,count:retained.length,sha256:hash(retainedBytes),sources,hosts,scope:'Complete original leadingContent/trailingContent/rememberRetainedState bodies, sequential retained remember slot and composition-local stack hosts. Lambda captures and avatar inheritance verified; full composition/Transition lifetime remains separate.'};
for(const [file,value]of [['retained.json',retainedBytes],['retained.meta.json',Buffer.from(JSON.stringify(retainedMeta,null,2)+'\n')]]){const target=path.join(fixture,file);if(process.argv.includes('--check')){if(!fs.readFileSync(target).equals(value))throw Error('Reference drift '+file);}else fs.writeFileSync(target,value);}
console.log('Original Chip retained closures: '+retained.length+' frames, SHA '+hash(retainedBytes));
