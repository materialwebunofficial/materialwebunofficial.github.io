package topappbaroracle
import androidx.compose.animation.core.FloatSpringSpec

fun stateJSON(s:TopAppBarState)="{\"limit\":${s.heightOffsetLimit},\"offset\":${s.heightOffset},\"content\":${s.contentOffset},\"collapsed\":${s.collapsedFraction},\"overlapped\":${s.overlappedFraction}}"
fun behavior(kind:String,s:TopAppBarState,can:()->Boolean={true},at:()->Boolean={true},snap:AnimationSpec<Float>?=AnimationSpec(FloatSpringSpec(1f,1600f)),fling:DecayAnimationSpec<Float>?=DecayAnimationSpec(SplineBasedFloatDecayAnimationSpec(Density(1f)))):TopAppBarScrollBehavior = when(kind){
 "pinned"->PinnedScrollBehavior(s,can,at)
 "enter-always"->EnterAlwaysScrollBehavior(s,snap,fling,can,at)
 "legacy"->LegacyEnterAlwaysScrollBehavior(s,snap,fling,can,false)
 "reverse"->LegacyEnterAlwaysScrollBehavior(s,snap,fling,can,true)
 else->ExitUntilCollapsedScrollBehavior(s,snap,fling,can)
}
fun main(args:Array<String>){val mode=args[0];val out=mutableListOf<String>()
 if(mode=="state")for(limit in listOf(0f,-.5f,-48f,-80f,-Float.MAX_VALUE))for(offset in listOf(0f,-.5f,-79.25f,-150f))for(content in listOf(0f,.125f,-.125f,23.25f,-500f))for(at in listOf(false,true)){
  val s=TopAppBarState(limit,offset,content);s.isScrollingContentAtStart={at};val initial=stateJSON(s);s.heightOffset=offset;val assigned=stateJSON(s);s.heightOffsetLimit=-32f;val limitOnly=stateJSON(s);s.heightOffset=-40f
  out.add("{\"limit\":$limit,\"offset\":$offset,\"content\":$content,\"atStart\":$at,\"initial\":$initial,\"assigned\":$assigned,\"limitOnly\":$limitOnly,\"clamped\":${stateJSON(s)}}")
 }
 else if(mode=="nested")for(kind in listOf("pinned","enter-always","exit-until-collapsed","legacy","reverse"))for(limit in listOf(0f,-48f,-80f))for(initial in listOf(0f,-.5f,-20f,-80f))for(atStart in listOf(false,true))for(enabled in listOf(false,true)){
  val s=TopAppBarState(limit,initial,0f);val b=behavior(kind,s,{enabled},{atStart},null,null);val connection=b.nestedScrollConnection;val steps=mutableListOf<String>()
  for((pre,consumed,available) in listOf(Triple(-.125f,-.25f,0f),Triple(-23.25f,-10f,-2f),Triple(-100f,-200f,0f),Triple(13.5f,12.5f,0f),Triple(80f,0f,20f),Triple(0f,0f,-10f))){
   val p=connection.onPreScroll(Offset(17f,pre),NestedScrollSource());val before=stateJSON(s);val r=connection.onPostScroll(Offset(9f,consumed),Offset(15f,available),NestedScrollSource())
   steps.add("{\"pre\":$pre,\"consumed\":$consumed,\"available\":$available,\"preResult\":${p.y},\"beforePost\":$before,\"postResult\":${r.y},\"afterPost\":${stateJSON(s)}}")
  }
  val velocity=runSuspend{connection.onPostFling(Velocity(13f,11f),Velocity(9f,30f))}
  out.add("{\"kind\":\"$kind\",\"limit\":$limit,\"initial\":$initial,\"atStart\":$atStart,\"enabled\":$enabled,\"steps\":${steps.joinToString(prefix="[",postfix="]")},\"final\":${stateJSON(s)},\"returnedVelocity\":${velocity.y}}")
 }
 else if(mode=="coupled")for(titleHeight in listOf(28,90))for(minimum in listOf(0,32))for(maximum in listOf(64,300))for(fraction in listOf(.1f,.3f,.49f,.5f,.8f))for(v in listOf(-900f,0f,900f))for(step in listOf(8L,16L,33L)){
  val s=TopAppBarState(-Float.MAX_VALUE,0f,0f);watched=s;frameStep=step;absoluteTime=0;records.clear();zeroDurationScale=false;mutateBeforeSnap=false
  var previousHeight=-1
  frameMeasure={
   measuredRowJSON=sourceMeasureRow(s.heightOffset,titleHeight,minimum,maximum)
   if(measuredRowHeight!=previousHeight){previousHeight=measuredRowHeight;s.heightOffsetLimit=-(measuredRowHeight.toFloat()-s.heightOffset)}
  }
  frameMeasure!!.invoke();s.heightOffset=s.heightOffsetLimit*fraction;frameMeasure!!.invoke();val initial=stateJSON(s);val initialLayout=measuredRowJSON
  val velocity=runSuspend{settleAppBar(s,v,DecayAnimationSpec(SplineBasedFloatDecayAnimationSpec(Density(1f))),AnimationSpec(FloatSpringSpec(1f,1600f)))}
  out.add("{\"titleHeight\":$titleHeight,\"minimum\":$minimum,\"maximum\":$maximum,\"fraction\":$fraction,\"velocity\":$v,\"step\":$step,\"initial\":$initial,\"initialLayout\":$initialLayout,\"final\":${stateJSON(s)},\"returnedVelocity\":${velocity.y},\"frames\":${records.joinToString(prefix="[",postfix="]")}}")
  frameMeasure=null
 }
 else for(limit in listOf(-48f,-80f))for(fraction in listOf(0f,.005f,.01f,.1f,.49f,.5f,.9f,1f))for(v in listOf(-900f,-2f,-1f,0f,1f,2f,900f))for(step in listOf(8L,16L,33L))for(specs in listOf("both","snap","fling","none")){
  val s=TopAppBarState(limit,limit*fraction,77f);watched=s;frameStep=step;absoluteTime=0;records.clear();zeroDurationScale=mode=="reduced";mutateBeforeSnap=mode=="mutation"
  val snap=if(specs=="both"||specs=="snap")AnimationSpec<Float>(FloatSpringSpec(1f,1600f))else null
  val fling=if(specs=="both"||specs=="fling")DecayAnimationSpec<Float>(SplineBasedFloatDecayAnimationSpec(Density(1f)))else null
  val velocity=runSuspend{settleAppBar(s,v,fling,snap)}
  out.add("{\"limit\":$limit,\"offset\":${limit*fraction},\"velocity\":$v,\"step\":$step,\"specs\":\"$specs\",\"finalOffset\":${s.heightOffset},\"returnedVelocity\":${velocity.y},\"frames\":${records.joinToString(prefix="[",postfix="]")}}")
 }
 println(out.joinToString(prefix="[",postfix="]"))
}
