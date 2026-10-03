package androidx.compose.foundation.shape

annotation class Stable
annotation class Immutable
annotation class IntRange(val from:Long=0,val to:Long=100)
annotation class FloatRange(val from:Double=0.0,val to:Double=100.0)
interface InspectableValue { val valueOverride:Any? }
interface Interpolatable { fun lerp(other:Any?,t:Float):Any? }
fun requirePrecondition(value:Boolean,message:()->String){ if(!value)throw IllegalArgumentException(message()) }
fun throwIllegalArgumentException(message:String):Nothing = throw IllegalArgumentException(message)
data class Dp(val value:Float)
val Int.dp get()=Dp(toFloat())
val Float.dp get()=Dp(this)
interface Density { val density:Float; /* ORIGINAL_DP_TO_PX */ }
data class TestDensity(override val density:Float):Density
enum class LayoutDirection { Ltr,Rtl }
data class Size(val width:Float,val height:Float){
    val minDimension get()=kotlin.math.min(kotlin.math.abs(width),kotlin.math.abs(height))
}
data class Offset(val x:Float,val y:Float)
data class Rect(val left:Float,val top:Float,val right:Float,val bottom:Float)
fun Size.toRect()=Rect(0f,0f,width,height)
data class CornerRadius(val x:Float,val y:Float=x){ companion object { val Zero=CornerRadius(0f) } }
sealed class Outline {
    class Rectangle(val rect:Rect):Outline()
    class Rounded(val roundRect:RoundRect):Outline()
    class Generic(val path:Path):Outline()
}
class Path {
    val points=mutableListOf<Offset>();var closed=false
    fun moveTo(x:Float,y:Float){points.add(Offset(x,y))}
    fun lineTo(x:Float,y:Float){points.add(Offset(x,y))}
    fun close(){closed=true}
}
fun Float.toStringAsFixed(digits:Int)=java.lang.String.format(java.util.Locale.ROOT,"%.${digits}f",toDouble())
