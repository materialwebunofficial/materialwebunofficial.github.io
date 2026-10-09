import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),here=fileURLToPath(new URL('./',import.meta.url));
const directory=path.join(root,'test/fixtures/androidx/text-field'),cache=path.join(root,'research/text-field-generator'),runtime=path.join(root,'research/kotlin-runtime');fs.mkdirSync(cache,{recursive:true});
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),manifest=JSON.parse(fs.readFileSync(path.join(directory,'sources.json')));
for(const source of manifest.sources)if(hash(fs.readFileSync(path.join(directory,source.file)))!==source.sha256)throw Error('Original source SHA '+source.file);
const read=file=>fs.readFileSync(path.join(directory,file),'utf8'),save=(file,text)=>fs.writeFileSync(path.join(cache,file),text);
function balanced(text,start,open,close){const first=text.indexOf(open,start);if(first<0)throw Error('Missing '+open);let depth=0;for(let i=first;i<text.length;i++){if(text[i]===open)depth++;else if(text[i]===close&&--depth===0)return text.slice(start,i+1);}throw Error('Unclosed original body');}
function body(text,marker){const start=text.indexOf(marker);if(start<0)throw Error('Missing '+marker);return balanced(text,start,'{','}');}
const defaults=read('TextFieldDefaults.kt'),impl=read('TextFieldImpl.kt'),license=defaults.slice(0,defaults.indexOf('@file:'));
const tokenNames=new Set(),tokens=['FilledTextFieldTokens.kt','OutlinedTextFieldTokens.kt'].map(file=>{
 const text=read(file),properties=[...text.matchAll(/    inline val \w+: ColorToken\s+get\(\) = ColorSchemeKeyTokens\.(\w+)/g)].map(match=>{tokenNames.add(match[1]);return match[0];});
 const opacity=[...text.matchAll(/    const val \w+Opacity = [^\n]+/g)].map(match=>match[0]);return 'internal object '+file.replace('.kt','')+'{\n'+properties.concat(opacity).join('\n')+'\n}';
});
const factory=(marker,name)=>{const start=defaults.indexOf(marker),call=defaults.indexOf('?: TextFieldColors(',start);if(start<0||call<0)throw Error('Missing original factory');return 'fun '+name+'():TextFieldColors { val localTextSelectionColors=LocalTextSelectionColors.current; return '+balanced(defaults,call+3,'(',')')+' }';};
const classStart=defaults.indexOf('public class TextFieldColors'),classHeader=defaults.slice(classStart,defaults.indexOf('{',classStart)+1);
const getters=['leadingIcon','trailingIcon','indicator','container','placeholder','label','text','supportingText','prefix','suffix'].map(name=>body(defaults,'public fun '+name+'Color('));
const cursor=defaults.match(/public fun cursorColor\(isError: Boolean\): Color = [^\n]+/)?.[0];if(!cursor)throw Error('Missing cursor getter');
const phases=body(impl,'private enum class InputPhase').replace('private enum','enum');
const transitions=['labelProgress','placeholderOpacity','affixOpacity'].map(name=>body(impl,'private fun Transition<InputPhase>.'+name).replace('private fun','fun'));
save('Original.kt',license+'package reference\n'+tokens.join('\n')+'\n'+classHeader+'\n'+getters.join('\n')+'\n'+cursor+'\n}\n'+factory('internal fun ColorScheme.defaultTextFieldColors(','filled')+'\n'+factory('internal val ColorScheme.defaultOutlinedTextFieldColors:','outlined')+'\n'+phases+'\n'+transitions.join('\n'));
const host=fs.readFileSync(path.join(here,'ReferenceHost.kt'),'utf8').replace('/*TOKEN_NAMES*/',[...tokenNames].join(','));save('Host.kt',host);
const run=(args)=>{const result=spawnSync('java',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});if(result.status!==0)throw Error(result.stderr||result.stdout);return result.stdout;};
const cp=path.join(runtime,'stdlib.jar');run(['-cp',path.join(runtime,'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-jvm-target','1.8','-d',path.join(cache,'reference.jar'),path.join(cache,'Original.kt'),path.join(cache,'Host.kt')]);
const rows=JSON.parse(run(['-cp',path.join(cache,'reference.jar')+path.delimiter+cp,'reference.HostKt'])),bytes=Buffer.from(JSON.stringify(rows)+'\n');
fs.writeFileSync(path.join(directory,'states.json'),bytes);fs.writeFileSync(path.join(directory,'states.meta.json'),JSON.stringify({revision:manifest.revision,count:rows.length,sha256:hash(bytes),sources:manifest.sources,hosts:['generate.mjs','ReferenceHost.kt'].map(file=>({file:'tools/androidx-text-field/'+file,sha256:hash(fs.readFileSync(path.join(here,file)))})),scope:'Unchanged default color constructor arguments, Color getter bodies and label/placeholder/affix Transition target/spec branches. Symbolic Color/ColorScheme/selection-local, State and descriptor-recording Transition hosts. No native packed Color/raster, actual Compose transition frame scheduling or measurement.'},null,2)+'\n');
console.log('Generated '+rows.length+' unchanged original text-field state/spec records, SHA '+hash(bytes));
