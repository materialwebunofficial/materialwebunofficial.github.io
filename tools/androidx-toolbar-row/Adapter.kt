package androidx.compose.material3
import kotlin.math.roundToInt

interface MeasurePolicy{
 fun MeasureScope.measure(measurables:List<Measurable>,constraints:Constraints):MeasureResult
 fun IntrinsicMeasureScope.minIntrinsicWidth(measurables:List<IntrinsicMeasurable>,height:Int):Int
 fun IntrinsicMeasureScope.minIntrinsicHeight(measurables:List<IntrinsicMeasurable>,width:Int):Int
 fun IntrinsicMeasureScope.maxIntrinsicWidth(measurables:List<IntrinsicMeasurable>,height:Int):Int
 fun IntrinsicMeasureScope.maxIntrinsicHeight(measurables:List<IntrinsicMeasurable>,width:Int):Int
}
open class AlignmentLine{companion object{const val Unspecified=Int.MIN_VALUE}}
object Baseline:AlignmentLine()
object MinimumInteractiveTopAlignmentLine:AlignmentLine()
object MinimumInteractiveLeftAlignmentLine:AlignmentLine()
interface CompositionLocalConsumerModifierNode
object LocalMinimumInteractiveComponentSize
fun CompositionLocalConsumerModifierNode.currentValueOf(local:LocalMinimumInteractiveComponentSize)=48.dp
fun Dp.coerceAtLeast(min:Dp)=if(this<min)min else this
object LeafConstraints{val values=linkedMapOf<String,Constraints>()}
data class FlowLayoutData(val fillCrossAxisFraction:Float)
interface Measured
class CoroutineScope{fun launch(block:()->Unit)=block()}
class AnimationVector1D
typealias AnimationSpec<T> = Any
object PaddingHost{var progress=1f}
class Animatable<T,V>(initial:T){val value:Float get()=PaddingHost.progress;fun animateTo(value:T,spec:Any){}}
enum class EnterExitState{PreEnter,Visible,PostExit}
class Transition(val currentState:EnterExitState,val targetState:EnterExitState)
class Deferred<T>(val value:T){fun animate(transitionSpec:Any,forcedInitialValue:T?=null,forcedInitialVelocity:T?=null,target:(EnterExitState)->T)=Value(value)}
class ChangeSize(val alignment:Alignment?,val end:IntSize){fun size(full:IntSize)=end}
class Exit(val config:ChangeConfig)
class ChangeConfig(val changeSize:ChangeSize?)
fun Exit(size:ChangeSize)=Exit(ChangeConfig(size))
class LayerFactory{fun init():GraphicsLayerScope.()->Unit={}}
class TransformState{val slideHandoffValue=IntOffset.Zero;val slideHandoffVelocity=IntOffset.Zero;fun combinedSlide(transitionValue:IntOffset,fullSize:IntSize)=transitionValue}
val DefaultOffsetAnimationSpec=Any()
object VisibilityHost{
 var vertical=false;var transition=Transition(EnterExitState.PreEnter,EnterExitState.Visible)
 var currentAlignment:Alignment?=null;var alignment:Alignment?=null
 var animatedSize=IntSize(48,48);var animatedOffset=IntOffset.Zero
}
data class LeafInput(val main:Int,val cross:Int,val weight:Float=0f,val fill:Boolean=true,val line:Int?=null,val align:String="center",val required:Boolean=false,val intrinsicMinMain:Int=main,val intrinsicMinCross:Int=cross,val wrap:Boolean=false){
 fun json()="{\"main\":$main,\"cross\":$cross,\"weight\":$weight,\"fill\":$fill,\"line\":${line?:"null"},\"align\":\"$align\",\"required\":$required,\"intrinsicMinMain\":$intrinsicMinMain,\"intrinsicMinCross\":$intrinsicMinCross,\"wrap\":$wrap}"
}
internal fun parentData(i:LeafInput,vertical:Boolean)=RowColumnParentData(i.weight,i.fill,when(i.align){
 "line"->CrossAxisAlignment.AlignmentLine(Baseline)
 "start"->if(vertical)CrossAxisAlignment.horizontal(Alignment.Start)else CrossAxisAlignment.vertical(Alignment.Top)
 "end"->if(vertical)CrossAxisAlignment.horizontal(Alignment.End)else CrossAxisAlignment.vertical(Alignment.Bottom)
 else->null
})
class Leaf(val id:String,val input:LeafInput,val vertical:Boolean):Measurable{
 override val parentData:Any?=parentData(input,vertical)
 override fun measure(constraints:Constraints):Placeable{
  LeafConstraints.values[id]=constraints
  val natural=if(vertical)IntSize(input.cross,input.main)else IntSize(input.main,input.cross)
  val size=if(input.required)natural else constraints.constrain(natural)
  return Placeable(id,Scope.layout(size.width,size.height){},constraints).also{it.parentData=parentData;if(input.line!=null)it.lines[Baseline]=input.line}
 }
 fun intrinsicCross(available:Int,minimum:Boolean):Int{val base=if(minimum)input.intrinsicMinCross else input.cross;return base*if(input.wrap)((input.main+available.coerceAtLeast(1).toLong()-1)/available.coerceAtLeast(1)).toInt().coerceAtLeast(1)else 1}
 override fun minIntrinsicWidth(height:Int)=if(vertical)intrinsicCross(height,true)else input.intrinsicMinMain
 override fun minIntrinsicHeight(width:Int)=if(vertical)input.intrinsicMinMain else intrinsicCross(width,true)
 override fun maxIntrinsicWidth(height:Int)=if(vertical)intrinsicCross(height,false)else input.main
 override fun maxIntrinsicHeight(width:Int)=if(vertical)input.main else intrinsicCross(width,false)
}
fun horizontalArrangement(name:String):Arrangement.Horizontal=when(name){"start"->Arrangement.Start;"end"->Arrangement.End;"between"->Arrangement.SpaceBetween;"around"->Arrangement.SpaceAround;"evenly"->Arrangement.SpaceEvenly;"spaced"->Arrangement.spacedBy(7.dp,Alignment.CenterHorizontally);else->Arrangement.Center}
fun verticalArrangement(name:String):Arrangement.Vertical=when(name){"start"->Arrangement.Top;"end"->Arrangement.Bottom;"between"->Arrangement.SpaceBetween;"around"->Arrangement.SpaceAround;"evenly"->Arrangement.SpaceEvenly;"spaced"->Arrangement.spacedBy(7.dp,Alignment.CenterVertically);else->Arrangement.Center}
class RowContent(val id:String,val children:List<Measurable>,val vertical:Boolean,val arrangement:String="start",val top:Int?=null,val left:Int?=null):Measurable{
 val policy:MeasurePolicy=if(vertical)ColumnMeasurePolicy(verticalArrangement(arrangement),Alignment.CenterHorizontally)else RowMeasurePolicy(horizontalArrangement(arrangement),Alignment.CenterVertically)
 override fun measure(constraints:Constraints)=Placeable(id,with(policy){with(Scope){measure(children,constraints)}},constraints).also{if(top!=null)it.lines[MinimumInteractiveTopAlignmentLine]=top;if(left!=null)it.lines[MinimumInteractiveLeftAlignmentLine]=left}
 override fun minIntrinsicWidth(height:Int)=with(policy){with(Scope){minIntrinsicWidth(children,height)}}
 override fun minIntrinsicHeight(width:Int)=with(policy){with(Scope){minIntrinsicHeight(children,width)}}
 override fun maxIntrinsicWidth(height:Int)=with(policy){with(Scope){maxIntrinsicWidth(children,height)}}
 override fun maxIntrinsicHeight(width:Int)=with(policy){with(Scope){maxIntrinsicHeight(children,width)}}
}
// Recreate the composable's explicit measurement/modifier tree; content leaves
// and current Deferred animation samples are host inputs, not an Android UI.
class VisibilityContent(val id:String,val row:Measurable,val vertical:Boolean,val sample:Int,val delta:Int,val current:String,val alignment:String,val settled:Boolean):Measurable{
 override fun measure(constraints:Constraints):Placeable{
  fun align(value:String)=if(vertical)if(value=="end")Alignment.BottomCenter else Alignment.TopCenter else if(value=="end")Alignment.CenterEnd else Alignment.CenterStart
  VisibilityHost.vertical=vertical;VisibilityHost.transition=Transition(if(settled)EnterExitState.Visible else EnterExitState.PreEnter,EnterExitState.Visible)
  VisibilityHost.currentAlignment=if(current=="none")null else align(current);VisibilityHost.alignment=align(alignment)
  VisibilityHost.animatedSize=if(vertical)IntSize(constraints.maxWidth.coerceAtMost(48),sample)else IntSize(sample,constraints.maxHeight.coerceAtMost(48))
  VisibilityHost.animatedOffset=if(vertical)IntOffset(0,delta)else IntOffset(delta,0)
  return Placeable(id,with(VisibilityPolicy()){with(Scope){measure(row,constraints)}},constraints)
 }
 override fun minIntrinsicWidth(height:Int)=row.minIntrinsicWidth(height);override fun minIntrinsicHeight(width:Int)=row.minIntrinsicHeight(width)
 override fun maxIntrinsicWidth(height:Int)=row.maxIntrinsicWidth(height);override fun maxIntrinsicHeight(width:Int)=row.maxIntrinsicHeight(width)
}
fun boxes()=Host.boxes.entries.joinToString(prefix="{",postfix="}"){(id,r)->"\"$id\":${r.json()}"}

// Execute the original minimum-interactive modifier around the original SizeNode.
// The leaf inside the sized body is an explicit host measurement boundary.
fun iconMeasure(c:Constraints,width:Int=40,height:Int=40):Placeable{
 val body=Wrapped("body",SizeNode(minWidth=width.dp,maxWidth=width.dp,minHeight=height.dp,maxHeight=height.dp,enforceIncoming=true),Content(IntSize(24,24)))
 return Wrapped("touch",MinimumInteractiveModifierNode(),body).measure(c)
}
fun iconAt(c:Constraints,origin:Rect):Rect{
 Host.boxes.clear();val p=iconMeasure(c)
 with(Placeable.PlacementScope(0,IntOffset.Zero)){placeRoot(p)}
 val b=Host.boxes.getValue("body")
 return Rect(origin.x+b.x,origin.y+b.y,b.width,b.height)
}
