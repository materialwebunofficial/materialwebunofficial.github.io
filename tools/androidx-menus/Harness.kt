package androidx.compose.material3
import kotlin.math.roundToInt
annotation class Stable
annotation class Immutable
@RequiresOptIn annotation class ExperimentalMaterial3ExpressiveApi
typealias IntList=List<Int>
class MutableIntList(size:Int):ArrayList<Int>(size)
data class Dp(val value:Float){operator fun plus(other:Dp)=Dp(value+other.value);operator fun div(divisor:Int)=Dp(value/divisor)}
val Int.dp get()=Dp(toFloat())
val Double.dp get()=Dp(toFloat())
interface Density {fun Dp.roundToPx()=value.roundToInt()}
data class DpOffset(val x:Dp,val y:Dp)
data class IntOffset(val x:Int,val y:Int)
data class IntSize(val width:Int,val height:Int)
data class IntRect(val left:Int,val top:Int,val right:Int,val bottom:Int){
 constructor(offset:IntOffset,size:IntSize):this(offset.x,offset.y,offset.x+size.width,offset.y+size.height)
 val width get()=right-left;val height get()=bottom-top;val center get()=IntOffset((left+right)/2,(top+bottom)/2)
}
data class TransformOrigin(val pivotFractionX:Float,val pivotFractionY:Float){companion object {val Center=TransformOrigin(.5f,.5f)}}
enum class LayoutDirection {Ltr,Rtl}
interface PopupPositionProvider {fun calculatePosition(anchorBounds:IntRect,windowSize:IntSize,layoutDirection:LayoutDirection,popupContentSize:IntSize):IntOffset}
object Alignment {
 interface Horizontal {fun align(size:Int,space:Int,layoutDirection:LayoutDirection):Int}
 interface Vertical {fun align(size:Int,space:Int):Int}
 val Start=H(-1f);val End=H(1f);val CenterHorizontally=H(0f)
 val Top=V(-1f);val Bottom=V(1f);val CenterVertically=V(0f)
}
class H(val bias:Float,val logical:Boolean=true):Alignment.Horizontal {override fun align(size:Int,space:Int,layoutDirection:LayoutDirection)=((space-size)/2f*(1+(if(logical&&layoutDirection==LayoutDirection.Rtl)-bias else bias))).roundToInt()}
class V(val bias:Float):Alignment.Vertical {override fun align(size:Int,space:Int)=((space-size)/2f*(1+bias)).roundToInt()}
object AbsoluteAlignment {val Left=H(-1f,false);val Right=H(1f,false)}
object Arrangement {interface Horizontal {val spacing:Dp;fun Density.arrange(totalSize:Int,sizes:IntArray,layoutDirection:LayoutDirection,outPositions:IntArray)}}
val MenuVerticalMargin=48.dp
val MenuHorizontalMargin=8.dp
fun main(args:Array<String>){
 val output=mutableListOf<String>();val density=object:Density{}
 if(args[0]=="position"){
  val positions=listOf("above" to MenuAnchorPosition.Above,"below" to MenuAnchorPosition.Below,"left" to MenuAnchorPosition.Left,"right" to MenuAnchorPosition.Right,"start" to MenuAnchorPosition.Start,"end" to MenuAnchorPosition.End)
  for(window in listOf(IntSize(390,700),IntSize(840,900)))for(point in listOf(IntOffset(-40,-10),IntOffset(8,48),IntOffset(300,580),IntOffset(370,690),IntOffset(150,200),IntOffset(20,20)))
  for(width in listOf(112,288,400))for(height in listOf(44,160,800))for((name,position) in positions)for(rtl in listOf(false,true))for(offset in listOf(0,10,-15))for(margin in listOf(0,8)){
   val anchor=IntRect(point,IntSize(48,40));val size=IntSize(width,height);val direction=if(rtl)LayoutDirection.Rtl else LayoutDirection.Ltr
   val provider=DropdownMenuPositionProvider(DpOffset(offset.dp,offset.dp),density,position,horizontalMargin=margin)
   val result=provider.calculatePosition(anchor,window,direction,size);val origin=provider.transformOrigin
   output.add("{\"input\":{\"anchor\":{\"left\":${anchor.left},\"top\":${anchor.top},\"right\":${anchor.right},\"bottom\":${anchor.bottom}},\"windowSize\":{\"width\":${window.width},\"height\":${window.height}},\"size\":{\"width\":$width,\"height\":$height},\"position\":\"$name\",\"rtl\":$rtl,\"offsetX\":$offset,\"offsetY\":$offset,\"horizontalMargin\":$margin},\"x\":${result.x},\"y\":${result.y},\"origin\":{\"x\":${origin.pivotFractionX},\"y\":${origin.pivotFractionY}}}")
  }
 }else if(args[0]=="arrange"){
  for(width in listOf(112,256))for(leading in listOf(false,true))for(trailing in listOf(false,true))for(l in listOf(20,24))for(text in listOf(40,120))for(t in listOf(20,35))for(spacing in listOf(8,12))for(rtl in listOf(false,true)){
   val sizes=(if(leading)listOf(l) else emptyList())+listOf(text)+(if(trailing)listOf(t) else emptyList());val result=IntArray(sizes.size)
   val policy=MenuArrangement(spacing.dp,leading,trailing);with(policy){with(density){arrange(width,sizes.toIntArray(),if(rtl)LayoutDirection.Rtl else LayoutDirection.Ltr,result)}}
   output.add("{\"input\":{\"width\":$width,\"leading\":$leading,\"trailing\":$trailing,\"spacing\":$spacing,\"rtl\":$rtl,\"sizes\":${sizes.joinToString(prefix="[",postfix="]")}},\"positions\":${result.joinToString(prefix="[",postfix="]")}}")
  }
 }else if(args[0]=="shapes"){
  fun corners(shape:Shape)=listOf(shape.topStart.value,shape.topEnd.value,shape.bottomEnd.value,shape.bottomStart.value).joinToString(prefix="[",postfix="]")
  for(count in 1..4)for(index in 0 until count){
   for(selected in listOf(false,true))output.add("{\"kind\":\"item\",\"index\":$index,\"count\":$count,\"selected\":$selected,\"corners\":${corners(shapeItem(MenuDefaults.itemShape(index,count),selected))}}")
   for(hasBeenHovered in listOf(false,true))for(hovered in listOf(false,true))output.add("{\"kind\":\"group\",\"index\":$index,\"count\":$count,\"hasBeenHovered\":$hasBeenHovered,\"hovered\":$hovered,\"corners\":${corners(shapeGroup(MenuDefaults.groupShape(index,count),hasBeenHovered,hovered))}}")
  }
 }else{
  val scheme=ColorScheme()
  for(vibrant in listOf(false,true))for(selectable in listOf(false,true))for(enabled in listOf(false,true))for(selected in listOf(false,true)){
   val colors=if(selectable){val c=if(vibrant)scheme.defaultMenuSelectableItemVibrantColors else scheme.defaultMenuSelectableItemColors;listOf("content" to c.textColor(enabled,selected),"leading" to c.leadingIconColor(enabled,selected),"trailing" to c.trailingContentColor(enabled,selected),"container" to c.containerColor(enabled,selected))}else{val c=if(vibrant)scheme.defaultMenuItemVibrantColors else scheme.defaultMenuItemColors;listOf("content" to c.textColor(enabled),"leading" to c.leadingIconColor(enabled),"trailing" to c.trailingIconColor(enabled),"container" to c.containerColor(enabled))}
   val roles=colors.joinToString(prefix="{",postfix="}"){(key,color)->"\"$key\":{\"role\":\"${color.role}\",\"alpha\":${color.alpha}}"}
   output.add("{\"vibrant\":$vibrant,\"selectable\":$selectable,\"enabled\":$enabled,\"selected\":$selected,\"roles\":$roles}")
  }
 }
 println(output.joinToString(prefix="[",postfix="]"))
}
