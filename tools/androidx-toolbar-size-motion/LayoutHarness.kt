package androidx.compose.material3

fun main(){
 val out=mutableListOf<String>()
 val bounds=listOf(intArrayOf(0,10000,0,10000),intArrayOf(0,0,0,0),intArrayOf(0,17,0,17),intArrayOf(0,199,0,63))
 val states=listOf("initial","visible","exit","disposed","enter")
 for(vertical in listOf(false,true))for(rtl in listOf(false,true))for(body in listOf(40,56,96))for(b in bounds)for(state in states)for(sample in listOf(0 to 96,12 to 72,48 to 48,96 to 96))for(presence in listOf(1,3)){
  Host.rtl=rtl;Host.boxes.clear();Host.origin=IntOffset.Zero;Host.sizes.clear()
  val expanded=state=="visible"||state=="enter"
  val current=when(state){"visible","exit"->androidx.compose.animation.core.EnterExitState.Visible;"disposed"->androidx.compose.animation.core.EnterExitState.PostExit;else->androidx.compose.animation.core.EnterExitState.PreEnter}
  val target=when(state){"visible","enter"->androidx.compose.animation.core.EnterExitState.Visible;"exit","disposed"->androidx.compose.animation.core.EnterExitState.PostExit;else->androidx.compose.animation.core.EnterExitState.PreEnter}
  val parent=androidx.compose.animation.core.ParentTransition(current==androidx.compose.animation.core.EnterExitState.Visible,expanded,false,false)
  val composed=androidx.compose.animation.core.composed(parent,null,false,current,target)
  val settled=current==target
  PaddingHost.progress=if(expanded)0f else 1f
  val groups=mutableListOf<Measurable>()
  val leadCurrent=if(state=="exit"||vertical)"end" else "start"
  val trailCurrent=if(state=="exit"||vertical)"start" else "end"
  if(composed)groups.add(VisibilityContent("leading",AlignedRow("leading-row",listOf(NativeInput(body,body)),vertical),vertical,sample.first,0,leadCurrent,leadCurrent,settled,sample.second))
  val main=AlignedRow("main-row",listOf(NativeInput(40,40)),vertical)
  groups.add(Wrapped("balanced",MinimumInteractiveBalancedPaddingNode(expanded,presence==3&&expanded,Any()),main))
  if(composed&&presence==3)groups.add(VisibilityContent("trailing",AlignedRow("trailing-row",listOf(NativeInput(56,56)),vertical),vertical,sample.first,0,trailCurrent,trailCurrent,settled,sample.second))
  val content=RowContent("content",groups,vertical,"center")
  val root=Wrapped("root",if(vertical)SizeNode(minWidth=64.dp,enforceIncoming=true)else SizeNode(minHeight=64.dp,enforceIncoming=true),Wrapped("padded",PaddingValuesModifier(Padding8),content))
  val c=if(vertical)Constraints(b[2],b[3],b[0],b[1])else Constraints(b[0],b[1],b[2],b[3])
  val p=root.measure(c);Host.boxes.clear();with(Placeable.PlacementScope(0,IntOffset.Zero)){placeRoot(p)}
  out.add("{\"input\":{\"vertical\":$vertical,\"rtl\":$rtl,\"body\":$body,\"minMain\":${b[0]},\"maxMain\":${b[1]},\"minCross\":${b[2]},\"maxCross\":${b[3]},\"state\":\"$state\",\"sample\":${sample.first},\"cross\":${sample.second},\"presence\":$presence,\"expanded\":$expanded,\"composed\":$composed,\"settled\":$settled,\"leadCurrent\":\"$leadCurrent\",\"trailCurrent\":\"$trailCurrent\"},\"size\":${IntSize(p.width,p.height).json()},\"placements\":${boxes()}}")
 }
 println(out.joinToString(prefix="[",postfix="]"))
}
