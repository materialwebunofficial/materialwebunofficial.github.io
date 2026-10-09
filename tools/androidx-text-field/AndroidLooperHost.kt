package android.os

// Only platform leaves are hosted. The unchanged AndroidUiDispatcher owns its
// real trampoline/frame queues and executes real coroutine continuations.
class Looper {
    companion object {
        private val main=Looper()
        @JvmStatic fun getMainLooper()=main
        @JvmStatic fun myLooper()=main
    }
}
class Handler(val looper:Looper) {
    private val waiting=ArrayDeque<Runnable>()
    fun post(block:Runnable):Boolean {waiting.addLast(block);return true}
    fun removeCallbacks(block:Runnable){waiting.removeAll{it===block}}
    fun drain(){while(waiting.isNotEmpty())waiting.removeFirst().run()}
    val pending get()=waiting.size
}
