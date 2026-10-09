package androidx.compose.animation.core

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.VectorConverter
import androidx.compose.animation.core.tooling.AnimateValueAsStateToolingHandle
import androidx.compose.runtime.*
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.colorspace.ColorSpaces
import kotlinx.coroutines.*

private class Scale(override var scaleFactor:Float=1f):MotionDurationScale
private fun values(v:AnimationVector4D)="[${v.v1},${v.v2},${v.v3},${v.v4}]"
private fun color(c:Color)="{\"packed\":\"${c.value.toString(16).padStart(16,'0')}\",\"space\":${c.colorSpace.id},\"vector\":${values(Color.VectorConverter(c.colorSpace).convertToVector(c))}}"
@Suppress("UNCHECKED_CAST")
fun main(){
 val rows=mutableListOf<String>()
 val roles=listOf("medium","fast")
 val scenarios=listOf("forward","reverse","retarget","between-retarget","double-retarget","same-target","packed-equal","spec-only","snap","cancel","forget","disabled")
 for(subject in listOf("color","border"))for(space in listOf(ColorSpaces.Srgb,ColorSpaces.DisplayP3,ColorSpaces.Oklab))for(role in roles)for(scheme in listOf("expressive","standard"))for(scenario in scenarios){
  if(subject=="border"&&role=="fast")continue
  val host=BroadcastClockHost();val scale=Scale();val scope=CoroutineScope(SupervisorJob()+host.dispatcher+host.frameClock+scale);val composition=Composition(scope)
  var index=if(scenario=="reverse")1 else 0;var alternateSpec=false;var changedSpace=false;var nearTarget=false;var label="ColorAnimation";var finished=0
  fun target():Color{val s=if(changedSpace)if(space.id==19)ColorSpaces.Srgb else ColorSpaces.Oklab else space;return if(subject=="border"){if(index==1)Color.Transparent else Color(.5f,.01f,-.04f,1f,s).copy(alpha=if(index==2).1f else 1f)}else if(index==0)Color(.5f,.01f,-.04f,1f,s)else Color(if(nearTarget).70001f else .7f,.04f,.01f,if(index==2).38f else 1f,s)}
  fun spec():AnimationSpec<Color> = if(scenario=="snap")SnapSpec()else SpringSpec(1f,if(alternateSpec)800f else if(role=="medium")1600f else 3800f)
  lateinit var state:State<Color>
  fun commit(){state=composition.commit{animateColorAsState(target(),spec(),label=label,finishedListener={finished++})}}
  fun snapshot(time:Long,event:String,action:String="null"){
   val handle=state as AnimateValueAsStateToolingHandle<Color,AnimationVector4D>;val anim=handle.animatable
   val field=state::class.java.getDeclaredField("job");field.isAccessible=true;val job=field.get(state) as Job?
   rows.add("{\"subject\":\"$subject\",\"space\":${space.id},\"role\":\"$role\",\"scheme\":\"$scheme\",\"scenario\":\"$scenario\",\"time\":$time,\"event\":\"$event\",\"action\":$action,\"value\":${color(state.value)},\"velocity\":${values(anim.velocityVector)},\"target\":${color(anim.targetValue)},\"convertedVelocity\":${values(anim.typeConverter.convertToVector(anim.velocity))},\"running\":${anim.isRunning},\"frames\":${host.pendingFrames},\"finished\":$finished,\"job\":${if(job==null)"null"else "{\"active\":${job.isActive},\"cancelled\":${job.isCancelled},\"completed\":${job.isCompleted}}"}}")
  }
  fun action(time:Long,event:String){commit();val spring=spec();snapshot(time,event,"{\"target\":${color(target())},\"spec\":${if(spring is SnapSpec)"\"Snap\""else "{\"stiffness\":${(spring as SpringSpec).stiffness},\"dampingRatio\":${spring.dampingRatio}}"},\"label\":\"$label\"}")}
  commit();snapshot(0,"initial");index=if(scenario=="reverse")0 else 1;action(0,"start");host.pump();snapshot(0,"start-pump")
  for(time in 16L..512L step 16L){host.frame(time*1_000_000L);snapshot(time,"frame-delivery");host.pump();snapshot(time,"frame")
   if(time==64L){when(scenario){
    "retarget","double-retarget"->{index=0;action(time,"retarget")}
    "rapid","rapid-separated"->{for(i in 1..3){index=if(i==2)1 else 0;action(time,"rapid-$i");if(scenario=="rapid-separated"){host.pump();snapshot(time,"rapid-$i-pump")}}}
    "disabled"->{index=2;action(time,"disabled")}
    "same-target"->action(time,"same-target")
    "packed-equal"->{nearTarget=true;action(time,"packed-equal")}
    "spec-only"->{alternateSpec=true;action(time,"spec-only")}
    "label"->{label="ChangedColorLabel";action(time,"label")}
    "space"->{changedSpace=true;action(time,"space")}
    "scale-zero"->{scale.scaleFactor=0f;snapshot(time,"scale-zero","{\"scale\":0}")}
    "scale-half"->{scale.scaleFactor=.5f;snapshot(time,"scale-half","{\"scale\":0.5}")}
    "cancel"->{scope.cancel();snapshot(time,"cancel","{\"cancel\":true}")}
    "forget"->{composition.dispose();snapshot(time,"forget","{\"cancel\":true}")}
   }}
   if(time==96L&&scenario=="double-retarget"){index=1;action(time,"second-retarget")}
   host.pump();snapshot(time,"action-pump");snapshot(time+8,"between-frames")
   if(time==64L&&scenario=="between-retarget"){index=0;action(time+8,"between-retarget");host.pump();snapshot(time+8,"between-retarget-pump")}
  }
  composition.dispose();snapshot(520,"scope-cancel","{\"cancel\":true}");host.pump();snapshot(520,"scope-cancel-pump");scope.cancel();host.pump();check(host.pendingFrames==0)
 }
 println(rows.joinToString(",","[","]"))
}
