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
 val scenarios=listOf("forward","retarget","between-retarget","rapid","rapid-separated","same-target","spec-only","label","space","snap","scale-zero","scale-half","cancel","forget","overshoot","packed-equal")
 for(space in ColorSpaces.ColorSpacesArray)for(scheme in listOf("expressive","standard"))for(scenario in scenarios){
  val host=BroadcastClockHost();val scale=Scale();val scope=CoroutineScope(SupervisorJob()+host.dispatcher+host.frameClock+scale);val composition=Composition(scope)
  var index=0;var alternateSpec=false;var changedSpace=false;var nearTarget=false;var label="ColorAnimation";var finished=0
  fun target():Color{val s=if(changedSpace)if(space.id==19)ColorSpaces.Srgb else ColorSpaces.Oklab else space;return if(index==0)Color(.5f,.01f,-.04f,1f,s)else Color(if(nearTarget).9501f else .95f,.4f,-.4f,.3f,s)}
  fun spec():AnimationSpec<Color> = if(scenario=="snap")SnapSpec()else SpringSpec(if(scenario=="overshoot")if(scheme=="expressive").6f else .9f else 1f,if(alternateSpec)1600f else if(scenario=="overshoot")if(scheme=="expressive")800f else 1400f else 3800f)
  lateinit var state:State<Color>
  fun commit(){state=composition.commit{animateColorAsState(target(),spec(),label=label,finishedListener={finished++})}}
  fun snapshot(time:Long,event:String,action:String="null"){
   val handle=state as AnimateValueAsStateToolingHandle<Color,AnimationVector4D>;val anim=handle.animatable
   val field=state::class.java.getDeclaredField("job");field.isAccessible=true;val job=field.get(state) as Job?
   rows.add("{\"space\":${space.id},\"scheme\":\"$scheme\",\"scenario\":\"$scenario\",\"time\":$time,\"event\":\"$event\",\"action\":$action,\"value\":${color(state.value)},\"velocity\":${values(anim.velocityVector)},\"target\":${color(anim.targetValue)},\"convertedVelocity\":${values(anim.typeConverter.convertToVector(anim.velocity))},\"running\":${anim.isRunning},\"frames\":${host.pendingFrames},\"finished\":$finished,\"job\":${if(job==null)"null"else "{\"active\":${job.isActive},\"cancelled\":${job.isCancelled},\"completed\":${job.isCompleted}}"}}")
  }
  fun action(time:Long,event:String){commit();val spring=spec();snapshot(time,event,"{\"target\":${color(target())},\"spec\":${if(spring is SnapSpec)"\"Snap\""else "{\"stiffness\":${(spring as SpringSpec).stiffness},\"dampingRatio\":${spring.dampingRatio}}"},\"label\":\"$label\"}")}
  commit();snapshot(0,"initial");index=1;action(0,"start");host.pump();snapshot(0,"start-pump")
  for(time in 16L..512L step 16L){host.frame(time*1_000_000L);snapshot(time,"frame-delivery");host.pump();snapshot(time,"frame")
   if(time==64L){when(scenario){
    "retarget","overshoot"->{index=0;action(time,"retarget")}
    "rapid","rapid-separated"->{for(i in 1..3){index=if(i==2)1 else 0;action(time,"rapid-$i");if(scenario=="rapid-separated"){host.pump();snapshot(time,"rapid-$i-pump")}}}
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
   host.pump();snapshot(time,"action-pump");snapshot(time+8,"between-frames")
   if(time==64L&&scenario=="between-retarget"){index=0;action(time+8,"between-retarget");host.pump();snapshot(time+8,"between-retarget-pump")}
  }
  composition.dispose();snapshot(520,"scope-cancel","{\"cancel\":true}");host.pump();snapshot(520,"scope-cancel-pump");scope.cancel();host.pump();check(host.pendingFrames==0)
 }
 println(rows.joinToString(",","[","]"))
}
