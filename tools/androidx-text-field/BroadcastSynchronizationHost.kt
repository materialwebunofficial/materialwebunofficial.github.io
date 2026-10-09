package androidx.compose.runtime.platform
import kotlin.contracts.*
fun makeSynchronizedObject(reference:Any?=null)=reference?:Any()
@OptIn(ExperimentalContracts::class)
inline fun <R> synchronized(lock:Any,block:()->R):R{
 contract {callsInPlace(block,InvocationKind.EXACTLY_ONCE)}
 return kotlin.synchronized(lock,block)
}
