package bottomappbaroracle
import androidx.compose.animation.core.FloatSpringSpec
import androidx.compose.material3.tokens.ExpressiveMotionTokens
import androidx.compose.material3.tokens.StandardMotionTokens
import androidx.compose.material3.Host
import androidx.compose.material3.Scope
import androidx.compose.material3.BottomLeaf
import androidx.compose.material3.BottomChild
import androidx.compose.material3.bottomSourceTree
import androidx.compose.material3.placeRoot

fun snapSpec(scheme:String)=if(scheme=="standard")AnimationSpec<Float>(FloatSpringSpec(StandardMotionTokens.SpringFastSpatialDamping,StandardMotionTokens.SpringFastSpatialStiffness))else AnimationSpec<Float>(FloatSpringSpec(ExpressiveMotionTokens.SpringFastSpatialDamping,ExpressiveMotionTokens.SpringFastSpatialStiffness))
fun stateJSON(s:BottomAppBarState)="{\"limit\":${s.heightOffsetLimit},\"offset\":${s.heightOffset},\"content\":${s.contentOffset},\"collapsed\":${s.collapsedFraction}}"
fun measure(s:BottomAppBarState,flexible:Boolean,minimum:Int,maximum:Int,inset:Int,rtl:Boolean,hasFab:Boolean):String{
 Host.rtl=rtl;Host.boxes.clear();Host.sizes.clear()
 val actions=listOf(BottomChild("action0",BottomLeaf(48,48,40,40)),BottomChild("action1",BottomLeaf(48,48,40,40)))
 val fabs=if(hasFab)listOf(BottomChild("fab0",BottomLeaf(56,56,56,56)))else emptyList()
 val inner=bottomSourceTree(flexible,actions,fabs,if(flexible)listOf(16f,0f,16f,0f)else listOf(4f,4f,4f,0f),listOf(0f,0f,0f,inset.toFloat()),if(flexible)"between" else "start")
 val c=androidx.compose.material3.Constraints(390,390,minimum,maximum)
 val behavior=ExitAlwaysScrollBehavior(s,null,null)
 val result=with(Scope){bottomSourceMeasure(inner,c,behavior)}
 val root=androidx.compose.material3.Placeable("scroll-root",result,c)
 with(androidx.compose.material3.Placeable.PlacementScope(0,androidx.compose.material3.IntOffset.Zero)){placeRoot(root)}
 val positions=Host.boxes.filterKeys{it!="content"}.entries.joinToString(prefix="{",postfix="}"){(id,r)->"\"$id\":${r.json()}"}
 return "{\"size\":${androidx.compose.material3.IntSize(root.width,root.height).json()},\"requested\":${root.measuredSize.json()},\"placements\":$positions}"
}
fun main(args:Array<String>){val mode=args[0];val out=mutableListOf<String>()
 if(mode=="state")for(limit in listOf(0f,-.5f,-48f,-80f,-Float.MAX_VALUE))for(offset in listOf(0f,-.5f,-79.25f,-150f))for(content in listOf(0f,.125f,-.125f,23.25f,-500f)){
  val s=BottomAppBarStateImpl(limit,offset,content);val initial=stateJSON(s);s.heightOffset=offset;val assigned=stateJSON(s);s.heightOffsetLimit=-32f;val limitOnly=stateJSON(s);s.heightOffset=-40f
  out.add("{\"limit\":$limit,\"offset\":$offset,\"content\":$content,\"initial\":$initial,\"assigned\":$assigned,\"limitOnly\":$limitOnly,\"clamped\":${stateJSON(s)}}")
 }
 else if(mode=="nested")for(limit in listOf(0f,-48f,-80f))for(initial in listOf(0f,-.5f,-20f,-80f))for(enabled in listOf(false,true)){
  val s=BottomAppBarStateImpl(limit,initial,0f);val b=ExitAlwaysScrollBehavior(s,null,null,{enabled});val connection=b.nestedScrollConnection;val steps=mutableListOf<String>()
  for((pre,consumed,available) in listOf(Triple(-.125f,-.25f,0f),Triple(-23.25f,-10f,-2f),Triple(-100f,-200f,0f),Triple(13.5f,12.5f,0f),Triple(80f,0f,20f),Triple(0f,0f,-10f))){
   val p=connection.onPreScroll(Offset(17f,pre),NestedScrollSource());val before=stateJSON(s);val r=connection.onPostScroll(Offset(9f,consumed),Offset(15f,available),NestedScrollSource())
   steps.add("{\"pre\":$pre,\"consumed\":$consumed,\"available\":$available,\"preResult\":${p.y},\"beforePost\":$before,\"postResult\":${r.y},\"afterPost\":${stateJSON(s)}}")
  }
  val velocity=runSuspend{connection.onPostFling(Velocity(13f,11f),Velocity(9f,30f))}
  out.add("{\"limit\":$limit,\"initial\":$initial,\"enabled\":$enabled,\"steps\":${steps.joinToString(prefix="[",postfix="]")},\"final\":${stateJSON(s)},\"returnedVelocity\":${velocity.y}}")
 }
 else if(mode=="coupled")for(flexible in listOf(false,true))for(bounds in listOf(Pair(0,2147483647),Pair(0,17),Pair(48,48),Pair(99,140)))for(inset in listOf(0,9))for(rtl in listOf(false,true))for(hasFab in listOf(false,true))for(fraction in listOf(.1f,.49f,.5f,.9f))for(v in listOf(-900f,0f,900f))for(scheme in listOf("expressive","standard")){
  val s=BottomAppBarStateImpl(-Float.MAX_VALUE,0f,77f);watched=s;frameStep=16;absoluteTime=0;records.clear();zeroDurationScale=false;mutateBeforeSnap=false
  frameMeasure={measuredJSON=measure(s,flexible,bounds.first,bounds.second,inset,rtl,hasFab)};frameMeasure!!.invoke();s.heightOffset=s.heightOffsetLimit*fraction;frameMeasure!!.invoke();val initial=stateJSON(s);val initialLayout=measuredJSON
  val velocity=runSuspend{settleAppBarBottom(s,v,DecayAnimationSpec(SplineBasedFloatDecayAnimationSpec(Density(1f))),snapSpec(scheme))}
  out.add("{\"variant\":\"${if(flexible)"flexible" else "standard"}\",\"minimum\":${bounds.first},\"maximum\":${bounds.second},\"inset\":$inset,\"rtl\":$rtl,\"hasFab\":$hasFab,\"fraction\":$fraction,\"velocity\":$v,\"scheme\":\"$scheme\",\"initial\":$initial,\"initialLayout\":$initialLayout,\"final\":${stateJSON(s)},\"returnedVelocity\":${velocity.y},\"frames\":${records.joinToString(prefix="[",postfix="]")}}")
  frameMeasure=null;measuredJSON="null"
 }
 else for(limit in listOf(-48f,-80f))for(fraction in listOf(0f,.005f,.01f,.1f,.49f,.5f,.9f,1f))for(v in listOf(-900f,-2f,-1f,0f,1f,2f,900f))for(step in listOf(8L,16L,33L))for(specs in listOf("both","snap","fling","none"))for(scheme in listOf("expressive","standard")){
  val s=BottomAppBarStateImpl(limit,limit*fraction,77f);watched=s;frameStep=step;absoluteTime=0;records.clear();zeroDurationScale=mode=="reduced";mutateBeforeSnap=mode=="mutation"
  val snap=if(specs=="both"||specs=="snap")snapSpec(scheme)else null
  val fling=if(specs=="both"||specs=="fling")DecayAnimationSpec<Float>(SplineBasedFloatDecayAnimationSpec(Density(1f)))else null
  val velocity=runSuspend{settleAppBarBottom(s,v,fling,snap)}
  out.add("{\"scheme\":\"$scheme\",\"limit\":$limit,\"offset\":${limit*fraction},\"velocity\":$v,\"step\":$step,\"specs\":\"$specs\",\"finalOffset\":${s.heightOffset},\"returnedVelocity\":${velocity.y},\"frames\":${records.joinToString(prefix="[",postfix="]")}}")
 }
 println(out.joinToString(prefix="[",postfix="]"))
}
