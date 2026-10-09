package androidx.core.os
import android.os.Handler
import android.os.Looper
object HandlerCompat {@JvmStatic fun createAsync(looper:Looper)=Handler(looper)}
