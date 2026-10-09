import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
const fixtures=path.join(root,'test/fixtures/androidx/exposed-dropdown'),menus=path.join(root,'test/fixtures/androidx/menus');
const cache=path.join(root,'research/exposed-dropdown-generator'),runtime=path.join(root,'research/kotlin-runtime');
fs.mkdirSync(fixtures,{recursive:true});fs.mkdirSync(cache,{recursive:true});
const revision='a095da93f8e98dea8748ceed79ea8427aade245f';
const hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const sourceFile=path.join(fixtures,'ExposedDropdownMenu.kt');
if(process.argv.includes('--download')){
 const url='https://raw.githubusercontent.com/androidx/androidx/'+revision+'/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/ExposedDropdownMenu.kt';
 const response=await fetch(url);if(!response.ok)throw new Error('Source download '+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());fs.writeFileSync(sourceFile,bytes);
 fs.writeFileSync(path.join(fixtures,'sources.json'),JSON.stringify({revision,sources:[{file:'ExposedDropdownMenu.kt',url,sha256:hash(bytes)}]},null,2)+'\n');
}
for(const folder of[fixtures,menus])for(const source of JSON.parse(fs.readFileSync(path.join(folder,'sources.json'),'utf8')).sources){
 if(hash(fs.readFileSync(path.join(folder,source.file)))!==source.sha256)throw new Error('Changed source '+source.file);
}
const read=file=>fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
function extract(source,prefix,bodyPrefix='{'){const start=source.indexOf(prefix);if(start<0)throw new Error('Missing '+prefix);let i=source.indexOf(bodyPrefix,start)+bodyPrefix.length,depth=1;while(depth){if(source[i]==='{')depth++;else if(source[i]==='}')depth--;i++;if(i>=source.length&&depth)throw new Error('Unclosed '+prefix);}return source.slice(start,i);}
const menu=read(path.join(menus,'Menu.kt')),exposed=read(sourceFile);
let positions=read(path.join(menus,'MenuPosition.kt'));positions=positions.slice(positions.indexOf('@Stable\ninternal object MenuPosition'));
positions=positions.replace('override var transformOrigin by mutableStateOf(TransformOrigin.Center)','override var transformOrigin = TransformOrigin.Center');
const imports=menu.split('\n').filter(line=>line.startsWith('import androidx.compose.material3.internal.MenuPosition.')).map(line=>line.replace('androidx.compose.material3.internal.MenuPosition.','androidx.compose.material3.MenuPosition.')).join('\n');
const parts=['public interface MenuPositionScope','public class MenuAnchorPosition','public interface DropdownMenuPopupPositionProvider','internal fun calculateTransformOrigin'].map(prefix=>extract(menu,prefix));
const scopeStart=menu.indexOf('internal class MenuPositionScopeImpl');parts.push(menu.slice(scopeStart,menu.indexOf('\n\n',scopeStart)));
const provider=extract(exposed,'@Stable\ninternal class ExposedDropdownMenuPositionProvider',') : DropdownMenuPopupPositionProvider {').replace('override var transformOrigin by mutableStateOf(TransformOrigin.Center)','override var transformOrigin = TransformOrigin.Center');
const policy='package androidx.compose.material3\nimport kotlin.math.max\nimport kotlin.math.min\nimport kotlin.math.roundToInt\n'+imports+'\n'+positions+'\n'+parts.join('\n')+'\n'+provider+'\n'+extract(exposed,'private fun calculateMaxHeight(')+'\nfun referenceHeight(window:IntRect,anchor:Rect?,margin:Int)=calculateMaxHeight(window,anchor,margin)\n';
fs.writeFileSync(path.join(cache,'Policy.kt'),policy);
const host=read(path.join(root,'tools/androidx-menus/Harness.kt')).split('fun main(args:Array<String>){')[0];
fs.writeFileSync(path.join(cache,'Host.kt'),host+'\ninterface State<T>{val value:T}\ndata class Rect(val left:Float,val top:Float,val right:Float,val bottom:Float)\n');
const classpath=path.join(runtime,'stdlib.jar'),jar=path.join(cache,'oracle.jar');
function run(args){const result=spawnSync('java',args,{encoding:'utf8',maxBuffer:16*1024*1024});if(result.status!==0)throw new Error(result.stderr||result.stdout||String(result.error));return result.stdout;}
run(['-cp',path.join(runtime,'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',classpath,'-jvm-target','1.8','-d',jar,path.join(cache,'Policy.kt'),path.join(cache,'Host.kt'),path.join(root,'tools/androidx-exposed-dropdown/Harness.kt')]);
for(const mode of['position','height']){
 const cases=JSON.parse(run(['-cp',jar+path.delimiter+classpath,'androidx.compose.material3.HarnessKt',mode]));
 fs.writeFileSync(path.join(fixtures,mode+'-oracle.json'),JSON.stringify(cases)+'\n');console.log('Executed unchanged ExposedDropdownMenu '+mode+': '+cases.length+' records.');
}
