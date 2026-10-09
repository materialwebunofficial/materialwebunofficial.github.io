package reference
import kotlin.math.roundToInt

// Density1 modifier/DrawScope adapters record actual original clip arguments.
enum class LayoutDirection{Ltr,Rtl}
interface Alignment {
 interface Horizontal{fun align(size:Int,space:Int,layoutDirection:LayoutDirection):Int;operator fun plus(other:Vertical):Alignment=error("Unused vertical combination")}
 interface Vertical
}
class Vertical(val bias:Float):Alignment.Vertical
class BiasAlignment(val horizontalBias:Float,val verticalBias:Float):Alignment
annotation class Immutable
fun Float.fastRoundToInt()=roundToInt()
data class Dp(val value:Float){fun toPx()=value}
val Int.dp get()=Dp(toFloat())
class PaddingValues(val left:Float,val right:Float){
 fun calculateLeftPadding(direction:LayoutDirection)=Dp(if(direction==LayoutDirection.Ltr)left else right)
 fun calculateRightPadding(direction:LayoutDirection)=Dp(if(direction==LayoutDirection.Ltr)right else left)
}
data class Size(val width:Float,val height:Float)
enum class ClipOp{Difference}
object Host{var clip:List<Float>?=null;var draws=0}
class DrawScope(val size:Size,val layoutDirection:LayoutDirection){fun drawContent(){Host.draws++}}
class Modifier(val scope:DrawScope){fun drawWithContent(block:DrawScope.()->Unit):Modifier{scope.block();return this}}
fun DrawScope.clipRect(left:Float,top:Float,right:Float,bottom:Float,operation:ClipOp,block:DrawScope.()->Unit){
 check(operation==ClipOp.Difference);Host.clip=listOf(left,top,right,bottom);block()
}
fun main(){
 val rows=mutableListOf<String>()
 for(width in listOf(0f,7.5f,31.5f,32f,40.25f,279.75f,280f,320.5f))
 for(labelWidth in listOf(-1f,0f,.25f,12.5f,62.96875f,109.34375f,280.25f))
 for(labelHeight in listOf(0f,16f,21.25f))for(bias in listOf(-1f,0f,1f))
 for(rtl in listOf(false,true))for(padding in listOf(16f to 16f,8.25f to 24.5f)){
  val direction=if(rtl)LayoutDirection.Rtl else LayoutDirection.Ltr
  Host.clip=null;Host.draws=0
  Modifier(DrawScope(Size(width,56f),direction)).outlineCutout({Size(labelWidth,labelHeight)},Horizontal(bias),PaddingValues(padding.first,padding.second))
  val output=Host.clip?.let{"["+it.joinToString(",")+"]"}?:"null"
  val bits=Host.clip?.let{"["+it.joinToString(","){value->(java.lang.Float.floatToRawIntBits(value).toLong() and 0xffffffffL).toString()}+"]"}?:"null"
  rows.add("{\"width\":$width,\"labelWidth\":$labelWidth,\"labelHeight\":$labelHeight,\"bias\":$bias,\"rtl\":$rtl,\"startPadding\":${padding.first},\"endPadding\":${padding.second},\"clip\":$output,\"clipBits\":$bits,\"draws\":${Host.draws}}")
 }
 println(rows.joinToString(",","[","]"))
}
