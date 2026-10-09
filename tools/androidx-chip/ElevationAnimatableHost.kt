package androidx.compose.animation.core
import androidx.compose.material3.ElevationClock
import androidx.compose.material3.State
import androidx.compose.ui.unit.Dp
import kotlin.coroutines.*
interface AnimationSpec<T>
class TweenSpec<T>(val durationMillis:Int,val easing:Easing):AnimationSpec<T>
// Clock/value/continuation host. Numeric FloatTweenSpec, Easing, complete
// ChipElevation classes and internal animateElevation execute unchanged.
class Animatable<T,V>(initial:T,converter:V){
 var targetValue=initial;private set
 var from=initial;private set
 private var stored=initial
 var start=0L;private set
 var lastSpec:TweenSpec<T>?=null;private set
 var launches=0;private set
 var snaps=0;private set
 private var initialVelocity=0f
 private var pending:Continuation<Unit>?=null
 val value:T get(){val spec=lastSpec?:return stored
  if(ElevationClock.time-start>=spec.durationMillis){stored=targetValue;lastSpec=null;val complete=pending;pending=null;complete?.resume(Unit);return stored}
  @Suppress("UNCHECKED_CAST")
  return Dp(FloatTweenSpec(spec.durationMillis,0,spec.easing).getValueFromNanos((ElevationClock.time-start)*1000000L,(from as Dp).value,(targetValue as Dp).value,initialVelocity)) as T}
 val velocity:Float get(){value;val spec=lastSpec?:return 0f;return FloatTweenSpec(spec.durationMillis,0,spec.easing).getVelocityFromNanos((ElevationClock.time-start)*1000000L,(from as Dp).value,(targetValue as Dp).value,initialVelocity)}
 suspend fun animateTo(target:T,spec:AnimationSpec<T>){
  val current=value;val velocity=velocity;pending=null;from=current;initialVelocity=velocity;targetValue=target;start=ElevationClock.time;lastSpec=spec as TweenSpec<T>;launches++
  suspendCoroutine<Unit>{pending=it}
 }
 suspend fun snapTo(target:T){pending=null;targetValue=target;from=target;stored=target;lastSpec=null;initialVelocity=0f;snaps++}
 fun cancelPending(){pending=null}
 fun asState():State<T>{val self=this;return object:State<T>{override val value get()=self.value}}
}
