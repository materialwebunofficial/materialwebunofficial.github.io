// Appended in the native material3 file so unchanged private onTap and state
// helpers can execute. Reflection only reads native Animatable state for probes.
private fun nativeAnim(state:AnalogTimePickerState):Animatable<Float,AnimationVector1D>{
    val field=AnalogTimePickerState::class.java.getDeclaredField("anim");field.isAccessible=true
    @Suppress("UNCHECKED_CAST") return field.get(state) as Animatable<Float,AnimationVector1D>
}

fun main(){
    val records=mutableListOf<String>()
    for(scenario in listOf("switch","tap","tap-interrupt","tap-delay-overlap","priority-reject","snap","external-replace","cancel")){
        val dispatcher=ClockDispatcher();val frames=ClockFrames()
        val scope=CoroutineScope(SupervisorJob()+dispatcher+frames)
        val base=TimePickerStateImpl(7,17,true);val state=AnalogTimePickerState(base);state.currentDiameter=256f;state.onRemembered()
        val jobs=linkedMapOf<String,Job>();val spatial=SpringSpec<Float>(.8f,380f)
        fun start(name:String,block:suspend ()->Unit){jobs[name]=scope.launch{block()}}
        fun snapshot(time:Long,event:String){
            val anim=nativeAnim(state);val pos=state.selectorPos
            records.add("{\"scenario\":\""+scenario+"\",\"time\":"+time+",\"event\":\""+event+"\",\"hour\":"+state.hour+",\"minute\":"+state.minute+",\"selection\":\""+state.selection+"\",\"angle\":"+state.currentAngle+",\"velocity\":"+anim.velocity+",\"target\":"+anim.targetValue+",\"running\":"+anim.isRunning+",\"x\":"+pos.x+",\"y\":"+pos.y+",\"frames\":"+frames.pendingFrames+",\"delays\":"+dispatcher.pendingDelays+",\"jobs\":{"+jobs.entries.joinToString(","){"\""+it.key+"\":{\"active\":"+it.value.isActive+",\"cancelled\":"+it.value.isCancelled+",\"completed\":"+it.value.isCompleted+"}"}+"}}")
        }
        snapshot(0,"initial")
        if(scenario=="tap"||scenario.startsWith("tap-")||scenario=="cancel")start("first"){state.onTap(229f,128f,74f,true,IntOffset(128,128),spatial)}
        else if(scenario=="snap"){state.selection=TimePickerSelectionMode.Minute;start("first"){state.onTap(229f,128f,74f,false,IntOffset(128,128),SnapSpec())}}
        else{state.selection=TimePickerSelectionMode.Minute;start("first"){state.animateToCurrent(spatial)}}
        snapshot(0,"start")
        for(time in 16L..1000L step 16L){
            dispatcher.advanceTo(time);frames.frame(time*1_000_000L);snapshot(time,"frame")
            if(time==64L){
                when(scenario){
                    "tap-interrupt"->start("second"){state.onTap(128f,27f,74f,true,IntOffset(128,128),spatial)}
                    "priority-reject"->start("second"){state.rotateTo(1f,spatial)}
                    "external-replace"->state.minuteInput=23
                    "cancel"->jobs["first"]!!.cancel()
                }
                snapshot(time,"after-action")
            }
            if(time==432L&&scenario=="tap-delay-overlap"){
                start("second"){state.onTap(128f,27f,74f,true,IntOffset(128,128),spatial)}
                snapshot(time,"after-action")
            }
            // Advancing time between frames must not extrapolate Animatable.value.
            dispatcher.advanceTo(time+8);snapshot(time+8,"between-frames")
        }
        scope.cancel();snapshot(1000,"scope-cancel")
        check(frames.pendingFrames==0&&dispatcher.pendingDelays==0)
    }
    println(records.joinToString(prefix="[",postfix="]"))
}
