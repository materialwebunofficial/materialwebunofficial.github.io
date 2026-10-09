package androidx.compose.animation.core

import androidx.compose.runtime.BroadcastFrameClock
import java.util.concurrent.atomic.AtomicInteger

// Original remembered scopes inherit the Recomposer's broadcast frame clock.
// Frame delivery/commit are explicit driver entries; the Recomposer itself and
// Android OS are not substituted by this deterministic driver.
class BroadcastClockHost {
    private val android=AndroidClockHost()
    val dispatcher get()=android.dispatcher
    val frameClock=BroadcastFrameClock()
    fun frame(time:Long)=frameClock.sendFrame(time)
    fun pump()=android.pump()
    private val queue=BroadcastFrameClock::class.java.getDeclaredField("queue").also{it.isAccessible=true}.get(frameClock)
    private val count=queue::class.java.getDeclaredField("pendingAwaitersCountUnlocked").also{it.isAccessible=true}.get(queue) as AtomicInteger
    private val bits=Class.forName("androidx.compose.runtime.internal.AtomicAwaitersCount").getDeclaredField("COUNT_BITS").also{it.isAccessible=true}.getInt(null)
    val pendingFrames get()=count.get() and (-1 shl bits).inv()
}
