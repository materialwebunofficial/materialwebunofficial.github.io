package androidx.compose.material3

fun main(){
 check(sourceRowPolicy()===DefaultRowMeasurePolicy);check(sourceColumnPolicy()===DefaultColumnMeasurePolicy)
 check(sourceRowPolicy(verticalAlignment=Alignment.CenterVertically)!==DefaultRowMeasurePolicy)
 check(sourceColumnPolicy(horizontalAlignment=Alignment.CenterHorizontally)!==DefaultColumnMeasurePolicy)
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
 )
 val bounds=listOf(intArrayOf(0,10000,0,10000),intArrayOf(0,0,0,0),intArrayOf(0,17,0,17),intArrayOf(0,199,0,41),intArrayOf(0,199,0,63),intArrayOf(20,160,20,99),intArrayOf(0,Constraints.Infinity,0,Constraints.Infinity))
 val out=mutableListOf<String>()
 for(vertical in listOf(false,true))for(rtl in listOf(false,true))for(profile in profiles)for(b in bounds)for(presence in 0..3)for(state in listOf("visible","collapsed","enter","exit")){
  Host.rtl=rtl;Host.boxes.clear();Host.origin=IntOffset.Zero;Host.sizes.clear()
  val expanded=state=="visible"||state=="enter";val composed=state!="collapsed";val settled=state=="visible"||state=="collapsed"
  val sample=if(state=="visible")-1 else if(state=="collapsed")0 else 12
  val cross=72;val padding=if(state=="visible")0f else if(state=="collapsed")1f else .5f;PaddingHost.progress=padding
  val leading=listOf(NativeInput(32,32),NativeInput(56,56))
  val trailing=listOf(NativeInput(96,96),NativeInput(40,40,align="center"))
  val lead=presence and 1 !=0;val trail=presence and 2 !=0
  val lc=if(vertical||state=="exit")"end" else "start"
  val tc=if(vertical||state=="exit")"start" else "end"
  val groups=mutableListOf<Measurable>()
  if(lead&&composed)groups.add(VisibilityContent("leading",AlignedRow("leading-row",leading,vertical),vertical,sample,0,lc,lc,settled,cross))
  val main=AlignedRow("main-row",profile,vertical)
  groups.add(Wrapped("balanced",MinimumInteractiveBalancedPaddingNode(lead&&expanded,trail&&expanded,Any()),main))
  if(trail&&composed)groups.add(VisibilityContent("trailing",AlignedRow("trailing-row",trailing,vertical),vertical,sample,0,tc,tc,settled,cross))
  // The outer composable explicitly centers its groups.
  val content=RowContent("content",groups,vertical,"center")
  val root=Wrapped("root",if(vertical)SizeNode(minWidth=64.dp,enforceIncoming=true)else SizeNode(minHeight=64.dp,enforceIncoming=true),Wrapped("padded",PaddingValuesModifier(Padding8),content))
  val c=if(vertical)Constraints(b[2],b[3],b[0],b[1])else Constraints(b[0],b[1],b[2],b[3])
  val p=root.measure(c)
  val top=main.owner.outer[MinimumInteractiveTopAlignmentLine];val left=main.owner.outer[MinimumInteractiveLeftAlignmentLine]
  Host.boxes.clear();with(Placeable.PlacementScope(0,IntOffset.Zero)){placeRoot(p)}
  out.add("{\"input\":{\"vertical\":$vertical,\"rtl\":$rtl,\"main\":${profile.joinToString(prefix="[",postfix="]"){it.json()}},\"leading\":${leading.joinToString(prefix="[",postfix="]"){it.json()}},\"trailing\":${trailing.joinToString(prefix="[",postfix="]"){it.json()}},\"minMain\":${b[0]},\"maxMain\":${b[1]},\"minCross\":${b[2]},\"maxCross\":${b[3]},\"presence\":$presence,\"state\":\"$state\",\"expanded\":$expanded,\"composed\":$composed,\"settled\":$settled,\"sample\":$sample,\"cross\":$cross,\"padding\":$padding,\"leadCurrent\":\"$lc\",\"trailCurrent\":\"$tc\"},\"size\":${IntSize(p.width,p.height).json()},\"lines\":{\"top\":${if(top==AlignmentLine.Unspecified)"null" else top},\"left\":${if(left==AlignmentLine.Unspecified)"null" else left}},\"placements\":${boxes()}}")
 }
 println(out.joinToString(prefix="[",postfix="]"))
}
