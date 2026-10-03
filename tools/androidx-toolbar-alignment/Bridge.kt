package androidx.compose.material3
import kotlin.math.*

data class Offset(val x:Float,val y:Float){operator fun plus(other:IntOffset)=Offset(x+other.x,y+other.y)}
class CoordinateLayer{fun mapOffset(p:Offset,inverse:Boolean)=p}
object LayoutNode{const val NotPlacedPlaceOrder=Int.MAX_VALUE}
interface AlignmentLinesOwner{
 val innerCoordinator:NodeCoordinator
 val parentAlignmentLinesOwner:AlignmentLinesOwner?
 val alignmentLines:AlignmentLines
 val placeOrder:Int
 fun forEachChildAlignmentLinesOwner(block:(AlignmentLinesOwner)->Unit)
 fun layoutChildren()
 fun requestLayout(){}
 fun requestMeasure(){}
}
// Coordinator/owner lifecycle, identity layers and deferred placement are host
// boundaries. Original get/transform/merging/override arithmetic is inserted.
interface LineGetter{operator fun get(alignmentLine:AlignmentLine):Int}
open class CoordinatorGet:LineGetter{
 open val hasMeasureResult=true
 open val apparentToRealOffset=IntOffset.Zero
 open fun calculateAlignmentLine(alignmentLine:AlignmentLine)=AlignmentLine.Unspecified
 // SOURCE_COORDINATOR_GET
}
class NodeCoordinator(val measureResult:MeasureResult,override val apparentToRealOffset:IntOffset=IntOffset.Zero):CoordinatorGet(){
 var position=IntOffset.Zero
 var wrappedBy:NodeCoordinator?=null
 var wrapped:NodeCoordinator?=null
 val child get()=wrapped
 var owner:Owner?=null
 var layer:CoordinateLayer?=null
 var isPlacedUnderMotionFrameOfReference=false
 var isShallowPlacing=false
 var isPlacingForAlignment=false
 var placement:()->Unit={}
 fun replace()=placement()
 override fun calculateAlignmentLine(alignmentLine:AlignmentLine):Int=if(wrapped!=null)calculateAlignmentAndPlaceChildAsNeeded(alignmentLine)else owner?.let{it.layoutChildren();it.alignmentLines.getLastCalculation()[alignmentLine]}?:AlignmentLine.Unspecified
 // SOURCE_PARENT_POSITION
}
typealias LookaheadCapablePlaceable=NodeCoordinator
class Owner(override val innerCoordinator:NodeCoordinator,val outer:NodeCoordinator=innerCoordinator):AlignmentLinesOwner{
 override var parentAlignmentLinesOwner:AlignmentLinesOwner?=null
 override val alignmentLines=LayoutNodeAlignmentLines(this)
 override var placeOrder=0
 val children=mutableListOf<Owner>()
 var placement:()->Unit={}
 init{innerCoordinator.owner=this}
 override fun forEachChildAlignmentLinesOwner(block:(AlignmentLinesOwner)->Unit)=children.forEach(block)
 override fun layoutChildren(){placement();if(alignmentLines.dirty)alignmentLines.recalculate()}
}
data class NativeInput(val width:Int,val height:Int,val weight:Float=0f,val fill:Boolean=true,val align:String="center",val native:Boolean=true){
 fun natural(vertical:Boolean)=LeafInput(if(vertical)maxOf(48,height)else maxOf(48,width),if(vertical)maxOf(48,width)else maxOf(48,height),weight,fill,align=align)
 fun json()="{\"width\":$width,\"height\":$height,\"weight\":$weight,\"fill\":$fill,\"align\":\"$align\",\"native\":$native}"
}
object RowOrigin{var value=IntOffset.Zero}
class NativeLeaf(val id:String,val input:NativeInput,val vertical:Boolean):Measurable{
 override val parentData:Any?=parentData(input.natural(vertical),vertical)
 lateinit var owner:Owner
 override fun measure(c:Constraints):Placeable{
  // Capture original modifier placement, not a hand-written body rectangle.
  val previous=Host.boxes.toMap();val previousOrigin=Host.origin
  Host.origin=IntOffset.Zero;Host.boxes.clear()
  val touch=iconMeasure(c,input.width,input.height)
  with(Placeable.PlacementScope(0,IntOffset.Zero)){placeRoot(touch)}
  val ink=Host.boxes.getValue("body");val realTouch=Host.boxes.getValue("touch")
  Host.boxes.clear();Host.boxes.putAll(previous);Host.origin=previousOrigin
  val inner=NodeCoordinator(Scope.layout(ink.width,ink.height){})
  val body=NodeCoordinator(Scope.layout(ink.width,ink.height){})
  val outer=NodeCoordinator(touch.result,touch.apparentToRealOffset)
  inner.wrappedBy=body;body.wrapped=inner;body.wrappedBy=outer;outer.wrapped=body
  body.position=IntOffset(ink.x-realTouch.x,ink.y-realTouch.y)
  owner=Owner(inner,outer)
  val result=Scope.layout(touch.width,touch.height){
   outer.position=IntOffset(Host.origin.x-RowOrigin.value.x+touch.apparentToRealOffset.x,Host.origin.y-RowOrigin.value.y+touch.apparentToRealOffset.y)
   Host.boxes[id+"-touch"]=Rect(Host.origin.x+realTouch.x,Host.origin.y+realTouch.y,realTouch.width,realTouch.height)
   Host.boxes[id+"-body"]=Rect(Host.origin.x+ink.x,Host.origin.y+ink.y,ink.width,ink.height)
  }
  return object:Placeable(id,result,c){override fun get(line:AlignmentLine)=outer[line]}.also{it.parentData=parentData}
 }
 override fun minIntrinsicWidth(h:Int)=maxOf(48,input.width);override fun maxIntrinsicWidth(h:Int)=maxOf(48,input.width)
 override fun minIntrinsicHeight(w:Int)=maxOf(48,input.height);override fun maxIntrinsicHeight(w:Int)=maxOf(48,input.height)
}
class AlignedRow(val id:String,val inputs:List<NativeInput>,val vertical:Boolean):Measurable{
 lateinit var owner:Owner
 override fun measure(c:Constraints):Placeable{
  val leaves=inputs.mapIndexed{i,input->if(input.native)NativeLeaf(id+"-$i",input,vertical)else Leaf(id+"-$i",LeafInput(if(vertical)input.height else input.width,if(vertical)input.width else input.height,input.weight,input.fill,align=input.align),vertical)}
  val policy=if(vertical)ColumnMeasurePolicy(Arrangement.Top,Alignment.CenterHorizontally)else RowMeasurePolicy(Arrangement.Start,Alignment.CenterVertically)
  val result=with(policy){with(Scope){measure(leaves,c)}}
  val p=object:Placeable(id,result,c){override fun get(line:AlignmentLine)=owner.outer[line]
   override fun placeAt(position:IntOffset,zIndex:Float,layerBlock:(GraphicsLayerScope.()->Unit)?){val old=RowOrigin.value;RowOrigin.value=Host.origin+position;super.placeAt(position,zIndex,layerBlock);RowOrigin.value=old}
  }
  val coordinator=NodeCoordinator(result,p.apparentToRealOffset);owner=Owner(coordinator)
  for(leaf in leaves)if(leaf is NativeLeaf){leaf.owner.outer.wrappedBy=coordinator;leaf.owner.parentAlignmentLinesOwner=owner;owner.children.add(leaf.owner)}
  owner.placement={val origin=Host.origin;val rowOrigin=RowOrigin.value;Host.origin=IntOffset.Zero;RowOrigin.value=IntOffset.Zero;with(Placeable.PlacementScope(result.width,IntOffset.Zero)){resultPlace(result)};Host.origin=origin;RowOrigin.value=rowOrigin}
  return p
 }
 override fun minIntrinsicWidth(h:Int)=0;override fun maxIntrinsicWidth(h:Int)=0
 override fun minIntrinsicHeight(w:Int)=0;override fun maxIntrinsicHeight(w:Int)=0
}
