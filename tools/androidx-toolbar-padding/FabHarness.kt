package androidx.compose.material3

fun main(){
 val out=mutableListOf<String>()
 val bounds=listOf(intArrayOf(0,10000,0,10000),intArrayOf(0,0,0,0),intArrayOf(0,17,0,17),intArrayOf(0,160,0,67),intArrayOf(20,160,20,99),intArrayOf(0,Constraints.Infinity,0,Constraints.Infinity))
 for(vertical in listOf(false,true))for(rtl in listOf(false,true))for(pad in paddingProfiles)for(contentAxis in listOf(0,144,203))for(contentCross in listOf(21,56,96))for(b in bounds)for(progress in listOf(0f,.5f,1f,1.08f))for(atEnd in listOf(false,true))for(scroll in listOf(0,37)){
  Host.rtl=rtl;Host.origin=IntOffset(0,0);Host.boxes.clear();Host.sizes.clear()
  val position=if(vertical)if(atEnd)"bottom" else "top" else if(atEnd)"end" else "start"
  val constraints=if(vertical)Constraints(b[2],b[3],b[0],b[1])else Constraints(b[0],b[1],b[2],b[3])
  val input="{\"contentPadding\":${pad.json()},\"vertical\":$vertical,\"contentAxis\":$contentAxis,\"contentCross\":$contentCross,\"minAxis\":${b[0]},\"maxAxis\":${b[1]},\"minCross\":${b[2]},\"maxCross\":${b[3]},\"progress\":$progress,\"position\":\"$position\",\"rtl\":$rtl,\"scroll\":$scroll}"
  val state=ScrollState(scroll);val content=Content(if(vertical)IntSize(contentCross,contentAxis)else IntSize(contentAxis,contentCross))
  val viewport=Wrapped("viewport",ScrollNode(state,false,vertical),content)
  val toolbar=Wrapped("toolbar",PaddingValuesModifier(pad.values()),viewport)
  val root=Wrapped("root",if(vertical)UnspecifiedConstraintsNode(minWidth=80.dp)else UnspecifiedConstraintsNode(minHeight=80.dp),Policy(vertical,progress,position,toolbar))
  try{
   val intrinsic=if(vertical)toolbar.maxIntrinsicHeight(64)else toolbar.maxIntrinsicWidth(64)
   Host.boxes.clear();Host.sizes.clear()
   val p=root.measure(constraints);with(Placeable.PlacementScope(0,IntOffset(0,0))){placeRoot(p)}
   val boxes=Host.boxes.filterKeys{it in listOf("toolbar","fab","viewport","content")}.entries.joinToString(prefix="{",postfix="}"){(id,r)->"\"$id\":${r.json()}"}
   out.add("{\"input\":$input,\"intrinsic\":$intrinsic,\"size\":${IntSize(p.width,p.height).json()},\"requested\":${Host.sizes.getValue("policy").json()},\"placements\":$boxes,\"scroll\":{\"max\":${state.maxValue},\"viewport\":${state.viewportSize},\"content\":${state.contentSize}}}")
  }catch(e:IllegalArgumentException){out.add("{\"input\":$input,\"error\":\"invalid-constraints\"}")}
 }
 println(out.joinToString(prefix="[",postfix="]"))
}
