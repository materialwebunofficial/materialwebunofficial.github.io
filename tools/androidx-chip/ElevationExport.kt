package androidx.compose.material3
import androidx.compose.animation.core.*
import androidx.compose.foundation.interaction.*
import androidx.compose.ui.unit.*

fun main(){
 val values=defaultElevationValues+mapOf("custom" to listOf(2f,4f,6f,8f,-1f,12f),"equal-all" to listOf(2f,2f,2f,2f,2f,2f))
 val histories=listOf(
  "hover-exit" to listOf(ElevationOp(0,"hover+"),ElevationOp(160,"hover-")),
  "interrupted-hover-exit" to listOf(ElevationOp(0,"hover+"),ElevationOp(32,"hover-")),
  "hover-focus-order" to listOf(ElevationOp(0,"hover+"),ElevationOp(32,"focus+"),ElevationOp(64,"focus-"),ElevationOp(160,"hover-")),
  "focus-hover-order" to listOf(ElevationOp(0,"focus+"),ElevationOp(16,"hover+"),ElevationOp(64,"hover-"),ElevationOp(160,"focus-")),
  "hover-press-cancel" to listOf(ElevationOp(0,"hover+"),ElevationOp(16,"press+"),ElevationOp(64,"press!"),ElevationOp(160,"hover-")),
  "two-presses-hover-between" to listOf(ElevationOp(0,"press1+"),ElevationOp(16,"hover+"),ElevationOp(32,"press2+"),ElevationOp(64,"press2-"),ElevationOp(96,"hover-"),ElevationOp(160,"press1-")),
  "drag-exit" to listOf(ElevationOp(0,"drag+"),ElevationOp(160,"drag-")),
  "interrupted-drag-exit" to listOf(ElevationOp(0,"drag+"),ElevationOp(32,"drag-")),
  "drag-hover-focus-order" to listOf(ElevationOp(0,"drag+"),ElevationOp(16,"hover+"),ElevationOp(32,"focus+"),ElevationOp(64,"focus-"),ElevationOp(96,"hover-"),ElevationOp(160,"drag-")),
  "press-drag-order" to listOf(ElevationOp(0,"press+"),ElevationOp(16,"drag+"),ElevationOp(64,"drag-"),ElevationOp(160,"press!")),
  "disabled-new-target" to listOf(ElevationOp(0,"hover+"),ElevationOp(32,enabled=false),ElevationOp(64,"hover-"),ElevationOp(96,enabled=true)),
  "disabled-held-reenable" to listOf(ElevationOp(0,"hover+"),ElevationOp(32,enabled=false),ElevationOp(64,enabled=true),ElevationOp(160,"hover-")),
  "equal-target-between" to listOf(ElevationOp(0,"hover+"),ElevationOp(160,"focus+"),ElevationOp(176,"press+"),ElevationOp(192,"press-"),ElevationOp(208,"focus-"),ElevationOp(256,"hover-")),
  "configuration-during-flight" to listOf(ElevationOp(0,"drag+"),ElevationOp(32,config="custom"),ElevationOp(64,"focus+"),ElevationOp(96,config="filter"),ElevationOp(160,"focus-"),ElevationOp(256,"drag-")),
  "cold-disabled" to emptyList()
 )
 val output=mutableListOf<String>()
 for(selectable in listOf(false,true))for(initial in values.keys)for((name,ops)in histories){
  ElevationMemory.reset();ElevationClock.time=0;var enabled=name!="cold-disabled";var configuration=initial;val source=InteractionSource();val active=mutableMapOf<String,Interaction>()
  fun render():State<Dp>{
   ElevationMemory.cursor=0;ElevationMemory.effectCursor=0;val v=values[configuration]!!
   val state=if(selectable)SelectableChipElevation(v[0].dp,v[1].dp,v[2].dp,v[3].dp,v[5].dp,v[4].dp).shadowElevation(enabled,source)else ChipElevation(v[0].dp,v[1].dp,v[2].dp,v[3].dp,v[5].dp,v[4].dp).shadowElevation(enabled,source)
   val effects=ElevationMemory.effects.toList();ElevationMemory.effects.clear();effects.forEach{runSuspend(it)};return state
  }
  render();var at=0;val frames=mutableListOf<String>()
  val times=(ops.map{it.time}+listOf(0L,1L,16L,31L,32L,48L,63L,64L,80L,95L,96L,112L,119L,120L,144L,149L,150L,159L,160L,176L,192L,208L,224L,256L,280L,310L,400L,600L)).distinct().sorted()
  for(time in times){ElevationClock.time=time;ElevationMemory.cells.filterIsInstance<Animatable<*,*>>().forEach{it.value}
   while(at<ops.size&&ops[at].time<=time){val op=ops[at++];op.enabled?.let{enabled=it};op.config?.let{configuration=it};op.event?.let{event->
    val id=event.dropLast(1);val incoming=event.endsWith("+")
    val interaction=if(incoming)when{id=="hover"->HoverInteraction.Enter();id=="focus"->FocusInteraction.Focus();id.startsWith("drag")->DragInteraction.Start();else->PressInteraction.Press()}.also{active[id]=it}else when(val old=active.remove(id)){
     is HoverInteraction.Enter->HoverInteraction.Exit(old);is FocusInteraction.Focus->FocusInteraction.Unfocus(old);is DragInteraction.Start->if(event.endsWith("!"))DragInteraction.Cancel(old)else DragInteraction.Stop(old);is PressInteraction.Press->if(event.endsWith("!"))PressInteraction.Cancel(old)else PressInteraction.Release(old);else->error(event)
    };source.interactions.emit(interaction)
   };render()}
   val state=render();@Suppress("UNCHECKED_CAST") val anim=ElevationMemory.cells[2] as Animatable<Dp,Unit>;@Suppress("UNCHECKED_CAST") val order=ElevationMemory.cells[0] as List<Interaction>;@Suppress("UNCHECKED_CAST") val last=ElevationMemory.cells[1] as MutableState<Interaction?>
   val sampled=state.value.value;val spec=anim.lastSpec
   frames.add("{\"time\":$time,\"value\":$sampled,\"target\":${anim.targetValue.value},\"duration\":${spec?.durationMillis?:0},\"launches\":${anim.launches},\"snaps\":${anim.snaps},\"lastInteraction\":\"${kind(last.value)}\",\"order\":[${order.joinToString{"\"${kind(it)}\""}}]}")
  }
  output.add("{\"selectable\":$selectable,\"configuration\":\"$initial\",\"initialEnabled\":${name!="cold-disabled"},\"name\":\"$name\",\"values\":{${values.entries.joinToString{"\"${it.key}\":[${it.value.joinToString()}]"}}},\"events\":[${ops.joinToString{it.json()}}],\"frames\":[${frames.joinToString()}]}")
 }
 println(output.joinToString(",","[","]"))
}
