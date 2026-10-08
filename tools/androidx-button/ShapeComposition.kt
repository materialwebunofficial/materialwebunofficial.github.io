package androidx.compose.animation.core
import androidx.compose.material3.tokens.*
import androidx.compose.material3.tokens.ExpressiveMotionTokens as E
import androidx.compose.material3.tokens.StandardMotionTokens as S

// Slot/group memory, effect draining, theme provision, density1 and outlines
// are explicit hosts. Original ButtonShapes/defaults/shapeByInteraction and
// both rememberAnimatedShape bodies execute against these hosts.
@Target(AnnotationTarget.FUNCTION,AnnotationTarget.PROPERTY_GETTER)
annotation class Composable
data class Dp(val value:Float):Comparable<Dp>{
 operator fun plus(other:Dp)=Dp(value+other.value)
 operator fun div(value:Int)=Dp(this.value/value)
 override fun compareTo(other:Dp)=value.compareTo(other.value)
}
val Double.dp get()=Dp(toFloat())
val Int.dp get()=Dp(toFloat())
data class PrecisionPointerFlag(val value:Boolean)
val shouldUsePrecisionPointerComponentSizing=PrecisionPointerFlag(false)
fun CornerSize(value:Dp):CornerSize=PixelCorner(value.value)
fun RoundedCornerShape(topStart:Dp,topEnd:Dp=topStart,bottomEnd:Dp=topStart,bottomStart:Dp=topStart)=RoundedCornerShape(CornerSize(topStart),CornerSize(topEnd),CornerSize(bottomEnd),CornerSize(bottomStart))
val CircleShape=RoundedCornerShape(PercentCorner(50f))
object RectangleShape:Shape{override fun createOutline(size:Size,layoutDirection:LayoutDirection,density:Density)=Outline(0f)}

class Shapes(val overrides:Map<Int,CornerSize> = emptyMap()){
 var defaultButtonShapesCached:ButtonShapes?=null
 internal fun fromToken(token:ShapeToken):Shape=overrides[token.id]?.let{RoundedCornerShape(it)}?:when(token){
  ShapeKeyTokens.CornerFull->ShapeTokens.CornerFull
  ShapeKeyTokens.CornerSmall->ShapeTokens.CornerSmall
  ShapeKeyTokens.CornerMedium->ShapeTokens.CornerMedium
  ShapeKeyTokens.CornerLarge->ShapeTokens.CornerLarge
  ShapeKeyTokens.CornerExtraLarge->ShapeTokens.CornerExtraLarge
  else->error("Only uniform button roles are supplied by this host")
 }
}
object MaterialTheme{var shapes=Shapes()}
internal val ShapeToken.value get()=MaterialTheme.shapes.fromToken(this)

data class MemoryCell(val key:Any?,val value:Any?)
object ButtonMemory{
 var group:Any?=null;var cursor=0;var lastEffect:Any?=null;var generation=0
 val cells=mutableListOf<MemoryCell>()
 fun reset(){group=null;cursor=0;lastEffect=null;generation=0;cells.clear()}
}
fun<T> key(key:Any?,block:()->T):T{
 if(key!=ButtonMemory.group){ButtonMemory.group=key;ButtonMemory.cells.clear();ButtonMemory.lastEffect=null}
 return block()
}
@Suppress("UNCHECKED_CAST")
fun<T> remember(key:Any?,factory:()->T):T{
 val i=ButtonMemory.cursor++;val old=ButtonMemory.cells.getOrNull(i)
 if(old!=null&&old.key==key)return old.value as T
 val value=factory();if(value is AnimatedShapeState)ButtonMemory.generation++
 if(i<ButtonMemory.cells.size)ButtonMemory.cells[i]=MemoryCell(key,value)else ButtonMemory.cells.add(MemoryCell(key,value))
 return value
}
internal fun LaunchedEffect(shape:CornerBasedShape,state:AnimatedShapeState,block:suspend()->Unit){
 val key=listOf(shape,state);if(key!=ButtonMemory.lastEffect){ButtonMemory.lastEffect=key;execute(block)}
}

data class Op(val time:Long,val pressed:Boolean?=null,val size:String?=null,val square:Boolean?=null,val role:String?=null,val value:Float?=null,val percent:Boolean=false,val stiffness:Float?=null,val damping:Float?=null,val threshold:Float?=null,val scheme:String?=null,val incidental:Boolean=false){
 fun json():String{val fields=mutableListOf("\"time\":$time")
  pressed?.let{fields.add("\"pressed\":$it")};size?.let{fields.add("\"size\":\"$it\"")};square?.let{fields.add("\"square\":$it")}
  role?.let{fields.add("\"role\":\"$it\"");fields.add("\"value\":$value");fields.add("\"percent\":$percent")}
  stiffness?.let{fields.add("\"spec\":{\"stiffness\":$it,\"dampingRatio\":$damping,\"visibilityThreshold\":$threshold}")}
  scheme?.let{fields.add("\"scheme\":\"$it\"")};if(incidental)fields.add("\"incidental\":true")
  return fields.joinToString(prefix="{",postfix="}")
 }
}
fun roleId(role:String)=when(role){"small"->ShapeKeyTokens.CornerSmall.id;"medium"->ShapeKeyTokens.CornerMedium.id;"large"->ShapeKeyTokens.CornerLarge.id;"extra-large"->ShapeKeyTokens.CornerExtraLarge.id;else->error(role)}
fun height(size:String)=when(size){"xs"->32;"s"->40;"m"->56;"l"->96;else->136}
internal fun squareToken(size:String)=when(size){"xs"->ButtonXSmallTokens.ContainerShapeSquare;"s"->ButtonSmallTokens.ContainerShapeSquare;"m"->ButtonMediumTokens.ContainerShapeSquare;"l"->ButtonLargeTokens.ContainerShapeSquare;else->ButtonXLargeTokens.ContainerShapeSquare}
fun buttonShapes(size:String,square:Boolean):ButtonShapes{
 val defaults=ButtonDefaults.shapesFor(height(size).dp)
 return if(square)ButtonDefaults.shapes(shape=squareToken(size).value,pressedShape=defaults.pressedShape)else defaults
}
fun main(){
 val histories=listOf(
  "reversal" to listOf(Op(0,pressed=true),Op(16,pressed=false),Op(112,pressed=true),Op(176,pressed=false)),
  "equal-new-values" to listOf(Op(0,pressed=true),Op(32,incidental=true),Op(64,scheme="standard"),Op(96,pressed=false)),
  "xs-to-small-equal-shapes" to listOf(Op(0,size="xs"),Op(1,pressed=true),Op(64,size="s"),Op(96,pressed=false)),
  "replace-square-pressed" to listOf(Op(0,pressed=true),Op(64,square=true),Op(96,pressed=false),Op(144,square=false)),
  "replace-square-rest" to listOf(Op(32,square=true),Op(64,pressed=true),Op(96,square=false),Op(144,pressed=false)),
  "replace-size-pressed" to listOf(Op(0,pressed=true),Op(64,size="m"),Op(96,pressed=false),Op(144,size="l"),Op(176,pressed=true)),
  "all-square-sizes" to listOf(Op(0,square=true),Op(16,size="xs"),Op(32,size="s"),Op(64,size="m"),Op(96,size="l"),Op(112,size="xl"),Op(144,pressed=true),Op(176,pressed=false)),
  "replace-effect-spec" to listOf(Op(0,pressed=true),Op(64,stiffness=2200f,damping=.7f),Op(96,pressed=false),Op(144,stiffness=1600f,damping=1f)),
  "equal-effect-spec" to listOf(Op(0,pressed=true),Op(64,stiffness=1600f,damping=1f),Op(96,pressed=false)),
  "equal-signed-zero-damping" to listOf(Op(0,pressed=true),Op(64,stiffness=1600f,damping=0f),Op(96,stiffness=1600f,damping=-0f),Op(144,pressed=false)),
  "replace-visible-threshold" to listOf(Op(0,pressed=true),Op(64,stiffness=1600f,damping=1f,threshold=.01f),Op(96,pressed=false)),
  "theme-unused-role" to listOf(Op(0,pressed=true),Op(64,role="medium",value=19f),Op(96,pressed=false)),
  "theme-pressed-role" to listOf(Op(0,pressed=true),Op(64,role="small",value=11f),Op(96,pressed=false)),
  "theme-square-role" to listOf(Op(0,square=true),Op(16,pressed=true),Op(64,role="medium",value=19f),Op(96,pressed=false)),
  "theme-percent-corner" to listOf(Op(0,pressed=true),Op(64,role="small",value=25f,percent=true),Op(96,pressed=false))
 )
 val cases=mutableListOf<String>()
 for(initialScheme in listOf("expressive","standard"))for((name,events)in histories){
  ButtonMemory.reset();MaterialTheme.shapes=Shapes();var size="s";var square=false;var pressed=false;var scheme=initialScheme
  var override:FiniteAnimationSpec<Float>?=null;val overrides=mutableMapOf<Int,CornerSize>()
  fun render():Shape{ButtonMemory.cursor=0;val spec=override?:FiniteAnimationSpec<Float>(if(scheme=="standard")S.SpringDefaultEffectsStiffness else E.SpringDefaultEffectsStiffness,if(scheme=="standard")S.SpringDefaultEffectsDamping else E.SpringDefaultEffectsDamping);val shapes=buttonShapes(size,square);check(shapes.copy()==shapes&&shapes.copy().hashCode()==shapes.hashCode());return shapeByInteraction(shapes,pressed,spec)}
  ButtonFrames.time=0;render();var at=0;val frames=mutableListOf<String>()
  val times=(events.map{it.time}+listOf(0L,1L,16L,32L,64L,65L,96L,112L,144L,176L,256L,400L,600L,800L,1100L)).distinct().sorted()
  for(time in times){ButtonFrames.time=time
   while(at<events.size&&events[at].time<=time){val e=events[at++];e.pressed?.let{pressed=it};e.size?.let{size=it};e.square?.let{square=it};e.scheme?.let{scheme=it}
    e.stiffness?.let{override=FiniteAnimationSpec(it,e.damping!!,e.threshold)}
    e.role?.let{overrides[roleId(it)]=if(e.percent)PercentCorner(e.value!!)else PixelCorner(e.value!!);MaterialTheme.shapes=Shapes(overrides.toMap())}
    render()
   }
   val renderer=render();val state=ButtonMemory.cells[0].value as AnimatedShapeState
   val bounds=Size(if(time>=144)240f else 320f,if(time>=144)180f else 160f)
   val radius=renderer.createOutline(bounds,LayoutDirection.Ltr,Density()).radius
   val offset=(renderer as ShapeWithHorizontalCenterOptically).offset(bounds,Density());check(offset==0f)
   frames.add("{\"time\":$time,\"generation\":${ButtonMemory.generation},\"progress\":${state.progress.value},\"velocity\":${state.progress.velocity},\"radius\":$radius}")
  }
  cases.add("{\"name\":\"$name\",\"scheme\":\"$initialScheme\",\"events\":${events.joinToString(prefix="[",postfix="]"){it.json()}},\"frames\":${frames.joinToString(prefix="[",postfix="]")}}")
 }
 println(cases.joinToString(prefix="[",postfix="]"))
}
