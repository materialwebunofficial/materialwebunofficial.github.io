package androidx.compose.material3
import kotlin.math.roundToInt

annotation class Immutable
annotation class Stable
inline fun requirePrecondition(value:Boolean,message:()->String){require(value,message)}
fun Int.fastCoerceIn(min:Int,max:Int)=coerceIn(min,max)
fun Int.fastCoerceAtLeast(min:Int)=coerceAtLeast(min)
data class IntSize(val width:Int,val height:Int){fun json()="{\"width\":$width,\"height\":$height}"}
data class IntOffset(val x:Int,val y:Int){operator fun plus(other:IntOffset)=IntOffset(x+other.x,y+other.y)}
data class Dp(val value:Float):Comparable<Dp>{fun toPx()=value;fun roundToPx()=value.roundToInt();val isSpecified get()=!value.isNaN();override fun compareTo(other:Dp)=value.compareTo(other.value);companion object{val Unspecified=Dp(Float.NaN)}}
val Int.dp get()=Dp(toFloat())
object FloatingToolbarDefaults{val ContainerSize=64.dp;val FabSizeRange=56.dp..80.dp}
object FloatingToolbarHorizontalFabPosition{const val End="end"}
object FloatingToolbarVerticalFabPosition{const val Bottom="bottom"}
interface State<T>{val value:T}
class Value<T>(override val value:T):State<T>
enum class LayoutDirection{Ltr,Rtl}
enum class Orientation{Horizontal,Vertical}
object Modifier{open class Node}
interface PaddingValues{
 fun calculateLeftPadding(direction:LayoutDirection):Dp
 fun calculateTopPadding():Dp
 fun calculateRightPadding(direction:LayoutDirection):Dp
 fun calculateBottomPadding():Dp
}
object Padding8:PaddingValues{
 override fun calculateLeftPadding(direction:LayoutDirection)=8.dp
 override fun calculateTopPadding()=8.dp
 override fun calculateRightPadding(direction:LayoutDirection)=8.dp
 override fun calculateBottomPadding()=8.dp
}
class ScrollState(var value:Int){var maxValue=0;var viewportSize=0;var contentSize=0;var reverseScrolling=false}
fun checkScrollableContainerConstraints(c:Constraints,orientation:Orientation){check(if(orientation==Orientation.Vertical)c.hasBoundedHeight else c.hasBoundedWidth)}
interface IntrinsicMeasurable{
 fun minIntrinsicWidth(height:Int):Int
 fun minIntrinsicHeight(width:Int):Int
 fun maxIntrinsicWidth(height:Int):Int
 fun maxIntrinsicHeight(width:Int):Int
}
interface Measurable:IntrinsicMeasurable{fun measure(constraints:Constraints):Placeable}
interface IntrinsicMeasureScope
interface LayoutModifierNode{
 fun MeasureScope.measure(measurable:Measurable,constraints:Constraints):MeasureResult
 fun IntrinsicMeasureScope.minIntrinsicWidth(measurable:IntrinsicMeasurable,height:Int)=measurable.minIntrinsicWidth(height)
 fun IntrinsicMeasureScope.minIntrinsicHeight(measurable:IntrinsicMeasurable,width:Int)=measurable.minIntrinsicHeight(width)
 fun IntrinsicMeasureScope.maxIntrinsicWidth(measurable:IntrinsicMeasurable,height:Int)=measurable.maxIntrinsicWidth(height)
 fun IntrinsicMeasureScope.maxIntrinsicHeight(measurable:IntrinsicMeasurable,width:Int)=measurable.maxIntrinsicHeight(width)
}
class GraphicsLayerScope{var shadowElevation=0f;var shape="";var clip=false}
typealias Layer=GraphicsLayerScope
class MeasureResult(val width:Int,val height:Int,val place:Placeable.PlacementScope.()->Unit)
interface MeasureScope:IntrinsicMeasureScope{
 val layoutDirection get()=if(Host.rtl)LayoutDirection.Rtl else LayoutDirection.Ltr
 fun layout(width:Int,height:Int,block:Placeable.PlacementScope.()->Unit)=MeasureResult(width,height,block)
}
object Scope:MeasureScope
object Host{var rtl=false;var origin=IntOffset(0,0);val boxes=linkedMapOf<String,Rect>();val sizes=linkedMapOf<String,IntSize>()}
data class Rect(val x:Int,val y:Int,val width:Int,val height:Int){fun json()="{\"x\":$x,\"y\":$y,\"width\":$width,\"height\":$height}"}
class Placeable(val id:String,val result:MeasureResult,val measurementConstraints:Constraints){
 var width=0;var height=0
 val measuredSize=IntSize(result.width,result.height)
 var apparentToRealOffset=IntOffset(0,0)
 init{onMeasuredSizeChanged();Host.sizes[id]=measuredSize}
 // SOURCE_COERCION
 fun handleMotionFrameOfReferencePlacement(){}
 fun placeAt(position:IntOffset,zIndex:Float,layerBlock:(GraphicsLayerScope.()->Unit)?){
  val previous=Host.origin;val absolute=position+previous
  Host.boxes[id]=Rect(absolute.x,absolute.y,result.width,result.height)
  Host.origin=absolute;PlacementScope(result.width,absolute).resultPlace(result);Host.origin=previous
 }
 class PlacementScope(val parentWidth:Int,val origin:IntOffset){
  val parentLayoutDirection get()=if(Host.rtl)LayoutDirection.Rtl else LayoutDirection.Ltr
  fun resultPlace(result:MeasureResult)=result.place(this)
  fun Placeable.place(x:Int,y:Int)=placeApparentToRealOffset(IntOffset(x,y),0f,null)
  fun Placeable.placeRelative(x:Int,y:Int)=placeAutoMirrored(IntOffset(x,y),0f,null)
  fun Placeable.placeRelativeWithLayer(x:Int,y:Int,block:(GraphicsLayerScope.()->Unit)?=null)=placeAutoMirrored(IntOffset(x,y),0f,block)
  fun withMotionFrameOfReferencePlacement(block:()->Unit)=block()
  // SOURCE_MIRRORING
  // SOURCE_PLACEMENT
 }
}
// Placement origin is host tree wiring; source arithmetic above is unmodified.
fun Placeable.PlacementScope.placeRoot(child:Placeable){child.placeAt(child.apparentToRealOffset,0f,null)}
class Content(val natural:IntSize):Measurable{
 override fun measure(constraints:Constraints)=Placeable("content",Scope.layout(constraints.constrainWidth(natural.width),constraints.constrainHeight(natural.height)){},constraints)
 override fun minIntrinsicWidth(height:Int)=natural.width
 override fun minIntrinsicHeight(width:Int)=natural.height
 override fun maxIntrinsicWidth(height:Int)=natural.width
 override fun maxIntrinsicHeight(width:Int)=natural.height
}
class Wrapped(val id:String,val node:LayoutModifierNode,val child:Measurable,val paddingIntrinsic:Boolean=false):Measurable{
 override fun measure(constraints:Constraints)=Placeable(id,with(node){with(Scope){measure(child,constraints)}},constraints)
 override fun minIntrinsicWidth(height:Int)=maxIntrinsicWidth(height)
 override fun minIntrinsicHeight(width:Int)=maxIntrinsicHeight(width)
 override fun maxIntrinsicWidth(height:Int)=if(paddingIntrinsic)child.maxIntrinsicWidth((height-16).coerceAtLeast(0))+16 else with(node){with(Scope){maxIntrinsicWidth(child,height)}}
 override fun maxIntrinsicHeight(width:Int)=if(paddingIntrinsic)child.maxIntrinsicHeight((width-16).coerceAtLeast(0))+16 else with(node){with(Scope){maxIntrinsicHeight(child,width)}}
}
class Policy(val vertical:Boolean,val progress:Float,val position:String,val toolbar:Measurable):Measurable{
 override fun measure(constraints:Constraints):Placeable{
  val fab=object:Measurable{
   override fun measure(c:Constraints)=Placeable("fab",Scope.layout(c.minWidth,c.minHeight){},c)
   override fun minIntrinsicWidth(h:Int)=56;override fun minIntrinsicHeight(w:Int)=56
   override fun maxIntrinsicWidth(h:Int)=56;override fun maxIntrinsicHeight(w:Int)=56
  }
  val result=with(Scope){if(vertical)vertical(listOf(toolbar,fab),constraints,Value(progress),position)else horizontal(listOf(toolbar,fab),constraints,Value(progress),position)}
  return Placeable("policy",result,constraints)
 }
 override fun minIntrinsicWidth(height:Int)=0;override fun minIntrinsicHeight(width:Int)=0
 override fun maxIntrinsicWidth(height:Int)=0;override fun maxIntrinsicHeight(width:Int)=0
}
