package androidx.compose.material3
import kotlin.math.roundToInt

// Only platform measurement/placement adapters. The policy and placement function
// compiled beside these are extracted unchanged from pinned NavigationItem.kt.
data class Dp(val value:Float) {
 operator fun plus(other:Dp)=Dp(value+other.value)
 operator fun times(other:Int)=Dp(value*other)
}
val Int.dp: Dp get()=Dp(toFloat())
enum class NavigationItemIconPosition { Top,Start }
enum class LayoutDirection { Ltr,Rtl }
interface DensityScope {
 fun Dp.toPx()=value
 fun Dp.roundToPx()=value.roundToInt()
}
data class Constraints(val minWidth:Int=0,val minHeight:Int=0,val maxWidth:Int=10000,val maxHeight:Int=10000) {
 fun constrainWidth(width:Int)=width.coerceIn(minWidth,maxWidth)
 fun constrainHeight(height:Int)=height.coerceIn(minHeight,maxHeight)
 fun constrain(other:Constraints)=Constraints(constrainWidth(other.minWidth),constrainHeight(other.minHeight),
  constrainWidth(other.maxWidth),constrainHeight(other.maxHeight))
 companion object {fun fixed(width:Int,height:Int)=Constraints(width,height,width,height)}
}
interface PaddingValues {
 fun calculateStartPadding(direction:LayoutDirection):Dp
 fun calculateEndPadding(direction:LayoutDirection):Dp
 fun calculateTopPadding():Dp
 fun calculateBottomPadding():Dp
}
class DynamicPaddingValues:PaddingValues {
 var progress=0f
  set(value){field=value.coerceIn(0f,1f)}
 override fun calculateStartPadding(direction:LayoutDirection)=16.dp
 override fun calculateEndPadding(direction:LayoutDirection)=16.dp
 override fun calculateTopPadding()=Dp((1-progress)*4+progress*16)
 override fun calculateBottomPadding()=calculateTopPadding()
}
const val IconLayoutIdTag="icon"
const val LabelLayoutIdTag="label"
const val IndicatorLayoutIdTag="indicator"
const val IndicatorRippleLayoutIdTag="ripple"
fun <T> List<T>.fastFirst(predicate:(T)->Boolean)=first(predicate)
fun lerp(start:Int,stop:Int,fraction:Float)=start+((stop-start)*fraction.toDouble()).roundToInt()
class LayerScope {var alpha=1f}
data class Placed(val x:Int,val y:Int,val width:Int,val height:Int,val alpha:Float)
class Placeable(val width:Int,val height:Int,val name:String,val placements:MutableMap<String,Placed>) {
 fun placeRelativeWithLayer(x:Int,y:Int,layerBlock:LayerScope.()->Unit={}) {
  val layer=LayerScope().apply(layerBlock)
  placements[name]=Placed(x,y,width,height,layer.alpha.coerceIn(0f,1f))
 }
}
interface Measurable {val layoutId:String;fun measure(constraints:Constraints):Placeable}
interface IntrinsicMeasurable {val layoutId:String;fun maxIntrinsicWidth(height:Int):Int}
class Child(override val layoutId:String,val width:Int,val height:Int,val placements:MutableMap<String,Placed>):Measurable {
 override fun measure(constraints:Constraints)=Placeable(constraints.constrainWidth(width),constraints.constrainHeight(height),layoutId,placements)
}
data class MeasureResult(val width:Int,val height:Int)
interface MeasureScope:DensityScope {
 val layoutDirection:LayoutDirection
 fun layout(width:Int,height:Int,placement:()->Unit):MeasureResult {placement();return MeasureResult(width,height)}
}
interface IntrinsicMeasureScope:DensityScope {val layoutDirection:LayoutDirection}
interface MeasurePolicy {
 fun MeasureScope.measure(measurables:List<Measurable>,constraints:Constraints):MeasureResult
 fun IntrinsicMeasureScope.maxIntrinsicWidth(measurables:List<IntrinsicMeasurable>,height:Int):Int
}

fun main() {
 val results=mutableListOf<String>()
 for(labelWidth in listOf(30,82,97,240,300))for(labelHeight in listOf(16,20,40))
 for(p in listOf(0f,.1f,.25f,.49f,.5f,.51f,.75f,1f,1.02f))
 for(selection in listOf(0f,.25f,1f,1.05f))for(topTarget in listOf(false,true)) {
  val placements=mutableMapOf<String,Placed>()
  val children=listOf(Child("icon",24,24,placements),Child("label",labelWidth,labelHeight,placements),
   Child("indicator",0,0,placements),Child("ripple",0,0,placements))
  val policy=AnimatedMeasurePolicy(if(topTarget)NavigationItemIconPosition.Top else NavigationItemIconPosition.Start,
   {p},{selection},DynamicPaddingValues(),4.dp,8.dp,20.dp)
  val scope=object:MeasureScope {override val layoutDirection=LayoutDirection.Ltr}
  val result=with(policy){with(scope){measure(children,Constraints(maxWidth=340))}}
  val positions=placements.entries.joinToString(prefix="{",postfix="}"){(name,g)->
   "\"$name\":{\"x\":${g.x},\"y\":${g.y},\"width\":${g.width},\"height\":${g.height},\"opacity\":${g.alpha}}"}
  results.add("{\"labelWidth\":$labelWidth,\"labelHeight\":$labelHeight,\"p\":$p,\"selection\":$selection,\"topTarget\":$topTarget,\"maxWidth\":340,\"width\":${result.width},\"height\":${result.height},\"placements\":$positions}")
 }
 println(results.joinToString(prefix="[",postfix="]"))
}
