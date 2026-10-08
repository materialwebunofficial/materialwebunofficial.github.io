package androidx.compose.material3
import androidx.compose.animation.core.*
import androidx.compose.foundation.interaction.*
import androidx.compose.ui.unit.*
import kotlin.coroutines.*
annotation class Stable
annotation class Composable
data class Offset(val x:Float,val y:Float){companion object{val Zero=Offset(0f,0f)}}
interface State<T>{val value:T}
fun<T> mutableStateListOf()=mutableListOf<T>()
object ElevationClock{var time=0L}
object ElevationMemory{
 val cells=mutableListOf<Any?>();var cursor=0
 val keys=mutableListOf<Any?>();var effectCursor=0
 val effects=mutableListOf<suspend()->Unit>()
 fun reset(){cells.clear();keys.clear();effects.clear();cursor=0;effectCursor=0}
}
@Suppress("UNCHECKED_CAST")
fun<T> remember(factory:()->T):T{val i=ElevationMemory.cursor++;if(i<ElevationMemory.cells.size)return ElevationMemory.cells[i] as T;val value=factory();ElevationMemory.cells.add(value);return value}
fun LaunchedEffect(key:Any?,block:suspend()->Unit){val i=ElevationMemory.effectCursor++;if(i>=ElevationMemory.keys.size){ElevationMemory.keys.add(key);ElevationMemory.effects.add(block)}else if(ElevationMemory.keys[i]!=key){ElevationMemory.keys[i]=key;ElevationMemory.effects.add(block)}}
fun runSuspend(block:suspend()->Unit){block.startCoroutine(object:Continuation<Unit>{override val context=EmptyCoroutineContext;override fun resumeWith(result:Result<Unit>){result.getOrThrow()}})}
data class ElevationOp(val time:Long,val event:String?=null,val enabled:Boolean?=null,val config:String?=null,val incidental:Boolean=false){
 fun json():String{val fields=mutableListOf("\"time\":$time");event?.let{fields.add("\"event\":\"$it\"")};enabled?.let{fields.add("\"enabled\":$it")};config?.let{fields.add("\"config\":\"$it\"")};if(incidental)fields.add("\"incidental\":true");return fields.joinToString(prefix="{",postfix="}")}
}
fun kind(i:Interaction?)=when(i){is HoverInteraction.Enter->"hover";is FocusInteraction.Focus->"focus";is PressInteraction.Press->"press";else->"null"}
fun main(){
 val histories=listOf(
  "hover-exit" to listOf(ElevationOp(0,"hover+"),ElevationOp(160,"hover-")),
  "hover-focus-order" to listOf(ElevationOp(0,"hover+"),ElevationOp(32,"focus+"),ElevationOp(64,"focus-"),ElevationOp(160,"hover-")),
  "focus-hover-order" to listOf(ElevationOp(0,"focus+"),ElevationOp(16,"hover+"),ElevationOp(64,"hover-"),ElevationOp(160,"focus-")),
  "held-press-hover-later" to listOf(ElevationOp(0,"press+"),ElevationOp(16,"hover+"),ElevationOp(64,"hover-"),ElevationOp(160,"press-")),
  "two-presses-hover-between" to listOf(ElevationOp(0,"press1+"),ElevationOp(16,"hover+"),ElevationOp(32,"press2+"),ElevationOp(64,"press2-"),ElevationOp(96,"hover-"),ElevationOp(160,"press1-")),
  "older-press-released-first" to listOf(ElevationOp(0,"press1+"),ElevationOp(16,"hover+"),ElevationOp(32,"press2+"),ElevationOp(64,"press1-"),ElevationOp(96,"press2-"),ElevationOp(160,"hover-")),
  "two-presses-newer-canceled" to listOf(ElevationOp(0,"press1+"),ElevationOp(16,"focus+"),ElevationOp(32,"press2+"),ElevationOp(64,"press2!"),ElevationOp(96,"focus-"),ElevationOp(160,"press1-")),
  "three-presses-out-of-order" to listOf(ElevationOp(0,"press1+"),ElevationOp(16,"hover+"),ElevationOp(32,"press2+"),ElevationOp(48,"press3+"),ElevationOp(64,"press2!"),ElevationOp(96,"press3-"),ElevationOp(160,"press1-"),ElevationOp(256,"hover-")),
  "disable-with-two-presses" to listOf(ElevationOp(0,"press1+"),ElevationOp(16,"hover+"),ElevationOp(32,"press2+"),ElevationOp(64,enabled=false),ElevationOp(80,"press1!"),ElevationOp(96,"press2!"),ElevationOp(112,"hover-"),ElevationOp(160,enabled=true)),
  "hover-press-cancel" to listOf(ElevationOp(0,"hover+"),ElevationOp(16,"press+"),ElevationOp(64,"press!"),ElevationOp(160,"hover-")),
  "all-order" to listOf(ElevationOp(0,"focus+"),ElevationOp(16,"press+"),ElevationOp(32,"hover+"),ElevationOp(64,"press-"),ElevationOp(96,"focus-"),ElevationOp(160,"hover-")),
  "disabled-new-target" to listOf(ElevationOp(0,"hover+"),ElevationOp(32,enabled=false),ElevationOp(64,"hover-"),ElevationOp(96,enabled=true)),
  "disabled-same-target" to listOf(ElevationOp(0,"hover+"),ElevationOp(32,"hover-"),ElevationOp(64,enabled=false),ElevationOp(96,enabled=true)),
  "disabled-held-reenable" to listOf(ElevationOp(0,"hover+"),ElevationOp(32,enabled=false),ElevationOp(64,enabled=true),ElevationOp(160,"hover-")),
  "incidental-same-target" to listOf(ElevationOp(0,"hover+"),ElevationOp(16,incidental=true),ElevationOp(32,"press+"),ElevationOp(48,"focus+"),ElevationOp(64,"press-"),ElevationOp(96,"focus-"),ElevationOp(160,"hover-")),
  "configuration-during-flight" to listOf(ElevationOp(0,"hover+"),ElevationOp(32,config="custom"),ElevationOp(64,"focus+"),ElevationOp(96,config="filled"),ElevationOp(160,"focus-"),ElevationOp(256,"hover-")),
  "cold-disabled" to emptyList()
 )
 val values=mapOf("filled" to listOf(0f,0f,0f,1f,0f),"tonal" to listOf(0f,0f,0f,1f,0f),"elevated" to listOf(1f,1f,1f,3f,0f),"custom" to listOf(2f,4f,6f,8f,-1f),"equal-all" to listOf(2f,2f,2f,2f,2f))
 val cases=mutableListOf<String>()
 for(toggle in listOf(false,true))for(initial in values.keys)for((name,ops)in histories){
  ElevationMemory.reset();ElevationClock.time=0;var enabled=name!="cold-disabled";var configuration=initial;val source=InteractionSource();val active=mutableMapOf<String,Interaction>()
  fun definition():Any{val v=values[configuration]!!;return if(toggle)when(configuration){"filled"->ToggleButtonDefaults.elevation();"elevated"->ElevatedToggleButtonDefaults.elevation();"tonal"->FilledTonalToggleButtonDefaults.elevation();else->ToggleButtonElevation(v[0].dp,v[1].dp,v[2].dp,v[3].dp,v[4].dp)}else when(configuration){"filled"->ButtonDefaults.buttonElevation();"elevated"->ButtonDefaults.elevatedButtonElevation();"tonal"->ButtonDefaults.filledTonalButtonElevation();else->ButtonElevation(v[0].dp,v[1].dp,v[2].dp,v[3].dp,v[4].dp)}}
  fun render():State<Dp>{ElevationMemory.cursor=0;ElevationMemory.effectCursor=0;val d=definition();val state=if(d is ButtonElevation)d.shadowElevation(enabled,source)else(d as ToggleButtonElevation).shadowElevation(enabled,source);val effects=ElevationMemory.effects.toList();ElevationMemory.effects.clear();effects.forEach{runSuspend(it)};return state}
  render();var at=0;val frames=mutableListOf<String>()
  val times=(ops.map{it.time}+listOf(0L,1L,16L,31L,32L,48L,63L,64L,80L,95L,96L,112L,119L,120L,144L,149L,150L,159L,160L,176L,208L,256L,280L,310L,400L,600L)).distinct().sorted()
  for(time in times){ElevationClock.time=time
   while(at<ops.size&&ops[at].time<=time){val op=ops[at++];op.enabled?.let{enabled=it};op.config?.let{configuration=it};op.event?.let{event->val k=event.dropLast(1);val incoming=event.endsWith("+");val i=if(incoming)when(k){"hover"->HoverInteraction.Enter();"focus"->FocusInteraction.Focus();else->PressInteraction.Press()}.also{active[k]=it}else when(val old=active.remove(k)){is HoverInteraction.Enter->HoverInteraction.Exit(old);is FocusInteraction.Focus->FocusInteraction.Unfocus(old);is PressInteraction.Press->if(event.endsWith("!"))PressInteraction.Cancel(old)else PressInteraction.Release(old);else->error("event $event")};source.interactions.emit(i)};render()}
   val state=render();@Suppress("UNCHECKED_CAST") val anim=ElevationMemory.cells[1] as Animatable<Dp,Unit>;@Suppress("UNCHECKED_CAST") val order=ElevationMemory.cells[0] as List<Interaction>
   val sampled=state.value.value;val velocity=anim.velocity;val spec=anim.lastSpec;val duration=spec?.durationMillis?:0;val easing=if(spec==null) "null" else if(spec.easing===FastOutSlowInEasing) "incoming" else "outgoing"
   frames.add("{\"time\":$time,\"value\":$sampled,\"velocity\":$velocity,\"target\":${anim.targetValue.value},\"from\":${anim.from.value},\"start\":${anim.start},\"duration\":$duration,\"easing\":\"$easing\",\"launches\":${anim.launches},\"snaps\":${anim.snaps},\"order\":[${order.joinToString{ "\"${kind(it)}\"" }}]}")
  }
  cases.add("{\"toggle\":$toggle,\"configuration\":\"$initial\",\"initialEnabled\":${name!="cold-disabled"},\"name\":\"$name\",\"values\":{${values.entries.joinToString{ "\"${it.key}\":[${it.value.joinToString()}]" }}},\"events\":[${ops.joinToString{it.json()}}],\"frames\":[${frames.joinToString()}]}")
 }
 println(cases.joinToString(prefix="[",postfix="]"))
}
