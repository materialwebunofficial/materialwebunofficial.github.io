package androidx.compose.animation.core

import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.resume
import kotlinx.coroutines.*

// Delay's timer is a deterministic platform leaf. Dispatch itself delegates to
// the complete original AndroidUiDispatcher, including its applying trampoline.
@OptIn(InternalCoroutinesApi::class)
class ClockBroadcastDelayHost(private val clock:BroadcastClockHost):CoroutineDispatcher(),Delay {
    var millis=0L
    private data class Waiting(val due:Long,val continuation:CancellableContinuation<Unit>)
    private val waiting=mutableListOf<Waiting>()
    override fun dispatch(context:CoroutineContext,block:Runnable)=clock.dispatcher.dispatch(context,block)
    override fun isDispatchNeeded(context:CoroutineContext)=clock.dispatcher.isDispatchNeeded(context)
    override fun scheduleResumeAfterDelay(timeMillis:Long,continuation:CancellableContinuation<Unit>){
        val item=Waiting(millis+timeMillis,continuation);waiting.add(item)
        continuation.invokeOnCancellation{waiting.remove(item)}
    }
    fun advanceTo(time:Long){
        require(time>=millis)
        while(true){val item=waiting.minByOrNull{it.due}?:break;if(item.due>time)break
            waiting.remove(item);millis=item.due;if(item.continuation.isActive)item.continuation.resume(Unit)
            clock.pump()
        }
        millis=time
    }
    val pendingDelays get()=waiting.size
}
