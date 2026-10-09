package androidx.compose.animation.core

import android.os.Handler
import android.os.Looper
import android.view.Choreographer
import androidx.compose.ui.platform.AndroidUiDispatcher

class AndroidClockHost {
    private val handler=Handler(Looper.getMainLooper())
    private val choreographer=Choreographer.getInstance()
    private val constructor=AndroidUiDispatcher::class.java.getDeclaredConstructor(Choreographer::class.java,Handler::class.java).also{it.isAccessible=true}
    val dispatcher=constructor.newInstance(choreographer,handler)
    val frameClock get()=dispatcher.frameClock
    private val callbacks=AndroidUiDispatcher::class.java.getDeclaredField("toRunOnFrame").also{it.isAccessible=true}
    fun frame(time:Long)=choreographer.frame(time)
    fun pump()=handler.drain()
    val pendingFrames get()=(callbacks.get(dispatcher) as List<*>).size
    val pendingDispatch get()=handler.pending
}
