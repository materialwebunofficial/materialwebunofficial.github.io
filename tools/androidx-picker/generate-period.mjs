// Execute complete original period measure helpers and ToggleItem composition.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),fixture=path.join(root,'test/fixtures/androidx/picker'),cache=path.join(root,'research/picker-period-generator'),runtime=path.join(root,'research/kotlin-runtime');
fs.mkdirSync(cache,{recursive:true});
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const run=(command,args)=>{const r=spawnSync(command,args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});if(r.status!==0)throw Error(r.stderr||r.stdout);return r.stdout;};
run('node',['tools/androidx-picker/generate-colors.mjs','--check']);
run('python',['tools/androidx-toolbar-row/generate.py','--policies-only']);
const sources=[];
for(const directory of ['picker','toolbar-row'])for(const entry of JSON.parse(fs.readFileSync(path.join(root,'test/fixtures/androidx',directory,'sources.json'))).sources){const file='test/fixtures/androidx/'+directory+'/'+entry.file;if(hash(fs.readFileSync(path.join(root,file)))!==entry.sha256)throw Error('Original SHA '+file);sources.push({...entry,file});}
const read=file=>fs.readFileSync(file,'utf8').replaceAll('\r\n','\n');
function block(source,marker){const start=source.indexOf(marker);if(start<0)throw Error(marker);const first=source.indexOf('{',start);let depth=0;for(let i=first;i<source.length;i++){if(source[i]==='{')depth++;else if(source[i]==='}'&&--depth===0)return source.slice(start,i+1);}throw Error('Unclosed '+marker);}
const time=read(path.join(fixture,'TimePicker.kt')),colors=read(path.join(root,'research/picker-colors-generator/OriginalColors.kt'));
const originals=['private fun HorizontalPeriodToggle(','private fun VerticalPeriodToggle(','private fun ToggleItem(','private fun <T> TimePickerShapes?.orVibrant('].map(marker=>block(time,marker));
const constants=['PeriodTogglePaddingSmall','VibrantSeparatorWidth','VibrantPeriodTogglePadding'].map(name=>{const first=time.indexOf('private val '+name+'\n');if(first<0)throw Error(name);return time.slice(first).split('\n').slice(0,2).join('\n');}).join('\n');
const kotlin=colors.slice(0,colors.indexOf('fun main(){')).replace('annotation class Composable','@Target(AnnotationTarget.FUNCTION,AnnotationTarget.PROPERTY_GETTER,AnnotationTarget.TYPE)\nannotation class Composable')+`
annotation class Immutable
annotation class Stable
data class IntSize(val width:Int,val height:Int)
fun Int.fastCoerceIn(min:Int,max:Int)=coerceIn(min,max)
fun Int.fastCoerceAtLeast(min:Int)=coerceAtLeast(min)
fun requirePrecondition(value:Boolean,message:()->String){require(value,message)}
val String.value:String get()=this
typealias CornerBasedShape=String
fun String.start()=this+":start"
fun String.end()=this+":end"
fun String.top()=this+":top"
fun String.bottom()=this+":bottom"
const val CircleShape="CornerFull"
fun RoundedCornerShape(value:Double)="px:"+value
data class ToggleButtonShapes(val shape:Shape,val pressedShape:Shape,val checkedShape:Shape)
typealias TimeInputColors=TimePickerColors
fun TimeInputColors.periodSelectorContentColor(checked:Boolean)=if(checked)periodSelectorSelectedContentColor else periodSelectorContentColor
fun TimeInputColors.periodSelectorContainerColor(checked:Boolean)=if(checked)periodSelectorSelectedContainerColor else periodSelectorContainerColor
data class ToggleButtonColors(val containerColor:Color,val contentColor:Color,val checkedContainerColor:Color,val checkedContentColor:Color)
object ToggleButtonDefaults{fun colors(containerColor:Color,contentColor:Color,checkedContainerColor:Color,checkedContentColor:Color)=ToggleButtonColors(containerColor,contentColor,checkedContainerColor,checkedContentColor)}
object ButtonDefaults{fun textButtonColors(containerColor:Color,contentColor:Color)=ToggleButtonColors(containerColor,contentColor,containerColor,contentColor)}
data class PaddingValues(val all:Double)
open class Modifier(val z:Float=0f,val fill:Boolean=false,val checked:Boolean?=null){companion object:Modifier()}
fun Modifier.zIndex(z:Float)=Modifier(z,fill,checked)
fun Modifier.fillMaxSize()=Modifier(z,true,checked)
class Semantics{var selected:Boolean=false}
fun Modifier.semantics(body:Semantics.()->Unit):Modifier{val s=Semantics().apply(body);return Modifier(z,fill,s.selected)}
object RowScope
fun shapeJson(shape:Shape)=if(shape=="CornerFull")"{\\"unit\\":\\"percent\\",\\"value\\":50}" else "{\\"unit\\":\\"px\\",\\"value\\":"+(if(shape.startsWith("px:"))shape.removePrefix("px:") else 8)+"}"
var itemRecord=""
fun ToggleButton(checked:Boolean,onCheckedChange:(Boolean)->Unit,modifier:Modifier,shapes:ToggleButtonShapes,colors:ToggleButtonColors,contentPadding:PaddingValues,content:RowScope.()->Unit){
 itemRecord="{\\"checked\\":"+checked+",\\"shapes\\":{\\"shape\\":"+shapeJson(shapes.shape)+",\\"pressedShape\\":"+shapeJson(shapes.pressedShape)+",\\"checkedShape\\":"+shapeJson(shapes.checkedShape)+"},\\"container\\":"+(if(checked)colors.checkedContainerColor else colors.containerColor).json()+",\\"content\\":"+(if(checked)colors.checkedContentColor else colors.contentColor).json()+",\\"z\\":"+modifier.z+",\\"fill\\":"+modifier.fill+",\\"selected\\":"+modifier.checked+",\\"padding\\":"+contentPadding.all+"}"
}
fun TextButton(modifier:Modifier,contentPadding:PaddingValues,shape:Shape,onClick:()->Unit,content:RowScope.()->Unit,colors:ToggleButtonColors){error("Legacy toggle branch unexpectedly used")}
class TimePickerState
interface Measurable {val layoutId:String? get()=null;fun measure(c:Constraints):Placeable}
class Placeable(val width:Int,val height:Int){var x=0;var y=0}
data class MeasureResult(val width:Int,val height:Int,val items:List<Placeable>)
class MeasureScope(val density:Float){
 val measured=mutableListOf<Placeable>()
 fun Double.roundToPx()=kotlin.math.floor((toFloat()*density+.5f).toDouble()).toInt()
 fun layout(width:Int,height:Int,body:PlacementScope.()->Unit):MeasureResult{PlacementScope().body();return MeasureResult(width,height,measured.toList())}
}
class PlacementScope{fun Placeable.place(x:Int,y:Int){this.x=x;this.y=y}}
fun interface MeasurePolicy{fun MeasureScope.measure(items:List<Measurable>,c:Constraints):MeasureResult}
fun <T,R> List<T>.fastMap(body:(T)->R)=map(body)
fun <T> List<T>.fastFirst(body:(T)->Boolean)=first(body)
fun <T> List<T>.fastFilter(body:(T)->Boolean)=filter(body)
var inputConstraints=Constraints.fixed(52,80)
var inputDensity=1f
var measurement:MeasureResult?=null
fun PeriodToggleImpl(modifier:Modifier,state:TimePickerState,colors:TimeInputColors,measurePolicy:MeasurePolicy,startShape:Shape,endShape:Shape,shapes:TimePickerShapes?){
 val scope=MeasureScope(inputDensity)
 val leaves=(0..1).map{object:Measurable{override fun measure(c:Constraints):Placeable{val p=Placeable(c.maxWidth,c.maxHeight);scope.measured.add(p);return p}}}
 measurement=with(measurePolicy){with(scope){measure(leaves,inputConstraints)}}
}
${constants}
${originals.join('\n')}
fun main(){
 val records=mutableListOf<String>()
 val t=with(TimePickerDefaults){ColorScheme().defaultTimePickerColors}
 val v=with(TimePickerDefaults){ColorScheme().defaultVibrantTimePickerColors}
 for(vibrant in listOf(false,true))for(checked in listOf(false,true)){
  ToggleItem(checked=checked,onClick={},colors=if(vibrant)v else t,content={})
  records.add("{\\"type\\":\\"item\\",\\"vibrant\\":"+vibrant+",\\"result\\":"+itemRecord+"}")
 }
 for(horizontal in listOf(false,true))for(vibrant in listOf(false,true))for(density in listOf(.5f,1f,1.25f,1.5f,2f,3f))for(dim in listOf(0 to 0,2 to 3,52 to 80,216 to 38,56 to 120,217 to 39,99 to 101)){
  inputConstraints=Constraints.fixed(dim.first,dim.second);inputDensity=density
  val shapes=if(vibrant)TimePickerShapes("CornerLarge","CornerFull") else null
  if(horizontal)HorizontalPeriodToggle(Modifier,TimePickerState(),t,shapes) else VerticalPeriodToggle(Modifier,TimePickerState(),t,shapes)
  val result=measurement!!
  records.add("{\\"type\\":\\"layout\\",\\"horizontal\\":"+horizontal+",\\"vibrant\\":"+vibrant+",\\"density\\":"+density+",\\"width\\":"+dim.first+",\\"height\\":"+dim.second+",\\"result\\":{\\"width\\":"+result.width+",\\"height\\":"+result.height+",\\"items\\":["+result.items.joinToString(","){"{\\"width\\":"+it.width+",\\"height\\":"+it.height+",\\"x\\":"+it.x+",\\"y\\":"+it.y+"}"}+" ]}}")
 }
 println(records.joinToString(prefix="[",postfix="]"))
}
`;
fs.writeFileSync(path.join(cache,'OriginalPeriod.kt'),kotlin);
const cp=path.join(runtime,'stdlib.jar');
run('java',['-cp',path.join(runtime,'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-jvm-target','1.8','-d',path.join(cache,'reference.jar'),path.join(root,'research/toolbar-row-generator/Constraints.kt'),path.join(cache,'OriginalPeriod.kt')]);
const records=JSON.parse(run('java',['-cp',path.join(cache,'reference.jar')+path.delimiter+cp,'androidx.compose.material3.OriginalPeriodKt'])),bytes=Buffer.from(JSON.stringify(records)+'\n');
const hosts=['tools/androidx-picker/generate-period.mjs','tools/androidx-picker/generate-colors.mjs','tools/androidx-toolbar-row/generate.py','tools/androidx-toolbar-row/Adapter.kt'].map(file=>({file,sha256:hash(fs.readFileSync(path.join(root,file)))}));
const meta={revision:'a095da93f8e98dea8748ceed79ea8427aade245f',count:records.length,sha256:hash(bytes),sources,hosts,scope:'Complete original HorizontalPeriodToggle, VerticalPeriodToggle and ToggleItem bodies; actual updated flag and native Constraints. Recording ToggleButton constructors/modifiers, symbolic Color/Shape, MeasureScope/place and fill-size leaves are explicit hosts. No complete nested ToggleButton modifier/layout/composition, native font, pointer, interpolation or raster.'};
for(const [file,value]of [['period.json',bytes],['period.meta.json',Buffer.from(JSON.stringify(meta,null,2)+'\n')]]){const target=path.join(fixture,file);if(process.argv.includes('--check')){if(!fs.readFileSync(target).equals(value))throw Error('Reference drift '+file);}else fs.writeFileSync(target,value);}
console.log('Original picker period: '+records.length+' cases, SHA '+hash(bytes));
