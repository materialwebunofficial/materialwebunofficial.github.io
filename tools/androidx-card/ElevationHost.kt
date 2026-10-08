package androidx.compose.material3
import androidx.compose.animation.core.*
import androidx.compose.foundation.interaction.*
import androidx.compose.ui.unit.*

fun main(){
 fun fields(definition:CardElevation)=listOf("defaultElevation","pressedElevation","focusedElevation","hoveredElevation","disabledElevation","draggedElevation").map{key->val field=definition.javaClass.getDeclaredField(key);field.isAccessible=true;(field.get(definition) as Dp).value}
 val values=mapOf("filled" to fields(CardDefaults.cardElevation()),"elevated" to fields(CardDefaults.elevatedCardElevation()),"outlined" to fields(CardDefaults.outlinedCardElevation()),"custom" to listOf(2f,4f,6f,8f,-1f,12f),"equal-all" to listOf(2f,2f,2f,2f,2f,2f))
 val histories=listOf(
  "hover-exit" to listOf(ElevationOp(0,"hover+"),ElevationOp(160,"hover-")),
  "hover-focus-order" to listOf(ElevationOp(0,"hover+"),ElevationOp(32,"focus+"),ElevationOp(64,"focus-"),ElevationOp(160,"hover-")),
  "focus-hover-order" to listOf(ElevationOp(0,"focus+"),ElevationOp(16,"hover+"),ElevationOp(64,"hover-"),ElevationOp(160,"focus-")),
  "held-press-hover-later" to listOf(ElevationOp(0,"press+"),ElevationOp(16,"hover+"),ElevationOp(64,"hover-"),ElevationOp(160,"press-")),
  "hover-press-cancel" to listOf(ElevationOp(0,"hover+"),ElevationOp(16,"press+"),ElevationOp(64,"press!"),ElevationOp(160,"hover-")),
  "two-presses-hover-between" to listOf(ElevationOp(0,"press1+"),ElevationOp(16,"hover+"),ElevationOp(32,"press2+"),ElevationOp(64,"press2-"),ElevationOp(96,"hover-"),ElevationOp(160,"press1-")),
  "older-press-released-first" to listOf(ElevationOp(0,"press1+"),ElevationOp(16,"hover+"),ElevationOp(32,"press2+"),ElevationOp(64,"press1-"),ElevationOp(96,"press2-"),ElevationOp(160,"hover-")),
  "drag-exit" to listOf(ElevationOp(0,"drag+"),ElevationOp(160,"drag-")),
  "drag-cancel" to listOf(ElevationOp(0,"drag+"),ElevationOp(64,"drag!")),
  "drag-hover-focus-order" to listOf(ElevationOp(0,"drag+"),ElevationOp(16,"hover+"),ElevationOp(32,"focus+"),ElevationOp(64,"focus-"),ElevationOp(96,"hover-"),ElevationOp(160,"drag-")),
  "press-drag-order" to listOf(ElevationOp(0,"press+"),ElevationOp(16,"drag+"),ElevationOp(64,"drag-"),ElevationOp(160,"press!")),
  "two-drags-out-of-order" to listOf(ElevationOp(0,"drag1+"),ElevationOp(16,"hover+"),ElevationOp(32,"drag2+"),ElevationOp(64,"drag1!"),ElevationOp(96,"hover-"),ElevationOp(160,"drag2-")),
  "disabled-new-target" to listOf(ElevationOp(0,"hover+"),ElevationOp(32,enabled=false),ElevationOp(64,"hover-"),ElevationOp(96,enabled=true)),
  "disabled-held-reenable" to listOf(ElevationOp(0,"hover+"),ElevationOp(32,enabled=false),ElevationOp(64,enabled=true),ElevationOp(160,"hover-")),
  "disabled-drag-held" to listOf(ElevationOp(0,"drag+"),ElevationOp(32,enabled=false),ElevationOp(64,enabled=true),ElevationOp(160,"drag-")),
  "incidental-same-target" to listOf(ElevationOp(0,"hover+"),ElevationOp(16,incidental=true),ElevationOp(32,"press+"),ElevationOp(48,"focus+"),ElevationOp(64,"press-"),ElevationOp(96,"focus-"),ElevationOp(160,"hover-")),
  "configuration-during-flight" to listOf(ElevationOp(0,"drag+"),ElevationOp(32,config="custom"),ElevationOp(64,"focus+"),ElevationOp(96,config="filled"),ElevationOp(160,"focus-"),ElevationOp(256,"drag-")),
  "drag-only-configuration" to listOf(ElevationOp(0,"drag+"),ElevationOp(32,config="drag-only"),ElevationOp(160,"drag-")),
  "cold-disabled" to emptyList()
 )
 val allValues=values+mapOf("drag-only" to listOf(0f,0f,0f,1f,0f,10f));val out=mutableListOf<String>()
 for(initial in values.keys)for((name,ops)in histories){
  ElevationMemory.reset();ElevationClock.time=0;var enabled=name!="cold-disabled";var configuration=initial;val source=InteractionSource();val active=mutableMapOf<String,Interaction>()
  fun definition():CardElevation{val v=allValues[configuration]!!;return when(configuration){"filled"->CardDefaults.cardElevation();"elevated"->CardDefaults.elevatedCardElevation();"outlined"->CardDefaults.outlinedCardElevation();else->CardElevation(v[0].dp,v[1].dp,v[2].dp,v[3].dp,v[5].dp,v[4].dp)}}
  fun render():State<Dp>{ElevationMemory.cursor=0;ElevationMemory.effectCursor=0;val state=definition().shadowElevation(enabled,source);val effects=ElevationMemory.effects.toList();ElevationMemory.effects.clear();effects.forEach{runSuspend(it)};return state}
  render();var at=0;val frames=mutableListOf<String>()
  val times=(ops.map{it.time}+listOf(0L,1L,16L,31L,32L,48L,63L,64L,80L,95L,96L,112L,119L,120L,144L,149L,150L,159L,160L,176L,208L,256L,280L,310L,400L,600L)).distinct().sorted()
  for(time in times){ElevationClock.time=time
   while(at<ops.size&&ops[at].time<=time){val op=ops[at++];op.enabled?.let{enabled=it};op.config?.let{configuration=it};op.event?.let{event->val k=event.dropLast(1);val incoming=event.endsWith("+");val i=if(incoming)when{ k=="hover"->HoverInteraction.Enter();k=="focus"->FocusInteraction.Focus();k.startsWith("drag")->DragInteraction.Start();else->PressInteraction.Press()}.also{active[k]=it}else when(val old=active.remove(k)){is HoverInteraction.Enter->HoverInteraction.Exit(old);is FocusInteraction.Focus->FocusInteraction.Unfocus(old);is DragInteraction.Start->if(event.endsWith("!"))DragInteraction.Cancel(old)else DragInteraction.Stop(old);is PressInteraction.Press->if(event.endsWith("!"))PressInteraction.Cancel(old)else PressInteraction.Release(old);else->error(event)};source.interactions.emit(i)};render()}
   val state=render();@Suppress("UNCHECKED_CAST") val anim=ElevationMemory.cells[1] as Animatable<Dp,Unit>;@Suppress("UNCHECKED_CAST") val order=ElevationMemory.cells[0] as List<Interaction>
   val sampled=state.value.value;val velocity=anim.velocity;val spec=anim.lastSpec;val duration=spec?.durationMillis?:0;val easing=if(spec==null) "null" else if(spec.easing===FastOutSlowInEasing) "incoming" else "outgoing"
   frames.add("{\"time\":$time,\"value\":$sampled,\"velocity\":$velocity,\"target\":${anim.targetValue.value},\"from\":${anim.from.value},\"start\":${anim.start},\"duration\":$duration,\"easing\":\"$easing\",\"launches\":${anim.launches},\"snaps\":${anim.snaps},\"order\":[${order.joinToString{"\"${kind(it)}\""}}]}")
  }
  out.add("{\"configuration\":\"$initial\",\"initialEnabled\":${name!="cold-disabled"},\"name\":\"$name\",\"values\":{${allValues.entries.joinToString{"\"${it.key}\":[${it.value.joinToString()}]"}}},\"events\":[${ops.joinToString{it.json()}}],\"frames\":[${frames.joinToString()}]}")
 }
 for(initial in values.keys){ElevationMemory.reset();ElevationClock.time=0;val v=values[initial]!!;val first=CardElevation(v[0].dp,v[1].dp,v[2].dp,v[3].dp,v[5].dp,v[4].dp);val cold=first.shadowElevation(false,null);ElevationMemory.cursor=0;val changed=CardElevation(9.dp,8.dp,7.dp,6.dp,5.dp,4.dp).shadowElevation(true,null);out.add("{\"kind\":\"null-source\",\"configuration\":\"$initial\",\"values\":[${v.joinToString()}],\"initial\":${cold.value.value},\"changed\":${changed.value.value},\"remembered\":${cold===changed}}")}
 for((name,definition)in listOf("filled" to CardDefaults.cardElevation(defaultElevation=4.dp),"elevated" to CardDefaults.elevatedCardElevation(defaultElevation=4.dp),"outlined" to CardDefaults.outlinedCardElevation(defaultElevation=4.dp)))out.add("{\"kind\":\"factory-override\",\"configuration\":\"$name\",\"defaultElevation\":4.0,\"values\":[${fields(definition).joinToString()}]}")
 println(out.joinToString(prefix="[",postfix="]"))
}
