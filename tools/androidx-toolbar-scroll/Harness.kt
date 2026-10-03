package androidx.compose.material3
import androidx.compose.animation.core.FloatSpringSpec
fun main(args:Array<String>){val out=mutableListOf<String>()
 when(args[0]){
 "spline"->for(density in listOf(.75f,1f,2f,3f))for(v in listOf(-8000f,-900f,-2f,0f,2f,50f,900f,8000f)){
  val spec=SplineBasedFloatDecayAnimationSpec(Density(density));val duration=spec.getDurationNanos(3f,v)/1_000_000L
  val samples=listOf(-1L,0L,1L,16L,64L,100L,duration/2,duration-1,duration,duration+16).filter{it>=-1}.distinct().sorted().joinToString(prefix="[",postfix="]") {t->"{\"time\":$t,\"value\":${spec.getValueFromNanos(t*1_000_000L,3f,v)},\"velocity\":${spec.getVelocityFromNanos(t*1_000_000L,3f,v)}}"}
  out.add("{\"density\":$density,\"from\":3,\"velocity\":$v,\"duration\":$duration,\"target\":${spec.getTargetValue(3f,v)},\"samples\":$samples}")
 }
 "expansion"->for(density in listOf(.75f,1f,2f))for(reverse in listOf(false,true))for(initial in listOf(false,true))for(expand in listOf(0f,40f,63.5f))for(collapse in listOf(0f,40f,21.25f)){
  hostDensity=Density(density);val events=mutableListOf<String>();val node=VerticalNestedScrollExpansionNode(initial,{events.add("expand")},{events.add("collapse")},reverse,Dp(expand),Dp(collapse));node.onAttach()
  val steps=mutableListOf<String>();for((index,delta) in listOf(0f,-.125f,-19f,-20.875f,-40f,1f,39f,100f,-160f,40f).withIndex()){
   events.clear();node.onPostScroll(Offset(8f,delta),Offset(0f,100f),NestedScrollSource())
   val offset=node.javaClass.getDeclaredField("contentOffset").also{it.isAccessible=true}.getFloat(node);val threshold=node.javaClass.getDeclaredField("threshold").also{it.isAccessible=true}.getFloat(node)
   val event=events.lastOrNull();if(event!=null)node.updateNode(event=="expand",node.onExpand,node.onCollapse,node.reverseLayout,node.expandScrollThreshold,node.collapseScrollThreshold)
   if(index==5)node.updateNode(node.expanded,node.onExpand,node.onCollapse,!node.reverseLayout,Dp(15f),Dp(31f))
   steps.add("{\"delta\":$delta,\"offset\":$offset,\"thresholdBeforeUpdate\":$threshold,\"event\":${event?.let{"\"$it\""}?:"null"},\"expanded\":${node.expanded}}")
  };out.add("{\"density\":$density,\"reverse\":$reverse,\"expanded\":$initial,\"expandThreshold\":$expand,\"collapseThreshold\":$collapse,\"steps\":${steps.joinToString(prefix="[",postfix="]")}}")
 }
 "exit"->for(dir in FloatingToolbarExitDirection.values())for(rtl in listOf(false,true))for(offset in listOf(0f,-.5f,-20f))for(x in listOf(0f,23.5f))for(y in listOf(0f,40.25f)){
  val state=FloatingToolbarStateImpl(-300f,offset,7f);val behavior=ExitAlwaysFloatingToolbarScrollBehavior(dir,state,AnimationSpec(FloatSpringSpec(1f,1600f)),DecayAnimationSpec(SplineBasedFloatDecayAnimationSpec(Density(1f))))
  val m=behavior.floatingScrollBehaviorModifier;m.measure(MeasureScope(if(rtl)LayoutDirection.Rtl else LayoutDirection.Ltr),Measurable(IntSize(224,80)),Constraints());val px=placedX;val py=placedY
  m.coordinates!!(Coordinates(IntSize(224,80),Offset(x+px,y+py),Coordinates(IntSize(500,400),Offset.Zero,null)));val limit=state.offsetLimit
  m.drag!!.action(15.5f);val dragged=state.offset;behavior.onPostScroll(Offset(900f,-7.25f),Offset.Zero,NestedScrollSource())
  out.add("{\"direction\":\"${dir.name.lowercase()}\",\"rtl\":$rtl,\"offset\":$offset,\"x\":$x,\"y\":$y,\"placement\":{\"x\":$px,\"y\":$py},\"limit\":$limit,\"dragged\":$dragged,\"scrolled\":${state.offset},\"contentOffset\":${state.contentOffset}}")
 }
 "settle","settle-reduced","snap-mutation"->for(limit in listOf(-80f,-224f))for(fraction in listOf(0f,.005f,.01f,.1f,.49f,.5f,.9f,1f))for(v in listOf(-900f,-2f,-1f,0f,1f,2f,900f))for(step in listOf(8L,16L,33L)){
  val state=FloatingToolbarStateImpl(limit,limit*fraction,77f);watched=state;frameStep=step;absoluteTime=0;records.clear()
  zeroDurationScale=args[0]=="settle-reduced"
  mutateBeforeSnap=args[0]=="snap-mutation"
  val behavior=ExitAlwaysFloatingToolbarScrollBehavior(Bottom,state,AnimationSpec(FloatSpringSpec(1f,1600f)),DecayAnimationSpec(SplineBasedFloatDecayAnimationSpec(Density(1f))))
  val velocity=runSuspend{behavior.onPostFling(Velocity.Zero,Velocity(0f,v))}
  out.add("{\"limit\":$limit,\"offset\":${limit*fraction},\"velocity\":$v,\"step\":$step,\"finalOffset\":${state.offset},\"contentOffset\":${state.contentOffset},\"returnedVelocity\":${velocity.y},\"frames\":${records.joinToString(prefix="[",postfix="]")}}")
 }
 };println(out.joinToString(prefix="[",postfix="]"))
}
