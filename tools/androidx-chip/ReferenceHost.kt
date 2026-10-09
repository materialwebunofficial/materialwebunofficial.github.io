package reference
import kotlin.math.roundToInt
annotation class Stable
annotation class Composable
enum class ColorSchemeKeyTokens{/*COLORS*/}
enum class ShapeKeyTokens{/*SHAPES*/}
enum class TypographyKeyTokens{/*TYPOGRAPHIES*/}
typealias ColorToken=ColorSchemeKeyTokens
typealias ShapeToken=ShapeKeyTokens
typealias TypographyToken=TypographyKeyTokens
data class Color(val role:String,val alpha:Float=1f,val copied:Boolean=false){
 fun copy(alpha:Float=this.alpha)=Color(role,alpha,true)
 fun takeOrElse(block:()->Color)=if(role=="unspecified")block()else this
 fun json()="{\"role\":\"$role\",\"alpha\":$alpha,\"copied\":$copied}"
 companion object{val Transparent=Color("transparent",0f);val Unspecified=Color("unspecified",Float.NaN)}
}
fun fromToken(token:ColorToken)=Color(token.name)
val ColorToken.value get()=fromToken(this)
open class Shape(val role:String)
open class CornerBasedShape(role:String):Shape(role)
class RoundedCornerShape(role:String):CornerBasedShape(role)
fun fromToken(token:ShapeToken):Shape=RoundedCornerShape(token.name)
class FiniteAnimationSpec<T>(val name:String)
fun <T> key(key:Any,block:()->T)=block()
fun rememberAnimatedShape(shape:CornerBasedShape,spec:FiniteAnimationSpec<Float>)=shape
data class Dp(val value:Float){operator fun plus(other:Dp)=Dp(value+other.value);operator fun div(other:Int)=Dp(value/other)}
val Double.dp get()=Dp(toFloat());val Int.dp get()=Dp(toFloat())
interface Density{val density:Float;fun Dp.roundToPx()=(value*density).roundToInt()}
enum class LayoutDirection{Ltr,Rtl}
object Arrangement{interface Horizontal{val spacing:Dp;fun Density.arrange(totalSize:Int,sizes:IntArray,layoutDirection:LayoutDirection,outPositions:IntArray)}}
data class PaddingValues(val start:Dp,val top:Dp=0.dp,val end:Dp,val bottom:Dp=0.dp){constructor(horizontal:Dp):this(horizontal,end=horizontal)}
data class BorderStroke(val width:Dp,val color:Color)
class ChipElevation(val elevation:Dp,val pressedElevation:Dp,val focusedElevation:Dp,val hoveredElevation:Dp,val draggedElevation:Dp,val disabledElevation:Dp){fun values()=listOf(elevation.value,pressedElevation.value,focusedElevation.value,hoveredElevation.value,draggedElevation.value,disabledElevation.value)}
typealias SelectableChipElevation=ChipElevation
fun main(){
 val rows=mutableListOf<String>()
 for(family in listOf("assist","filter","input","suggestion"))for(elevated in listOf(false,true))for(expressive in listOf(false,true))for(enabled in listOf(false,true))for(selected in listOf(false,true)){
  val selectable=family=="filter"||family=="input"
  val base:Any=when(family){"filter"->if(elevated)if(expressive)tonalElevatedFilterColors()else elevatedfilterColors()else if(expressive)tonalFilterColors()else filterColors();"input"->if(expressive)tonalInputColors()else inputColors();"suggestion"->if(elevated)elevatedsuggestionColors()else suggestionColors();else->if(elevated)elevatedassistColors()else assistColors()}
  val colors=if(selectable){val c=base as SelectableChipColors;linkedMapOf("container" to c.containerColor(enabled,selected),"label" to c.labelColor(enabled,selected),"leading" to c.leadingIconContentColor(enabled,selected),"trailing" to c.trailingIconContentColor(enabled,selected))}else{val c=base as ChipColors;linkedMapOf("container" to c.containerColor(enabled),"label" to c.labelColor(enabled),"leading" to c.leadingIconContentColor(enabled),"trailing" to c.trailingIconContentColor(enabled))}
  val border=when(family){"filter"->if(elevated)null else filterChipBorder(enabled,selected);"input"->inputChipBorder(enabled,selected);"suggestion"->if(elevated)null else suggestionChipBorder(enabled);else->if(elevated)null else assistChipBorder(enabled)}
  val elevation=when(family){"filter"->if(elevated)elevatedFilterChipElevation()else filterChipElevation();"input"->inputChipElevation();"suggestion"->if(elevated)elevatedSuggestionChipElevation()else suggestionChipElevation();else->if(elevated)elevatedAssistChipElevation()else assistChipElevation()}
  val json=colors.entries.joinToString(","){(name,color)->"\"$name\":"+if(color.role=="unspecified")"{\"role\":\"unspecified\",\"alpha\":null,\"copied\":false}" else color.json()}
  val b=border?.let{"{\"width\":${it.width.value},\"color\":${it.color.json()}}"}?:"null"
  rows.add("{\"kind\":\"state\",\"family\":\"$family\",\"elevated\":$elevated,\"expressive\":$expressive,\"enabled\":$enabled,\"selected\":$selected,\"colors\":{$json},\"border\":$b,\"elevation\":${elevation.values()}}")
 }
 for(selected in listOf(false,true))for(pressed in listOf(false,true)){val shape=shapeByInteraction(expressiveShapes(),selected,pressed,FiniteAnimationSpec<Float>("FastSpatial"));rows.add("{\"kind\":\"shape\",\"selected\":$selected,\"pressed\":$pressed,\"role\":\"${shape.role}\"}")}
 for(family in listOf("filter","input"))for(avatar in listOf(false,true))for(leading in listOf(false,true))for(trailing in listOf(false,true))for(density in listOf(1f,1.25f,2f))for(rtl in listOf(false,true))for(extra in listOf(0,31)){
  val arrangement=if(family=="filter")FilterDefaults.horizontalArrangement(leading,trailing)else InputDefaults.horizontalArrangement(avatar,leading,trailing)
  val padding=if(family=="filter")PaddingValues(8.dp,end=8.dp)else InputDefaults.contentPadding(avatar,leading,trailing)
  val sizes=intArrayOf(if(avatar&&family=="input")(24*density).roundToInt()else if(leading)(18*density).roundToInt()else 0,(50*density).roundToInt(),if(trailing)(18*density).roundToInt()else 0)
  val scope=object:Density{override val density=density};val total=sizes.sum()+with(scope){arrangement.spacing.roundToPx()}*2+extra;val positions=IntArray(3)
  with(arrangement){with(scope){arrange(total,sizes,if(rtl)LayoutDirection.Rtl else LayoutDirection.Ltr,positions)}}
  rows.add("{\"kind\":\"arrangement\",\"family\":\"$family\",\"avatar\":$avatar,\"leading\":$leading,\"trailing\":$trailing,\"density\":$density,\"rtl\":$rtl,\"total\":$total,\"sizes\":${sizes.toList()},\"spacing\":${arrangement.spacing.value},\"padding\":{\"start\":${padding.start.value},\"end\":${padding.end.value}},\"positions\":${positions.toList()}}")
 }
 println(rows.joinToString(",","[","]"))
}
