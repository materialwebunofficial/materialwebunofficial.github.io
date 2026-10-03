package androidx.compose.material3
import kotlin.math.roundToInt
@Target(AnnotationTarget.FUNCTION,AnnotationTarget.TYPE,AnnotationTarget.PROPERTY_GETTER) annotation class Composable
data class Dp(val value:Float):Comparable<Dp>{
 operator fun plus(other:Dp)=Dp(value+other.value)
 operator fun minus(other:Dp)=Dp(value-other.value)
 operator fun times(other:Int)=Dp(value*other)
 operator fun unaryMinus()=Dp(-value)
 override fun compareTo(other:Dp)=value.compareTo(other.value)
 companion object {val VectorConverter=TwoWayConverter<Dp,AnimationVector1D>()}
}
data class Sp(val value:Float)
val Int.dp get()=Dp(toFloat());val Double.dp get()=Dp(toFloat());val Int.sp get()=Sp(toFloat())
val Float.dp get()=Dp(this)
interface Density {val fontScale:Float get()=Host.fontScale;fun Dp.roundToPx()=value.roundToInt();fun Sp.roundToPx()=(value*fontScale).roundToInt();fun Int.toDp()=Dp(toFloat())}
enum class LayoutDirection {Ltr,Rtl}
data class Constraints(val minWidth:Int=0,val maxWidth:Int=Int.MAX_VALUE,val minHeight:Int=0,val maxHeight:Int=Int.MAX_VALUE){companion object{const val Infinity=Int.MAX_VALUE}}
fun mutableIntListOf()=mutableListOf<Int>()
fun Float.fastRoundToInt()=roundToInt()
fun IntArray.forEachIndexed(reverseInput:Boolean,action:(Int,Int)->Unit){val indices=if(reverseInput)indices.reversed() else indices;for(i in indices)action(i,this[i])}
class ScrollData{fun onLaidOut(density:Density,edgeOffset:Int,tabPositions:List<TabPosition>,selectedTab:Int){}}
object FirstBaseline;object LastBaseline
data class ChildSize(val width:Int,val height:Int,val firstBaseline:Int=15,val lastBaseline:Int=15){fun json()="{\"width\":$width,\"height\":$height,\"firstBaseline\":$firstBaseline,\"lastBaseline\":$lastBaseline}"}
data class Rect(val x:Int,val y:Int,val width:Int,val height:Int){fun json()="{\"x\":$x,\"y\":$y,\"width\":$width,\"height\":$height}"}
object Host {var fontScale=1f;var rtl=false;var children=emptyList<Measurable>();var constraints=Constraints();var result=MeasureResult(0,0);var placements=linkedMapOf<String,Rect>();var animationValues=mutableListOf<Dp>()}
class Placeable(val width:Int,val height:Int,val name:String,val first:Int=15,val last:Int=15){
 operator fun get(baseline:Any)=if(baseline===FirstBaseline)first else last
 class PlacementScope(val parentWidth:Int){
  fun Placeable.placeRelative(x:Int,y:Int){Host.placements[name]=Rect(if(Host.rtl)parentWidth-width-x else x,y,width,height)}
  fun Placeable.place(x:Int,y:Int){Host.placements[name]=Rect(x,y,width,height)}
 }
}
data class MeasureResult(val width:Int,val height:Int){fun json()="{\"width\":$width,\"height\":$height}"}
interface Measurable {val layoutId:String;fun measure(constraints:Constraints):Placeable;fun maxIntrinsicWidth(height:Int):Int;fun maxIntrinsicHeight(width:Int):Int}
class Child(override val layoutId:String,val size:ChildSize):Measurable {
 override fun measure(constraints:Constraints)=Placeable(size.width.coerceIn(constraints.minWidth,constraints.maxWidth),size.height.coerceIn(constraints.minHeight,constraints.maxHeight),layoutId,size.firstBaseline,size.lastBaseline)
 override fun maxIntrinsicWidth(height:Int)=size.width
 override fun maxIntrinsicHeight(width:Int)=size.height
}
interface MeasureScope:Density {
 val layoutDirection get()=if(Host.rtl)LayoutDirection.Rtl else LayoutDirection.Ltr
 fun layout(width:Int,height:Int,block:Placeable.PlacementScope.()->Unit):MeasureResult {Placeable.PlacementScope(width).block();return MeasureResult(width,height)}
}
fun Layout(content:()->Unit,policy:MeasureScope.(List<Measurable>,Constraints)->MeasureResult){Host.result=object:MeasureScope{}.policy(Host.children,Host.constraints)}
object Modifier {open class Node {val coroutineScope=CoroutineScope()};fun layoutId(id:String)=this;fun padding(horizontal:Dp)=this}
fun Box(modifier:Modifier,content:()->Unit){}
fun <T> List<T>.fastFirst(predicate:(T)->Boolean)=first(predicate)
fun <T,R> List<T>.fastMap(transform:(T)->R)=map(transform)
fun <T,R> List<T>.fastFold(initial:R,operation:(R,T)->R)=fold(initial,operation)
fun <T> List<T>.fastForEachIndexed(action:(Int,T)->Unit)=forEachIndexed(action)
fun <T> List<T>.fastForEach(action:(T)->Unit)=forEach(action)
data class TabPosition(val left:Dp,val width:Dp,val contentWidth:Dp){val right get()=left+width}
class RowScope {var positions=emptyList<TabPosition>();fun setTabPositions(value:List<TabPosition>){positions=value}}
interface State<T>{val value:T}
class MutableState<T>(override var value:T):State<T>
class AnimationVector1D
class TwoWayConverter<T,V>
class Animatable<T,V>(initial:T,converter:TwoWayConverter<T,V>){
 @Suppress("UNCHECKED_CAST") val value:T=Host.animationValues.removeAt(0) as T
 var targetValue:T=initial
 fun animateTo(target:T,spec:FiniteAnimationSpec<T>){targetValue=target}
}
typealias FiniteAnimationSpec<T> = Any
class CoroutineScope {fun launch(block:()->Unit){block()}}
interface LayoutModifierNode {fun MeasureScope.measure(measurable:Measurable,constraints:Constraints):MeasureResult}
class ScrollState(val maxValue:Int)
fun placedJson()=Host.placements.entries.joinToString(prefix="{",postfix="}"){(k,v)->"\"$k\":${v.json()}"}
fun main(args:Array<String>){
 val out=mutableListOf<String>();val density=object:Density{};val scope=object:MeasureScope{}
 when(args[0]){
 "baseline" -> for(width in listOf(64,128,300))for(text in listOf(null,ChildSize(20,20,15,15),ChildSize(80,20,14,14),ChildSize(200,40,15,35),ChildSize(120,60,17,57)))for(icon in listOf(null,ChildSize(24,24),ChildSize(40,40),ChildSize(56,56)))for(scale in listOf(1f,1.3f,2f))for(rtl in listOf(false,true)){
  Host.fontScale=scale;Host.rtl=rtl;Host.placements.clear();Host.constraints=Constraints(maxWidth=width)
  Host.children=listOfNotNull(text?.let{Child("text",it.copy(width=it.width+32))},icon?.let{Child("icon",it)})
  TabBaselineLayout(if(text==null)null else ({}),if(icon==null)null else ({}))
  out.add("{\"input\":{\"width\":$width,\"text\":${text?.json()?:"null"},\"icon\":${icon?.json()?:"null"},\"fontScale\":$scale,\"rtl\":$rtl},\"size\":${Host.result.json()},\"placements\":${placedJson()}}")
 }
 "rows" -> for(width in listOf(20,100,301,480,800))for(count in listOf(0,1,2,3,5,7))for(pattern in listOf(false,true))for(rtl in listOf(false,true)){
  Host.rtl=rtl;Host.placements.clear();val children=(0 until count).map{i->Child("tab$i",ChildSize(if(pattern)48+i*67 else 96,if(pattern)listOf(48,72,84)[i%3] else 48))}
  val row=RowScope();val result=with(scope){fixedRowPolicy(children,Constraints(maxWidth=width),row)}
  val data=children.joinToString(prefix="[",postfix="]"){it.size.json()};val positions=row.positions.joinToString(prefix="[",postfix="]"){p->"{\"left\":${p.left.value},\"width\":${p.width.value},\"contentWidth\":${p.contentWidth.value}}"}
  out.add("{\"input\":{\"width\":$width,\"tabs\":$data,\"rtl\":$rtl},\"size\":${result.json()},\"positions\":$positions,\"placements\":${placedJson()}}")
 }
 "scrollable-rows" -> for(count in listOf(0,1,2,3,5,7))for(minWidth in listOf(0f,48f,90f,90.5f,120f,120.4f))for(edge in listOf(0f,52f,52.4f,52.5f,80f))for(pattern in listOf(false,true))for(rtl in listOf(false,true)){
  Host.rtl=rtl;Host.placements.clear();val children=(0 until count).map{i->Child("tab$i",ChildSize(if(pattern)24+i*67 else 96,if(pattern)listOf(48,72,84)[i%3] else 48))};val row=RowScope()
  val result=with(scope){scrollableRowPolicy(children,Constraints(),row,edge.dp,minWidth.dp)}
  val data=children.joinToString(prefix="[",postfix="]"){it.size.json()};val positions=row.positions.joinToString(prefix="[",postfix="]"){p->"{\"left\":${p.left.value},\"width\":${p.width.value},\"contentWidth\":${p.contentWidth.value}}"}
  out.add("{\"input\":{\"tabs\":$data,\"minTabWidth\":$minWidth,\"edgePadding\":$edge,\"rtl\":$rtl},\"size\":${result.json()},\"positions\":$positions,\"placements\":${placedJson()}}")
 }
 "indicator" -> for(rowWidth in listOf(100,301,600))for(tabWidth in listOf(20,100,200))for(targetContent in listOf(24,44,120))for(rawWidth in listOf(18.5f,24f,45.5f,100.5f,220f))for(rawOffset in listOf(-.5f,0f,32.5f,100.5f,200f))for(scrollable in listOf(false,true))for(rtl in listOf(false,true)){
  Host.rtl=rtl;Host.placements.clear();val state=MutableState(listOf(TabPosition(0.dp,100.dp,100.dp)));val node=TabIndicatorOffsetNode(state,0,true,Any());val constraints=if(scrollable)Constraints(maxWidth=targetContent) else Constraints(minWidth=tabWidth,maxWidth=tabWidth)
  val child=Child("indicator",ChildSize(targetContent,3));with(node){with(scope){measure(child,constraints)}}
  state.value=listOf(TabPosition(200.dp,tabWidth.dp,targetContent.dp));Host.animationValues=mutableListOf(Dp(rawWidth),Dp(rawOffset));Host.placements.clear()
  val result=with(node){with(scope){measure(child,constraints)}};val drawn=Host.placements.getValue("indicator")
  // Placeable's public width is constrained; its real measured width is centered
  // by apparentToRealOffset. These host rules are pinned in Placeable.kt.
  val reported=result.width.coerceIn(constraints.minWidth,constraints.maxWidth)
  val relative=if(scrollable)maxOf(0,(tabWidth-reported)/2) else 0
  val parentX=if(rtl)rowWidth-reported-relative else relative
  val x=parentX+(reported-result.width)/2+drawn.x
  out.add("{\"input\":{\"rowWidth\":$rowWidth,\"tabWidth\":$tabWidth,\"targetContentWidth\":$targetContent,\"width\":$rawWidth,\"offset\":$rawOffset,\"scrollable\":$scrollable,\"rtl\":$rtl},\"x\":$x,\"width\":${drawn.width}}")
 }
 "scroll" -> for(visible in listOf(100,301,600))for(count in listOf(1,2,3,7))for(edge in listOf(0,52))for(tabWidth in listOf(90,140,220))for(selected in 0 until count){
  val positions=(0 until count).map{TabPosition((edge+it*tabWidth).dp,tabWidth.dp,40.dp)};val maxValue=maxOf(0,2*edge+count*tabWidth-visible);val owner=ScrollOwner(ScrollState(maxValue));val value=with(owner){positions[selected].calculateTabOffset(density,edge,positions)}
  val sizes=positions.joinToString(prefix="[",postfix="]"){"{\"left\":${it.left.value},\"width\":${it.width.value}}"}
  out.add("{\"input\":{\"maxValue\":$maxValue,\"edgePadding\":$edge,\"positions\":$sizes,\"selected\":$selected},\"offset\":$value}")
 }
 "center" -> for(width in listOf(0,33,100,101,180))for(height in listOf(48,71,72,73,88))for(childWidth in listOf(0,24,55,56,100))for(childHeight in listOf(48,71,72,73))for(rtl in listOf(false,true)){
  val y=IntArray(1);placeCenter(height,intArrayOf(childHeight),y,false);val x=CenterAlignment().align(childWidth,width,if(rtl)LayoutDirection.Rtl else LayoutDirection.Ltr)
  out.add("{\"input\":{\"tabWidth\":$width,\"rowHeight\":$height,\"contentSize\":{\"width\":$childWidth,\"height\":$childHeight}},\"rtl\":$rtl,\"x\":$x,\"y\":${y[0]}}")
 }
 "transport" -> for(initial in listOf(0,20,100))for(max in listOf(100,300))for(accumulator in listOf(-.49f,0f,.49f))for(direction in listOf(-1,1)){
  val state=ScrollTransport(initial,max,accumulator);val deltas=listOf(0f,.25f,.5f,-.5f,100.5f,-200.5f,300.1f,-20.3f,0f).map{it*direction};val samples=deltas.map{delta->val consumed=state.consume(delta);"{\"delta\":$delta,\"value\":${state.value},\"accumulator\":${state.accumulator},\"consumed\":$consumed}"}
  out.add("{\"initial\":$initial,\"maxValue\":$max,\"accumulator\":$accumulator,\"samples\":[${samples.joinToString()}]}")
 }
 "colors" -> for(secondary in listOf(false,true))for(selected in listOf(false,true))for(enabled in listOf(false,true))for(customInactive in listOf(false,true)){
  LocalContentColor.current=if(secondary)TabRowDefaults.secondaryContentColor else TabRowDefaults.primaryContentColor
  val color=if(customInactive)tabColor(selected,enabled,unselectedContentColor=Color("on-surface-variant")) else tabColor(selected,enabled)
  out.add("{\"secondary\":$secondary,\"selected\":$selected,\"enabled\":$enabled,\"customInactive\":$customInactive,\"role\":\"${color.role}\"}")
 }
 }
 println(out.joinToString(prefix="[",postfix="]"))
}
