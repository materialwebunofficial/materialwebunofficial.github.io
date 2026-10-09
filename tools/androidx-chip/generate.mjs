import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),here=fileURLToPath(new URL('./',import.meta.url)),directory=path.join(root,'test/fixtures/androidx/chip'),cache=path.join(root,'research/chip-generator'),runtime=path.join(root,'research/kotlin-runtime');fs.mkdirSync(cache,{recursive:true});
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),manifest=JSON.parse(fs.readFileSync(path.join(directory,'sources.json')));
for(const source of manifest.sources)if(hash(fs.readFileSync(path.join(directory,source.file)))!==source.sha256)throw Error('Original source SHA '+source.file);
const read=file=>fs.readFileSync(path.join(directory,file),'utf8').replaceAll('\r\n','\n'),save=(file,text)=>fs.writeFileSync(path.join(cache,file),text);
function balanced(text,start,open='{',close='}') {const first=text.indexOf(open,start);if(first<0)throw Error('Missing delimiter');let depth=0;for(let i=first;i<text.length;i++){if(text[i]===open)depth++;else if(text[i]===close&&--depth===0)return text.slice(start,i+1);}throw Error('Unclosed original');}
const chip=read('Chip.kt'),license=chip.slice(0,chip.indexOf('package '));
const block=marker=>{const start=chip.indexOf(marker);if(start<0)throw Error('Missing original '+marker);return balanced(chip,start);};
function func(marker){const start=chip.indexOf(marker);if(start<0)throw Error('Missing '+marker);const header=balanced(chip,start,'(',')'),end=start+header.length,body=chip.indexOf('{',end),equal=chip.indexOf('=',end);return body>=0&&body<equal?balanced(chip,start):chip.slice(start,equal+1)+balanced(chip,equal+1,'(',')');}
const colors=[...new Set([...chip.matchAll(/ColorSchemeKeyTokens\.(\w+)/g)].map(m=>m[1]))],shapes=new Set(),typographies=new Set();
const tokens=manifest.sources.filter(source=>source.file.endsWith('Tokens.kt')).map(({file})=>{
 const text=read(file);for(const m of text.matchAll(/ColorSchemeKeyTokens\.(\w+)/g))if(!colors.includes(m[1]))colors.push(m[1]);for(const m of text.matchAll(/ShapeKeyTokens\.(\w+)/g))shapes.add(m[1]);for(const m of text.matchAll(/TypographyKeyTokens\.(\w+)/g))typographies.add(m[1]);
 return text.slice(text.indexOf('internal object')).replaceAll('androidx.compose.ui.unit.Dp','Dp');
});
const factories=['Assist','ElevatedAssist','Filter','ElevatedFilter','Input','Suggestion','ElevatedSuggestion'].map(name=>{
 const start=chip.indexOf('internal val ColorScheme.default'+name+'ChipColors:'),call=chip.indexOf('?: ',start)+3;
 if(start<0||call<3)throw Error('Missing factory '+name);return 'fun '+name.toLowerCase()+'Colors()='+balanced(chip,call,'(',')');
});
const tonal=['Filter','ElevatedFilter','Input'].map(name=>{
 const start=chip.indexOf('internal val ColorScheme.defaultTonal'+(name==='ElevatedFilter'?'ElevatedFilter':name)+'ChipColors:'),call=chip.indexOf('.copy(',start);if(start<0||call<0)throw Error('Missing tonal '+name);return 'fun tonal'+name+'Colors()='+name.toLowerCase()+'Colors()'+balanced(chip,call,'(',')');
});
const border=['assist','filter','input','suggestion'].map(name=>func('public fun '+name+'ChipBorder(\n        enabled: Boolean'));
const elevations=['assist','elevatedAssist','filter','elevatedFilter','input','suggestion','elevatedSuggestion'].map(name=>func('public fun '+name+'ChipElevation('));
const objects=['Filter','Input'].map(name=>{
 const start=chip.indexOf('public object '+name+'ChipDefaults'),section=chip.slice(start,chip.indexOf('\n/**',start+30));
 const props=['HorizontalSpacing','CompactHorizontalSpacing'].map(prop=>chip.slice(chip.indexOf('public val '+prop+':',start)).split('\n')[0]);
 const marker=name==='Filter'?'public fun horizontalArrangement(\n        hasLeadingIcon: Boolean':'public fun horizontalArrangement(\n        hasAvatar: Boolean';
 const functionStart=chip.indexOf(marker,start);if(functionStart<0)throw Error('Missing arrangement '+name);
 const body=balanced(chip,functionStart),padding=name==='Input'?func('public fun contentPadding(\n        hasAvatar: Boolean'):'';
 return 'object '+name+'Defaults{\n'+props.join('\n')+'\n'+body+'\n'+padding+'\n}';
});
const shapeStart=chip.indexOf('internal val Shapes.defaultChipShapes:');const shapeCall=chip.indexOf('?: ChipShapes(',shapeStart)+3;
const shapeFactory='fun expressiveShapes()='+balanced(chip,shapeCall,'(',')');
const shapeChecks=chip.slice(chip.indexOf('internal val ChipShapes.hasRoundedCornerShapes:'),chip.indexOf('@Composable\nprivate fun shapeByInteraction'));
const suggestionStart=chip.indexOf('public object SuggestionChipDefaults'),suggestionSpacing=chip.slice(chip.indexOf('public val HorizontalSpacing:',suggestionStart)).split('\n')[0],defaultArrangement=chip.slice(chip.indexOf('private val DefaultHorizontalArrangement =')).split('\n')[0];
save('Original.kt',license+'package reference\n'+tokens.join('\n')+'\n'+block('public class ChipColors(')+'\n'+block('public class SelectableChipColors(')+'\n'+factories.concat(tonal,border,elevations,objects).join('\n')+'\n'+block('private class ChipArrangement(').replace('private class','internal class')+'\nobject SuggestionChipDefaults{'+suggestionSpacing+'}\n'+defaultArrangement+'\n'+block('public class ChipShapes(')+'\n'+shapeChecks+'\n'+block('private fun shapeByInteraction(').replace('private fun','fun')+'\n'+shapeFactory);
let host=fs.readFileSync(path.join(here,'ReferenceHost.kt'),'utf8').replace('/*COLORS*/',colors.join(',')).replace('/*SHAPES*/',[...shapes].join(',')).replace('/*TYPOGRAPHIES*/',[...typographies].join(','));save('Host.kt',host);
const run=args=>{const r=spawnSync('java',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});if(r.status!==0)throw Error(r.stderr||r.stdout);return r.stdout;},cp=path.join(runtime,'stdlib.jar');
run(['-cp',path.join(runtime,'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-jvm-target','1.8','-d',path.join(cache,'reference.jar'),path.join(cache,'Original.kt'),path.join(cache,'Host.kt')]);
const rows=JSON.parse(run(['-cp',path.join(cache,'reference.jar')+path.delimiter+cp,'reference.HostKt'])),bytes=Buffer.from(JSON.stringify(rows)+'\n');
fs.writeFileSync(path.join(directory,'foundation.json'),bytes);fs.writeFileSync(path.join(directory,'foundation.meta.json'),JSON.stringify({revision:manifest.revision,count:rows.length,sha256:hash(bytes),sources:manifest.sources,hosts:['generate.mjs','ReferenceHost.kt'].map(file=>({file:'tools/androidx-chip/'+file,sha256:hash(fs.readFileSync(path.join(here,file)))})),scope:'Unchanged complete color classes/getters/copy, default color constructor/copy arguments, current border and elevation factory defaults, input padding and complete compact ChipArrangement, ChipShapes/default constructor/selection priority. Symbolic role/alpha-copy/shape, Dp/Density/Arrangement, elevation descriptor and animated-shape identity hosts. No native packed Color, Row/Surface/modifier/composition runtime, elevation/shape/content animation frames or raster.'},null,2)+'\n');console.log('Generated '+rows.length+' original chip foundation records, SHA '+hash(bytes));
