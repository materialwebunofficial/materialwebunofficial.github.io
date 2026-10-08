package androidx.compose.animation.core
import kotlin.coroutines.*
import androidx.compose.material3.tokens.ExpressiveMotionTokens as E
import androidx.compose.material3.tokens.StandardMotionTokens as S

annotation class Stable
class Size(val width:Float,val height:Float){val minDimension get()=minOf(width,height)}
class Density
enum class LayoutDirection{Ltr,Rtl}
class Outline(val radius:Float)
interface Shape{fun createOutline(size:Size,layoutDirection:LayoutDirection,density:Density):Outline}
interface ShapeWithHorizontalCenterOptically:Shape{fun offset(size:Size,density:Density):Float}
const val CenterOpticallyCoefficient=.11f // unused for the uniform corners in this host
interface CornerSize{fun toPx(shapeSize:Size,density:Density):Float}
data class PixelCorner(val px:Float):CornerSize{override fun toPx(shapeSize:Size,density:Density)=px}
data class PercentCorner(val percent:Float):CornerSize{override fun toPx(shapeSize:Size,density:Density)=shapeSize.minDimension*(percent/100f)}
abstract class CornerBasedShape:Shape{abstract val topStart:CornerSize;abstract val topEnd:CornerSize;abstract val bottomEnd:CornerSize;abstract val bottomStart:CornerSize}
data class RoundedCornerShape(override val topStart:CornerSize,override val topEnd:CornerSize=topStart,override val bottomEnd:CornerSize=topStart,override val bottomStart:CornerSize=topStart):CornerBasedShape(),Interpolatable{
 override fun createOutline(size:Size,layoutDirection:LayoutDirection,density:Density)=Outline(topStart.toPx(size,density))
 override fun lerp(other:Any?,t:Float):Any?=if(other is RoundedCornerShape)lerp(this,other,t)else null
}
object ButtonFrames{var time=0L}
class Animatable(initial:Float){
 private var stored=initial;private var animation:NativeProgress?=null
 val value:Float get()=sample().value
 val velocity:Float get()=sample().velocity
 private fun sample():Motion{
  val a=animation?:return Motion(stored,0f)
  val elapsed=ButtonFrames.time-a.start
  return if(elapsed>=a.duration){stored=a.to;animation=null;Motion(stored,0f)}else SpringSimulation(a.to).also{it.stiffness=a.spec.stiffness;it.dampingRatio=a.spec.damping}.updateValues(a.from,a.velocity,elapsed)
 }
 suspend fun snapTo(value:Float){stored=value;animation=null}
 suspend fun animateTo(to:Float,spec:FiniteAnimationSpec<Float>,initialVelocity:Float=velocity){
  val from=value;val threshold=spec.visibilityThreshold?:.01f;animation=NativeProgress(from,to,initialVelocity,spec,ButtonFrames.time,estimateAnimationDurationMillis(spec.stiffness,spec.damping,initialVelocity/threshold,(from-to)/threshold,1f).coerceAtLeast(0))
 }
}
data class NativeProgress(val from:Float,val to:Float,val velocity:Float,val spec:FiniteAnimationSpec<Float>,val start:Long,val duration:Long)
fun execute(block:suspend()->Unit){block.startCoroutine(object:Continuation<Unit>{override val context=EmptyCoroutineContext;override fun resumeWith(result:Result<Unit>){result.getOrThrow()}})}
fun shape(id:String):RoundedCornerShape=RoundedCornerShape(if(id=="round")PercentCorner(50f)else PixelCorner(id.toFloat()))
fun main(){
 val histories=mutableListOf<String>()
 val events=listOf(listOf(0L to "8",16L to "round"),listOf(0L to "8",64L to "round"),listOf(0L to "8",96L to "round",112L to "8",176L to "round"),listOf(0L to "8",64L to "12",96L to "round",144L to "16"),listOf(0L to "8",600L to "round"))
 for(standard in listOf(false,true))for(ops in events){
  val spec=FiniteAnimationSpec<Float>(if(standard)S.SpringDefaultEffectsStiffness else E.SpringDefaultEffectsStiffness,if(standard)S.SpringDefaultEffectsDamping else E.SpringDefaultEffectsDamping)
  val state=AnimatedShapeState(shape("round"),spec);val frames=mutableListOf<String>();var at=0
  val times=(ops.map{it.first}+listOf(0L,1L,16L,32L,64L,96L,112L,144L,176L,256L,400L,600L,616L,800L,1100L)).distinct().sorted()
  for(time in times){ButtonFrames.time=time;while(at<ops.size&&ops[at].first<=time){execute{state.animateToShape(shape(ops[at].second))};at++}
   val corner=(state.getMorphedShape() as RoundedCornerShape).topStart
   val radius=corner.toPx(Size(if(time>=144)120f else 160f,if(time>=144)80f else 40f),Density())
   frames.add("{\"time\":$time,\"progress\":${state.progress.value},\"velocity\":${state.progress.velocity},\"radius\":$radius}")
  }
  val encoded=ops.joinToString(prefix="[",postfix="]"){"{\"time\":${it.first},\"shape\":\"${it.second}\"}"}
  histories.add("{\"scheme\":\"${if(standard) "standard" else "expressive"}\",\"events\":$encoded,\"frames\":${frames.joinToString(prefix="[",postfix="]")}}")
 }
 println(histories.joinToString(prefix="[",postfix="]"))
}
