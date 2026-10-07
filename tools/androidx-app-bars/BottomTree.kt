package androidx.compose.material3

data class BottomLeaf(val width:Int,val height:Int,val inkWidth:Int?=null,val inkHeight:Int?=null,val minimum:Float=48f,val weight:Float=0f,val fill:Boolean=true,val align:String="center",val line:Int?=null){
 fun json(id:String)="{\"id\":\"$id\",\"width\":$width,\"height\":$height,\"weight\":$weight,\"fill\":$fill,\"align\":\"$align\",\"line\":${line?:"null"}"+(if(inkWidth==null)"" else ",\"ink\":{\"width\":$inkWidth,\"height\":$inkHeight,\"minimum\":$minimum}")+"}"
}
class BottomChild(val id:String,val data:BottomLeaf):Measurable {
 override val parentData:Any?=parentData(LeafInput(data.width,data.height,data.weight,data.fill,data.line,data.align),false)
 override fun measure(c:Constraints):Placeable{
  val child=if(data.inkWidth==null)Leaf(id,LeafInput(data.width,data.height,line=data.line),false)else{
   MinimumHost.size=data.minimum
   Wrapped(id,MinimumInteractiveModifierNode(),Wrapped(id+"-body",SizeNode(minWidth=data.inkWidth.dp,maxWidth=data.inkWidth.dp,minHeight=data.inkHeight!!.dp,maxHeight=data.inkHeight.dp,enforceIncoming=true),Content(IntSize(24,24))))
  }
  return child.measure(c).also{it.parentData=parentData}
 }
 override fun minIntrinsicWidth(h:Int)=data.width;override fun minIntrinsicHeight(w:Int)=data.height
 override fun maxIntrinsicWidth(h:Int)=data.width;override fun maxIntrinsicHeight(w:Int)=data.height
}
class BottomParent(val child:Measurable,val weight:Float):Measurable by child{override val parentData:Any?=RowColumnParentData(weight,true,null)}
class BottomRow(val id:String,val children:List<Measurable>,val arrangement:Arrangement.Horizontal):Measurable{
 override fun measure(c:Constraints):Placeable{val policy=RowMeasurePolicy(arrangement,Alignment.CenterVertically);return Placeable(id,with(policy){with(Scope){measure(children,c)}},c)}
 override fun minIntrinsicWidth(h:Int)=0;override fun minIntrinsicHeight(w:Int)=0
 override fun maxIntrinsicWidth(h:Int)=0;override fun maxIntrinsicHeight(w:Int)=0
}
class PhysicalPads(val left:Float,val top:Float,val right:Float,val bottom:Float):PaddingValues{
 override fun calculateLeftPadding(d:LayoutDirection)=Dp(left);override fun calculateRightPadding(d:LayoutDirection)=Dp(right)
 override fun calculateTopPadding()=Dp(top);override fun calculateBottomPadding()=Dp(bottom)
}
fun bottomSourceTree(flexible:Boolean,actions:List<Measurable>,fabs:List<Measurable>,p:List<Float>,inset:List<Float>,name:String,height:Float=if(flexible)64f else 80f):Measurable{
 val arrangement=if(name=="fixed")Arrangement.spacedBy(32.dp,Alignment.CenterHorizontally)else horizontalArrangement(name)
 val children=if(flexible)actions+fabs else listOf(BottomParent(BottomRow("actions-row",actions,Arrangement.Start),1f))+(if(fabs.isEmpty())emptyList()else listOf(Wrapped("fab-fill",FillNode(Direction.Vertical,1f),Wrapped("fab-padding",PaddingValuesModifier(Pads(listOf(0f,8f,12f,0f))),NativeBox("fab-box",fabs)))))
 return Wrapped("bar",FillNode(Direction.Horizontal,1f),Wrapped("insets",PaddingValuesModifier(PhysicalPads(inset[0],inset[1],inset[2],inset[3])),Wrapped("content-height",SizeNode(minHeight=Dp(height),maxHeight=Dp(height),enforceIncoming=true),Wrapped("content-padding",PaddingValuesModifier(Pads(p)),BottomRow("content-row",children,arrangement)))))
}
fun main(){
 val profiles=listOf(
  Pair(emptyList<BottomLeaf>(),emptyList<BottomLeaf>()),
  Pair(listOf(BottomLeaf(48,48,40,40),BottomLeaf(48,48,40,40),BottomLeaf(48,48,40,40)),listOf(BottomLeaf(56,56,56,56))),
  Pair(listOf(BottomLeaf(49,49,32,40,49f),BottomLeaf(128,96,128,96)),listOf(BottomLeaf(48,48,40,40))),
  Pair(listOf(BottomLeaf(31,73,weight=1f),BottomLeaf(25,48,weight=2f,fill=false),BottomLeaf(17,32)),emptyList<BottomLeaf>()),
  Pair(listOf(BottomLeaf(35,31,align="start"),BottomLeaf(51,19,align="end")),listOf(BottomLeaf(111,56))),
  Pair(listOf(BottomLeaf(67,35,align="line",line=23),BottomLeaf(51,31,weight=1f,align="line",line=19)),listOf(BottomLeaf(96,96,96,96)))
 )
 val bounds=listOf(listOf(390,390,0,2147483647),listOf(199,199,0,200),listOf(160,160,48,48),listOf(0,0,0,0),listOf(17,17,0,17),listOf(301,301,99,140),listOf(0,390,0,80))
 val pads=listOf(listOf(4f,4f,4f,0f),listOf(16f,0f,16f,0f),listOf(0f,0f,0f,0f),listOf(7.5f,2.5f,19.5f,6.5f),listOf(40f,21f,60f,13f))
 val records=mutableListOf<String>()
 for(profile in profiles)for(b in bounds)for(p in pads)for(rtl in listOf(false,true))for(flexible in listOf(false,true))for(name in if(flexible)listOf("start","end","center","between","around","evenly","fixed")else listOf("start"))for(inset in listOf(listOf(0f,0f,0f,0f),listOf(7f,0f,13f,9f))){
  Host.rtl=rtl;Host.boxes.clear();Host.sizes.clear();LeafConstraints.values.clear()
  val actions=profile.first.mapIndexed{i,leaf->BottomChild("action$i",leaf)};val fabs=profile.second.mapIndexed{i,leaf->BottomChild("fab$i",leaf)}
  val root=bottomSourceTree(flexible,actions,fabs,p,inset,name)
  val result=root.measure(Constraints(b[0],b[1],b[2],b[3]));with(Placeable.PlacementScope(0,IntOffset.Zero)){placeRoot(result)}
  val positions=Host.boxes.filterKeys{it!="content"}.entries.joinToString(prefix="{",postfix="}"){(id,rect)->"\"$id\":${rect.json()}"}
  val constraints=LeafConstraints.values.entries.joinToString(prefix="{",postfix="}"){(id,c)->"\"$id\":{\"minWidth\":${c.minWidth},\"maxWidth\":${c.maxWidth},\"minHeight\":${c.minHeight},\"maxHeight\":${c.maxHeight}}"}
  records.add("{\"input\":{\"minWidth\":${b[0]},\"maxWidth\":${b[1]},\"minHeight\":${b[2]},\"maxHeight\":${b[3]},\"rtl\":$rtl,\"variant\":\"${if(flexible)"flexible" else "standard"}\",\"height\":${if(flexible)64 else 80},\"arrangement\":\"$name\",\"contentPadding\":{\"start\":${p[0]},\"top\":${p[1]},\"end\":${p[2]},\"bottom\":${p[3]}},\"insets\":{\"left\":${inset[0]},\"top\":${inset[1]},\"right\":${inset[2]},\"bottom\":${inset[3]}},\"actions\":${profile.first.mapIndexed{i,v->v.json("action$i")}.joinToString(prefix="[",postfix="]")},\"fabs\":${profile.second.mapIndexed{i,v->v.json("fab$i")}.joinToString(prefix="[",postfix="]")}},\"size\":${IntSize(result.width,result.height).json()},\"requested\":${result.measuredSize.json()},\"placements\":$positions,\"constraints\":$constraints}")
 }
 println(records.joinToString(prefix="[",postfix="]"))
}
