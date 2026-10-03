package androidx.compose.material3
fun main(){
 val profiles=listOf(
  emptyList(),listOf(NativeInput(40,40)),listOf(NativeInput(40,40),NativeInput(40,40),NativeInput(40,40)),
  listOf(NativeInput(32,32),NativeInput(52,40,align="end"),NativeInput(56,56,align="start")),
  listOf(NativeInput(40,40,1f),NativeInput(40,40,2f),NativeInput(40,40,.33f,false)),
  listOf(NativeInput(19,15,native=false),NativeInput(52,40),NativeInput(32,32)),
  listOf(NativeInput(96,96),NativeInput(136,136),NativeInput(40,40)),
 )
 val bounds=listOf(intArrayOf(0,10000,0,10000),intArrayOf(0,0,0,0),intArrayOf(0,17,0,17),intArrayOf(0,93,0,41),intArrayOf(0,199,0,45),intArrayOf(0,199,0,47),intArrayOf(0,199,0,63),intArrayOf(20,160,20,99),intArrayOf(199,301,64,99),intArrayOf(0,Constraints.Infinity,0,Constraints.Infinity))
 val out=mutableListOf<String>()
 for(vertical in listOf(false,true))for(rtl in listOf(false,true))for(profile in profiles)for(b in bounds)for(presence in 0..3)for(sample in listOf(0,12,48))for(progress in listOf(0f,.5f,1f))for(expanded in listOf(false,true)){
  Host.rtl=rtl;Host.boxes.clear();Host.origin=IntOffset.Zero;Host.sizes.clear();PaddingHost.progress=progress
  val main=AlignedRow("main-row",profile,vertical)
  val lead=presence and 1 !=0;val trail=presence and 2 !=0
  val groups=mutableListOf<Measurable>()
  if(lead)groups.add(VisibilityContent("leading",RowContent("leading-row",listOf(Leaf("leading0",LeafInput(48,48),vertical)),vertical),vertical,sample,0,"none",if(vertical)"end" else "start",false))
  groups.add(Wrapped("balanced",MinimumInteractiveBalancedPaddingNode(lead&&expanded,trail&&expanded,Any()),main))
  if(trail)groups.add(VisibilityContent("trailing",RowContent("trailing-row",listOf(Leaf("trailing0",LeafInput(48,48),vertical)),vertical),vertical,sample,0,"none",if(vertical)"start" else "end",false))
  val content=RowContent("content",groups,vertical,"center")
  val root=Wrapped("root",if(vertical)SizeNode(minWidth=64.dp,enforceIncoming=true)else SizeNode(minHeight=64.dp,enforceIncoming=true),Wrapped("padded",PaddingValuesModifier(Padding8),content))
  val c=if(vertical)Constraints(b[2],b[3],b[0],b[1])else Constraints(b[0],b[1],b[2],b[3])
  val p=root.measure(c)
  val top=main.owner.outer[MinimumInteractiveTopAlignmentLine];val left=main.owner.outer[MinimumInteractiveLeftAlignmentLine]
  Host.boxes.clear();with(Placeable.PlacementScope(0,IntOffset.Zero)){placeRoot(p)}
  out.add("{\"input\":{\"vertical\":$vertical,\"rtl\":$rtl,\"main\":${profile.joinToString(prefix="[",postfix="]"){it.json()}},\"minMain\":${b[0]},\"maxMain\":${b[1]},\"minCross\":${b[2]},\"maxCross\":${b[3]},\"presence\":$presence,\"sample\":$sample,\"padding\":$progress,\"expanded\":$expanded},\"size\":${IntSize(p.width,p.height).json()},\"lines\":{\"top\":${if(top==AlignmentLine.Unspecified)"null" else top},\"left\":${if(left==AlignmentLine.Unspecified)"null" else left}},\"placements\":${boxes()}}")
 }
 println(out.joinToString(prefix="[",postfix="]"))
}
