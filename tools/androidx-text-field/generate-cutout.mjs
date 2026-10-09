import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),here=fileURLToPath(new URL('./',import.meta.url)),directory=path.join(root,'test/fixtures/androidx/text-field'),cache=path.join(root,'research/text-field-cutout-generator'),runtime=path.join(root,'research/kotlin-runtime');
fs.mkdirSync(cache,{recursive:true});const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const field=JSON.parse(fs.readFileSync(path.join(directory,'sources.json'))),row=JSON.parse(fs.readFileSync(path.join(root,'test/fixtures/androidx/toolbar-row/sources.json')));
if(field.revision!==row.revision)throw Error('Mismatched reference revisions');
const sources=[{...field.sources.find(s=>s.file==='OutlinedTextField.kt'),path:'test/fixtures/androidx/text-field/OutlinedTextField.kt'},{...row.sources.find(s=>s.file==='Alignment.kt'),path:'test/fixtures/androidx/toolbar-row/Alignment.kt'}];
for(const s of sources)if(hash(fs.readFileSync(path.join(root,s.path)))!==s.sha256)throw Error('Original SHA '+s.path);
function body(text,marker){const start=text.indexOf(marker);if(start<0)throw Error('Missing '+marker);const first=text.indexOf('{',start);let depth=0;for(let i=first;i<text.length;i++){if(text[i]==='{')depth++;else if(text[i]==='}'&&--depth===0)return text.slice(start,i+1);}throw Error('Unclosed original body');}
const outlined=fs.readFileSync(path.join(directory,'OutlinedTextField.kt'),'utf8'),alignment=fs.readFileSync(path.join(root,sources[1].path),'utf8');
const clip=body(outlined,'internal fun Modifier.outlineCutout('),padding=outlined.match(/private val OutlinedTextFieldInnerPadding\s+get\(\) = [^\n]+/)?.[0];if(!padding)throw Error('Missing original cutout padding');
const horizontal=body(alignment,'public data class Horizontal(val bias: Float) : Alignment.Horizontal');
const license=outlined.slice(0,outlined.indexOf('@file:'));
fs.writeFileSync(path.join(cache,'Original.kt'),license+'package reference\nimport kotlin.math.roundToInt\n'+clip+'\n'+padding+'\n'+horizontal+'\n');
fs.writeFileSync(path.join(cache,'Host.kt'),fs.readFileSync(path.join(here,'CutoutHost.kt')));
const run=args=>{const r=spawnSync('java',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});if(r.status!==0)throw Error(r.stderr||r.stdout);return r.stdout;};
const cp=path.join(runtime,'stdlib.jar');run(['-cp',path.join(runtime,'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-jvm-target','1.8','-d',path.join(cache,'reference.jar'),path.join(cache,'Original.kt'),path.join(cache,'Host.kt')]);
const rows=JSON.parse(run(['-cp',path.join(cache,'reference.jar')+path.delimiter+cp,'reference.HostKt'])),bytes=Buffer.from(JSON.stringify(rows)+'\n');
fs.writeFileSync(path.join(directory,'cutout.json'),bytes);fs.writeFileSync(path.join(directory,'cutout.meta.json'),JSON.stringify({revision:field.revision,count:rows.length,sha256:hash(bytes),sources,hosts:['generate-cutout.mjs','CutoutHost.kt'].map(file=>({path:'tools/androidx-text-field/'+file,sha256:hash(fs.readFileSync(path.join(here,file)))})),scope:'Unchanged outlineCutout draw body and BiasAlignment.Horizontal class. Density1 Dp/padding, logical DrawScope and clip-call recorder hosts; finite JVM roundToInt supplies fastRoundToInt. No source modifier/cache scheduling or native border/path/raster.'},null,2)+'\n');
console.log('Generated '+rows.length+' unchanged original cutout/alignment records, SHA '+hash(bytes));
