/** Test host for original NodeCoordinator/InnerNodeCoordinator traversal. */
package androidx.compose.foundation

internal object Nodes {const val Layout=1}
internal annotation class ExperimentalComposeUiApi
internal object ComposeUiFlags {var isSkipNonImportantSemanticsNodesHitTestEnabled=false}
internal class TreeLayoutNode(val outerCoordinator:TreeCoordinator){var isPlaced=true;val zSortedChildren=mutableListOf<TreeLayoutNode>()}
fun <T> List<T>.reversedAny(predicate:(T)->Boolean):Boolean{for(i in lastIndex downTo 0)if(predicate(this[i]))return true;return false}
internal class TreeHitSource{
 fun entityType()=0
 fun shouldHitTest(node:Modifier.Node)=true
 fun shouldHitTestChildren(node:TreeLayoutNode)=true
 fun interceptOutOfBoundsChildEvents(node:Modifier.Node)=false
 fun shareWithSiblings(result:HitTestResult,child:TreeLayoutNode):Boolean{if(child.outerCoordinator.share){result.acceptHits();return true};return false}
 fun childHitTest(child:TreeLayoutNode,p:Offset,result:HitTestResult,type:PointerType,inLayer:Boolean){child.outerCoordinator.hitTest(this,child.outerCoordinator.fromParentPosition(p),result,type,inLayer)}
}
internal open class TreeCoordinatorHost(val id:String,val measuredWidth:Int,val measuredHeight:Int,val radius:Float,val x:Float=0f,val y:Float=0f,val density:Float=1f,val target:Float=48f,val pointer:Boolean=true,val clipping:Boolean=true,val share:Boolean=false){
 val minimumTouchTargetSize=Size(target*density,target*density)
 val useOutline=true
 val lastOutlineBounds=Rect(0f,0f,measuredWidth.toFloat(),measuredHeight.toFloat())
 val isClipping=clipping
 val layer:ClipLayer?=if(clipping)ClipLayer(Outline.Rounded(RoundRect(0f,0f,measuredWidth.toFloat(),measuredHeight.toFloat(),CornerRadius(radius))))else null
 val node=Modifier.Node(id)
 var wrapped:TreeCoordinator?=null
 fun head(kind:Int):Modifier.Node?=if(pointer)node else null
 fun Modifier.Node.nextUntil(kind:Int,stop:Int):Modifier.Node?=null
 // Normal pointer leaves have zero explicit stylus bounds expansion. The
 // separate native minimum-target path remains original in TreeCoordinator.
 fun Modifier.Node?.isInExpandedTouchBounds(p:Offset,type:PointerType)=false
 open fun hitTestChild(source:TreeHitSource,p:Offset,result:HitTestResult,type:PointerType,inLayer:Boolean){}
 fun fromParentPosition(p:Offset)=Offset(p.x-x,p.y-y)
 fun shouldSharePointerInputWithSiblings()=share
}
fun main(){
 val out=mutableListOf<String>()
 fun tree(n:TreeCoordinator):String{
  val children=if(n is TreeInnerCoordinator)n.layoutNode.zSortedChildren.map{it.outerCoordinator}else emptyList()
  return "{\"id\":\"${n.id}\",\"width\":${n.measuredWidth},\"height\":${n.measuredHeight},\"radius\":${n.radius},\"x\":${n.x},\"y\":${n.y},\"density\":${n.density},\"target\":${n.target},\"pointer\":${n.pointer},\"clipping\":${n.clipping},\"share\":${n.share},\"inner\":${n is TreeInnerCoordinator},\"wrapped\":${n.wrapped?.let{tree(it)}?:"null"},\"children\":[${children.joinToString{tree(it)}}]}"
 }
 fun record(label:String,root:TreeCoordinator,p:Offset,type:PointerType,disabledLeaf:Boolean=false){
  val result=HitTestResult();root.hitTest(TreeHitSource(),p,result,type,true)
  val geometries=mutableMapOf<String,Pair<TreeCoordinator,Offset>>()
  fun collect(n:TreeCoordinator,position:Offset){geometries[n.id]=Pair(n,position);n.wrapped?.let{collect(it,it.fromParentPosition(position))};if(n is TreeInnerCoordinator)n.layoutNode.zSortedChildren.forEach{collect(it.outerCoordinator,it.outerCoordinator.fromParentPosition(position))}}
  collect(root,p)
  val routed=result.map{it.id};val nodes=routed.associateWith{ClickableNode(null,null,true,!disabledLeaf||it!=routed.last(),null,null,{})}
  for(up in listOf(false,true)){
   var consumed=false
   val changes=routed.associateWith{PointerInputChange(geometries[it]!!.second,type,up,!up)}
   for(id in routed.reversed()){
    val geometry=geometries[id]!!;val change=changes[id]!!;change.isConsumed=consumed
    nodes[id]!!.onPointerEvent(PointerEvent(listOf(change),PointerButtons(true)),PointerEventPass.Main,IntSize(geometry.first.measuredWidth,geometry.first.measuredHeight));consumed=change.isConsumed
   }
   for(id in routed){val geometry=geometries[id]!!;val change=changes[id]!!;change.isConsumed=consumed;nodes[id]!!.onPointerEvent(PointerEvent(listOf(change),PointerButtons(true)),PointerEventPass.Final,IntSize(geometry.first.measuredWidth,geometry.first.measuredHeight));consumed=change.isConsumed}
  }
  out.add("{\"label\":\"$label\",\"tree\":${tree(root)},\"type\":\"$type\",\"x\":${p.x},\"y\":${p.y},\"disabledLeaf\":$disabledLeaf,\"path\":[${result.joinToString{ "\"${it.id}\"" }}],\"direct\":${result.hasHit()},\"activation\":{${nodes.entries.joinToString{"\"${it.key}\":${it.value.clicks}"}}}}")
 }
 for(flag in listOf(false,true)){ComposeUiFlags.isSkipNonImportantSemanticsNodesHitTestEnabled=flag
  for(family in listOf(Triple("checkbox",IntSize(18,18),0f),Triple("radio",IntSize(24,24),0f),Triple("switch",IntSize(52,32),0f),Triple("fab",IntSize(40,40),12f))){
   val w=family.second.width.toFloat();val h=family.second.height.toFloat()
  for(rootClip in listOf(false,true))for(childClip in listOf(false,true))for(density in listOf(1f,2f))for(reverse in listOf(false,true))for(type in PointerType.values())for(px in listOf(-16f,-4f,0f,w/2,w-1,w,w+1,w+6,w+9,w+11,w+12,w*1.5f+12,w*2+11,w*2+12,w*2+16,w*2+28)){
   val root=TreeInnerCoordinator("root",maxOf(70,family.second.width*2+12),48,0f,pointer=false,clipping=rootClip,density=density)
   val a=TreeCoordinator("a",family.second.width,family.second.height,family.third,x=0f,y=(48-h)/2,clipping=childClip,density=density)
   val b=TreeCoordinator("b",family.second.width,family.second.height,family.third,x=w+12,y=(48-h)/2,clipping=childClip,density=density)
   val children=if(reverse)listOf(b,a)else listOf(a,b);root.layoutNode.zSortedChildren.addAll(children.map{TreeLayoutNode(it)})
   record("siblings/${family.first}/$flag/$rootClip/$childClip/$density/$reverse",root,Offset(px,24f),type)
  }
  }
  for(disabledLeaf in listOf(false,true))for(type in PointerType.values())for(px in listOf(10f,15f,15.5f,16f,16.5f,17f,26f,34.5f,35f,35.5f,36f,40f)){
   val root=TreeCoordinator("row",400,56,4f)
   val inner=TreeInnerCoordinator("inner",400,56,0f,pointer=false,clipping=false);root.wrapped=inner
   inner.layoutNode.zSortedChildren.add(TreeLayoutNode(TreeCoordinator("checkbox",18,18,0f,x=17f,y=19f,clipping=false)))
   record("ancestor/$flag",root,Offset(px,28f),type,disabledLeaf)
  }
 }
 println(out.joinToString(prefix="[",postfix="]"))
}
