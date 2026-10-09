// Run unchanged native state, angular geometry and circular layout bodies.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),fixture=path.join(root,'test/fixtures/androidx/picker'),cache=path.join(root,'research/picker-clock-generator'),runtime=path.join(root,'research/kotlin-runtime');
fs.mkdirSync(cache,{recursive:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),read=f=>fs.readFileSync(f,'utf8').replaceAll('\r\n','\n');
const sources=[];
for(const directory of ['picker','sliders'])for(const entry of JSON.parse(read(path.join(root,'test/fixtures/androidx',directory,'sources.json'))).sources){const file='test/fixtures/androidx/'+directory+'/'+entry.file;if(hash(fs.readFileSync(path.join(root,file)))!==entry.sha256)throw Error('Original SHA '+file);sources.push({...entry,file});}
const motionManifest=JSON.parse(read(path.join(root,'tools/androidx-motion/sources.json')));
for(const name of ['FloatAnimationSpec.kt','SpringSimulation.kt','SpringEstimation.kt']){const entry=motionManifest[name],file='test/fixtures/androidx/motion/'+name;if(hash(fs.readFileSync(path.join(root,file)))!==entry.sha256)throw Error('Original SHA '+file);sources.push({...entry,file});}
function block(s,marker){const start=s.indexOf(marker);if(start<0)throw Error(marker);const first=s.indexOf('{',start);let depth=0;for(let i=first;i<s.length;i++){if(s[i]==='{')depth++;else if(s[i]==='}'&&--depth===0)return s.slice(start,i+1);}throw Error('Unclosed '+marker);}
const time=read(path.join(fixture,'TimePicker.kt')),drag=read(path.join(root,'test/fixtures/androidx/sliders/DragGestureDetector.kt'));
const section=(from,to)=>{const a=time.indexOf(from),b=time.indexOf(to,a);if(a<0||b<0)throw Error(from);return time.slice(a,b);};
const originals=[block(time,'public interface TimePickerState {'),section('public val TimePickerState.isPm:','/**\n * Factory function'),block(time,'@JvmInline\npublic value class TimePickerSelectionMode private constructor'),block(time,'private class TimePickerStateImpl('),block(time,'internal class AnalogTimePickerState('),section('internal val TimePickerState.hourForDisplay:','@Composable\ninternal fun VerticalTimePicker('),block(time,'private fun dist('),block(time,'private fun atan('),block(time,'private fun CircularLayout('),section('private const val FullCircle:','private val PeriodTogglePaddingOld'),block(drag,'internal class TouchSlopDetector(')].join('\n');
const kotlin=time.slice(0,time.indexOf('*/')+2)+`\npackage androidx.compose.material3
import kotlin.math.*
import kotlin.reflect.KProperty
import kotlin.coroutines.*
import androidx.compose.animation.core.FloatSpringSpec
@Target(AnnotationTarget.PROPERTY_GETTER,AnnotationTarget.VALUE_PARAMETER) annotation class IntRange(val from:Long=0,val to:Long=Long.MAX_VALUE)
annotation class FloatRange(val from:Double,val to:Double)
@Target(AnnotationTarget.TYPE) annotation class Composable
typealias IntList=List<Int>
fun intListOf(vararg items:Int)=items.toList()
fun MutableIntList(capacity:Int)=ArrayList<Int>(capacity)
class MutableState<T>(var value:T)
fun <T> mutableStateOf(value:T)=MutableState(value)
operator fun <T> MutableState<T>.getValue(o:Any?,p:KProperty<*>):T=value
operator fun <T> MutableState<T>.setValue(o:Any?,p:KProperty<*>,v:T){value=v}
class IntState(var intValue:Int)
fun mutableIntStateOf(value:Int)=IntState(value)
class Saver<T,S>(val save:(T)->S,val restore:(S)->T)
class Ref<T>{var value:T?=null}
interface RememberObserver{fun onRemembered();fun onForgotten();fun onAbandoned()}
class FocusRequester
data class IntOffset(val x:Int,val y:Int)
data class DpOffset(val x:Float,val y:Float)
val Int.dp:Float get()=toFloat()
val Double.dp:Float get()=toFloat()
const val ClockDialContainerSize=256f
const val ClockDialSelectorHandleContainerSize=48f
const val MaxHourValue=23
const val MaxMinuteValue=59
val operations=mutableListOf<String>()
class AnimationSpec<T>(val name:String)
val Spatial=AnimationSpec<Float>("DefaultSpatial")
enum class MutatePriority{UserInput,PreventUserInput}
val PreventUserInput=MutatePriority.PreventUserInput
class MutatorMutex{ suspend fun mutate(priority:MutatePriority,block:suspend ()->Unit){operations.add("priority:"+priority);block()} }
// Target-recording hosts; these do not claim to execute native interpolation,
// coroutine cancellation, dispatcher or frame-clock timing.
class Animatable(initial:Float){var value=initial;var targetValue=initial
 suspend fun animateTo(target:Float,spec:AnimationSpec<Float>){operations.add("animate:"+target+":"+spec.name);value=target;targetValue=target}
 suspend fun snapTo(target:Float){operations.add("snap:"+target);value=target;targetValue=target}
}
suspend fun delay(millis:Long){operations.add("delay:"+millis)}
fun <T> execute(block:suspend ()->T):T{var result:Result<T>?=null;block.startCoroutine(object:Continuation<T>{override val context=EmptyCoroutineContext;override fun resumeWith(r:Result<T>){result=r}});return result!!.getOrThrow()}
data class Offset(val x:Float,val y:Float){
 operator fun plus(o:Offset)=Offset(x+o.x,y+o.y)
 operator fun minus(o:Offset)=Offset(x-o.x,y-o.y)
 operator fun div(n:Float)=Offset(x/n,y/n)
 operator fun times(n:Float)=Offset(x*n,y*n)
 fun getDistance()=sqrt(x*x+y*y)
 companion object{val Zero=Offset(0f,0f);val Unspecified=Offset(Float.NaN,Float.NaN)}
}
enum class Orientation{Horizontal,Vertical}
interface Modifier{companion object:Modifier}
enum class LayoutId{Selector,InnerCircle}
data class Constraints(val minWidth:Int,val maxWidth:Int,val minHeight:Int,val maxHeight:Int)
data class Placeable(val width:Int,val height:Int,var x:Int=0,var y:Int=0){fun place(x:Int,y:Int){this.x=x;this.y=y}}
class Measurable(val width:Int,val height:Int,val layoutId:LayoutId?=null){fun measure(c:Constraints)=Placeable(width.coerceIn(c.minWidth,c.maxWidth),height.coerceIn(c.minHeight,c.maxHeight)).also{measured.add(it)}}
val measured=mutableListOf<Placeable>()
var inputConstraints=Constraints(256,256,256,256)
var inputLeaves=listOf<Measurable>()
var layoutSize=0 to 0
class MeasureScope{fun layout(width:Int,height:Int,placement:()->Unit){layoutSize=width to height;placement()}}
fun Layout(modifier:Any,content:()->Unit,measure:MeasureScope.(List<Measurable>,Constraints)->Unit){measured.clear();MeasureScope().measure(inputLeaves,inputConstraints)}
fun <T> List<T>.fastFilter(predicate:(T)->Boolean)=filter(predicate)
fun <T,R> List<T>.fastMap(transform:(T)->R)=map(transform)
fun <T> List<T>.fastFirstOrNull(predicate:(T)->Boolean)=firstOrNull(predicate)
fun <T> List<T>.fastForEachIndexed(action:(Int,T)->Unit)=forEachIndexed(action)
${originals}
private fun snapshot(state:AnalogTimePickerState):String{
 val p=state.selectorPos
 return "{\\"hour\\":"+state.hour+",\\"minute\\":"+state.minute+",\\"hourInput\\":"+state.state.hourInput+",\\"minuteInput\\":"+state.state.minuteInput+",\\"selection\\":\\""+state.selection+"\\",\\"angle\\":"+state.currentAngle+",\\"x\\":"+p.x+",\\"y\\":"+p.y+",\\"operations\\":["+operations.joinToString(","){"\\""+it+"\\""}+"]}"
}
fun main(){
 val records=mutableListOf<String>()
 for(is24 in listOf(false,true))for(hour in 0..23)for(minute in listOf(0,1,29,30,58,59))for(unit in listOf(TimePickerSelectionMode.Hour,TimePickerSelectionMode.Minute)){
  val base=TimePickerStateImpl(hour,minute,is24,unit);val state=AnalogTimePickerState(base);state.currentDiameter=256f;state.onRemembered();operations.clear()
  records.add("{\\"type\\":\\"initial\\",\\"is24\\":"+is24+",\\"hour\\":"+hour+",\\"minute\\":"+minute+",\\"selection\\":\\""+unit+"\\",\\"result\\":"+snapshot(state)+"}")
 }
 for(is24 in listOf(false,true))for(unit in listOf(TimePickerSelectionMode.Hour,TimePickerSelectionMode.Minute))for(initialHour in listOf(0,7,12,19))for(diameter in listOf(200f,238f,256f))for(radius in listOf(0f,69f,73.99f,74f,101f))for(index in 0..23){
  val base=TimePickerStateImpl(initialHour,17,is24,unit);val state=AnalogTimePickerState(base);state.currentDiameter=diameter;state.onRemembered();operations.clear()
  val scale=diameter/256f;val center=IntOffset(diameter.toInt()/2,diameter.toInt()/2);val phi=index*PI/12-PI/2
  val x=(center.x+radius*scale*cos(phi)).toFloat();val y=(center.y+radius*scale*sin(phi)).toFloat()
  execute{state.onTap(x,y,74f*scale,true,center,Spatial)}
  val tapped=snapshot(state);operations.clear();execute{state.animateToCurrent(Spatial)}
  records.add("{\\"type\\":\\"tap\\",\\"is24\\":"+is24+",\\"hour\\":"+initialHour+",\\"minute\\":17,\\"selection\\":\\""+unit+"\\",\\"diameter\\":"+diameter+",\\"x\\":"+x+",\\"y\\":"+y+",\\"tapped\\":"+tapped+",\\"switched\\":"+snapshot(state)+"}")
 }
 for(is24 in listOf(false,true))for(unit in listOf(TimePickerSelectionMode.Hour,TimePickerSelectionMode.Minute))for(initialHour in listOf(0,7,12,19))for(index in 0..47){
  val base=TimePickerStateImpl(initialHour,17,is24,unit);val state=AnalogTimePickerState(base);state.currentDiameter=256f;state.onRemembered();operations.clear()
  val radius=if(index%2==0)69f else 101f;val phi=index*PI/24-PI/2;val x=(128+radius*cos(phi)).toFloat();val y=(128+radius*sin(phi)).toFloat()
  execute{state.rotateTo(atan(y-128,x-128),Spatial)};state.moveSelector(x,y,74f,IntOffset(128,128))
  val dragged=snapshot(state);operations.clear();state.selection=TimePickerSelectionMode.Minute;execute{state.onGestureEnd(Spatial)}
  records.add("{\\"type\\":\\"drag\\",\\"is24\\":"+is24+",\\"hour\\":"+initialHour+",\\"minute\\":17,\\"selection\\":\\""+unit+"\\",\\"x\\":"+x+",\\"y\\":"+y+",\\"dragged\\":"+dragged+",\\"ended\\":"+snapshot(state)+"}")
 }
 for(is24 in listOf(false,true))for(hour in listOf(0,7,12,19))for(value in listOf(-1,0,1,11,12,13,23,24,59,60,99)){
  val state=TimePickerStateImpl(hour,17,is24);state.hourInput=value;state.minuteInput=value
  records.add("{\\"type\\":\\"inputState\\",\\"is24\\":"+is24+",\\"hour\\":"+hour+",\\"value\\":"+value+",\\"result\\":{\\"hour\\":"+state.hour+",\\"minute\\":"+state.minute+",\\"hourInput\\":"+state.hourInput+",\\"minuteInput\\":"+state.minuteInput+",\\"valid\\":"+state.isInputValid+"}}")
 }
 for(size in listOf(200,238,256,257,390))for(ratio in listOf(OuterCircleToSizeRatio,InnerCircleToSizeRatio)){
  inputConstraints=Constraints(size,size,size,size);inputLeaves=(0..11).map{Measurable(48,48)};CircularLayout(radiusToSizeRatio=ratio,content={})
  records.add("{\\"type\\":\\"layout\\",\\"size\\":"+size+",\\"ratio\\":"+ratio+",\\"result\\":["+measured.joinToString(","){"{\\"x\\":"+it.x+",\\"y\\":"+it.y+",\\"width\\":"+it.width+",\\"height\\":"+it.height+"}"}+"]}")
 }
 for(slop in listOf(.125f,18f))for(delta in listOf(Offset(0f,0f),Offset(.12f,0f),Offset(.125f,0f),Offset(10f,10f),Offset(18f,0f),Offset(30f,-40f))){
  val detector=TouchSlopDetector();val post=detector.getPostSlopOffset(delta,slop)
  records.add("{\\"type\\":\\"slop\\",\\"slop\\":"+slop+",\\"x\\":"+delta.x+",\\"y\\":"+delta.y+",\\"result\\":"+(if(post.x.isNaN())"null" else "{\\"x\\":"+post.x+",\\"y\\":"+post.y+"}")+"}")
 }
 for((damping,stiffness) in listOf(.8f to 380f,.9f to 700f,1f to 1600f))for((from,target) in listOf((RadiansPerHour*7-FullCircle/4) to (RadiansPerMinute*17-FullCircle/4),0f to HalfCircle,HalfCircle to -HalfCircle,0f to 1f,1f to 0f))for(interrupted in listOf(false,true)){
  val spec=FloatSpringSpec(damping,stiffness,.01f);val velocity=if(interrupted)spec.getVelocityFromNanos(64_000_000L,from,target,0f) else 0f
  val start=if(interrupted)spec.getValueFromNanos(64_000_000L,from,target,0f) else from;val end=if(interrupted)from else target
  val duration=spec.getDurationNanos(start,end,velocity)/1_000_000L
  val samples=(0L..640L step 16L).map{time->val value=if(time>=duration)end else spec.getValueFromNanos(time*1_000_000L,start,end,velocity);val v=if(time>=duration)0f else spec.getVelocityFromNanos(time*1_000_000L,start,end,velocity);"{\\"time\\":"+time+",\\"position\\":"+value+",\\"velocity\\":"+v+"}"}
  records.add("{\\"type\\":\\"spring\\",\\"stiffness\\":"+stiffness+",\\"dampingRatio\\":"+damping+",\\"from\\":"+start+",\\"to\\":"+end+",\\"velocity\\":"+velocity+",\\"duration\\":"+duration+",\\"samples\\":["+samples.joinToString(",")+"]}")
 }
 println(records.joinToString(prefix="[",postfix="]"))
}
`;
fs.writeFileSync(path.join(cache,'OriginalClock.kt'),kotlin);
const floatSource=read(path.join(root,'test/fixtures/androidx/motion/FloatAnimationSpec.kt'));
fs.writeFileSync(path.join(cache,'FloatSpring.kt'),floatSource.slice(0,floatSource.indexOf('*/')+2)+`\npackage androidx.compose.animation.core
const val MillisToNanos=1_000_000L
object Spring{const val StiffnessVeryLow=50f;const val StiffnessMedium=1500f;const val DampingRatioNoBouncy=1f;const val DefaultDisplacementThreshold=.01f}
fun throwIllegalArgumentException(message:String):Nothing=throw IllegalArgumentException(message)
interface FloatAnimationSpec{
 fun getValueFromNanos(playTimeNanos:Long,initialValue:Float,targetValue:Float,initialVelocity:Float):Float
 fun getVelocityFromNanos(playTimeNanos:Long,initialValue:Float,targetValue:Float,initialVelocity:Float):Float
 fun getEndVelocity(initialValue:Float,targetValue:Float,initialVelocity:Float):Float
 fun getDurationNanos(initialValue:Float,targetValue:Float,initialVelocity:Float):Long
}
${block(floatSource,'public class FloatSpringSpec(')}
`);
fs.writeFileSync(path.join(cache,'FloatPackingHost.kt'),read(path.join(root,'tools/androidx-motion/FloatPacking.kt'))+'\nfun Double.fastIsFinite()=isFinite()\n');
const run=(command,args)=>{const r=spawnSync(command,args,{cwd:root,encoding:'utf8',maxBuffer:32e6});if(r.status!==0)throw Error(r.stderr||r.stdout);return r.stdout;};
const cp=['stdlib.jar','androidx-annotation.jar'].map(name=>path.join(runtime,name)).join(path.delimiter);
run('java',['-cp',path.join(runtime,'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-jvm-target','1.8','-d',path.join(cache,'reference.jar'),...['OriginalClock.kt','FloatSpring.kt','FloatPackingHost.kt'].map(name=>path.join(cache,name)),...['SpringSimulation.kt','SpringEstimation.kt'].map(name=>path.join(root,'test/fixtures/androidx/motion',name))]);
const records=JSON.parse(run('java',['-cp',path.join(cache,'reference.jar')+path.delimiter+cp,'androidx.compose.material3.OriginalClockKt'])),bytes=Buffer.from(JSON.stringify(records)+'\n');
const hosts=['tools/androidx-picker/generate-clock.mjs','tools/androidx-motion/FloatPacking.kt'].map(file=>({file,sha256:hash(fs.readFileSync(path.join(root,file)))})),meta={revision:'a095da93f8e98dea8748ceed79ea8427aade245f',count:records.length,sha256:hash(bytes),sources,hosts,scope:'Complete unchanged TimePickerState interface/default input setters/extensions, StateImpl/Saver, AnalogTimePickerState, onTap/moveSelector/selectorPos/dist/atan, CircularLayout and TouchSlopDetector bodies. Separately complete FloatSpringSpec, SpringSimulation and SpringEstimation bodies execute with packing/isFinite hosts. Float Dp/scalar state, Saver constructor, target-recording Animatable/priority/delay, immediate suspend continuation, constrained 48px leaves and placement are explicit hosts. Scalar samples do not execute native Animatable frame-clock ownership, MutatorMutex cancellation, coroutine delay timing, gesture dispatch, Compose composition, font or raster.'};
for(const [file,value]of [['clock.json',bytes],['clock.meta.json',Buffer.from(JSON.stringify(meta,null,2)+'\n')]]){const target=path.join(fixture,file);if(process.argv.includes('--check')){if(!fs.readFileSync(target).equals(value))throw Error('Reference drift '+file);}else fs.writeFileSync(target,value);}
console.log('Original picker clock: '+records.length+' cases, SHA '+hash(bytes));
