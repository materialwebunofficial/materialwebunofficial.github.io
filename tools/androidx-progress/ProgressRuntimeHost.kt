package androidx.compose.animation.core

import androidx.compose.runtime.MonotonicFrameClock
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.resume
import kotlinx.coroutines.*

// Frame delivery is a platform binding. Real Job cancellation and the complete
// original Animatable/MutatorMutex/AnimationState/SuspendAnimation loop execute.
class PulseClock:MonotonicFrameClock {
    var now=0L
    private val waiters=linkedSetOf<CancellableContinuation<Long>>()
    override suspend fun <R> withFrameNanos(onFrame:(Long)->R):R {
        val time=suspendCancellableCoroutine<Long>{continuation->
            waiters.add(continuation)
            continuation.invokeOnCancellation{waiters.remove(continuation)}
        }
        return onFrame(time)
    }
    fun frame(time:Long){now=time;val pending=waiters.toList();waiters.clear();for(waiter in pending)if(waiter.isActive)waiter.resume(time)}
    val pendingCount get()=waiters.size
}

typealias AtomicReference<T> = java.util.concurrent.atomic.AtomicReference<T>
open class PlatformOptimizedCancellationException(message:String):CancellationException(message)
internal const val AnimationDebugDurationScale=1L
internal inline fun checkPrecondition(value:Boolean,lazyMessage:()->String){check(value,lazyMessage)}

// These paths are not used by progress's explicit tween/infinite specs. Fail if
// execution crosses the declared scope instead of inventing spring/decay math.
class SpringSpec<T>(visibilityThreshold:T?=null):AnimationSpec<T>{
 override fun <V:AnimationVector> vectorize(converter:TwoWayConverter<T,V>):VectorizedAnimationSpec<V> = error("Unused spring path")
}
class DecayAnimationSpec<T>
object Spring { const val DefaultDisplacementThreshold=.01f }
class DecayAnimation<T,V:AnimationVector>(animationSpec:DecayAnimationSpec<T>,typeConverter:TwoWayConverter<T,V>,initialValue:T,initialVelocityVector:V):Animation<T,V>{
 override val durationNanos:Long get()=error("Unused decay path")
 override val typeConverter:TwoWayConverter<T,V> get()=error("Unused decay path")
 override val targetValue:T get()=error("Unused decay path")
 override val isInfinite:Boolean get()=error("Unused decay path")
 override fun getValueFromNanos(playTimeNanos:Long):T=error("Unused decay path")
 override fun getVelocityVectorFromNanos(playTimeNanos:Long):V=error("Unused decay path")
}
