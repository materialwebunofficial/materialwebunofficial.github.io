package reference

annotation class Composable
annotation class Stable
annotation class Immutable
typealias ColorToken=String
typealias ShapeToken=String
typealias TypographyToken=String
typealias Shape=String
typealias Dp=Double
val Int.dp:Dp get()=toDouble()
val Double.dp:Dp get()=this
object ColorSchemeKeyTokens {/*ROLES*/}
object ShapeKeyTokens {/*SHAPES*/}
object TypographyKeyTokens {/*FONTS*/}
object ElevationTokens {const val Level0=0.0;const val Level3=6.0}
data class Color(val role:String,val alpha:Float=1f,val copied:Boolean=false){
    fun copy(alpha:Float)=Color(role,alpha,true)
    fun json()="{\"role\":\"$role\",\"alpha\":${alpha.toDouble()},\"copied\":$copied}"
    companion object {val Transparent=Color("transparent",0f);val Unspecified=Color("unspecified")}
}
fun Color.takeOrElse(block:()->Color)=if(this==Color.Unspecified)block()else this
data class TextSelectionColors(val key:Int=0)
object LocalTextSelectionColors {var current=TextSelectionColors()}
object ComposeMaterial3Flags {val isUpdatedTimepickerToggleEnabled=true}
class ColorScheme {
    var defaultOutlinedTextFieldColorsCached:TextFieldColors?=null
    var defaultTimeInputColorsCached:TimeInputColors?=null
    var defaultVibrantTimeInputColorsCached:TimeInputColors?=null
    fun fromToken(token:String)=Color(token)
}
object MaterialTheme {var colorScheme=ColorScheme()}
data class State<T>(val value:T)
fun <T> rememberUpdatedState(value:T)=State(value)
data class Spec<T>(val name:String)
enum class MotionSchemeKeyTokens {FastEffects,FastSpatial;fun <T> value()=Spec<T>(name)}
object Probe {val specs=mutableListOf<String>();var border:BorderStroke?=null;var background:Color?=null}
fun animateColorAsState(targetValue:Color,animationSpec:Spec<Color>):State<Color>{Probe.specs.add("{\"kind\":\"color\",\"spec\":\"${animationSpec.name}\",\"target\":${targetValue.json()}}");return State(targetValue)}
fun animateDpAsState(targetValue:Dp,animationSpec:Spec<Dp>):State<Dp>{Probe.specs.add("{\"kind\":\"dp\",\"spec\":\"${animationSpec.name}\",\"target\":$targetValue}");return State(targetValue)}
data class BorderStroke(val width:Dp,val color:Color)
class InteractionSource(val focused:Boolean)
fun InteractionSource.collectIsFocusedAsState()=State(focused)
open class Modifier {companion object:Modifier()}
fun Modifier.border(stroke:BorderStroke,shape:Shape):Modifier {Probe.border=stroke;return this}
fun Modifier.textFieldBackground(color:()->Color,shape:Shape):Modifier {Probe.background=color();return this}
fun Box(modifier:Modifier){}
fun TimeInputColors.paletteJson():String {
    val fields=linkedMapOf("containerColor" to containerColor,"periodSelectorBorderColor" to periodSelectorBorderColor,"periodSelectorSelectedContainerColor" to periodSelectorSelectedContainerColor,"periodSelectorContainerColor" to periodSelectorContainerColor,"periodSelectorSelectedContentColor" to periodSelectorSelectedContentColor,"periodSelectorContentColor" to periodSelectorContentColor,"timeSelectorSelectedContainerColor" to timeSelectorContainerColor(true),"timeSelectorContainerColor" to timeSelectorContainerColor(false),"timeSelectorSelectedContentColor" to timeSelectorContentColor(true),"timeSelectorContentColor" to timeSelectorContentColor(false))
    return fields.entries.joinToString(",","{","}"){(key,value)->"\"$key\":${value.json()}"}
}
fun main(){
    val rows=mutableListOf<String>()
    for(vibrant in listOf(false,true)) {
        MaterialTheme.colorScheme=ColorScheme()
        val scheme=MaterialTheme.colorScheme
        val colors=with(TimeInputDefaults){if(vibrant)scheme.defaultVibrantTimeInputColors else scheme.defaultTimeInputColors}
        val cached=with(TimeInputDefaults){if(vibrant)scheme.defaultVibrantTimeInputColors else scheme.defaultTimeInputColors}
        check(colors===cached)
        val copied=colors.copy(containerColor=Color.Unspecified,timeTextFieldColors=null)
        check(colors==copied&&colors.hashCode()==copied.hashCode())
        rows.add("{\"kind\":\"palette\",\"vibrant\":$vibrant,\"values\":${colors.paletteJson()}}")
        for(enabled in listOf(false,true))for(error in listOf(false,true))for(focused in listOf(false,true)){
            val field=colors.timeTextFieldColors
            val values=linkedMapOf("text" to field.textColor(enabled,error,focused),"container" to field.containerColor(enabled,error,focused),"indicator" to field.indicatorColor(enabled,error,focused),"cursor" to field.cursorColor(error))
            Probe.specs.clear();Probe.border=null;Probe.background=null
            OutlinedTextFieldDefaults.Container(enabled,error,InteractionSource(focused),colors=field)
            val json=values.entries.joinToString(",","{","}"){(key,value)->"\"$key\":${value.json()}"}
            rows.add("{\"kind\":\"field\",\"vibrant\":$vibrant,\"enabled\":$enabled,\"error\":$error,\"focused\":$focused,\"values\":$json,\"borderWidth\":${Probe.border!!.width},\"borderColor\":${Probe.border!!.color.json()},\"background\":${Probe.background!!.json()},\"animations\":[${Probe.specs.joinToString(",")}]}" )
        }
    }
    // Cached outlined factory must adopt a changed selection local without
    // overwriting TimeInput overrides through the complete copy implementation.
    val first=with(OutlinedTextFieldDefaults){MaterialTheme.colorScheme.defaultOutlinedTextFieldColors}
    LocalTextSelectionColors.current=TextSelectionColors(1)
    val second=with(OutlinedTextFieldDefaults){MaterialTheme.colorScheme.defaultOutlinedTextFieldColors}
    check(first!==second&&second.textSelectionColors===LocalTextSelectionColors.current)
    println(rows.joinToString(",","[","]"))
}
