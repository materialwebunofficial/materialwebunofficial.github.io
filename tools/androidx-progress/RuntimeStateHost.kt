package androidx.compose.runtime

import kotlin.reflect.KProperty
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.Flow

// Plain scalar state binding; no Compose snapshot observer/composition scheduler.
interface State<out T> { val value:T }
class MutableState<T>(override var value:T):State<T>
fun <T> mutableStateOf(value:T):MutableState<T> = MutableState(value)
operator fun <T> State<T>.getValue(receiver:Any?,property:KProperty<*>):T = value
operator fun <T> MutableState<T>.setValue(receiver:Any?,property:KProperty<*>,next:T){value=next}

// Explicit composition entry/storage adapters. The original transition loop
// and child state bodies execute; composition/snapshot scheduling does not.
lateinit var effectScope:CoroutineScope
fun <T> remember(calculation:()->T):T=calculation()
fun LaunchedEffect(key:Any,block:suspend CoroutineScope.()->Unit){effectScope.launch(block=block)}
fun <T> snapshotFlow(block:()->T):Flow<T> = error("Unused durationScale0 snapshot-resume path")
