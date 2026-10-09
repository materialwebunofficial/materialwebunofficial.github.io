package android.view

class Choreographer {
    fun interface FrameCallback {fun doFrame(time:Long)}
    private val waiting=mutableListOf<FrameCallback>()
    fun postFrameCallback(callback:FrameCallback){waiting.add(callback)}
    fun removeFrameCallback(callback:FrameCallback){waiting.removeAll{it===callback}}
    fun frame(time:Long){val callbacks=waiting.toList();waiting.clear();for(callback in callbacks)callback.doFrame(time)}
    companion object {@JvmStatic fun getInstance()=Choreographer()}
}
