package androidx.compose.material3

// Composition emission, density=1 and already shaped leaves are explicit hosts.
// The source Row/Box, SizeNode, defaultMinSize, Padding and Spacer policy run.
data class ToggleLayoutSize(val height:Dp)
fun TooltipModifier.defaultMinSize(minHeight:Dp)=then(TooltipModifier(listOf("default-min" to UnspecifiedConstraintsNode(minHeight=minHeight))))
fun TooltipModifier.size(size:Dp)=then(TooltipModifier(listOf("size" to SizeNode(minWidth=size,maxWidth=size,minHeight=size,maxHeight=size,enforceIncoming=true))))
fun TooltipModifier.width(width:Dp)=then(TooltipModifier(listOf("size" to SizeNode(minWidth=width,maxWidth=width,enforceIncoming=true))))
class ToggleIconBox(val children:List<Measurable>,val alignment:Alignment,val propagate:Boolean):Measurable{
 override fun measure(c:Constraints):Placeable{
  val measured=mutableListOf<TooltipPlaceable>()
  val taps=children.map{child->object:Measurable by child{override fun measure(c:Constraints)=child.measure(c).also{measured.add(it as TooltipPlaceable)}}}
  val policy=BoxMeasurePolicy(alignment,propagate)
  return tooltipPlaceable("icon-box",with(policy){with(Scope){measure(taps,c)}},c,children=measured)
 }
 override fun minIntrinsicWidth(h:Int)=0;override fun maxIntrinsicWidth(h:Int)=0
 override fun minIntrinsicHeight(w:Int)=0;override fun maxIntrinsicHeight(w:Int)=0
}
fun Box(modifier:TooltipModifier,contentAlignment:Alignment,propagateMinConstraints:Boolean,content:()->Unit){
 TooltipEmission.emit(TooltipEmission.wrap("icon",modifier,ToggleIconBox(TooltipEmission.children(content),contentAlignment,propagateMinConstraints)))
}
class ToggleSpacer:Measurable{
 override fun measure(c:Constraints)=tooltipPlaceable("spacer",with(SpacerMeasurePolicy){with(Scope){measure(emptyList(),c)}},c)
 override fun minIntrinsicWidth(h:Int)=0;override fun maxIntrinsicWidth(h:Int)=0
 override fun minIntrinsicHeight(w:Int)=0;override fun maxIntrinsicHeight(w:Int)=0
}
fun Spacer(modifier:TooltipModifier){TooltipEmission.emit(TooltipEmission.wrap("spacer",modifier,ToggleSpacer()))}
fun toggleTree(height:Int,rtl:Boolean,c:Constraints,icon:List<TooltipInput>?,content:List<TooltipInput>):Placeable{
 Host.rtl=rtl
 val root=TooltipEmission.children{
  nativeToggleContent(ToggleLayoutSize(height.dp),ToggleLayoutDefaults.contentPaddingFor(height.dp,icon!=null),ButtonDefaults.iconSizeFor(height.dp),ButtonDefaults.iconSpacingFor(height.dp),icon?.let{{it.forEachIndexed{i,p->TooltipEmission.emit(TooltipLeaf("icon-$i",p))}}}){
   content.forEachIndexed{i,p->TooltipEmission.emit(TooltipLeaf("content-$i",p))}
  }
 }.single()
 return root.measure(c)
}
fun parseLeaves(text:String):List<TooltipInput>?=if(text=="-")null else if(text.isEmpty())emptyList() else text.split(';').map{item->val v=item.split(',').map{it.toInt()};TooltipInput(v[0],v[1],required=v[2]==1)}
fun main(args:Array<String>){
 val cases=mutableListOf<String>()
 if(args.isNotEmpty()){
  for(line in java.io.File(args[0]).readLines().filter{it.isNotBlank()}){
   val sections=line.split('|');val h=sections[0].split(',').map{it.toInt()}
   cases.add("{${tooltipOutput(toggleTree(h[0],h[1]==1,Constraints(h[2],h[3],h[4],h[5]),parseLeaves(sections[1]),parseLeaves(sections[2])!!))}}")
  }
 }else{
  val bounds=listOf(Constraints(0,0,0,0),Constraints(0,17,0,17),Constraints(0,33,0,21),Constraints(0,73,0,41),Constraints(0,220,0,80),Constraints(20,160,20,99),Constraints(199,301,64,99),Constraints.fixed(250,70),Constraints(0,Constraints.Infinity,0,Constraints.Infinity))
  val contents=listOf(emptyList(),listOf(TooltipInput(0,20)),listOf(TooltipInput(72,20)),listOf(TooltipInput(190,40)),listOf(TooltipInput(81,51)),listOf(TooltipInput(300,99,required=true)),listOf(TooltipInput(33,12),TooltipInput(72,31)))
  val icons=listOf(null,emptyList(),listOf(TooltipInput(7,9)),listOf(TooltipInput(60,47)),listOf(TooltipInput(61,47,required=true)),listOf(TooltipInput(7,9),TooltipInput(13,17)))
  for(height in listOf(32,40,56,96,136))for(rtl in listOf(false,true))for(c in bounds)for(icon in icons)for(content in contents){
   val root=toggleTree(height,rtl,c,icon,content)
   cases.add("{\"input\":{\"height\":$height,\"rtl\":$rtl,\"constraints\":${tooltipBounds(c)},\"icon\":${tooltipInputs(icon)},\"content\":${tooltipInputs(content)}},${tooltipOutput(root)}}")
  }
 }
 println("{\"cases\":${cases.joinToString(prefix="[",postfix="]")}}")
}
