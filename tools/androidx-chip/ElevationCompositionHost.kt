package androidx.compose.material3
import androidx.compose.animation.core.*
import androidx.compose.foundation.interaction.*
import kotlin.coroutines.*
import kotlin.reflect.KProperty
annotation class Composable
annotation class Immutable
data class Offset(val x:Float,val y:Float){companion object{val Zero=Offset(0f,0f)}}
interface State<T>{val value:T}
class MutableState<T>(override var value:T):State<T>
operator fun<T> State<T>.getValue(owner:Any?,property:KProperty<*>)=value
operator fun<T> MutableState<T>.setValue(owner:Any?,property:KProperty<*>,value:T){this.value=value}
fun<T> mutableStateOf(value:T)=MutableState(value)
fun<T> mutableStateListOf()=mutableListOf<T>()
object ElevationClock{var time=0L}
object ElevationMemory{
 val cells=mutableListOf<Any?>();var cursor=0
 val keys=mutableListOf<Any?>();var effectCursor=0
 val effects=mutableListOf<suspend()->Unit>()
 fun reset(){cells.clear();keys.clear();effects.clear();cursor=0;effectCursor=0}
}
@Suppress("UNCHECKED_CAST")
fun<T> remember(factory:()->T):T{val index=ElevationMemory.cursor++;if(index<ElevationMemory.cells.size)return ElevationMemory.cells[index] as T;return factory().also{ElevationMemory.cells.add(it)}}
fun LaunchedEffect(key:Any?,block:suspend()->Unit){
 val index=ElevationMemory.effectCursor++
 if(index>=ElevationMemory.keys.size){ElevationMemory.keys.add(key);ElevationMemory.effects.add(block)}
 else if(ElevationMemory.keys[index]!=key){
  // Explicit sequential clock: complete a due frame before canceling the old
  // target job; an interrupted continuation never reaches lastInteraction.
  if(index==1)ElevationMemory.cells.filterIsInstance<Animatable<*,*>>().forEach{it.value;it.cancelPending()}
  ElevationMemory.keys[index]=key;ElevationMemory.effects.add(block)
 }
}
fun runSuspend(block:suspend()->Unit){block.startCoroutine(object:Continuation<Unit>{override val context=EmptyCoroutineContext;override fun resumeWith(result:Result<Unit>){result.getOrThrow()}})}
fun kind(value:Interaction?)=when(value){is HoverInteraction.Enter->"hover";is FocusInteraction.Focus->"focus";is PressInteraction.Press->"press";is DragInteraction.Start->"drag";else->"null"}
data class ElevationOp(val time:Long,val event:String?=null,val enabled:Boolean?=null,val config:String?=null){
 fun json():String{val fields=mutableListOf("\"time\":$time");event?.let{fields.add("\"event\":\"$it\"")};enabled?.let{fields.add("\"enabled\":$it")};config?.let{fields.add("\"config\":\"$it\"")};return fields.joinToString(",","{","}")}
}
