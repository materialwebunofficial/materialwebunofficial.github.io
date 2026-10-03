package androidx.compose.animation.core

fun IntSize.json()="[$width,$height]"
fun AnimationVector2D.json()="[$v1,$v2]"
fun main(){
 val vectors=mutableListOf<String>()
 val pairs=listOf(IntSize(0,48) to IntSize(48,48),IntSize(48,48) to IntSize(56,56),IntSize(48,48) to IntSize(48,96),IntSize(136,96) to IntSize(0,56),IntSize(17,0) to IntSize(96,136),IntSize(0,0) to IntSize(0,96))
 for((from,to)in pairs)for(spec in listOf(Triple(800f,.6f,.01f),Triple(1400f,.9f,.01f),Triple(400f,1f,1f)))for(velocity in listOf(AnimationVector2D(0f,0f),AnimationVector2D(-180f,340f)))for(interrupt in listOf(0L,64L,128L)){
  val animationSpec=SpringSpec<IntSize>(spec.second,spec.first,if(spec.third==1f)IntSize(1,1)else null)
  val state=SourceTransition(from,SizeConverter);state.velocityVector=velocity;state.updateTargetValue(to,animationSpec)
  val firstDuration=state.animation.durationMillis
  val target=if(interrupt==0L)to else IntSize(if(from.width==to.width)to.width else from.width,if(from.height==to.height)to.height+48 else from.height)
  if(interrupt!=0L){state.sample(interrupt);state.updateTargetValue(target,animationSpec)}
  val duration=state.animation.durationMillis
  val samples=mutableListOf<String>()
  for(ms in (listOf(0L,16L,32L,64L,80L,128L,200L,400L,duration-1,duration,duration+1).filter{it>=0}.distinct().sorted())){
   state.sample(ms);samples.add("{\"ms\":$ms,\"size\":${state.value.json()},\"velocity\":${state.velocityVector.json()},\"finished\":${state.isFinished}}")
  }
  vectors.add("{\"from\":${from.json()},\"to\":${to.json()},\"velocity\":${velocity.json()},\"stiffness\":${spec.first},\"dampingRatio\":${spec.second},\"visibilityThreshold\":${spec.third},\"interrupt\":$interrupt,\"target\":${target.json()},\"firstDuration\":$firstDuration,\"duration\":$duration,\"samples\":[${samples.joinToString()}]}")
 }
 val composition=mutableListOf<String>()
 for(pc in listOf(false,true))for(pt in listOf(false,true))for(pending in listOf(null,false,true))for(seeking in listOf(false,true))for(initial in listOf(false,true))for(force in listOf(false,true))for(current in EnterExitState.values())for(target in EnterExitState.values()){
  val parent=ParentTransition(pc,pt,seeking,initial)
  composition.add("{\"current\":$pc,\"target\":$pt,\"pending\":$pending,\"seeking\":$seeking,\"initial\":$initial,\"force\":$force,\"childCurrent\":\"$current\",\"childTarget\":\"$target\",\"composed\":${composed(parent,pending,force,current,target)}}")
 }
 println("{\"vectors\":[${vectors.joinToString()}],\"composition\":[${composition.joinToString()}]}")
}
