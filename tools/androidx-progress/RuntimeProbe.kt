package androidx.compose.animation.core

import kotlinx.coroutines.*

fun main(args:Array<String>) {
 if(args.firstOrNull()=="timeline"){exportTimeline();return}
 val clock=PulseClock()
 val scope=CoroutineScope(SupervisorJob()+Dispatchers.Unconfined+clock)
 val anim=Animatable(0f)
 val records=mutableListOf<Float>()
 val job=scope.launch{anim.animateTo(1f,IncreasingAmplitudeAnimationSpec){records.add(value)}}
 check(clock.pendingCount==1)
 clock.frame(16000000L);check(records.single()==0f)
 clock.frame(32000000L)
 clock.frame(516000000L)
 check(job.isCompleted&&!job.isCancelled&&records.last()==1f&&clock.pendingCount==0)
 val loop=scope.launch{anim.animateTo(2f,offsetAnimationSpec(1000)){records.add(value)}}
 clock.frame(532000000L);clock.frame(548000000L)
 loop.cancel();check(loop.isCancelled&&clock.pendingCount==0&&!anim.isRunning)
 scope.cancel()
 println("Original Animatable/TargetBasedAnimation/AnimationState/MutatorMutex/SuspendAnimation with real coroutine Job: first frame zero, finite completion and infinite cancellation passed.")
}

private fun exportTimeline(){
 val clock=PulseClock();val scope=CoroutineScope(SupervisorJob()+Dispatchers.Unconfined+clock)
 val global=Animatable(0f);val additional=Animatable(0f);val progress=Animatable(CircularIndeterminateMinProgress);val offset=Animatable(0f)
 androidx.compose.runtime.effectScope=scope
 val transition=InfiniteTransition("progress-runtime")
 fun channel(from:Float,to:Float,spec:AnimationSpec<Float>):InfiniteTransition.TransitionAnimationState<Float,AnimationVector1D>{
  val state=transition.TransitionAnimationState(from,to,Float.VectorConverter,spec,"probe");transition.addAnimation(state);return state
 }
 val standardGlobal=channel(0f,CircularGlobalRotationDegreesTarget,circularIndeterminateGlobalRotationAnimationSpec)
 val standardAdditional=channel(0f,CircularAdditionalRotationDegreesTarget,circularIndeterminateRotationAnimationSpec)
 val standardProgress=channel(CircularIndeterminateMinProgress,CircularIndeterminateMaxProgress,circularIndeterminateProgressAnimationSpec)
 val firstHead=channel(0f,1f,linearIndeterminateFirstLineHeadAnimationSpec)
 val firstTail=channel(0f,1f,linearIndeterminateFirstLineTailAnimationSpec)
 val secondHead=channel(0f,1f,linearIndeterminateSecondLineHeadAnimationSpec)
 val secondTail=channel(0f,1f,linearIndeterminateSecondLineTailAnimationSpec)
 transition.run()
 var wave=0f;offset.updateBounds(0f,1f)
 scope.launch{global.animateTo(CircularGlobalRotationDegreesTarget,circularIndeterminateGlobalRotationAnimationSpec)}
 scope.launch{additional.animateTo(CircularAdditionalRotationDegreesTarget,circularIndeterminateRotationAnimationSpec)}
 scope.launch{progress.animateTo(CircularIndeterminateMaxProgress,circularIndeterminateProgressAnimationSpec)}
 scope.launch{offset.animateTo(1f,offsetAnimationSpec(9000)){wave=value%1f}}
 val times=sortedSetOf<Long>()
 for(time in 0L..24000L)times.add(time*MillisToNanos)
 for(boundary in listOf(1L,299L,300L,1499L,1500L,2999L,3000L,3957L,5999L,6000L,8999L,9000L,17999L,18000L))
  for(fraction in listOf(1L,125000L,900000L,999999L))times.add(boundary*MillisToNanos+fraction)
 val records=times.map{time->clock.frame(time);"{\"nanos\":$time,\"global\":${global.value},\"additional\":${additional.value},\"rotation\":${global.value+additional.value},\"degrees\":${drawingRotation(global.value,additional.value)},\"progress\":${progress.value},\"offset\":$wave,\"standardRotation\":${standardGlobal.value+standardAdditional.value},\"standardProgress\":${standardProgress.value},\"fractions\":[${firstTail.value},${firstHead.value},${secondTail.value},${secondHead.value}]}"}
 scope.cancel();check(clock.pendingCount==0)
 println(records.joinToString(prefix="[",postfix="]"))
}
