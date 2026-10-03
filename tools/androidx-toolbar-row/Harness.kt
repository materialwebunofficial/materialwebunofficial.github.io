package androidx.compose.material3

fun main(args:Array<String>){
 val profiles=listOf(
  emptyList(),listOf(LeafInput(48,48),LeafInput(48,48),LeafInput(48,48)),
  listOf(LeafInput(19,15),LeafInput(65,47,align="end"),LeafInput(113,62,align="start")),
  listOf(LeafInput(19,48,1f),LeafInput(35,32,2f,false),LeafInput(48,64)),
  listOf(LeafInput(11,15,.33f),LeafInput(65,47,.77f),LeafInput(113,62,1.7f,false)),
  listOf(LeafInput(40,60,line=15,align="line"),LeafInput(51,32,line=29,align="line"),LeafInput(16,20,align="line")),
  listOf(LeafInput(61,73,required=true),LeafInput(48,48),LeafInput(16,16)),
  listOf(LeafInput(113,62,.77f,intrinsicMinMain=23,intrinsicMinCross=17,wrap=true),LeafInput(65,47,intrinsicMinMain=11,intrinsicMinCross=13,wrap=true)),
  listOf(LeafInput(48,48,1f),LeafInput(48,48,2f),LeafInput(48,48,.33f,false)),
 )
 val bounds=listOf(intArrayOf(0,10000,0,10000),intArrayOf(0,0,0,0),intArrayOf(0,15,0,15),intArrayOf(0,84,0,34),intArrayOf(20,160,48,99),intArrayOf(199,301,64,99),intArrayOf(0,Constraints.Infinity,0,Constraints.Infinity),intArrayOf(160,160,48,48),intArrayOf(0,199,0,63))
 val out=mutableListOf<String>()
 if(args[0]=="row")for(vertical in listOf(false,true))for(rtl in listOf(false,true))for(profile in profiles)for(b in bounds)for(arrangement in listOf("start","center","end","between","around","evenly","spaced")){
  Host.rtl=rtl;Host.boxes.clear();Host.sizes.clear()
  val children=profile.mapIndexed{i,p->Leaf("c$i",p,vertical)}
  val row=RowContent("row",children,vertical,arrangement)
  val c=if(vertical)Constraints(b[2],b[3],b[0],b[1])else Constraints(b[0],b[1],b[2],b[3])
  val p=row.measure(c);with(Placeable.PlacementScope(0,IntOffset.Zero)){placeRoot(p)}
  val intrinsic=listOf(0,99,Constraints.Infinity).map{n->"{\"available\":$n,\"minWidth\":${row.minIntrinsicWidth(n)},\"minHeight\":${row.minIntrinsicHeight(n)},\"maxWidth\":${row.maxIntrinsicWidth(n)},\"maxHeight\":${row.maxIntrinsicHeight(n)}}"}.joinToString(prefix="[",postfix="]")
  out.add("{\"input\":{\"vertical\":$vertical,\"rtl\":$rtl,\"children\":${profile.joinToString(prefix="[",postfix="]"){it.json()}},\"minMain\":${b[0]},\"maxMain\":${b[1]},\"minCross\":${b[2]},\"maxCross\":${b[3]},\"arrangement\":\"$arrangement\"},\"size\":${IntSize(p.width,p.height).json()},\"requested\":${p.measuredSize.json()},\"placements\":${boxes()},\"intrinsic\":$intrinsic}")
 }
 if(args[0]=="toolbar")for(vertical in listOf(false,true))for(rtl in listOf(false,true))for(profile in listOf(profiles[1],profiles[2],profiles[3],profiles[5],profiles[8]))for(b in bounds)for(sample in listOf(0,12,48,54))for(delta in listOf(-12,0,12))for(current in listOf("none","start","end"))for(padding in listOf(0f,.5f,1f))for(lines in listOf(intArrayOf(4,4),intArrayOf(8,0))){
  Host.rtl=rtl;Host.boxes.clear();Host.sizes.clear();LeafConstraints.values.clear();PaddingHost.progress=padding
  val leading=RowContent("leading-row",listOf(Leaf("leading0",LeafInput(48,48),vertical)),vertical)
  val main=RowContent("main-row",profile.mapIndexed{i,p->Leaf("main$i",p,vertical)},vertical,top=lines[0],left=lines[1])
  val trailing=RowContent("trailing-row",listOf(Leaf("trailing0",LeafInput(48,48),vertical)),vertical)
  val leadingVisibility=VisibilityContent("leading",leading,vertical,sample,delta,current,if(vertical)"end" else "start",false)
  val trailingVisibility=VisibilityContent("trailing",trailing,vertical,sample,-delta,current,if(vertical)"start" else "end",false)
  val balanced=Wrapped("balanced",MinimumInteractiveBalancedPaddingNode(false,true,Any()),main)
  val content=RowContent("content",listOf(leadingVisibility,balanced,trailingVisibility),vertical,"center")
  val padded=Wrapped("padded",PaddingValuesModifier(Padding8),content)
  val root=Wrapped("root",if(vertical)SizeNode(minWidth=64.dp,enforceIncoming=true)else SizeNode(minHeight=64.dp,enforceIncoming=true),padded)
  val c=if(vertical)Constraints(b[2],b[3],b[0],b[1])else Constraints(b[0],b[1],b[2],b[3])
  val p=root.measure(c);with(Placeable.PlacementScope(0,IntOffset.Zero)){placeRoot(p)}
  val placements=boxes();val origins=Host.boxes.toMap()
  val nativeIds=listOf("leading0","trailing0")+if(profile.all{it.main==48&&it.cross==48&&it.align=="center"})profile.indices.map{"main$it"}else emptyList()
  val icons=nativeIds.joinToString(prefix="{",postfix="}"){id->"\"$id\":${iconAt(LeafConstraints.values.getValue(id),origins.getValue(id)).json()}"}
  out.add("{\"input\":{\"vertical\":$vertical,\"rtl\":$rtl,\"main\":${profile.joinToString(prefix="[",postfix="]"){it.json()}},\"minMain\":${b[0]},\"maxMain\":${b[1]},\"minCross\":${b[2]},\"maxCross\":${b[3]},\"sample\":$sample,\"delta\":$delta,\"current\":\"$current\",\"padding\":$padding,\"top\":${lines[0]},\"left\":${lines[1]}},\"size\":${IntSize(p.width,p.height).json()},\"placements\":$placements,\"icons\":$icons}")
 }
 if(args[0]=="icon"){
  val iconBounds=listOf(0 to 0,0 to 1,0 to 17,0 to 39,0 to 40,0 to 41,0 to 45,0 to 47,0 to 48,0 to 49,17 to 45,40 to 65,41 to 41,45 to 45,49 to 99,65 to Constraints.Infinity)
  for(rtl in listOf(false,true))for(size in listOf(24 to 24,40 to 40,32 to 40,56 to 48,96 to 96))for(w in iconBounds)for(h in iconBounds){
   Host.rtl=rtl;Host.boxes.clear();Host.sizes.clear();val c=Constraints(w.first,w.second,h.first,h.second)
   val p=iconMeasure(c,size.first,size.second);with(Placeable.PlacementScope(0,IntOffset.Zero)){placeRoot(p)}
   out.add("{\"input\":{\"rtl\":$rtl,\"width\":${size.first},\"height\":${size.second},\"minWidth\":${w.first},\"maxWidth\":${w.second},\"minHeight\":${h.first},\"maxHeight\":${h.second}},\"size\":${IntSize(p.width,p.height).json()},\"requested\":${p.measuredSize.json()},\"body\":${Host.boxes.getValue("body").json()},\"lines\":{\"top\":${p[MinimumInteractiveTopAlignmentLine]},\"left\":${p[MinimumInteractiveLeftAlignmentLine]}}}")
  }
 }
 println(out.joinToString(prefix="[",postfix="]"))
}
