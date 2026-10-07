package androidx.compose.material3
data class TreeLeaf(val width:Int,val height:Int,val inkWidth:Int?=null,val inkHeight:Int?=null,val minimum:Float=48f,val weight:Float=0f,val fill:Boolean=true){
 fun json(id:String)="{\"id\":\"$id\",\"width\":$width,\"height\":$height,\"weight\":$weight,\"fill\":$fill"+(if(inkWidth==null)"" else ",\"ink\":{\"width\":$inkWidth,\"height\":$inkHeight,\"minimum\":$minimum}")+"}"
}
class TreeChild(val id:String,val data:TreeLeaf):Measurable{
 override val parentData:Any?=RowColumnParentData(data.weight,data.fill,null)
 override fun measure(c:Constraints):Placeable{
  val result=if(data.inkWidth==null)Slot(id,data.width,data.height,null).measure(c)else{
   MinimumHost.size=data.minimum
   Wrapped(id,MinimumInteractiveModifierNode(),Wrapped(id+"-body",SizeNode(minWidth=data.inkWidth.dp,maxWidth=data.inkWidth.dp,minHeight=data.inkHeight!!.dp,maxHeight=data.inkHeight.dp,enforceIncoming=true),Content(IntSize(24,24)))).measure(c)
  }
  result.parentData=parentData;return result
 }
 override fun minIntrinsicWidth(h:Int)=data.width;override fun minIntrinsicHeight(w:Int)=data.height
 override fun maxIntrinsicWidth(h:Int)=data.width;override fun maxIntrinsicHeight(w:Int)=data.height
}
class Named(val id:String,val child:Measurable):Measurable by child
class NativeBox(val id:String,val children:List<Measurable>):Measurable{
 override fun measure(c:Constraints):Placeable{val policy=BoxMeasurePolicy(Alignment.TopStart,false);return Placeable(id,with(policy){with(Scope){measure(children,c)}},c)}
 override fun minIntrinsicWidth(h:Int)=0;override fun minIntrinsicHeight(w:Int)=0
 override fun maxIntrinsicWidth(h:Int)=0;override fun maxIntrinsicHeight(w:Int)=0
}
class NativeColumn(val children:List<Measurable>,val alignment:String):Measurable{
 override fun measure(c:Constraints):Placeable{
  val align=when(alignment){"center"->Alignment.CenterHorizontally;"end"->Alignment.End;else->Alignment.Start}
  val policy=ColumnMeasurePolicy(Arrangement.Top,align)
  return Placeable("title-column",with(policy){with(Scope){measure(children,c)}},c)
 }
 override fun minIntrinsicWidth(h:Int)=0;override fun minIntrinsicHeight(w:Int)=0
 override fun maxIntrinsicWidth(h:Int)=0;override fun maxIntrinsicHeight(w:Int)=0
}
fun main(){
 val profiles=listOf(
  Triple(emptyList<TreeLeaf>(),emptyList<TreeLeaf>(),TreeLeaf(104,28)),
  Triple(listOf(TreeLeaf(48,48,40,40)),listOf(TreeLeaf(48,48,40,40),TreeLeaf(48,48,40,40)),TreeLeaf(104,28)),
  Triple(listOf(TreeLeaf(49,49,32,40,49f)),listOf(TreeLeaf(52,48,52,40),TreeLeaf(128,96,128,96)),TreeLeaf(188,36)),
  Triple(listOf(TreeLeaf(61,73),TreeLeaf(48,48)),listOf(TreeLeaf(24,32,weight=1f),TreeLeaf(35,48,weight=2f,fill=false)),TreeLeaf(301,56)),
  Triple(listOf(TreeLeaf(148,96,128,96)),listOf(TreeLeaf(19,48),TreeLeaf(244,72)),TreeLeaf(288,88)))
 val bounds=listOf(listOf(0,390,0,2147483647),listOf(0,390,0,200),listOf(0,199,0,63),listOf(160,160,48,48),listOf(0,0,0,0),listOf(0,17,0,17),listOf(49,301,32,99))
 val records=mutableListOf<String>()
 for(profile in profiles)for(b in bounds)for(rtl in listOf(false,true))for(alignment in listOf("start","center","end"))for(subtitle in listOf(false,true))for(vertical in listOf("center","bottom"))for(offset in listOf(0f,-.5f,-17.5f,-48f)){
  Host.rtl=rtl;Host.boxes.clear();Host.sizes.clear()
  val nav=profile.first.mapIndexed{i,p->TreeChild("nav$i",p)}
  val actions=profile.second.mapIndexed{i,p->TreeChild("action$i",p)}
  val title=if(subtitle)NativeColumn(listOf(NativeBox("headline-box",listOf(TreeChild("headline",profile.third))),NativeBox("subtitle-box",listOf(TreeChild("subtitle",TreeLeaf(86,20))))),alignment)else NativeBox("title-box",listOf(TreeChild("headline",profile.third)))
  val tree=listOf(
   Named("navigationIcon",Wrapped("navigationIcon",PaddingValuesModifier(Pads(listOf(4f,0f,0f,0f))),NativeBox("navigation-box",nav))),
   Named("actionIcons",Wrapped("actionIcons",PaddingValuesModifier(Pads(listOf(0f,0f,4f,0f))),NativeBox("actions-box",listOf(RowContent("actions-row",actions,false,"end"))))),
   Named("title",Wrapped("title",PaddingValuesModifier(Pads(listOf(4f,0f,4f,0f))),title)))
  val c=Constraints(b[0],b[1],b[2],b[3]);val policy=TopAppBarMeasurePolicy({offset},if(vertical=="bottom")Arrangement.Bottom else Arrangement.Center,when(alignment){"center"->Alignment.CenterHorizontally;"end"->Alignment.End;else->Alignment.Start},24,64.dp,Pads(listOf(0f,0f,0f,0f)))
  val root=Placeable("row",with(policy){with(Scope){measure(tree,c)}},c);with(Placeable.PlacementScope(0,IntOffset.Zero)){placeRoot(root)}
  val boxes=Host.boxes.filterKeys{it!="content"}.entries.joinToString(prefix="{",postfix="}"){(id,r)->"\"$id\":${r.json()}"}
  records.add("{\"input\":{\"minWidth\":${b[0]},\"maxWidth\":${b[1]},\"minHeight\":${b[2]},\"maxHeight\":${b[3]},\"rtl\":$rtl,\"height\":64,\"scrolledOffset\":$offset,\"alignment\":\"$alignment\",\"vertical\":\"$vertical\",\"titleBottomPadding\":24,\"subtitleProvided\":$subtitle,\"navigation\":${profile.first.mapIndexed{i,p->p.json("nav$i")}.joinToString(prefix="[",postfix="]")},\"actions\":${profile.second.mapIndexed{i,p->p.json("action$i")}.joinToString(prefix="[",postfix="]")},\"title\":[${profile.third.json("headline")}],\"subtitle\":[${TreeLeaf(86,20).json("subtitle")}]},\"size\":${IntSize(root.width,root.height).json()},\"requested\":${root.measuredSize.json()},\"placements\":$boxes}")
 }
 println(records.joinToString(prefix="[",postfix="]"))
}
