package androidx.compose.material3
import kotlin.math.roundToInt
data class Dp(val value:Float):Comparable<Dp>{fun toPx()=value;fun roundToPx()=value.roundToInt();override fun compareTo(other:Dp)=value.compareTo(other.value)}
val Int.dp get()=Dp(toFloat());val Double.dp get()=Dp(toFloat())
fun Float.fastRoundToInt()=roundToInt()
object FloatingToolbarDefaults{val ContainerSize=64.dp;val FabSizeRange=56.dp..80.dp}
object FloatingToolbarHorizontalFabPosition{const val End="end"}
object FloatingToolbarVerticalFabPosition{const val Bottom="bottom"}
data class Constraints(val minWidth:Int=0,val maxWidth:Int=10000,val minHeight:Int=0,val maxHeight:Int=10000)
interface State<T>{val value:T};class Value<T>(override val value:T):State<T>
object AlignmentLine{const val Unspecified=Int.MIN_VALUE};object MinimumInteractiveTopAlignmentLine;object MinimumInteractiveLeftAlignmentLine
data class Rect(val x:Int,val y:Int,val width:Int,val height:Int){fun json()="{\"x\":$x,\"y\":$y,\"width\":$width,\"height\":$height}"}
object Host{var rtl=false;var padding=0f;val placements=linkedMapOf<String,Rect>();var elevation=0f;var vertical=false;var transition=Transition(EnterExitState.PreEnter,EnterExitState.Visible);var currentAlignment:Alignment?=null;var alignment:Alignment?=null;var animatedSize=IntSize(48,48);var animatedOffset=IntOffset.Zero}
class Layer{var shadowElevation=0f;var shape="";var clip=false}
class Placeable(val width:Int,val height:Int,val id:String,val top:Int,val left:Int){
 operator fun get(key:Any)=if(key===MinimumInteractiveTopAlignmentLine)top else left
 class PlacementScope(val parentWidth:Int){
  fun Placeable.place(x:Int,y:Int){Host.placements[id]=Rect(x,y,width,height)}
  fun Placeable.placeRelative(x:Int,y:Int){place(if(Host.rtl)parentWidth-width-x else x,y)}
  fun Placeable.placeRelativeWithLayer(x:Int,y:Int,block:Layer.()->Unit){val l=Layer().apply(block);Host.elevation=l.shadowElevation;placeRelative(x,y)}
  fun Placeable.placeWithLayer(x:Int,y:Int,zIndex:Float,block:Layer.()->Unit){place(x,y)}
 }
}
interface Measurable{fun measure(constraints:Constraints):Placeable;fun maxIntrinsicWidth(height:Int):Int;fun maxIntrinsicHeight(width:Int):Int}
class Child(val id:String,val width:Int,val height:Int,val top:Int=AlignmentLine.Unspecified,val left:Int=AlignmentLine.Unspecified):Measurable{
 override fun measure(constraints:Constraints)=Placeable(width.coerceIn(constraints.minWidth,constraints.maxWidth),height.coerceIn(constraints.minHeight,constraints.maxHeight),id,top,left)
 override fun maxIntrinsicWidth(height:Int)=width;override fun maxIntrinsicHeight(width:Int)=height
}
data class MeasureResult(val width:Int,val height:Int){fun json()="{\"width\":$width,\"height\":$height}"}
interface MeasureScope{val isLookingAhead get()=false;fun layout(width:Int,height:Int,block:Placeable.PlacementScope.()->Unit):MeasureResult{Placeable.PlacementScope(width).block();return MeasureResult(width,height)}}
enum class EnterExitState{PreEnter,Visible,PostExit}
enum class LayoutDirection{Ltr,Rtl}
data class IntSize(val width:Int,val height:Int){val isValid get()=width>=0&&height>=0}
data class IntOffset(val x:Int,val y:Int){operator fun plus(other:IntOffset)=IntOffset(x+other.x,y+other.y);operator fun minus(other:IntOffset)=IntOffset(x-other.x,y-other.y);companion object{val Zero=IntOffset(0,0)}}
data class Alignment(val bx:Float,val by:Float){fun align(size:IntSize,space:IntSize,direction:LayoutDirection)=IntOffset(((space.width-size.width)/2f*(1+bx)).roundToInt(),((space.height-size.height)/2f*(1+by)).roundToInt());companion object{val TopStart=Alignment(-1f,-1f)}}
fun Constraints.constrain(size:IntSize)=IntSize(size.width.coerceIn(minWidth,maxWidth),size.height.coerceIn(minHeight,maxHeight))
class Transition(val currentState:EnterExitState,val targetState:EnterExitState)
class Deferred<T>(val value:T){fun animate(transitionSpec:Any,forcedInitialValue:T?=null,forcedInitialVelocity:T?=null,target:(EnterExitState)->T)=Value(value)}
class ChangeSize(val alignment:Alignment?,val end:IntSize){fun size(full:IntSize)=end}
class Exit(val config:ChangeConfig);class ChangeConfig(val changeSize:ChangeSize?)
fun Exit(size:ChangeSize)=Exit(ChangeConfig(size))
class LayerFactory{fun init():Layer.()->Unit={}}
class TransformState{val slideHandoffValue=IntOffset.Zero;val slideHandoffVelocity=IntOffset.Zero;fun combinedSlide(transitionValue:IntOffset,fullSize:IntSize)=transitionValue}
val DefaultOffsetAnimationSpec=Any()
object Modifier{open class Node{val coroutineScope=CoroutineScope()}}
class CoroutineScope{fun launch(block:()->Unit){block()}}
class AnimationVector1D;typealias AnimationSpec<T> = Any
class Animatable<T,V>(initial:T){val value:Float get()=Host.padding;fun animateTo(value:T,spec:Any){}}
interface LayoutModifierNode{fun MeasureScope.measure(measurable:Measurable,constraints:Constraints):MeasureResult}
typealias ColorToken=Color;typealias ShapeToken=String
data class Color(val role:String)
object ColorSchemeKeyTokens{val SurfaceContainer=Color("surface-container");val PrimaryContainer=Color("primary-container");val TertiaryContainer=Color("tertiary-container");val OnSurface=Color("on-surface");val OnPrimaryContainer=Color("on-primary-container")}
object ShapeKeyTokens{val CornerFull="capsule"}
class FloatingToolbarColors(val toolbarContainerColor:Color,val toolbarContentColor:Color,val fabContainerColor:Color,val fabContentColor:Color){fun json()="{\"toolbarContainer\":\"${toolbarContainerColor.role}\",\"toolbarContent\":\"${toolbarContentColor.role}\",\"fabContainer\":\"${fabContainerColor.role}\",\"fabContent\":\"${fabContentColor.role}\"}"}
class ColorScheme{var defaultFloatingToolbarStandardColorsCached:FloatingToolbarColors?=null;var defaultFloatingToolbarVibrantColorsCached:FloatingToolbarColors?=null;fun fromToken(color:Color)=color;fun contentColorFor(color:Color)=Color(if(color.role=="surface-container")"on-surface" else "on-"+color.role)}
fun placements()=Host.placements.entries.joinToString(prefix="{",postfix="}"){(k,v)->"\"$k\":${v.json()}"}
fun main(args:Array<String>){val scope=object:MeasureScope{};val out=mutableListOf<String>()
 when(args[0]){
 "fab"->for(vertical in listOf(false,true))for(intrinsic in listOf(0,64,160,219,320))for(intrinsicCross in listOf(16,64,72,112))for(progress in listOf(-.1f,0f,.125f,.33333334f,.5f,.75f,1f,1.08f))for(atEnd in listOf(false,true))for(rtl in listOf(false,true))for(max in listOf(50,200,10000))for(cross in listOf(80,99)){
  Host.rtl=rtl;Host.placements.clear();val position=if(vertical)if(atEnd)"bottom" else "top" else if(atEnd)"end" else "start"
  val constraints=if(vertical)Constraints(minWidth=cross,maxHeight=max)else Constraints(minHeight=cross,maxWidth=max)
  val children=listOf(if(vertical)Child("toolbar",intrinsicCross,intrinsic)else Child("toolbar",intrinsic,intrinsicCross),Child("fab",56,56))
  val result=with(scope){if(vertical)vertical(children,constraints,Value(progress),position)else horizontal(children,constraints,Value(progress),position)}
  out.add("{\"input\":{\"vertical\":$vertical,\"intrinsic\":$intrinsic,\"intrinsicCross\":$intrinsicCross,\"progress\":$progress,\"position\":\"$position\",\"rtl\":$rtl,\"max\":$max,\"cross\":$cross},\"size\":${result.json()},\"placements\":${placements()},\"elevation\":${Host.elevation}}")
 }
 "padding"->for(width in listOf(40,48,64,144))for(height in listOf(40,48,64))for(top in listOf(AlignmentLine.Unspecified,0,4,8))for(left in listOf(AlignmentLine.Unspecified,0,4,8))for(progress in listOf(0f,.125f,.5f,1f))for(leading in listOf(false,true))for(trailing in listOf(false,true)){
  Host.padding=progress;Host.placements.clear();val node=MinimumInteractiveBalancedPaddingNode(leading,trailing,Any());val result=with(node){with(scope){measure(Child("content",width,height,top,left),Constraints())}}
  out.add("{\"input\":{\"width\":$width,\"height\":$height,\"top\":${if(top==AlignmentLine.Unspecified)"null" else top},\"left\":${if(left==AlignmentLine.Unspecified)"null" else left},\"progress\":$progress,\"leading\":$leading,\"trailing\":$trailing},\"size\":${result.json()},\"placements\":${placements()}}")
 }
 "colors"->{val scheme=ColorScheme();out.add("{\"style\":\"standard\",\"colors\":${scheme.defaultFloatingToolbarStandardColors.json()}}");out.add("{\"style\":\"vibrant\",\"colors\":${scheme.defaultFloatingToolbarVibrantColors.json()}}")}
 "visibility"->for(vertical in listOf(false,true))for(current in listOf("none","start","end"))for(alignment in listOf("start","end"))for(size in listOf(-5,0,12,24,47,48,52))for(delta in listOf(-48,-12,0,12,48))for(state in listOf(EnterExitState.PreEnter,EnterExitState.Visible,EnterExitState.PostExit))for(currentState in listOf(EnterExitState.Visible,EnterExitState.PreEnter)){
  fun align(value:String)=if(vertical)Alignment(0f,if(value=="end")1f else -1f)else Alignment(if(value=="end")1f else -1f,0f)
  Host.vertical=vertical;Host.rtl=false;Host.currentAlignment=if(current=="none")null else align(current);Host.alignment=align(alignment);Host.animatedSize=if(vertical)IntSize(48,size)else IntSize(size,48);Host.animatedOffset=if(vertical)IntOffset(0,delta)else IntOffset(delta,0);Host.transition=Transition(currentState,state);Host.placements.clear()
  val node=VisibilityPolicy();val offset=node.targetOffsetByState(state,IntSize(48,48));val result=with(node){with(scope){measure(Child("content",48,48),Constraints())}}
  out.add("{\"input\":{\"vertical\":$vertical,\"current\":\"$current\",\"alignment\":\"$alignment\",\"animatedSize\":$size,\"delta\":$delta,\"targetState\":\"$state\",\"currentState\":\"$currentState\"},\"size\":${result.json()},\"placements\":${placements()},\"targetOffset\":{\"x\":${offset.x},\"y\":${offset.y}}}")
 }
 }
 println(out.joinToString(prefix="[",postfix="]"))
}
