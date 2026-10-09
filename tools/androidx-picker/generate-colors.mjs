// Complete original factory/branch bodies run with symbolic Color and State hosts.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),fixture=path.join(root,'test/fixtures/androidx/picker'),cache=path.join(root,'research/picker-colors-generator'),runtime=path.join(root,'research/kotlin-runtime');
fs.mkdirSync(cache,{recursive:true});
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),manifest=JSON.parse(fs.readFileSync(path.join(fixture,'sources.json')));
for(const source of manifest.sources)if(hash(fs.readFileSync(path.join(fixture,source.file)))!==source.sha256)throw Error('Original SHA '+source.file);
const read=file=>fs.readFileSync(path.join(fixture,file),'utf8').replaceAll('\r\n','\n');
function block(source,marker){const start=source.indexOf(marker);if(start<0)throw Error(marker);const first=source.indexOf('{',start);let depth=0;for(let i=first;i<source.length;i++){if(source[i]==='{')depth++;else if(source[i]==='}'&&--depth===0)return source.slice(start,i+1);}throw Error('Unclosed '+marker);}
const date=read('DatePicker.kt'),time=read('TimePicker.kt'),flag=read('ComposeMaterial3Flags.kt');
const dateFactory=block(date,'internal val ColorScheme.defaultDatePickerColors:'),timeFactory=block(time,'internal val ColorScheme.defaultTimePickerColors:'),vibrantFactory=block(time,'internal val ColorScheme.defaultVibrantTimePickerColors:'),shapeFactory=block(time,'internal val Shapes.defaultTimePickerShapes:');
const content=block(date,'internal fun dayContentColor('),container=block(date,'internal fun dayContainerColor(');
const fields=source=>[...source.matchAll(/^\s+(\w+) =/gm)].map(m=>m[1]);
const dateFields=fields(dateFactory),timeFields=fields(timeFactory);
const tokenFiles=['DatePickerModalTokens.kt','TimePickerTokens.kt'];
const tokenSources=tokenFiles.map(file=>read(file).slice(read(file).indexOf('internal object')));
const roles=[...new Set([...tokenSources.join('\n').matchAll(/ColorSchemeKeyTokens\.(\w+)/g)].map(m=>m[1]).concat(['SurfaceContainerLowest','SurfaceContainer','OnPrimaryContainer']))];
const shapes=[...new Set([...tokenSources.join('\n').matchAll(/ShapeKeyTokens\.(\w+)/g)].map(m=>m[1]).concat(['CornerLarge']))];
const fonts=[...new Set([...tokenSources.join('\n').matchAll(/TypographyKeyTokens\.(\w+)/g)].map(m=>m[1]))];
const metrics=tokenFiles.flatMap((file,index)=>[...tokenSources[index].matchAll(/inline val (\w+): ([^\n]+)\n\s+get\(\) = ([^\n]+)/g)].filter(m=>m[2]!=='ColorToken').map(m=>({object:file.replace('.kt',''),name:m[1],type:m[2]})));
const stateClass=(name,names,body='')=>'class '+name+'('+names.map(key=>'val '+key+':Color').join(',')+'){'+body+'\nfun json()="{"+listOf('+names.map(key=>'"\\"'+key+'\\":"+'+key+'.json()').join(',')+').joinToString(",")+"}"}';
const kotlin=`package androidx.compose.material3
${[...time.matchAll(/^import androidx\.compose\.material3\.tokens\.TimePickerTokens\.(.*)$/gm)].map(m=>'import androidx.compose.material3.TimePickerTokens.'+m[1]).join('\n')}
annotation class Composable
typealias ColorToken=String
typealias ShapeToken=String
typealias TypographyToken=String
typealias Shape=String
val Double.dp:Double get()=this
val Int.dp:Double get()=toDouble()
object ColorSchemeKeyTokens {${roles.map(x=>'const val '+x+'="'+x+'"').join(';')}}
object ShapeKeyTokens {${shapes.map(x=>'const val '+x+'="'+x+'"').join(';')}}
object TypographyKeyTokens {${fonts.map(x=>'const val '+x+'="'+x+'"').join(';')}}
object ElevationTokens {const val Level0=0.0;const val Level3=6.0}
${tokenSources.join('\n').replaceAll('androidx.compose.ui.unit.Dp','Double')}
data class Color(val role:String,val alpha:Float=1f,val copied:Boolean=false){
 fun copy(alpha:Float)=Color(role,alpha,true)
 fun json()="{\\"role\\":\\""+role+"\\",\\"alpha\\":"+alpha.toDouble()+",\\"copied\\":"+copied+"}"
 companion object {val Transparent=Color("transparent",0f)}
}
data class State<T>(val value:T,val animated:Boolean=false)
fun rememberUpdatedState(target:Color)=State(target)
fun animateColorAsState(target:Color,spec:String)=State(target,true)
object MotionSchemeKeyTokens {const val DefaultEffects="DefaultEffects"}
fun String.value()=this
const val DisabledAlpha=.38f
object ComposeMaterial3Flags {val isUpdatedTimepickerToggleEnabled=${/isUpdatedTimepickerToggleEnabled[^=]*=\s*(true|false)/.exec(flag)?.[1]??'MISSING'}}
class ColorScheme {
 var defaultDatePickerColorsCached:DatePickerColors?=null
 var defaultTimePickerColorsCached:TimePickerColors?=null
 var defaultVibrantTimePickerColorsCached:TimePickerColors?=null
 val onSurfaceVariant=Color("OnSurfaceVariant")
 val defaultOutlinedTextFieldColors=Color("outlined-text-field-factory")
 fun fromToken(role:String)=Color(role)
}
class Shapes {var defaultTimePickerShapesCached:TimePickerShapes?=null;fun fromToken(role:String)=role}
data class TimePickerShapes(val timeFieldShape:Shape,val periodSelectorShape:Shape)
object DividerTokens {const val Color="OutlineVariant"}
${stateClass('DatePickerColors',dateFields,content+'\n'+container)}
${stateClass('TimePickerColors',timeFields)}
object DatePickerDefaults {${dateFactory}}
object TimePickerDefaults {${timeFactory}\n${vibrantFactory}\n${shapeFactory}}
fun main(){
 val d=with(DatePickerDefaults){ColorScheme().defaultDatePickerColors}
 val t=with(TimePickerDefaults){ColorScheme().defaultTimePickerColors}
 val v=with(TimePickerDefaults){ColorScheme().defaultVibrantTimePickerColors}
 val s=with(TimePickerDefaults){Shapes().defaultTimePickerShapes}
 val days=mutableListOf<String>()
 for(today in listOf(false,true))for(selected in listOf(false,true))for(inRange in listOf(false,true))for(enabled in listOf(false,true))for(animate in listOf(false,true)){
  val c=d.dayContentColor(today,selected,inRange,enabled);val b=d.dayContainerColor(selected,enabled,animate)
  days.add("{\\"options\\":{\\"isToday\\":"+today+",\\"selected\\":"+selected+",\\"inRange\\":"+inRange+",\\"enabled\\":"+enabled+",\\"animate\\":"+animate+"},\\"content\\":"+c.value.json()+",\\"container\\":"+b.value.json()+",\\"animateContent\\":"+c.animated+",\\"animateContainer\\":"+b.animated+"}")
 }
 val metrics=listOf(${metrics.map(m=>`"\\"${m.object}.${m.name}\\":"+${m.type==='ShapeToken'||m.type==='TypographyToken'?'"\\\""+':''}${m.object}.${m.name}${m.type==='ShapeToken'||m.type==='TypographyToken'?'+"\\\""':''}`).join(',')})
 println("{\\"date\\":"+d.json()+",\\"time\\":"+t.json()+",\\"vibrant\\":"+v.json()+",\\"shapes\\":{\\"timeFieldShape\\":\\""+s.timeFieldShape+"\\",\\"periodSelectorShape\\":\\""+s.periodSelectorShape+"\\"},\\"days\\":["+days.joinToString(",")+"],\\"tokens\\":{"+metrics.joinToString(",")+"}}")
}
`;
fs.writeFileSync(path.join(cache,'OriginalColors.kt'),date.slice(0,date.indexOf('package '))+kotlin);
const run=(command,args)=>{const r=spawnSync(command,args,{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});if(r.status!==0)throw Error(r.stderr||r.stdout);return r.stdout;};
const cp=path.join(runtime,'stdlib.jar');
run('java',['-cp',path.join(runtime,'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-jvm-target','1.8','-d',path.join(cache,'reference.jar'),path.join(cache,'OriginalColors.kt')]);
const records=JSON.parse(run('java',['-cp',path.join(cache,'reference.jar')+path.delimiter+cp,'androidx.compose.material3.OriginalColorsKt'])),bytes=Buffer.from(JSON.stringify(records)+'\n');
const file='tools/androidx-picker/generate-colors.mjs';
const meta={revision:manifest.revision,sha256:hash(bytes),sources:manifest.sources,hosts:[{file,sha256:hash(fs.readFileSync(path.join(root,file)))}],scope:'Complete original Date/TimePicker default color factories, vibrant color and shape factories, DatePicker day content/container branches. Original token getters execute. Named constructor records, symbolic Color/alpha-copy, cached factory fields, State/animation targets are explicit host boundaries. This does not execute native layout, interpolation, input, full composition or raster.'};
for(const [file,value]of [['colors.json',bytes],['colors.meta.json',Buffer.from(JSON.stringify(meta,null,2)+'\n')]]){const target=path.join(fixture,file);if(process.argv.includes('--check')){if(!fs.readFileSync(target).equals(value))throw Error('Reference drift '+file);}else fs.writeFileSync(target,value);}
console.log('Original picker factories and '+records.days.length+' day states, SHA '+hash(bytes));
