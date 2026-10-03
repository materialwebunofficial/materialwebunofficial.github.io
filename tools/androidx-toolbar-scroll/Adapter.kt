package androidx.compose.material3
import kotlin.reflect.KProperty
import kotlin.coroutines.*
import androidx.compose.animation.core.FloatSpringSpec
// Host density is an explicit input. It is CSS-pixel density in the web adapter.
data class Dp(val value:Float)
data class Density(val density:Float){fun Dp.toPx()=value*density}
var hostDensity=Density(1f)
interface DelegatableNode
open class DelegatingNode {open val shouldAutoInvalidate=true;open fun onAttach(){};fun delegate(n:DelegatableNode){}}
interface CompositionLocalConsumerModifierNode
fun nestedScrollModifierNode(connection:NestedScrollConnection,dispatcher:Any?):DelegatableNode=object:DelegatableNode{}
fun DelegatableNode.requireDensity()=hostDensity
data class Offset(val x:Float,val y:Float){companion object{val Zero=Offset(0f,0f)}}
data class Velocity(val x:Float,val y:Float){operator fun plus(v:Velocity)=Velocity(x+v.x,y+v.y);companion object{val Zero=Velocity(0f,0f)}}
class NestedScrollSource
interface NestedScrollConnection {
 fun onPostScroll(consumed:Offset,available:Offset,source:NestedScrollSource)=Offset.Zero
 suspend fun onPostFling(consumed:Velocity,available:Velocity)=Velocity.Zero
}
data class FloatingToolbarExitDirection(val name:String){companion object{val Start=FloatingToolbarExitDirection("Start");val End=FloatingToolbarExitDirection("End");val Top=FloatingToolbarExitDirection("Top");val Bottom=FloatingToolbarExitDirection("Bottom");fun values()=listOf(Start,End,Top,Bottom)}}
val Start=FloatingToolbarExitDirection.Start;val End=FloatingToolbarExitDirection.End;val Top=FloatingToolbarExitDirection.Top;val Bottom=FloatingToolbarExitDirection.Bottom
interface FloatingToolbarState {var offsetLimit:Float;var offset:Float;var contentOffset:Float}
class MutableFloat(var floatValue:Float){operator fun getValue(o:Any?,p:KProperty<*>)=floatValue;operator fun setValue(o:Any?,p:KProperty<*>,v:Float){floatValue=v}}
fun mutableFloatStateOf(v:Float)=MutableFloat(v)
interface FloatingToolbarScrollBehavior:NestedScrollConnection {val exitDirection:FloatingToolbarExitDirection;val state:FloatingToolbarState;val snapAnimationSpec:AnimationSpec<Float>;val flingAnimationSpec:DecayAnimationSpec<Float>;val floatingScrollBehaviorModifier:Modifier}
enum class Orientation{Horizontal,Vertical};enum class LayoutDirection{Ltr,Rtl}
data class IntSize(val width:Int,val height:Int){companion object{val Zero=IntSize(0,0)}}
class Constraints
class Placeable(val width:Int,val height:Int){fun placeWithLayer(x:Int,y:Int){placedX=x;placedY=y}}
var placedX=0;var placedY=0
class Measurable(val size:IntSize){fun measure(c:Constraints)=Placeable(size.width,size.height)}
class MeasureScope(val layoutDirection:LayoutDirection){fun layout(w:Int,h:Int,place:()->Unit){place()}}
data class Coordinates(val size:IntSize,val position:Offset,val parentLayoutCoordinates:Coordinates?){fun positionInParent()=position}
fun Coordinates.positionInParent()=position
class DragState(val action:(Float)->Unit)
fun DraggableState(action:(Float)->Unit)=DragState(action)
class Modifier(val measure:MeasureScope.(Measurable,Constraints)->Unit) {
 var drag:DragState?=null;var stopped:(suspend (Float)->Unit)?=null;var coordinates:((Coordinates)->Unit)?=null
 fun draggable(orientation:Orientation,state:DragState,onDragStopped:suspend (Float)->Unit):Modifier{drag=state;stopped=onDragStopped;return this}
 fun onGloballyPositioned(block:(Coordinates)->Unit):Modifier{coordinates=block;return this}
 companion object{fun layout(block:MeasureScope.(Measurable,Constraints)->Unit)=Modifier(block)}
}
interface FloatDecayAnimationSpec {
 val absVelocityThreshold:Float
 fun getTargetValue(initialValue:Float,initialVelocity:Float):Float
 fun getValueFromNanos(playTimeNanos:Long,initialValue:Float,initialVelocity:Float):Float
 fun getDurationNanos(initialValue:Float,initialVelocity:Float):Long
 fun getVelocityFromNanos(playTimeNanos:Long,initialValue:Float,initialVelocity:Float):Float
}
const val platformFlingScrollFriction=.015f
class AnimationSpec<T>(val spring:FloatSpringSpec)
class DecayAnimationSpec<T>(val decay:FloatDecayAnimationSpec)
class AnimationState(val initialValue:Float,val initialVelocity:Float=0f)
class AnimationScope(var value:Float,var velocity:Float){var canceled=false;fun cancelAnimation(){canceled=true}}
var frameStep=16L;var absoluteTime=0L;var zeroDurationScale=false;var mutateBeforeSnap=false;val records=mutableListOf<String>();var watched:FloatingToolbarState?=null
fun record(phase:String,t:Long,scope:AnimationScope){records.add("{\"phase\":\"$phase\",\"time\":$t,\"absoluteTime\":$absoluteTime,\"value\":${scope.value},\"velocity\":${scope.velocity},\"offset\":${watched!!.offset},\"canceled\":${scope.canceled}}")}
// Explicit host frame clock. Each fresh AnimationState begins on the next
// frame, as SuspendAnimation.animate's UnspecifiedTime branch requires.
// Values/velocity at and past duration follow DecayAnimation/TargetBasedAnimation.
suspend fun AnimationState.animateDecay(spec:DecayAnimationSpec<Float>,block:AnimationScope.()->Unit){
 val d=spec.decay;val duration=d.getDurationNanos(initialValue,initialVelocity);var t=if(zeroDurationScale)duration/1_000_000L else 0L
 while(true){absoluteTime+=frameStep;val nanos=t*1_000_000L;val ended=nanos>=duration
  val scope=AnimationScope(if(ended)d.getTargetValue(initialValue,initialVelocity) else d.getValueFromNanos(nanos,initialValue,initialVelocity),if(ended)0f else d.getVelocityFromNanos(nanos,initialValue,initialVelocity))
  scope.block();record("decay",t,scope);if(scope.canceled||ended)break;t+=frameStep
 }
}
suspend fun AnimationState.animateTo(target:Float,animationSpec:AnimationSpec<Float>,block:AnimationScope.()->Unit){
 val s=animationSpec.spring;val duration=s.getDurationNanos(initialValue,target,initialVelocity);var t=if(zeroDurationScale)duration/1_000_000L else 0L
 if(mutateBeforeSnap){watched!!.offsetLimit=-160f;watched!!.offset=-120f}
 while(true){absoluteTime+=frameStep;val nanos=t*1_000_000L;val ended=nanos>=duration
  val scope=AnimationScope(if(ended)target else s.getValueFromNanos(nanos,initialValue,target,initialVelocity),if(ended)0f else s.getVelocityFromNanos(nanos,initialValue,target,initialVelocity))
  scope.block();record("snap",t,scope);if(scope.canceled||ended)break;t+=frameStep
 }
}
fun <T> runSuspend(block:suspend ()->T):T {var result:Result<T>?=null;block.startCoroutine(object:Continuation<T>{override val context=EmptyCoroutineContext;override fun resumeWith(r:Result<T>){result=r}});return result!!.getOrThrow()}
