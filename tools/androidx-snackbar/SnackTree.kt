package androidx.compose.material3

// Only leaf dimensions/baselines, node wiring and scheduling are supplied here.
// Modifier baseline queries run the original coordinator get/placement bodies.
class SnackLinePlaceable(id:String,result:MeasureResult,c:Constraints):Placeable(id,result,c){
 lateinit var coordinator:NodeCoordinator
 override fun get(line:AlignmentLine)=coordinator[line]
 override fun placeAt(position:IntOffset,zIndex:Float,layerBlock:(GraphicsLayerScope.()->Unit)?){coordinator.position=position;super.placeAt(position,zIndex,layerBlock)}
}
fun snackLinePlaceable(id:String,result:MeasureResult,c:Constraints,child:SnackLinePlaceable?=null):SnackLinePlaceable{
 val p=SnackLinePlaceable(id,result,c);val coordinator=NodeCoordinator(result,p.apparentToRealOffset);p.coordinator=coordinator
 if(child==null){Owner(coordinator)}else{
  coordinator.wrapped=child.coordinator;child.coordinator.wrappedBy=coordinator
  coordinator.placement={val saved=Host.origin;Host.origin=IntOffset.Zero;with(Placeable.PlacementScope(result.width,IntOffset.Zero)){resultPlace(result)};Host.origin=saved}
 }
 return p
}
class SnackText(val input:SnackInput):Measurable{
 override fun measure(c:Constraints):Placeable{
  val lines=mutableMapOf<AlignmentLine,Int>();if(input.first!=null)lines[FirstBaseline]=input.first;if(input.last!=null)lines[LastBaseline]=input.last
  return snackLinePlaceable("text",Scope.layout(if(input.required)input.width else c.constrainWidth(input.width),if(input.required)input.height else c.constrainHeight(input.height),lines){},c)
 }
 override fun minIntrinsicWidth(h:Int)=input.width;override fun maxIntrinsicWidth(h:Int)=input.width
 override fun minIntrinsicHeight(w:Int)=input.height;override fun maxIntrinsicHeight(w:Int)=input.height
}
class SnackPads(val start:Int=0,val top:Int=0,val end:Int=0,val bottom:Int=0):PaddingValues{
 override fun calculateLeftPadding(d:LayoutDirection)=(if(d==LayoutDirection.Rtl)end else start).dp
 override fun calculateRightPadding(d:LayoutDirection)=(if(d==LayoutDirection.Rtl)start else end).dp
 override fun calculateTopPadding()=top.dp;override fun calculateBottomPadding()=bottom.dp
}
class SnackOffset(val first:Boolean):LayoutModifierNode{
 override fun MeasureScope.measure(measurable:Measurable,constraints:Constraints)=nativeBaseline(constraints,measurable,if(first)FirstBaseline else LastBaseline,if(first)30.dp else Dp.Unspecified,if(first)Dp.Unspecified else 12.dp)
}
class SnackLineWrap(val id:String,val node:LayoutModifierNode,val child:Measurable):Measurable{
 override fun measure(c:Constraints):Placeable{
  lateinit var p:SnackLinePlaceable
  val tap=object:Measurable by child{override fun measure(c:Constraints)=child.measure(c).also{p=it as SnackLinePlaceable}}
  return snackLinePlaceable(id,with(node){with(Scope){measure(tap,c)}},c,p)
 }
 override fun minIntrinsicWidth(h:Int)=0;override fun maxIntrinsicWidth(h:Int)=0
 override fun minIntrinsicHeight(w:Int)=0;override fun maxIntrinsicHeight(w:Int)=0
}
class SnackActionRow(val action:SnackInput?,val dismiss:SnackInput?):Measurable{
 override fun measure(c:Constraints):Placeable{
  val children=mutableListOf<Measurable>();if(action!=null)children.add(SnackLeaf("action",action));if(dismiss!=null)children.add(SnackLeaf("dismissAction",dismiss))
  val policy=RowMeasurePolicy(Arrangement.Start,Alignment.Top)
  return Placeable("action-row",with(policy){with(Scope){measure(children,c)}},c)
 }
 override fun minIntrinsicWidth(h:Int)=0;override fun maxIntrinsicWidth(h:Int)=0
 override fun minIntrinsicHeight(w:Int)=0;override fun maxIntrinsicHeight(w:Int)=0
}
class SnackEnd(val child:Measurable):Measurable by child{
 override val parentData:Any?=RowColumnParentData(crossAxisAlignment=CrossAxisAlignment.horizontal(Alignment.End))
 override fun measure(c:Constraints)=child.measure(c).also{it.parentData=parentData}
}
class SnackColumn(val children:List<Measurable>):Measurable{
 override fun measure(c:Constraints):Placeable{val policy=ColumnMeasurePolicy(Arrangement.Top,Alignment.Start);return Placeable("column",with(policy){with(Scope){measure(children,c)}},c)}
 override fun minIntrinsicWidth(h:Int)=0;override fun maxIntrinsicWidth(h:Int)=0
 override fun minIntrinsicHeight(w:Int)=0;override fun maxIntrinsicHeight(w:Int)=0
}
fun snackNewLine(c:Constraints,text:SnackInput,action:SnackInput?,dismiss:SnackInput?):Placeable{
 val t=SnackLineWrap("first-padding",SnackOffset(true),SnackLineWrap("last-padding",SnackOffset(false),SnackLineWrap("text-end",PaddingValuesModifier(SnackPads(end=8)),SnackText(text))))
 val row=SnackEnd(Wrapped("action-end",PaddingValuesModifier(SnackPads(end=if(dismiss==null)8 else 0)),SnackActionRow(action,dismiss)))
 val tree=Wrapped("snackbar",SizeNode(maxWidth=600.dp,enforceIncoming=true),Wrapped("fill",FillNode(Direction.Horizontal,1f),Wrapped("outer-padding",PaddingValuesModifier(SnackPads(start=16,bottom=2)),SnackColumn(listOf(t,row)))))
 return tree.measure(c)
}
class SnackOneRow(val text:SnackInput,val action:SnackInput?,val dismiss:SnackInput?):Measurable{
 override fun measure(c:Constraints):Placeable{
  val children=mutableListOf<Measurable>(SnackLeaf("text",text));if(action!=null)children.add(SnackLeaf("action",action));if(dismiss!=null)children.add(SnackLeaf("dismissAction",dismiss))
  return Placeable("row",with(Scope){nativeRow(children,c)},c)
 }
 override fun minIntrinsicWidth(h:Int)=0;override fun maxIntrinsicWidth(h:Int)=0
 override fun minIntrinsicHeight(w:Int)=0;override fun maxIntrinsicHeight(w:Int)=0
}
fun snackOneRowTree(c:Constraints,text:SnackInput,action:SnackInput?,dismiss:SnackInput?)=
 Wrapped("snackbar",PaddingValuesModifier(SnackPads(start=16,end=if(dismiss==null)8 else 0)),SnackOneRow(text,action,dismiss)).measure(c)
fun snackPresenter(c:Constraints,text:SnackInput,action:SnackInput?,dismiss:SnackInput?,newLine:Boolean):Placeable{
 val content=object:Measurable{
  override fun measure(c:Constraints)=if(newLine&&action!=null)snackNewLine(c,text,action,dismiss)else snackOneRowTree(c,text,action,dismiss)
  override fun minIntrinsicWidth(h:Int)=0;override fun maxIntrinsicWidth(h:Int)=0
  override fun minIntrinsicHeight(w:Int)=0;override fun maxIntrinsicHeight(w:Int)=0
 }
 return Wrapped("presentation",PaddingValuesModifier(SnackPads(12,12,12,12)),content).measure(c)
}
