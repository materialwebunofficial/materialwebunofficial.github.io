package androidx.compose.material3

fun main(){
 val profiles=listOf(
  listOf(NativeInput(32,32),NativeInput(52,40),NativeInput(56,56)),
  listOf(NativeInput(40,40),NativeInput(96,96),NativeInput(32,32)),
  listOf(NativeInput(19,15,native=false),NativeInput(52,40),NativeInput(32,32)),
  listOf(NativeInput(40,40,1f),NativeInput(56,56,2f,false),NativeInput(32,32,.33f)),
  listOf(NativeInput(32,32,align="end"),NativeInput(52,40,align="center"),NativeInput(56,56)),
  listOf(NativeInput(71,21,native=false),NativeInput(56,56,align="start"),NativeInput(32,32,align="center")),
  listOf(NativeInput(136,136),NativeInput(40,40),NativeInput(96,96)),
  listOf(NativeInput(71,21,native=false,align="line",line=13),NativeInput(19,15,native=false,align="line",line=7),NativeInput(56,56)),
  emptyList(),
  listOf(NativeInput(203,21,native=false))
 )
 val bounds=listOf(intArrayOf(0,10000,0,10000),intArrayOf(0,0,0,0),intArrayOf(0,17,0,17),intArrayOf(0,199,0,41),intArrayOf(0,199,0,63),intArrayOf(20,160,20,99),intArrayOf(0,Constraints.Infinity,0,Constraints.Infinity))
 val out=mutableListOf<String>();val queries=mutableListOf<String>();val noFab=mutableListOf<String>()
 for(vertical in listOf(false,true))for(profile in profiles)for(available in listOf(0,17,64,96,Constraints.Infinity)){
  Host.rtl=false
  val row=AlignedRow("content",profile,vertical)
  queries.add("{\"vertical\":$vertical,\"main\":${profile.joinToString(prefix="[",postfix="]"){it.json()}},\"available\":$available,\"values\":{\"minWidth\":${row.minIntrinsicWidth(available)},\"maxWidth\":${row.maxIntrinsicWidth(available)},\"minHeight\":${row.minIntrinsicHeight(available)},\"maxHeight\":${row.maxIntrinsicHeight(available)}}}")
 }
 for(vertical in listOf(false,true))for(rtl in listOf(false,true))for(profile in profiles)for(pad in paddingProfiles)for(b in bounds)for(progress in listOf(0f,.5f,1f,1.08f))for(atEnd in listOf(false,true))for(scroll in listOf(0,37)){
  Host.rtl=rtl;Host.origin=IntOffset.Zero;Host.boxes.clear();Host.sizes.clear()
  val position=if(vertical)if(atEnd)"bottom" else "top" else if(atEnd)"end" else "start"
  val constraints=if(vertical)Constraints(b[2],b[3],b[0],b[1])else Constraints(b[0],b[1],b[2],b[3])
  val input="{\"contentPadding\":${pad.json()},\"vertical\":$vertical,\"main\":${profile.joinToString(prefix="[",postfix="]"){it.json()}},\"minAxis\":${b[0]},\"maxAxis\":${b[1]},\"minCross\":${b[2]},\"maxCross\":${b[3]},\"progress\":$progress,\"position\":\"$position\",\"rtl\":$rtl,\"scroll\":$scroll}"
  val state=ScrollState(scroll);val row=AlignedRow("content",profile,vertical)
  val viewport=Wrapped("viewport",ScrollNode(state,false,vertical),row)
  val toolbar=Wrapped("toolbar",PaddingValuesModifier(pad.values()),viewport)
  val root=Wrapped("root",if(vertical)UnspecifiedConstraintsNode(minWidth=80.dp)else UnspecifiedConstraintsNode(minHeight=80.dp),Policy(vertical,progress,position,toolbar))
  try{
   val intrinsic=if(vertical)toolbar.maxIntrinsicHeight(64)else toolbar.maxIntrinsicWidth(64)
   Host.boxes.clear();Host.sizes.clear()
   val p=root.measure(constraints);Host.boxes.clear()
   with(Placeable.PlacementScope(0,IntOffset.Zero)){placeRoot(p)}
   out.add("{\"input\":$input,\"intrinsic\":$intrinsic,\"size\":${IntSize(p.width,p.height).json()},\"requested\":${Host.sizes.getValue("policy").json()},\"placements\":${boxes()},\"scroll\":{\"max\":${state.maxValue},\"viewport\":${state.viewportSize},\"content\":${state.contentSize}}}")
  }catch(e:IllegalArgumentException){out.add("{\"input\":$input,\"error\":\"invalid-constraints\"}")}
 }
 PaddingHost.natural=true
 for(vertical in listOf(false,true))for(rtl in listOf(false,true))for(profile in profiles)for(pad in paddingProfiles)for(b in bounds){
  Host.rtl=rtl;Host.origin=IntOffset.Zero;Host.boxes.clear();Host.sizes.clear()
  val row=AlignedRow("main-row",profile,vertical,false)
  val balanced=Wrapped("balanced",MinimumInteractiveBalancedPaddingNode(false,false,Any()),row)
  val content=RowContent("content",listOf(balanced),vertical,"center")
  val root=Wrapped("root",if(vertical)SizeNode(minWidth=64.dp,enforceIncoming=true)else SizeNode(minHeight=64.dp,enforceIncoming=true),Wrapped("padded",PaddingValuesModifier(pad.values()),content))
  val c=if(vertical)Constraints(b[2],b[3],b[0],b[1])else Constraints(b[0],b[1],b[2],b[3])
  val p=root.measure(c);Host.boxes.clear();with(Placeable.PlacementScope(0,IntOffset.Zero)){placeRoot(p)}
  val input="{\"contentPadding\":${pad.json()},\"vertical\":$vertical,\"rtl\":$rtl,\"main\":${profile.joinToString(prefix="[",postfix="]"){it.json()}},\"minMain\":${b[0]},\"maxMain\":${b[1]},\"minCross\":${b[2]},\"maxCross\":${b[3]}}"
  noFab.add("{\"input\":$input,\"size\":${IntSize(p.width,p.height).json()},\"placements\":${boxes()}}")
 }
 println("{\"layout\":"+out.joinToString(prefix="[",postfix="]")+",\"intrinsic\":"+queries.joinToString(prefix="[",postfix="]")+",\"no-fab\":"+noFab.joinToString(prefix="[",postfix="]")+"}")
}
