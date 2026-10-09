package androidx.compose.runtime

import kotlin.reflect.KProperty
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow

annotation class Composable
interface State<out T> {val value:T}
class MutableState<T>(override var value:T):State<T>
fun <T> mutableStateOf(value:T)=MutableState(value)
operator fun <T> State<T>.getValue(receiver:Any?,property:KProperty<*>)=value
operator fun <T> MutableState<T>.setValue(receiver:Any?,property:KProperty<*>,next:T){value=next}
// Explicit remember slots and commit entry are hosts. Original wrappers and
// AnimateAsState update/jobs execute; this is not a Compose snapshot scheduler.
class Composition(val scope:CoroutineScope){
    data class Slot(val keys:List<Any?>,val value:Any?)
    val slots=mutableListOf<Slot>();var index=0;val effects=mutableListOf<()->Unit>()
    fun <T> commit(block:()->T):T {current=this;index=0;val value=block();val pending=effects.toList();effects.clear();for(effect in pending)effect();return value}
}
lateinit var current:Composition
@Suppress("UNCHECKED_CAST")
fun <T> remember(vararg keys:Any?,calculation:()->T):T {
    val at=current.index++;val previous=current.slots.getOrNull(at)
    if(previous!=null&&previous.keys==keys.toList())return previous.value as T
    val next=Composition.Slot(keys.toList(),calculation());if(at==current.slots.size)current.slots.add(next)else current.slots[at]=next
    return next.value as T
}
fun rememberCoroutineScope()=current.scope
fun SideEffect(effect:()->Unit){current.effects.add(effect)}
fun <T> snapshotFlow(block:()->T):Flow<T> = error("Unused infinite snapshot resume")
