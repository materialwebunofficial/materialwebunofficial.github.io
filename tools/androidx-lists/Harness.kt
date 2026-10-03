package androidx.compose.material3
import kotlin.math.roundToInt

// Only platform types/measurement adapters. Policy/state-selection math is the
// unchanged source compiled in Policy.kt/Colors.kt, not rewritten expectations.
data class Dp(val value:Float):Comparable<Dp> {
 operator fun plus(other:Dp)=Dp(value+other.value)
 operator fun minus(other:Dp)=Dp(value-other.value)
 operator fun div(other:Int)=Dp(value/other)
 override fun compareTo(other:Dp)=value.compareTo(other.value)
}
val Int.dp get()=Dp(toFloat())
val Double.dp get()=Dp(toFloat())
val Int.sp get()=Dp(toFloat())
interface Density {fun Dp.roundToPx()=value.roundToInt()}
object LocalDensity {val current=object:Density{}}
object ListItemDefaults {val InteractiveListTopPadding=10.dp;val InteractiveListBottomPadding=10.dp}
object ComposeMaterial3Flags {const val isExpressiveListItemHeightBasedOnTextLinesFixEnabled=true}
object Alignment {fun interface Vertical {fun align(size:Int,space:Int):Int};val CenterVertically=Vertical{size,space->((space-size)/2f).roundToInt()};val Top=Vertical{_,_->0}}
fun Int.fastCoerceIn(min:Int,max:Int)=coerceIn(min,max)
fun Int.subtractConstraintSafely(value:Int)=if(this==Constraints.Infinity)this else (this-value).coerceAtLeast(0)
data class Constraints(val minWidth:Int=0,val minHeight:Int=0,val maxWidth:Int=Int.MAX_VALUE,val maxHeight:Int=Int.MAX_VALUE) {
 val hasBoundedWidth get()=maxWidth!=Infinity
 fun offset(horizontal:Int=0,vertical:Int=0)=Constraints((minWidth+horizontal).coerceAtLeast(0),(minHeight+vertical).coerceAtLeast(0),if(maxWidth==Infinity)Infinity else (maxWidth+horizontal).coerceAtLeast(0),if(maxHeight==Infinity)Infinity else (maxHeight+vertical).coerceAtLeast(0))
 fun constrainHeight(height:Int)=height.coerceIn(minHeight,maxHeight)
 companion object {const val Infinity=Int.MAX_VALUE}
}
object FirstBaseline
object LastBaseline
data class Placed(val x:Int,val y:Int,val width:Int,val height:Int)
class Placeable(val width:Int,val height:Int,val name:String,val multiline:Boolean,val placements:MutableMap<String,Placed>){
 operator fun get(baseline:Any)=if(baseline===LastBaseline&&multiline)34 else 14
 fun placeRelative(x:Int,y:Int){placements[name]=Placed(x,y,width,height)}
}
val Placeable?.widthOrZero get()=this?.width?:0
val Placeable?.heightOrZero get()=this?.height?:0
interface IntrinsicMeasurable {
 fun minIntrinsicWidth(height:Int):Int
 fun maxIntrinsicWidth(height:Int):Int
 fun minIntrinsicHeight(width:Int):Int
 fun maxIntrinsicHeight(width:Int):Int
}
interface Measurable:IntrinsicMeasurable {fun measure(constraints:Constraints):Placeable}
data class Size(val width:Int,val height:Int){fun json()="{\"width\":$width,\"height\":$height}"}
class Child(val name:String,val size:Size,val placements:MutableMap<String,Placed>):Measurable {
 override fun measure(constraints:Constraints)=Placeable(size.width.coerceIn(constraints.minWidth,constraints.maxWidth),size.height.coerceIn(constraints.minHeight,constraints.maxHeight),name,size.height>=40&&name=="supporting",placements)
 override fun minIntrinsicWidth(height:Int)=size.width
 override fun maxIntrinsicWidth(height:Int)=size.width
 override fun minIntrinsicHeight(width:Int)=size.height
 override fun maxIntrinsicHeight(width:Int)=size.height
}
data class MeasureResult(val width:Int,val height:Int)
interface MeasureScope:Density {fun layout(width:Int,height:Int,block:()->Unit):MeasureResult {block();return MeasureResult(width,height)}}
interface IntrinsicMeasureScope:Density
interface MultiContentMeasurePolicy {
 fun MeasureScope.measure(measurables:List<List<Measurable>>,constraints:Constraints):MeasureResult
 fun IntrinsicMeasureScope.minIntrinsicWidth(measurables:List<List<IntrinsicMeasurable>>,height:Int):Int
 fun IntrinsicMeasureScope.maxIntrinsicWidth(measurables:List<List<IntrinsicMeasurable>>,height:Int):Int
 fun IntrinsicMeasureScope.minIntrinsicHeight(measurables:List<List<IntrinsicMeasurable>>,width:Int):Int
 fun IntrinsicMeasureScope.maxIntrinsicHeight(measurables:List<List<IntrinsicMeasurable>>,width:Int):Int
}
fun main(args:Array<String>){
 if(args[0]=="shapes"){
  val output=mutableListOf<String>()
  for(selected in listOf(false,true))for(pressed in listOf(false,true))for(focused in listOf(false,true))for(hovered in listOf(false,true))for(dragged in listOf(false,true))
   output.add("{\"selected\":$selected,\"pressed\":$pressed,\"focused\":$focused,\"hovered\":$hovered,\"dragged\":$dragged,\"shape\":${shapeIndex(selected,pressed,focused,hovered,dragged)}}")
  println(output.joinToString(prefix="[",postfix="]"));return
 }
 if(args[0]=="colors"){
  val scheme=ColorScheme();val output=mutableListOf<String>()
  for(segmented in listOf(false,true))for(enabled in listOf(false,true))for(selected in listOf(false,true))for(dragged in listOf(false,true)){
   val colors=if(segmented)scheme.defaultSegmentedListItemColors else scheme.defaultListItemColors
   val roles=listOf("container" to colors.containerColor(enabled,selected,dragged),"content" to colors.contentColor(enabled,selected,dragged),"leading" to colors.leadingContentColor(enabled,selected,dragged),"trailing" to colors.trailingContentColor(enabled,selected,dragged),"overline" to colors.overlineContentColor(enabled,selected,dragged),"supporting" to colors.supportingContentColor(enabled,selected,dragged))
   val result=roles.joinToString(prefix="{",postfix="}"){(name,color)->"\"$name\":{\"role\":\"${color.role}\",\"alpha\":${color.alpha}}"}
   output.add("{\"segmented\":$segmented,\"enabled\":$enabled,\"selected\":$selected,\"dragged\":$dragged,\"roles\":$result}")
  }
  println(output.joinToString(prefix="[",postfix="]"));return
 }
 val output=mutableListOf<String>()
 for(width in listOf(80,368,Constraints.Infinity))for(leading in listOf(null,Size(36,24),Size(52,40),Size(68,56)))
 for(trailing in listOf(null,Size(32,20),Size(32,16)))for(overline in listOf(null,Size(40,16)))
 for(supporting in listOf(null,Size(120,20),Size(120,40)))for(content in listOf(Size(40,24),Size(200,48)))
 for(minHeight in listOf(0,28))for(maxHeight in listOf(10000,58))for(padding in listOf(20,24))for(alignment in listOf("auto","top","center")){
  val placements=mutableMapOf<String,Placed>()
  val sizes=listOf("leading" to leading,"trailing" to trailing,"overline" to overline,"supporting" to supporting,"content" to content)
  val children=sizes.map{(name,size)->if(size==null)emptyList<Measurable>() else listOf(Child(name,size,placements))}
  val align=when(alignment){"auto"->verticalAlignment();"top"->Alignment.Top;else->Alignment.CenterVertically}
  val policy=InteractiveListItemMeasurePolicy(align,padding.dp)
  val scope=object:MeasureScope{}
  val result=with(policy){with(scope){measure(children,Constraints(minHeight=minHeight,maxWidth=width,maxHeight=maxHeight))}}
  val inputSizes=sizes.joinToString{(name,size)->"\"$name\":${size?.json()?:"null"}"}
  val input="{\"width\":${if(width==Constraints.Infinity)"null" else width},\"minHeight\":$minHeight,\"maxHeight\":$maxHeight,\"verticalPadding\":$padding,\"alignment\":\"$alignment\",\"supportingMultiline\":${supporting?.height==40},$inputSizes}"
  val placed=placements.entries.joinToString(prefix="{",postfix="}"){(name,g)->"\"$name\":{\"x\":${g.x},\"y\":${g.y},\"width\":${g.width},\"height\":${g.height}}"}
  output.add("{\"input\":$input,\"width\":${result.width},\"height\":${result.height},\"placements\":$placed}")
 }
 println(output.joinToString(prefix="[",postfix="]"))
}
