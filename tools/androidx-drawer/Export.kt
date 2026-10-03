package androidx.compose.animation.core

import androidx.compose.ui.input.pointer.util.VelocityTracker1D
import androidx.compose.ui.input.pointer.util.ComposeUiFlags
import androidx.compose.foundation.gestures.*
import androidx.compose.ui.geometry.Offset

fun main(args:Array<String>) {
 if(args.firstOrNull()=="velocity") { exportVelocity(); return }
 if(args.firstOrNull()=="slop") { exportSlop(); return }
 val decay=FloatExponentialDecaySpec()
 val tween=FloatTweenSpec(duration=256)
 val releaseTracker=VelocityTracker1D().also { it.addDataPoint(0,400f);it.addDataPoint(32,600f) }
 val releaseVelocity=releaseTracker.calculateVelocity(8000f)
 val consumedSlop=ViewConfiguration(8f).pointerSlop(PointerType.Mouse)
 val slopDetector=TouchSlopDetector(Orientation.Horizontal)
 val mouseDragFrom=-360f+slopDetector.getPostSlopOffset(Offset(200f,0f),consumedSlop).x
 val cases=mutableListOf<String>()
 for ((from,to,velocity) in listOf(Triple(-160f,0f,0f),Triple(-220f,-360f,0f),
   Triple(-290f,-360f,0f),Triple(-160f,-360f,0f),Triple(-180f,0f,900f),
   Triple(-180f,-360f,-900f),Triple(-180f,0f,-900f),Triple(-180f,-360f,900f),
   Triple(-290f,0f,500f),Triple(-70f,-360f,-500f),Triple(-160f,0f,6250f),
   Triple(-200f,-360f,-6250f),Triple(-120f,0f,400f),Triple(-120f,0f,1200f),Triple(-160f,0f,releaseVelocity),
   Triple(mouseDragFrom,0f,0f),Triple(mouseDragFrom,0f,releaseVelocity))) {
  val projected=decay.getTargetValue(from,velocity)
  val canDecay=velocity!=0f && velocity*(to-from)>=0f && (if(velocity>0)projected>=to else projected<=to)
  val duration=if(canDecay)decay.getDurationNanos(from,velocity)/1000000L else 256L
  val samples=listOf(0L,1L,16L,32L,64L,80L,100L,128L,160L,192L,224L,255L,256L,320L)
   .joinToString(prefix="[",postfix="]") { time ->
    val nanos=time*1000000L
    val value=if(canDecay)decay.getValueFromNanos(nanos,from,velocity) else tween.getValueFromNanos(nanos,from,to,velocity)
    val v=if(canDecay)decay.getVelocityFromNanos(nanos,from,velocity) else tween.getVelocityFromNanos(nanos,from,to,velocity)
    "{\"time\":$time,\"position\":$value,\"velocity\":$v}"
   }
  cases.add("{\"from\":$from,\"to\":$to,\"velocity\":$velocity,\"projected\":$projected,\"kind\":\"${if(canDecay)"decay" else "tween"}\",\"duration\":$duration,\"samples\":$samples}")
 }
 println(cases.joinToString(prefix="[",postfix="]"))
}

fun exportSlop() {
 val cases=mutableListOf<String>()
 for(touchSlop in listOf(0f,8f,18f,24f)) for(type in PointerType.values())
  for(deltas in listOf(listOf(.025f,.025f,.025f),listOf(4f,4f,1f),listOf(200f),listOf(-220f),
    listOf(100f,-110f,20f),listOf(0f,0f,1f),listOf(.05f,.01f))) {
   val slop=ViewConfiguration(touchSlop).pointerSlop(type)
   val detector=TouchSlopDetector(Orientation.Horizontal)
   val samples=deltas.joinToString(prefix="[",postfix="]") { delta ->
    val offset=detector.getPostSlopOffset(Offset(delta,0f),slop)
    "{\"delta\":$delta,\"postSlop\":${if(offset.isSpecified)offset.x else "null"}}"
   }
   cases.add("{\"touchSlop\":$touchSlop,\"pointerType\":\"${type.name.lowercase()}\",\"slop\":$slop,\"samples\":$samples}")
  }
 println(cases.joinToString(prefix="[",postfix="]"))
}

fun exportVelocity() {
 val cases=mutableListOf<String>()
 val histories=listOf(
  listOf(0L to 400f),listOf(0L to 400f,32L to 600f),
  listOf(0L to 400f,32L to 200f),listOf(0L to 0f,16L to 10f,32L to 20f,48L to 30f),
  listOf(0L to 0f,16L to 10f,32L to 40f,48L to 90f),
  listOf(0L to 0f,12L to 25f,30L to 100f,46L to 180f),
  listOf(0L to 400f,16L to 410f,32L to 415f,48L to 417f,64L to 417f),
  listOf(0L to 400f,16L to 420f,32L to 410f,48L to 400f),
  listOf(0L to 0f,16L to 10f,32L to 40f,96L to 160f),
  listOf(0L to 0f,16L to 10f,32L to 40f,80L to 120f,96L to 160f),
  (0L..240L step 8).map { it to (it*it/100f) },
  listOf(0L to 0f,16L to 10f,16L to 15f,32L to 40f),
  listOf(0L to 400f,0L to 600f),listOf(0L to 0f,16L to 1000f,32L to 4000f),
  listOf(0L to 16777216f,16L to 16777220f,32L to 16777224f)
 )
 for(fix in listOf(true,false)) for(history in histories) {
  ComposeUiFlags.isVelocityTrackerMinSampleSizeFixEnabled=fix
  val tracker=VelocityTracker1D()
  history.forEach { tracker.addDataPoint(it.first,it.second) }
  val velocity=tracker.calculateVelocity(8000f)
  val points=history.joinToString(prefix="[",postfix="]") { "{\"time\":${it.first},\"position\":${it.second}}" }
  cases.add("{\"minimumSampleFix\":$fix,\"samples\":$points,\"velocity\":$velocity}")
 }
 println(cases.joinToString(prefix="[",postfix="]"))
}
