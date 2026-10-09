package reference
import kotlin.math.*

annotation class Immutable
annotation class Stable
annotation class JvmDefaultWithCompatibility
fun Int.fastCoerceAtLeast(value:Int)=coerceAtLeast(value)
fun Int.fastCoerceAtMost(value:Int)=coerceAtMost(value)
fun Int.fastCoerceIn(min:Int,max:Int)=coerceIn(min,max)
fun Float.fastRoundToInt()=roundToInt()
inline fun checkPrecondition(value:Boolean,message:()->String){check(value,message)}
inline fun requirePrecondition(value:Boolean,message:()->String){require(value,message)}
inline fun <T> List<T>.fastFirstOrNull(block:(T)->Boolean)=firstOrNull(block)
inline fun <T> List<T>.fastFirst(block:(T)->Boolean)=first(block)
enum class LayoutDirection{Ltr,Rtl}
data class IntSize(val width:Int,val height:Int)
data class IntOffset(val x:Int,val y:Int){companion object{val Zero=IntOffset(0,0)}}
data class Size(val width:Float,val height:Float){companion object{val Zero=Size(0f,0f)}}
data class Dp(val value:Float){operator fun plus(other:Dp)=Dp(value+other.value);operator fun times(value:Int)=Dp(this.value*value)}
val Int.dp get()=Dp(toFloat())
interface Density{
 val density:Float get()=1f
 fun Dp.toPx()=value*density
 fun Dp.roundToPx()=toPx().roundToInt()
}
class PaddingValues(val start:Float,val top:Float,val end:Float,val bottom:Float){
 fun calculateStartPadding(direction:LayoutDirection)=Dp(start)
 fun calculateEndPadding(direction:LayoutDirection)=Dp(end)
 fun calculateLeftPadding(direction:LayoutDirection)=Dp(if(direction==LayoutDirection.Ltr)start else end)
 fun calculateRightPadding(direction:LayoutDirection)=Dp(if(direction==LayoutDirection.Ltr)end else start)
 fun calculateTopPadding()=Dp(top)
 fun calculateBottomPadding()=Dp(bottom)
}
typealias FloatProducer=()->Float
const val LeadingId="leading";const val TrailingId="trailing";const val PrefixId="prefix";const val SuffixId="suffix";const val LabelId="label";const val TextFieldId="text";const val PlaceholderId="placeholder";const val SupportingId="supporting";const val ContainerId="container"
interface LayoutIdParentData{val layoutId:Any?}
data class ParentData(override val layoutId:Any):LayoutIdParentData
interface IntrinsicMeasurable{
 val parentData:Any?
 fun minIntrinsicWidth(height:Int):Int
 fun maxIntrinsicWidth(height:Int):Int
 fun minIntrinsicHeight(width:Int):Int
 fun maxIntrinsicHeight(width:Int):Int
}
interface Measurable:IntrinsicMeasurable{fun measure(constraints:Constraints):Placeable}
interface IntrinsicMeasureScope:Density{val layoutDirection:LayoutDirection}
interface MeasureScope:IntrinsicMeasureScope{fun layout(width:Int,height:Int,block:Placeable.PlacementScope.()->Unit):MeasureResult}
interface MeasurePolicy{
 fun MeasureScope.measure(measurables:List<Measurable>,constraints:Constraints):MeasureResult
 fun IntrinsicMeasureScope.minIntrinsicWidth(measurables:List<IntrinsicMeasurable>,height:Int):Int
 fun IntrinsicMeasureScope.maxIntrinsicWidth(measurables:List<IntrinsicMeasurable>,height:Int):Int
 fun IntrinsicMeasureScope.minIntrinsicHeight(measurables:List<IntrinsicMeasurable>,width:Int):Int
 fun IntrinsicMeasureScope.maxIntrinsicHeight(measurables:List<IntrinsicMeasurable>,width:Int):Int
}
data class MeasureResult(val width:Int,val height:Int,val block:Placeable.PlacementScope.()->Unit)
class Layer{var alpha=1f}
data class Placement(val x:Int,val y:Int,val width:Int,val height:Int,val alpha:Float)
object Host{
 var parentWidth=0;var direction=LayoutDirection.Ltr
 val measurements=mutableListOf<String>();val placements=linkedMapOf<String,Placement>()
 fun reset(){measurements.clear();placements.clear()}
}
class Placeable(val id:String,val width:Int,val height:Int){
 class PlacementScope{
  fun Placeable.place(x:Int,y:Int){Host.placements[id]=Placement(x,y,width,height,1f)}
  fun Placeable.place(offset:IntOffset)=place(offset.x,offset.y)
  fun Placeable.placeRelative(x:Int,y:Int)=place(if(Host.direction==LayoutDirection.Rtl)Host.parentWidth-width-x else x,y)
  fun Placeable.placeRelativeWithLayer(x:Int,y:Int,block:Layer.()->Unit){val layer=Layer();layer.block();Host.placements[id]=Placement(if(Host.direction==LayoutDirection.Rtl)Host.parentWidth-width-x else x,y,width,height,layer.alpha)}
 }
}
class Scope(override val layoutDirection:LayoutDirection):MeasureScope{
 override fun layout(width:Int,height:Int,block:Placeable.PlacementScope.()->Unit)=MeasureResult(width,height,block)
}
data class Leaf(val id:String,val width:Int,val height:Int):Measurable{
 override val parentData=ParentData(id)
 override fun minIntrinsicWidth(height:Int)=width
 override fun maxIntrinsicWidth(height:Int)=width
 override fun minIntrinsicHeight(width:Int)=height
 override fun maxIntrinsicHeight(width:Int)=height
 override fun measure(constraints:Constraints):Placeable{
  val w=constraints.constrainWidth(width);val h=constraints.constrainHeight(height)
  Host.measurements.add("{\"id\":\"$id\",\"constraints\":${constraints.json()},\"width\":$w,\"height\":$h}")
  return Placeable(id,w,h)
 }
 fun json()="{\"id\":\"$id\",\"width\":$width,\"height\":$height}"
}
fun Constraints.json()="{\"minWidth\":$minWidth,\"maxWidth\":$maxWidth,\"minHeight\":$minHeight,\"maxHeight\":$maxHeight}"
