package androidx.compose.material3
import kotlin.math.*
val Double.dp get()=Dp(toFloat())

// Composition emission, density1, the platform precision-pointer flag and
// already shaped text/icon/control leaves are explicit hosts.
val shouldUsePrecisionPointerComponentSizing=Value(false)
fun PaddingValues(start:Dp,end:Dp,top:Dp,bottom:Dp)=TooltipPads(start.roundToPx(),top.roundToPx(),end.roundToPx(),bottom.roundToPx())
fun TooltipModifier.defaultMinSize(minWidth:Dp,minHeight:Dp)=then(TooltipModifier(listOf("default-min" to UnspecifiedConstraintsNode(minWidth,minHeight))))
class ButtonRow(val children:List<Measurable>,val arrangement:Arrangement.Horizontal,val alignment:Alignment.Vertical):Measurable{
 override fun measure(c:Constraints):Placeable{
  val measured=mutableListOf<TooltipPlaceable>()
  val taps=children.map{child->object:Measurable by child{override fun measure(c:Constraints)=child.measure(c).also{measured.add(it as TooltipPlaceable)}}}
  val policy=RowMeasurePolicy(arrangement,alignment)
  return tooltipPlaceable("row",with(policy){with(Scope){measure(taps,c)}},c,children=measured)
 }
 override fun minIntrinsicWidth(h:Int)=0;override fun maxIntrinsicWidth(h:Int)=0
 override fun minIntrinsicHeight(w:Int)=0;override fun maxIntrinsicHeight(w:Int)=0
}
fun Row(modifier:TooltipModifier,horizontalArrangement:Arrangement.Horizontal,verticalAlignment:Alignment.Vertical,content:()->Unit){
 TooltipEmission.emit(TooltipEmission.wrap("button",modifier,ButtonRow(TooltipEmission.children(content),horizontalArrangement,verticalAlignment)))
}
fun buttonTree(height:Int,rtl:Boolean,text:TooltipInput,leading:Boolean,trailing:Boolean,c:Constraints):Placeable{
 Host.rtl=rtl
 val padding=ButtonDefaults.contentPaddingFor(height.dp,leading,trailing)
 val content:()->Unit={
  val icon=ButtonDefaults.iconSizeFor(height.dp).roundToPx()
  val gap=ButtonDefaults.iconSpacingFor(height.dp).roundToPx()
  if(leading){TooltipEmission.emit(TooltipLeaf("leading",TooltipInput(icon,icon)));TooltipEmission.emit(TooltipLeaf("leading-gap",TooltipInput(gap,0)))}
  TooltipEmission.emit(TooltipLeaf("text",text))
  if(trailing){TooltipEmission.emit(TooltipLeaf("trailing-gap",TooltipInput(gap,0)));TooltipEmission.emit(TooltipLeaf("trailing",TooltipInput(icon,icon)))}
 }
 val root=TooltipEmission.children{nativeButtonContent(padding,content)}.single()
 return root.measure(c)
}
fun main(args:Array<String>){
 val sizes=listOf(32,40,56,96,136)
 val defaults=sizes.map{height->val p=ButtonDefaults.contentPaddingFor(height.dp);"{\"height\":$height,\"start\":${p.calculateLeftPadding(LayoutDirection.Ltr).roundToPx()},\"end\":${p.calculateRightPadding(LayoutDirection.Ltr).roundToPx()},\"vertical\":${p.calculateTopPadding().roundToPx()},\"icon\":${ButtonDefaults.iconSizeFor(height.dp).roundToPx()},\"gap\":${ButtonDefaults.iconSpacingFor(height.dp).roundToPx()},\"minWidth\":${ButtonDefaults.MinWidth.roundToPx()}}"}
 val cases=mutableListOf<String>()
 if(args.isNotEmpty()){
  for(line in java.io.File(args[0]).readLines().filter{it.isNotBlank()}){
   val v=line.split(',').map{it.toInt()};val root=buttonTree(v[0],v[1]==1,TooltipInput(v[5],v[6],v[7],v[8]),v[2]==1,v[3]==1,Constraints(0,Constraints.Infinity,v[0],Constraints.Infinity))
   cases.add("{${tooltipOutput(root)}}")
  }
 }else for(height in sizes)for(rtl in listOf(false,true))for(leading in listOf(false,true))for(trailing in listOf(false,true))for(text in listOf(TooltipInput(0,20,15),TooltipInput(72,20,15),TooltipInput(190,40,15,35),TooltipInput(81,51,17,47))){
  val root=buttonTree(height,rtl,text,leading,trailing,Constraints(0,Constraints.Infinity,height,Constraints.Infinity))
  cases.add("{\"height\":$height,\"rtl\":$rtl,\"leading\":$leading,\"trailing\":$trailing,\"text\":${text.json()},${tooltipOutput(root)}}")
 }
 println("{\"defaults\":${defaults.joinToString(prefix="[",postfix="]")},\"cases\":${cases.joinToString(prefix="[",postfix="]")}}")
}
