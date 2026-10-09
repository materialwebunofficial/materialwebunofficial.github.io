package androidx.compose.animation.core

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tooling.AnimateValueAsStateToolingHandle
import androidx.compose.runtime.Composition
import androidx.compose.runtime.State
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.colorspace.ColorSpaces
import kotlinx.coroutines.*

private class Scale(override var scaleFactor:Float=1f):MotionDurationScale
private fun vectorJson(vector:AnimationVector)= (0 until vector.size).joinToString(",","[","]"){vector[it].toString()}
@Suppress("UNCHECKED_CAST")
fun main(){
    val rows=mutableListOf<String>()
    val scenarios=listOf("forward","signed-zero","retarget","between-retarget","same-target","spec-only","label","rapid","rapid-separated","snap","scale-zero","scale-change","cancel","forget","color-space","color-overshoot")
    for(kind in listOf("float","dp","color"))for(scheme in listOf("expressive","standard"))for(scenario in scenarios){
        if(kind!="color"&&scenario.startsWith("color-"))continue
        val host=BroadcastClockHost();val scale=Scale();val scope=CoroutineScope(SupervisorJob()+host.dispatcher+host.frameClock+scale);val composition=Composition(scope)
        var target=0;var label="FieldAnimation";var alternateSpec=false;var otherSpace=false;var finished=0
        val baseStiffness=if(kind=="color"&&scenario!="color-overshoot")3800f else if(scheme=="expressive")800f else 1400f
        val baseDamping=if(kind=="color"&&scenario!="color-overshoot")1f else if(scheme=="expressive").6f else .9f
        fun scalar(index:Int)=if(scenario=="signed-zero"){if(index==0)-0f else 0f}else if(index==0)1f else 2f
        fun color(index:Int):Color {val space=if(otherSpace)ColorSpaces.Other else ColorSpaces.Oklab;return if(scenario=="signed-zero")Color(.5f,if(index==0)-0f else 0f,-.04f,1f,space)else if(index==0)Color(.5f,.01f,-.04f,1f,space)else Color(.95f,.4f,-.4f,.3f,space)}
        fun spec():AnimationSpec<Any> = if(scenario=="snap")SnapSpec()else SpringSpec(if(alternateSpec)1f else baseDamping,if(alternateSpec)1600f else baseStiffness)
        var state:State<Any>?=null
        fun commit(){state=composition.commit{when(kind){
            "float"->animateFloatAsState(scalar(target),spec() as AnimationSpec<Float>,label=label,finishedListener={finished++})
            "dp"->animateDpAsState(Dp(scalar(target)),spec() as AnimationSpec<Dp>,label=label,finishedListener={finished++})
            else->animateColorAsState(color(target),spec() as AnimationSpec<Color>,label=label,finishedListener={finished++})
        }} as State<Any>}
        fun snapshot(time:Long,event:String,action:String="null"){
            val handle=state as AnimateValueAsStateToolingHandle<Any,AnimationVector>;val anim=handle.animatable;val converter=anim.typeConverter
            val jobField=state!!::class.java.getDeclaredField("job");jobField.isAccessible=true;val job=jobField.get(state) as Job?
            rows.add("{\"kind\":\"$kind\",\"scheme\":\"$scheme\",\"scenario\":\"$scenario\",\"time\":$time,\"event\":\"$event\",\"action\":$action,\"value\":${vectorJson(converter.convertToVector(state!!.value))},\"velocity\":${vectorJson(anim.velocityVector)},\"target\":${vectorJson(converter.convertToVector(anim.targetValue))},\"running\":${anim.isRunning},\"frames\":${host.pendingFrames},\"finished\":$finished,\"job\":${if(job==null) "null" else "{\"active\":${job.isActive},\"cancelled\":${job.isCancelled},\"completed\":${job.isCompleted}}"}}")
        }
        fun action(time:Long,event:String){commit();snapshot(time,event,"{\"target\":${if(kind=="color")vectorJson(AnimationVector4D(color(target).alpha,color(target).red,color(target).green,color(target).blue))else "[${scalar(target)}]"},\"spec\":${if(scenario=="snap") "\"Snap\"" else "{\"stiffness\":${if(alternateSpec)1600f else baseStiffness},\"dampingRatio\":${if(alternateSpec)1f else baseDamping}}"},\"label\":\"$label\",\"converter\":\"${if(otherSpace) "OtherOklab" else kind}\"}")}
        commit();snapshot(0,"initial");target=1;action(0,"start");host.pump();snapshot(0,"start-pump")
        for(time in 16L..512L step 16L){
            host.frame(time*1_000_000L);snapshot(time,"frame-delivery");host.pump();snapshot(time,"frame")
            if(time==64L){when(scenario){
                "retarget"->{target=0;action(time,"retarget")}
                "signed-zero"->{target=0;action(time,"signed-zero")}
                "same-target"->action(time,"same-target")
                "spec-only"->{alternateSpec=true;action(time,"spec-only")}
                "label"->{label="ChangedLabel";action(time,"label")}
                "rapid"->{target=0;action(time,"rapid-1");target=1;action(time,"rapid-2");target=0;action(time,"rapid-3")}
                "rapid-separated"->{target=0;action(time,"rapid-1");host.pump();snapshot(time,"rapid-1-pump");target=1;action(time,"rapid-2");host.pump();snapshot(time,"rapid-2-pump");target=0;action(time,"rapid-3");host.pump();snapshot(time,"rapid-3-pump")}
                "scale-zero"->{scale.scaleFactor=0f;snapshot(time,"scale-zero","{\"scale\":0}")}
                "scale-change"->{scale.scaleFactor=.5f;snapshot(time,"scale-half","{\"scale\":0.5}")}
                "cancel"->{scope.cancel();snapshot(time,"cancel","{\"cancel\":true}")}
                "forget"->{composition.dispose();snapshot(time,"forget","{\"cancel\":true}")}
                "color-space"->{otherSpace=true;action(time,"color-space")}
            }}
            host.pump();snapshot(time,"action-pump");snapshot(time+8,"between-frames")
            if(time==64L&&scenario=="between-retarget"){target=0;action(time+8,"between-retarget");host.pump();snapshot(time+8,"between-retarget-pump")}
        }
        scope.cancel();snapshot(520,"scope-cancel","{\"cancel\":true}");host.pump();snapshot(520,"scope-cancel-pump");check(host.pendingFrames==0)
    }
    println(rows.joinToString(",","[","]"))
}
