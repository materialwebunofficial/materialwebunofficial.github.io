package androidx.compose.animation.core

import androidx.compose.runtime.MonotonicFrameClock
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.resume
import kotlinx.coroutines.*

// Deterministic JVM dispatcher/delay/frame delivery are platform hosts. Real
// CoroutineScope/Job/Mutex/CancellableContinuation and native animation bodies
// execute. No Compose snapshot observation or Android dispatcher is substituted.
@OptIn(InternalCoroutinesApi::class)
class ClockDispatcher:CoroutineDispatcher(),Delay{
    var millis=0L
    private data class Waiting(val due:Long,val continuation:CancellableContinuation<Unit>)
    private val waiting=mutableListOf<Waiting>()
    override fun dispatch(context:CoroutineContext,block:Runnable){block.run()}
    override fun scheduleResumeAfterDelay(timeMillis:Long,continuation:CancellableContinuation<Unit>){
        val item=Waiting(millis+timeMillis,continuation);waiting.add(item)
        continuation.invokeOnCancellation{waiting.remove(item)}
    }
    fun advanceTo(time:Long){
        require(time>=millis)
        while(true){val item=waiting.minByOrNull{it.due}?:break;if(item.due>time)break
            waiting.remove(item);millis=item.due;if(item.continuation.isActive)item.continuation.resume(Unit)
        }
        millis=time
    }
    val pendingDelays get()=waiting.size
}

class ClockFrames:MonotonicFrameClock{
    private val waiting=linkedSetOf<CancellableContinuation<Long>>()
    override suspend fun <R> withFrameNanos(onFrame:(Long)->R):R{
        val time=suspendCancellableCoroutine<Long>{continuation->waiting.add(continuation);continuation.invokeOnCancellation{waiting.remove(continuation)}}
        return onFrame(time)
    }
    fun frame(time:Long){val pending=waiting.toList();waiting.clear();for(item in pending)if(item.isActive)item.resume(time)}
    val pendingFrames get()=waiting.size
}

typealias AtomicReference<T> = java.util.concurrent.atomic.AtomicReference<T>
open class PlatformOptimizedCancellationException(message:String):CancellationException(message)
internal const val AnimationDebugDurationScale=1L
internal inline fun checkPrecondition(value:Boolean,lazyMessage:()->String){check(value,lazyMessage)}
internal fun throwIllegalArgumentException(message:String):Nothing=throw IllegalArgumentException(message)

// Decay is outside this finite spring/snap reference. Fail if it is entered.
class DecayAnimationSpec<T>
class DecayAnimation<T,V:AnimationVector>(animationSpec:DecayAnimationSpec<T>,typeConverter:TwoWayConverter<T,V>,initialValue:T,initialVelocityVector:V):Animation<T,V>{
    override val durationNanos:Long get()=error("Unused decay path")
    override val typeConverter:TwoWayConverter<T,V> get()=error("Unused decay path")
    override val targetValue:T get()=error("Unused decay path")
    override val isInfinite:Boolean get()=error("Unused decay path")
    override fun getValueFromNanos(playTimeNanos:Long):T=error("Unused decay path")
    override fun getVelocityVectorFromNanos(playTimeNanos:Long):V=error("Unused decay path")
}
