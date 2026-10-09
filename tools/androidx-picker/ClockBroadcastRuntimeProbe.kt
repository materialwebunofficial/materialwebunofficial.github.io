// Appended to the original material3 file to enter unchanged private state/onTap.
private class Scale(override var scaleFactor:Float=1f):androidx.compose.ui.MotionDurationScale
@Suppress("UNCHECKED_CAST")
private fun nativeAnim(state:AnalogTimePickerState):Animatable<Float,AnimationVector1D>{
    val field=AnalogTimePickerState::class.java.getDeclaredField("anim");field.isAccessible=true
    return field.get(state) as Animatable<Float,AnimationVector1D>
}

fun main(){
    val rows=mutableListOf<String>()
    val scenarios=listOf("switch","tap","tap-interrupt","tap-rapid","tap-separated","tap-before-frame","tap-delay-overlap","priority-reject","pending-cancel-priority","pending-cancel-recover","snap","external-replace","cancel","cancel-before-launch","forget","scale-zero","scale-change")
    for(scheme in listOf("expressive","standard"))for(scenario in scenarios){
        val clock=BroadcastClockHost();val dispatcher=ClockBroadcastDelayHost(clock);val scale=Scale()
        val parent=CoroutineScope(SupervisorJob()+dispatcher+clock.frameClock+scale)
        val composition=androidx.compose.runtime.Composition(parent)
        val scope=composition.commit{androidx.compose.runtime.rememberCoroutineScope()}
        check(scope.coroutineContext[androidx.compose.runtime.MonotonicFrameClock]===clock.frameClock)
        check(scope.coroutineContext[Job]!==parent.coroutineContext[Job])
        val base=TimePickerStateImpl(7,17,true);val state=AnalogTimePickerState(base);state.currentDiameter=256f;state.onRemembered()
        val jobs=linkedMapOf<String,Job>();val spatial=SpringSpec<Float>(if(scheme=="expressive").8f else .9f,if(scheme=="expressive")380f else 700f)
        fun start(name:String,block:suspend ()->Unit){jobs[name]=scope.launch{block()}}
        fun snapshot(time:Long,event:String){
            val anim=nativeAnim(state);val pos=state.selectorPos
            rows.add("{\"scheme\":\"$scheme\",\"scenario\":\"$scenario\",\"time\":$time,\"event\":\"$event\",\"hour\":${state.hour},\"minute\":${state.minute},\"selection\":\"${state.selection}\",\"angle\":${state.currentAngle},\"velocity\":${anim.velocity},\"target\":${anim.targetValue},\"running\":${anim.isRunning},\"x\":${pos.x},\"y\":${pos.y},\"frames\":${clock.pendingFrames},\"delays\":${dispatcher.pendingDelays},\"jobs\":{${jobs.entries.joinToString(","){"\"${it.key}\":{\"active\":${it.value.isActive},\"cancelled\":${it.value.isCancelled},\"completed\":${it.value.isCompleted}}"}}}}")
        }
        fun second(name:String="second"){start(name){state.onTap(128f,27f,74f,true,IntOffset(128,128),spatial)}}
        snapshot(0,"initial")
        if(scenario=="snap"){state.selection=TimePickerSelectionMode.Minute;start("first"){state.onTap(229f,128f,74f,false,IntOffset(128,128),SnapSpec())}}
        else if(scenario=="switch"||scenario=="priority-reject"||scenario=="external-replace"){state.selection=TimePickerSelectionMode.Minute;start("first"){state.animateToCurrent(spatial)}}
        else start("first"){state.onTap(229f,128f,74f,true,IntOffset(128,128),spatial)}
        snapshot(0,"start")
        if(scenario=="cancel-before-launch"){jobs["first"]!!.cancel();snapshot(0,"cancel-before-launch")}
        clock.pump();snapshot(0,"start-pump")
        if(scenario=="tap-before-frame"){second();snapshot(0,"before-frame");clock.pump();snapshot(0,"before-frame-pump")}
        for(time in 16L..1000L step 16L){
            dispatcher.advanceTo(time);clock.frame(time*1_000_000L);snapshot(time,"frame-delivery");clock.pump();snapshot(time,"frame")
            if(time==64L){
                when(scenario){
                    "tap-interrupt"->second()
                    "tap-rapid","tap-separated"->{
                        second();snapshot(time,"rapid-1");if(scenario=="tap-separated"){clock.pump();snapshot(time,"rapid-1-pump")}
                        start("third"){state.onTap(27f,128f,74f,true,IntOffset(128,128),spatial)};snapshot(time,"rapid-2");if(scenario=="tap-separated"){clock.pump();snapshot(time,"rapid-2-pump")}
                        second("fourth")
                    }
                    "priority-reject"->start("second"){state.rotateTo(1f,spatial)}
                    "pending-cancel-priority","pending-cancel-recover"->{
                        state.selection=TimePickerSelectionMode.Minute
                        start("second"){state.animateToCurrent(spatial)}
                        // This launch is already queued when second cancels the
                        // first writer and suspends awaiting the Foundation lock.
                        start("third"){jobs["second"]!!.cancel()}
                    }
                    "external-replace"->state.minuteInput=23
                    "cancel"->jobs["first"]!!.cancel()
                    "forget"->composition.dispose()
                    "scale-zero"->scale.scaleFactor=0f
                    "scale-change"->scale.scaleFactor=.5f
                }
                snapshot(time,"after-action");clock.pump();snapshot(time,"action-pump")
            }
            if(time==432L&&scenario=="tap-delay-overlap"){second();snapshot(time,"after-action");clock.pump();snapshot(time,"action-pump")}
            dispatcher.advanceTo(time+8);snapshot(time+8,"between-frames")
            if(time==64L&&scenario.startsWith("pending-cancel-")){
                if(scenario=="pending-cancel-priority")start("fourth"){state.rotateTo(1f,spatial)}
                else start("fourth"){state.animateToCurrent(spatial)}
                snapshot(time+8,"pending-retry");clock.pump();snapshot(time+8,"pending-retry-pump")
            }
        }
        composition.dispose();snapshot(1000,"scope-cancel");clock.pump();snapshot(1000,"scope-cancel-pump")
        check(clock.pendingFrames==0&&dispatcher.pendingDelays==0);parent.cancel();clock.pump()
    }
    println(rows.joinToString(",","[","]"))
}
