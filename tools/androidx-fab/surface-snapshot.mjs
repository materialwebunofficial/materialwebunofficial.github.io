// Execute unchanged sRGB constructor/compositor and ColorScheme methods.
// Color-space conversion, Dp and composition-local delivery are explicit hosts.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),fix=path.join(root,'test/fixtures/androidx/fab-surface');
const cache=path.join(root,'research/fab-surface-generator'),runtime=path.join(root,'research/kotlin-runtime');
const read=name=>fs.readFileSync(path.join(fix,name),'utf8').replaceAll('\r\n','\n');
for(const entry of JSON.parse(read('sources.json')).sources){
 const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(fix,entry.file))).digest('hex');
 if(hash!==entry.sha256)throw Error('Original source hash: '+entry.file);
}
function block(source,marker){
 const start=source.indexOf(marker),opening=source.indexOf('{',start);if(start<0)throw Error(marker);
 let depth=0;for(let end=opening;end<source.length;end++){
  depth+=(source[end]==='{')-(source[end]==='}');if(!depth)return source.slice(start,end+1);
 }throw Error(marker);
}
const color=read('Color.kt'),scheme=read('ColorScheme.kt');
const ctor=name=>`fun ${name}(red:Float,green:Float,blue:Float,alpha:Float=1f,colorSpace:ColorSpace=ColorSpaces.Srgb):Color {\n`+
 block(block(color,`${name==='Color'?'public':'internal'} fun ${name}(\n`),'if (colorSpace.isSrgb)')+'\nerror("Only source sRGB branch is hosted")\n}';
const content=scheme.slice(scheme.indexOf('public fun ColorScheme.contentColorFor'),scheme.indexOf('/**',scheme.indexOf('public fun ColorScheme.contentColorFor')));
const pairs=[...content.matchAll(/^\s+(\w+) -> (\w+)/gm)].map(m=>m.slice(1)).filter(p=>p[0]!=='else');
const names=[...new Set(pairs.flat().concat('surfaceTint'))];
const copy=color.slice(color.indexOf('public fun copy('),color.indexOf('/**',color.indexOf('public fun copy(')));
const component=color.slice(color.indexOf('private inline fun compositeComponent'),color.indexOf('/**',color.indexOf('private inline fun compositeComponent')));
const source=String.raw`import kotlin.math.*
annotation class Stable
data class Dp(val value:Float)
val Int.dp get()=Dp(toFloat())
class ColorSpace(val isSrgb:Boolean=true)
object ColorSpaces {val Srgb=ColorSpace()}
fun Float.fastCoerceIn(min:Float,max:Float)=coerceIn(min,max)
data class Color(val value:ULong){
 val colorSpace get()=ColorSpaces.Srgb
 val red get()=((value shr 48) and 0xffUL).toFloat()/255f
 val green get()=((value shr 40) and 0xffUL).toFloat()/255f
 val blue get()=((value shr 32) and 0xffUL).toFloat()/255f
 val alpha get()=((value shr 56) and 0xffUL).toFloat()/255f
 fun convert(space:ColorSpace)=this
 ${copy}
 companion object {val Unspecified=Color(0x10UL)}
}
${ctor('Color')}
${ctor('UncheckedColor')}
${block(color,'public fun Color.compositeOver')}
${component}
class ColorScheme(${names.map(name=>'var '+name+':Color').join(',')})
${content}
${block(scheme,'public fun ColorScheme.surfaceColorAtElevation')}
fun color(value:Long)=Color(value.toULong() shl 32)
fun argb(c:Color)=(c.value shr 32).toLong()
fun main(){
 val out=mutableListOf<String>()
 val levels=listOf(0f,.001f,.1f,.5f,1f,1.5f,2f,3f,4f,6f,8f,9f,12f,16f,24f,30f,64f,100f,999f)
 val colors=listOf(0xfffffbfeL,0xff141218L,0xff6750a4L,0xffa33d42L,0x00ffffffL,0x80112233L,0x01112233L,0xff00ff80L)
 for(bg in colors)for(tint in colors)for(level in levels){
  val s=ColorScheme(${names.map(name=>name==='surface'?'color(bg)':name==='surfaceTint'?'color(tint)':'Color.Unspecified').join(',')})
  out.add("{\"surface\":"+bg+",\"tint\":"+tint+",\"elevation\":"+level+",\"result\":"+argb(s.surfaceColorAtElevation(Dp(level)))+"}")
 }
 println("{\"tonal\":["+out.joinToString()+"],")
 val matches=mutableListOf<String>();val keys=listOf(${pairs.map(p=>JSON.stringify(p[0])).join(',')})
 for(a in keys.indices)for(b in a until keys.size){
  val entries=keys.mapIndexed{i,key->key to color(if(i==b)(a+1).toLong() else(i+1).toLong())}.toMap()
  val s=ColorScheme(${names.map((name,i)=>pairs.some(p=>p[0]===name)?`entries.getValue("${name}")`:`color(${(0xff000000+i).toString()}L)`).join(',')})
  val result=s.contentColorFor(entries.getValue(keys[b]));val first=keys.indexOfFirst{entries[it]==entries[keys[b]]}
  matches.add("{\"duplicate\":["+a+","+b+"],\"match\":"+first+",\"result\":"+argb(result)+"}")
 }
 println("\"matches\":["+matches.joinToString()+"],")
 val packed=mutableListOf<String>()
 for(r in listOf(-.1f,0f,.001f,.1f,.5f,.999f,1f,1.1f))for(a in listOf(0f,.01f,.1f,.2f,.5f,1f)){
  val g=1f-r;val b=.3f
  packed.add("{\"components\":["+r+","+g+","+b+","+a+"],\"result\":"+argb(Color(r,g,b,a))+"}")
 }
 println("\"packing\":["+packed.joinToString()+"]}")
}
`;
fs.mkdirSync(cache,{recursive:true});fs.writeFileSync(path.join(cache,'Source.kt'),source);
const cp=path.join(runtime,'stdlib.jar');
function run(args){const r=spawnSync('java',args,{encoding:'utf8',maxBuffer:8e6});if(r.status)throw Error(r.stderr||r.stdout);return r.stdout;}
run(['-cp',path.join(runtime,'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-jvm-target','1.8','-d',path.join(cache,'oracle.jar'),path.join(cache,'Source.kt')]);
const data=JSON.parse(run(['-cp',path.join(cache,'oracle.jar')+path.delimiter+cp,'SourceKt']));
data.roles=pairs;fs.writeFileSync(path.join(fix,'surface-oracle.json'),JSON.stringify(data)+'\n');
console.log(`Native sRGB Surface: ${data.tonal.length} tonal, ${data.matches.length} role-collision, ${data.packing.length} packing cases.`);
