package androidx.compose.material3

// Compose emission, density1, text/control leaves and drawing-only values are
// hosts. Actual Box/Column/modifier/constraint/alignment bodies run separately.
@Target(AnnotationTarget.FUNCTION,AnnotationTarget.TYPE)
annotation class Composable
interface Shape
object DefaultShape:Shape
class Matrix
class Local<T>(val current:T){infix fun provides(value:T)=value}
fun <T> remember(vararg keys:Any?,calculation:()->T)=calculation()
fun <T> mutableStateOf(value:T)=Value(value)
val LocalLayoutDirection get()=Local(if(Host.rtl)LayoutDirection.Rtl else LayoutDirection.Ltr)
class WindowInfo(val containerSize:IntSize=IntSize(960,800))
val LocalWindowInfo=Local(WindowInfo())
val LocalContentColor=Local(0)
val LocalTextStyle=Local(0)
class StyleToken{val value=0}
object PlainTooltipTokens{val SupportingTextFont=StyleToken()}
object RichTooltipTokens{
 val ActionLabelTextFont=StyleToken();val SubheadFont=StyleToken();val SupportingTextFont=StyleToken()
 val ContainerElevation=3.dp
}
object ElevationTokens{val Level0=0.dp}
data class RichTooltipColors(val containerColor:Int=0,val contentColor:Int=0,val titleContentColor:Int=0,val actionContentColor:Int=0)
interface TooltipScope{fun obtainAnchorBounds():Any?=null;fun obtainPositionProvider():Any?=null}
object LayoutTooltipScope:TooltipScope
class TooltipCaretShape(matrix:Value<Matrix>,shape:Shape,caret:Shape):Shape
fun TooltipModifier.layoutCaret(matrix:Value<Matrix>,window:IntSize,anchor:()->Any?,position:Any?,direction:LayoutDirection)=this
fun CompositionLocalProvider(vararg values:Int,content:()->Unit)=content()

open class TooltipModifier(val nodes:List<Pair<String,LayoutModifierNode>> = emptyList()){
 companion object:TooltipModifier()
 fun then(other:TooltipModifier)=TooltipModifier(nodes+other.nodes)
}
class TooltipPads(val start:Int=0,val top:Int=0,val end:Int=0,val bottom:Int=0):PaddingValues{
 override fun calculateLeftPadding(d:LayoutDirection)=(if(d==LayoutDirection.Rtl)end else start).dp
 override fun calculateRightPadding(d:LayoutDirection)=(if(d==LayoutDirection.Rtl)start else end).dp
 override fun calculateTopPadding()=top.dp;override fun calculateBottomPadding()=bottom.dp
}
fun PaddingValues(horizontal:Dp,vertical:Dp)=TooltipPads(horizontal.roundToPx(),vertical.roundToPx(),horizontal.roundToPx(),vertical.roundToPx())
fun TooltipModifier.padding(horizontal:Dp=0.dp,vertical:Dp=0.dp,bottom:Dp=vertical)=then(TooltipModifier(listOf("padding" to PaddingValuesModifier(TooltipPads(horizontal.roundToPx(),vertical.roundToPx(),horizontal.roundToPx(),bottom.roundToPx())))))
fun TooltipModifier.padding(values:PaddingValues)=then(TooltipModifier(listOf("padding" to PaddingValuesModifier(values))))
fun TooltipModifier.sizeIn(minWidth:Dp=Dp.Unspecified,maxWidth:Dp=Dp.Unspecified,minHeight:Dp=Dp.Unspecified,maxHeight:Dp=Dp.Unspecified)=then(TooltipModifier(listOf("size" to SizeNode(minWidth=minWidth,maxWidth=maxWidth,minHeight=minHeight,maxHeight=maxHeight,enforceIncoming=true))))
fun TooltipModifier.requiredHeightIn(min:Dp)=then(TooltipModifier(listOf("required-size" to SizeNode(minHeight=min,enforceIncoming=false))))
class TooltipBaseline(val top:Dp):LayoutModifierNode{
 override fun MeasureScope.measure(measurable:Measurable,constraints:Constraints)=tooltipNativeBaseline(constraints,measurable,FirstBaseline,top,Dp.Unspecified)
}
fun TooltipModifier.paddingFromBaseline(top:Dp)=then(TooltipModifier(listOf("baseline" to TooltipBaseline(top))))

data class TooltipInput(val width:Int,val height:Int,val first:Int?=null,val last:Int?=first,val required:Boolean=false){
 fun json()="{\"width\":$width,\"height\":$height,\"first\":${first?:"null"},\"last\":${last?:"null"},\"required\":$required}"
}
class TooltipPlaceable(id:String,result:MeasureResult,c:Constraints):Placeable(id,result,c){
 lateinit var coordinator:NodeCoordinator
 lateinit var owner:Owner
 override fun get(line:AlignmentLine)=coordinator[line]
 override fun placeAt(position:IntOffset,zIndex:Float,layerBlock:(GraphicsLayerScope.()->Unit)?){coordinator.position=position;super.placeAt(position,zIndex,layerBlock)}
}
fun tooltipPlaceable(id:String,result:MeasureResult,c:Constraints,wrapped:TooltipPlaceable?=null,children:List<TooltipPlaceable> = emptyList()):TooltipPlaceable{
 val p=TooltipPlaceable(id,result,c);val coordinator=NodeCoordinator(result,p.apparentToRealOffset);p.coordinator=coordinator
 if(wrapped!=null){
  coordinator.wrapped=wrapped.coordinator;wrapped.coordinator.wrappedBy=coordinator;p.owner=wrapped.owner;p.owner.outer=coordinator
  coordinator.placement={val saved=Host.origin;Host.origin=IntOffset.Zero;with(Placeable.PlacementScope(result.width,IntOffset.Zero)){resultPlace(result)};Host.origin=saved}
 }else{
  p.owner=Owner(coordinator)
  for(child in children){child.owner.outer.wrappedBy=coordinator;child.owner.parentAlignmentLinesOwner=p.owner;p.owner.children.add(child.owner)}
  p.owner.placement={val saved=Host.origin;Host.origin=IntOffset.Zero;with(Placeable.PlacementScope(result.width,IntOffset.Zero)){resultPlace(result)};Host.origin=saved}
 }
 return p
}
class TooltipLeaf(val id:String,val input:TooltipInput):Measurable{
 override fun measure(c:Constraints):Placeable{
  TooltipBrowserConstraints[id]?.let{check(tooltipBounds(c)==it){"$id: native ${tooltipBounds(c)} != Chromium $it"}}
  val lines=mutableMapOf<AlignmentLine,Int>();input.first?.let{lines[FirstBaseline]=it};input.last?.let{lines[LastBaseline]=it}
  return tooltipPlaceable(id,Scope.layout(if(input.required)input.width else c.constrainWidth(input.width),if(input.required)input.height else c.constrainHeight(input.height),lines){},c)
 }
 override fun minIntrinsicWidth(h:Int)=input.width;override fun maxIntrinsicWidth(h:Int)=input.width
 override fun minIntrinsicHeight(w:Int)=input.height;override fun maxIntrinsicHeight(w:Int)=input.height
}
class TooltipWrap(val id:String,val node:LayoutModifierNode,val child:Measurable):Measurable{
 override fun measure(c:Constraints):Placeable{
  lateinit var p:TooltipPlaceable
  val tap=object:Measurable by child{override fun measure(c:Constraints)=child.measure(c).also{p=it as TooltipPlaceable}}
  return tooltipPlaceable(id,with(node){with(Scope){measure(tap,c)}},c,p)
 }
 override fun minIntrinsicWidth(h:Int)=0;override fun maxIntrinsicWidth(h:Int)=0
 override fun minIntrinsicHeight(w:Int)=0;override fun maxIntrinsicHeight(w:Int)=0
}
class TooltipBox(val id:String,val children:List<Measurable>,val propagate:Boolean):Measurable{
 override fun measure(c:Constraints):Placeable{
  val measured=mutableListOf<TooltipPlaceable>()
  val taps=children.map{child->object:Measurable by child{override fun measure(c:Constraints)=child.measure(c).also{measured.add(it as TooltipPlaceable)}}}
  val policy=BoxMeasurePolicy(Alignment.TopStart,propagate)
  val result=with(policy){with(Scope){measure(taps,c)}}
  return tooltipPlaceable(id,result,c,children=measured)
 }
 override fun minIntrinsicWidth(h:Int)=0;override fun maxIntrinsicWidth(h:Int)=0
 override fun minIntrinsicHeight(w:Int)=0;override fun maxIntrinsicHeight(w:Int)=0
}
class TooltipColumn(val id:String,val children:List<Measurable>):Measurable{
 override fun measure(c:Constraints):Placeable{
  val measured=mutableListOf<TooltipPlaceable>()
  val taps=children.map{child->object:Measurable by child{override fun measure(c:Constraints)=child.measure(c).also{measured.add(it as TooltipPlaceable)}}}
  val policy=ColumnMeasurePolicy(Arrangement.Top,Alignment.Start)
  return tooltipPlaceable(id,with(policy){with(Scope){measure(taps,c)}},c,children=measured)
 }
 override fun minIntrinsicWidth(h:Int)=0;override fun maxIntrinsicWidth(h:Int)=0
 override fun minIntrinsicHeight(w:Int)=0;override fun maxIntrinsicHeight(w:Int)=0
}
object TooltipEmission{
 val stack=mutableListOf<MutableList<Measurable>>()
 var name="body"
 fun children(content:()->Unit):List<Measurable>{val nodes=mutableListOf<Measurable>();stack.add(nodes);content();stack.removeAt(stack.lastIndex);return nodes}
 fun emit(node:Measurable){stack.last().add(node)}
 fun wrap(id:String,modifier:TooltipModifier,content:Measurable):Measurable{
  var result=content
  for((index,pair) in modifier.nodes.withIndex().reversed())result=TooltipWrap(if(id=="tooltip"&&index==0)id else "$id-${pair.first}-$index",pair.second,result)
  return result
 }
}
fun Surface(modifier:TooltipModifier,shape:Shape,color:Int,tonalElevation:Dp,shadowElevation:Dp,content:()->Unit){
 val children=TooltipEmission.children(content)
 TooltipEmission.emit(TooltipEmission.wrap("tooltip",modifier,TooltipBox("surface",children,true)))
}
fun Box(modifier:TooltipModifier,content:()->Unit){
 val id=TooltipEmission.name
 TooltipEmission.emit(TooltipEmission.wrap(id,modifier,TooltipBox("$id-box",TooltipEmission.children(content),false)))
}
fun Column(modifier:TooltipModifier,content:()->Unit){TooltipEmission.emit(TooltipEmission.wrap("column",modifier,TooltipColumn("column",TooltipEmission.children(content))))}
fun emitTooltipLeaves(id:String,leaves:List<TooltipInput>){TooltipEmission.name=id;leaves.forEachIndexed{i,data->TooltipEmission.emit(TooltipLeaf("$id-$i",data))}}
fun tooltipTree(rich:Boolean,c:Constraints,maxWidth:Int,title:List<TooltipInput>?,text:List<TooltipInput>,action:List<TooltipInput>?):Placeable{
 // Name each source Box before invoking its lambda, not after it has emitted.
 TooltipEmission.name=if(rich&&title!=null)"title" else "body"
 val titleContent:(()->Unit)?=title?.let{{emitTooltipLeaves("title",it);TooltipEmission.name="body"}}
 val textContent:()->Unit={emitTooltipLeaves("body",text);TooltipEmission.name="action"}
 val actionContent:(()->Unit)?=action?.let{{emitTooltipLeaves("action",it)}}
 val root=TooltipEmission.children{with(LayoutTooltipScope){if(rich)RichTooltip(title=titleContent,action=actionContent,maxWidth=maxWidth.dp,text=textContent)else PlainTooltip(maxWidth=maxWidth.dp,content=textContent)}}.single()
 return root.measure(c)
}
fun tooltipOutput(root:Placeable):String{
 Host.boxes.clear();Host.origin=IntOffset.Zero
 with(Placeable.PlacementScope(0,IntOffset.Zero)){placeRoot(root)}
 val boxes=Host.boxes.entries.joinToString(prefix="{",postfix="}"){"\"${it.key}\":${it.value.json()}"}
 return "\"size\":${IntSize(root.width,root.height).json()},\"requested\":${root.measuredSize.json()},\"placements\":$boxes"
}
fun tooltipBounds(c:Constraints)="{\"minWidth\":${c.minWidth},\"maxWidth\":${c.maxWidth},\"minHeight\":${c.minHeight},\"maxHeight\":${c.maxHeight}}"
fun tooltipInputs(inputs:List<TooltipInput>?)=inputs?.joinToString(prefix="[",postfix="]"){it.json()}?:"null"
val TooltipBrowserConstraints=mutableMapOf<String,String>()
fun tooltipBrowserLeaves(text:String,id:String):List<TooltipInput>?{
 if(text=="-")return null
 if(text.isEmpty())return emptyList()
 return text.split(';').mapIndexed{index,item->
  val v=item.split(',').map{it.toInt()}
  TooltipBrowserConstraints["$id-$index"]=tooltipBounds(Constraints(v[5],v[6],v[7],v[8]))
  TooltipInput(v[0],v[1],v[2].takeUnless{it==Int.MIN_VALUE},v[3].takeUnless{it==Int.MIN_VALUE},v[4]==1)
 }
}
fun main(args:Array<String>){
 if(args.isNotEmpty()){
  val rows=java.io.File(args[0]).readLines().filter{it.isNotBlank()}.map{line->
   val sections=line.split('|');val head=sections[0].split(',').map{it.toInt()}
   TooltipBrowserConstraints.clear();Host.rtl=head[1]==1
   val title=tooltipBrowserLeaves(sections[1],"title")
   val text=tooltipBrowserLeaves(sections[2],"body")!!
   val action=tooltipBrowserLeaves(sections[3],"action")
   val root=tooltipTree(head[0]==1,Constraints(0,head[2],0,head[3]),head[4],title,text,action)
   "{${tooltipOutput(root)}}"
  }
  println(rows.joinToString(prefix="[",postfix="]"));return
 }
 val profiles=listOf(emptyList(),listOf(TooltipInput(0,0)),listOf(TooltipInput(72,20,15)),listOf(TooltipInput(181,40,15,35)),listOf(TooltipInput(710,110,18,98)),listOf(TooltipInput(151,99,20,80,true)),listOf(TooltipInput(49,27,12),TooltipInput(91,51,17,37)),listOf(TooltipInput(160,72,null),TooltipInput(0,0,0)))
 val titles=listOf(null,emptyList(),listOf(TooltipInput(63,20,15)),listOf(TooltipInput(610,60,18,58)),listOf(TooltipInput(13,61,9),TooltipInput(21,31,5)),listOf(TooltipInput(151,41,17,17,true)))
 val actions=listOf(null,emptyList(),listOf(TooltipInput(48,48,29)),listOf(TooltipInput(190,72,37)),listOf(TooltipInput(90,48,29),TooltipInput(161,40,24)),listOf(TooltipInput(211,77,null,null,true)))
 val bounds=listOf(Constraints(0,0,0,0),Constraints(0,17,0,17),Constraints(0,93,0,41),Constraints(0,301,0,80),Constraints(0,960,0,800),Constraints(20,160,20,99),Constraints(199,301,64,99),Constraints.fixed(250,70),Constraints(0,Constraints.Infinity,0,Constraints.Infinity))
 val records=mutableListOf<String>()
 for(rich in listOf(false,true))for(rtl in listOf(false,true))for(c in bounds)for(maximum in listOf(0,21,200,320,771))for(text in profiles)for(title in if(rich)titles else listOf(null))for(action in if(rich)actions else listOf(null)){
  Host.rtl=rtl
  val root=tooltipTree(rich,c,maximum,title,text,action)
  records.add("{\"input\":{\"rich\":$rich,\"rtl\":$rtl,\"constraints\":${tooltipBounds(c)},\"maxWidth\":$maximum,\"title\":${tooltipInputs(title)},\"text\":${tooltipInputs(text)},\"action\":${tooltipInputs(action)}},${tooltipOutput(root)}}")
 }
 println(records.joinToString(prefix="[",postfix="]"))
}
