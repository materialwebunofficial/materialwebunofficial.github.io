package androidx.compose.runtime

import kotlin.reflect.KProperty
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow

annotation class Composable
interface State<out T> {val value:T}
object StateWriteObserver {var write:((Any,Any?)->Unit)?=null}
class MutableState<T>(initial:T):State<T>{override var value:T=initial;set(next){field=next;StateWriteObserver.write?.invoke(this,next)}}
fun <T> mutableStateOf(value:T)=MutableState(value)
operator fun <T> State<T>.getValue(receiver:Any?,property:KProperty<*>)=value
operator fun <T> MutableState<T>.setValue(receiver:Any?,property:KProperty<*>,next:T){value=next}
// Explicit remember slots and commit entry are hosts. Original wrappers and
// AnimateAsState update/jobs execute; this is not a Compose snapshot scheduler.
class Composition(val scope:CoroutineScope){
    data class Slot(val keys:List<Any?>,val value:Any?)
    fun dispose(){for(slot in slots)(slot.value as? RememberObserver)?.onForgotten()}
    val slots=mutableListOf<Slot>();var index=0;val effects=mutableListOf<()->Unit>()
    fun <T> commit(block:()->T):T {current=this;index=0;val value=block();val pending=effects.toList();effects.clear();for(effect in pending)effect();return value}
}
lateinit var current:Composition
@Suppress("UNCHECKED_CAST")
fun <T> remember(vararg keys:Any?,calculation:()->T):T {
    val at=current.index++;val previous=current.slots.getOrNull(at)
    if(previous!=null&&previous.keys==keys.toList())return previous.value as T
    val next=Composition.Slot(keys.toList(),calculation());if(at==current.slots.size)current.slots.add(next)else current.slots[at]=next
    (next.value as? RememberObserver)?.onRemembered()
    return next.value as T
}
class Composer(val applyCoroutineContext:kotlin.coroutines.CoroutineContext)
val currentComposer get()=Composer(current.scope.coroutineContext)
fun SideEffect(effect:()->Unit){current.effects.add(effect)}
fun <T> snapshotFlow(block:()->T):Flow<T> = error("Unused infinite snapshot resume")

interface RememberObserver {fun onRemembered();fun onForgotten();fun onAbandoned()}
@Target(AnnotationTarget.TYPE) annotation class DisallowComposableCalls
@RequiresOptIn annotation class InternalComposeApi
@RequiresOptIn annotation class ComposeToolingApi
object ComposeToolingFlags {const val isVerboseTracingEnabled=false}
object RememberedCoroutineScopeTracingContext:kotlin.coroutines.AbstractCoroutineContextElement(Key){object Key:kotlin.coroutines.CoroutineContext.Key<RememberedCoroutineScopeTracingContext>}
open class PlatformOptimizedCancellationException(message:String):kotlinx.coroutines.CancellationException(message)
class CompositionErrorContextImpl:kotlin.coroutines.AbstractCoroutineContextElement(Key){
 companion object Key:kotlin.coroutines.CoroutineContext.Key<CompositionErrorContextImpl>
 fun Throwable.attachComposeStackTrace(scope:kotlinx.coroutines.CoroutineScope):Unit=error("Tracing outside this host scope")
}
