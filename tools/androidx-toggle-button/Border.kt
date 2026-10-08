package androidx.compose.animation.core
import kotlin.coroutines.*
import kotlin.reflect.KProperty
import androidx.compose.material3.tokens.ExpressiveMotionTokens as E
import androidx.compose.material3.tokens.StandardMotionTokens as S

// Explicit composition, Job/coroutine, clock, Animatable and already-converted
// color hosts. The original border, animate*AsState and TargetBasedAnimation/
// vectorized spring bodies execute; no native Color packing/raster is supplied.
annotation class Composable
data class Dp(val value:Float):Comparable<Dp>{companion object{val Hairline=Dp(0f)};override fun compareTo(other:Dp)=value.compareTo(other.value)}
fun Dp.toPx()=value*BorderClock.density
data class Size(val width:Float,val height:Float){val minDimension get()=minOf(width,height)}
data class Offset(val x:Float,val y:Float)
fun drawContentWithoutBorder()=0f
val Double.dp get()=Dp(toFloat())
val Int.dp get()=Dp(toFloat())
val Dp.Companion.VectorConverter:TwoWayConverter<Dp,AnimationVector1D> get()=DpConverter
val DpConverter=TwoWayConverter<Dp,AnimationVector1D>({AnimationVector1D(it.value)},{Dp(it.value)})
val dpDefaultSpring=SpringSpec<Dp>(visibilityThreshold=Dp(.4f)) // unused with explicit MotionScheme spring
val colorDefaultSpring=SpringSpec<Color>()
fun<T> spring(dampingRatio:Float,stiffness:Float,visibilityThreshold:T?):SpringSpec<T> = SpringSpec(dampingRatio,stiffness,visibilityThreshold)
abstract class Brush
data class SolidColor(val value:Color):Brush()
data class BorderStroke(val width:Dp,val brush:Brush){constructor(width:Dp,color:Color):this(width,SolidColor(color))}
data class ColorSpace(val name:String)
object ColorSpaces{val Oklab=ColorSpace("oklab");val Srgb=ColorSpace("srgb")}
data class Color(val l:Float,val a:Float,val b:Float,val alpha:Float=1f,val colorSpace:ColorSpace=ColorSpaces.Srgb){
 companion object{val Transparent=Color(0f,0f,0f,0f)}
 // Inputs already supply Oklab components. Preserve the source color-space key,
 // while explicitly hosting conversion/packing outside this executable proof.
 fun convert(to:ColorSpace)=copy(colorSpace=to)
}
fun Float.fastCoerceIn(min:Float,max:Float)=coerceIn(min,max)
typealias ColorToken=Int
object ColorSchemeKeyTokens{const val OutlineVariant=24}
val ColorToken.value get()=BorderClock.color
enum class MotionSchemeKeyTokens{FastSpatial,DefaultEffects;
 fun<T> value():FiniteAnimationSpec<T>{val standard=BorderClock.scheme=="standard";val spatial=this==FastSpatial
  if(!spatial)BorderClock.effectsSpec?.let{return SpringSpec(dampingRatio=it.second,stiffness=it.first)}
  return SpringSpec(dampingRatio=if(spatial){if(standard)S.SpringFastSpatialDamping else E.SpringFastSpatialDamping}else{if(standard)S.SpringDefaultEffectsDamping else E.SpringDefaultEffectsDamping},stiffness=if(spatial){if(standard)S.SpringFastSpatialStiffness else E.SpringFastSpatialStiffness}else{if(standard)S.SpringDefaultEffectsStiffness else E.SpringDefaultEffectsStiffness})
 }
}
interface State<T>{val value:T}
class MutableState<T>(override var value:T):State<T>
fun<T> mutableStateOf(value:T)=MutableState(value)
operator fun<T> State<T>.getValue(owner:Any?,property:KProperty<*>)=value
operator fun<T> MutableState<T>.setValue(owner:Any?,property:KProperty<*>,newValue:T){value=newValue}
data class BorderCell(val keys:List<Any?>,val value:Any?)
object BorderMemory{
 val cells=mutableListOf<BorderCell>();val effects=mutableListOf<()->Unit>();var cursor=0
 fun reset(){cells.clear();effects.clear();cursor=0}
}
@Suppress("UNCHECKED_CAST")
fun<T> remember(vararg keys:Any?,factory:()->T):T{
 val i=BorderMemory.cursor++;val old=BorderMemory.cells.getOrNull(i);val key=keys.toList()
 if(old!=null&&old.keys==key)return old.value as T
 val cell=BorderCell(key,factory());if(i<BorderMemory.cells.size)BorderMemory.cells[i]=cell else BorderMemory.cells.add(cell)
 return cell.value as T
}
fun SideEffect(block:()->Unit){BorderMemory.effects.add(block)}
enum class CoroutineStart{UNDISPATCHED}
class Job{fun cancel(){BorderClock.cancellations++}}
class CoroutineScope
val BorderScope=CoroutineScope()
fun rememberCoroutineScope()=BorderScope
fun CoroutineScope.launch(start:CoroutineStart,block:suspend()->Unit):Job{check(start==CoroutineStart.UNDISPATCHED);BorderClock.launches++;block.startCoroutine(object:Continuation<Unit>{override val context=EmptyCoroutineContext;override fun resumeWith(result:Result<Unit>){result.getOrThrow()}});return Job()}
interface AnimateValueAsStateToolingHandle<T,V:AnimationVector>{var animatable:Animatable<T,V>;var animationSpec:AnimationSpec<T>;fun setToolingOverrideState(toolingOverrideState:State<T>?)}
class Animatable<T,V:AnimationVector>(initialValue:T,val typeConverter:TwoWayConverter<T,V>,val visibilityThreshold:T?,val label:String){
 private var stored=initialValue;var targetValue=initialValue;private set
 var animation:TargetBasedAnimation<T,V>?=null;private set
 private var start=0L
 val value:T get(){val a=animation?:return stored;val elapsed=(BorderClock.time-start)*1_000_000L
  if(a.isFinishedFromNanos(elapsed)){stored=targetValue;animation=null;return stored};return a.getValueFromNanos(elapsed)}
 val velocityVector:V get(){value;return animation?.getVelocityVectorFromNanos((BorderClock.time-start)*1_000_000L)?.copy()?:typeConverter.convertToVector(stored).newInstance()}
 suspend fun animateTo(target:T,spec:AnimationSpec<T>){val current=value;val velocity=velocityVector;targetValue=target;animation=TargetBasedAnimation(spec,typeConverter,current,target,velocity);start=BorderClock.time}
}
object BorderClock{
 var time=0L;var scheme="expressive";var color=Color(.7f,.03f,-.08f);var launches=0;var cancellations=0
 var effectsSpec:Pair<Float,Float>?=null
 var density=1f
}
data class BorderOp(val time:Long,val checked:Boolean?=null,val enabled:Boolean?=null,val palette:Int?=null,val scheme:String?=null,val size:String?=null,val incidental:Boolean=false,val effectsSpec:Pair<Float,Float>?=null){
 fun json():String{val fields=mutableListOf("\"time\":$time");checked?.let{fields.add("\"checked\":$it")};enabled?.let{fields.add("\"enabled\":$it")};palette?.let{fields.add("\"palette\":$it")};scheme?.let{fields.add("\"scheme\":\"$it\"")};size?.let{fields.add("\"size\":\"$it\"")};if(incidental)fields.add("\"incidental\":true");effectsSpec?.let{fields.add("\"effectsSpec\":{\"stiffness\":${it.first},\"dampingRatio\":${it.second}}")};return fields.joinToString(prefix="{",postfix="}")}
}
fun Color.vectorJson()="[$alpha,$l,$a,$b]"
fun AnimationVector.arrayJson()=(0 until size).joinToString(prefix="[",postfix="]"){get(it).toString()}
fun main(){
 val palettes=listOf(Color(.7f,.03f,-.08f),Color(.35f,-.12f,.1f),Color(.94f,.15f,-.15f))
 val histories=listOf(
  "select-close-reverse" to listOf(BorderOp(0,checked=true),BorderOp(32,checked=false),BorderOp(64,checked=true),BorderOp(112,checked=false)),
  "close-finish-open" to listOf(BorderOp(0,checked=true),BorderOp(600,checked=false)),
  "disabled-unchecked" to listOf(BorderOp(0,enabled=false),BorderOp(64,enabled=true),BorderOp(96,enabled=false),BorderOp(144,enabled=true)),
  "disabled-during-close" to listOf(BorderOp(0,checked=true),BorderOp(32,enabled=false),BorderOp(64,checked=false),BorderOp(144,enabled=true)),
  "theme-during-motion" to listOf(BorderOp(0,checked=true),BorderOp(32,palette=1),BorderOp(64,checked=false),BorderOp(96,palette=2),BorderOp(144,palette=0)),
  "unchecked-theme" to listOf(BorderOp(0,palette=1),BorderOp(32,palette=2),BorderOp(64,palette=0)),
  "scheme-same-target" to listOf(BorderOp(0,checked=true),BorderOp(32,scheme="standard"),BorderOp(96,checked=false),BorderOp(112,scheme="expressive")),
  "size-and-label-preserve" to listOf(BorderOp(0,checked=true),BorderOp(32,size="xl"),BorderOp(64,incidental=true),BorderOp(96,checked=false),BorderOp(112,size="xs")),
  "checked-disabled-no-border" to listOf(BorderOp(0,checked=true),BorderOp(600,enabled=false),BorderOp(800,enabled=true)),
  "rapid-alpha-reversal" to listOf(BorderOp(0,enabled=false),BorderOp(16,enabled=true),BorderOp(32,checked=true),BorderOp(48,checked=false),BorderOp(64,checked=true),BorderOp(96,checked=false)),
  "custom-effects-alpha-handoff" to listOf(BorderOp(0,effectsSpec=800f to .35f),BorderOp(1,enabled=false),BorderOp(144,enabled=true),BorderOp(256,checked=true),BorderOp(400,checked=false)),
  "custom-effects-theme-handoff" to listOf(BorderOp(0,effectsSpec=800f to .35f),BorderOp(1,palette=1),BorderOp(400,palette=2),BorderOp(544,palette=0),BorderOp(600,palette=1)),
  "cold-checked" to emptyList(),
  "cold-disabled" to emptyList()
 )
 val cases=mutableListOf<String>()
 for(scheme in listOf("expressive","standard"))for((name,events)in histories){
  BorderMemory.reset();BorderClock.scheme=scheme;BorderClock.time=0;BorderClock.color=palettes[0];BorderClock.launches=0;BorderClock.cancellations=0;BorderClock.effectsSpec=null
  val initialChecked=name=="cold-checked";val initialEnabled=name!="cold-disabled";var checked=initialChecked;var enabled=initialEnabled
  fun render():BorderStroke?{BorderMemory.cursor=0;val result=animateBorderStrokeAsState(OutlinedToggleButtonDefaults.border(enabled,checked));val effects=BorderMemory.effects.toList();BorderMemory.effects.clear();effects.forEach{it()};return result}
  render();var at=0;val frames=mutableListOf<String>()
  val times=(events.map{it.time}+listOf(0L,1L,16L,32L,48L,64L,65L,96L,112L,144L,176L,256L,400L,600L,616L,800L,1100L)).distinct().sorted()
  for(time in times){BorderClock.time=time
   while(at<events.size&&events[at].time<=time){val e=events[at++];e.checked?.let{checked=it};e.enabled?.let{enabled=it};e.palette?.let{BorderClock.color=palettes[it]};e.scheme?.let{BorderClock.scheme=it};e.effectsSpec?.let{BorderClock.effectsSpec=it};render()}
   render();val visible=render()
   @Suppress("UNCHECKED_CAST") val width=(BorderMemory.cells[0].value as AnimateValueAsStateToolingHandle<Dp,AnimationVector1D>).animatable
   @Suppress("UNCHECKED_CAST") val color=(BorderMemory.cells[2].value as AnimateValueAsStateToolingHandle<Color,AnimationVector4D>).animatable
   val strokes=mutableListOf<String>()
   for(density in listOf(1f,1.25f,2f))for(size in listOf(Size(192f,40f),Size(1f,1f),Size(0f,40f))){BorderClock.density=density;val stroke=if(visible==null)0f else nativeBorderStroke(visible.width,Size(size.width*density,size.height*density))/density;strokes.add("{\"density\":$density,\"size\":[${size.width},${size.height}],\"stroke\":$stroke}")}
   BorderClock.density=1f
   frames.add("{\"time\":$time,\"width\":${width.value.value},\"widthVelocity\":${width.velocityVector.value},\"color\":${color.value.vectorJson()},\"colorVelocity\":${color.velocityVector.arrayJson()},\"visible\":${visible!=null},\"widthDuration\":${width.animation?.durationNanos?.div(1_000_000L)},\"colorDuration\":${color.animation?.durationNanos?.div(1_000_000L)},\"launches\":${BorderClock.launches},\"strokes\":${strokes.joinToString(prefix="[",postfix="]")}}")
  }
  cases.add("{\"name\":\"$name\",\"scheme\":\"$scheme\",\"initialChecked\":$initialChecked,\"initialEnabled\":$initialEnabled,\"palettes\":${palettes.joinToString(prefix="[",postfix="]"){it.vectorJson()}},\"events\":${events.joinToString(prefix="[",postfix="]"){it.json()}},\"frames\":${frames.joinToString(prefix="[",postfix="]")}}")
 }
 println(cases.joinToString(prefix="[",postfix="]"))
}
