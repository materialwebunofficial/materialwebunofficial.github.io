package androidx.compose.material3
import androidx.compose.material3.tokens.*
annotation class Stable
data class Color(val role:Int,val alpha:Float=1f){companion object{val Transparent=Color(-1,0f);val Unspecified=Color(-2)}}
fun Color.takeOrElse(other:()->Color)=if(this==Color.Unspecified)other()else this
internal val ColorToken.value get()=Color(id)
data class BorderStroke(val width:Dp,val color:Color)
class ColorScheme{
 var defaultToggleButtonColorsCached:ToggleButtonColors?=null
 var defaultElevatedToggleButtonColorsCached:ToggleButtonColors?=null
 var defaultFilledTonalToggleButtonColorsCached:ToggleButtonColors?=null
 var defaultOutlinedToggleButtonColorsCached:ToggleButtonColors?=null
 internal fun fromToken(token:ColorToken)=Color(token.id)
}
fun Color.json()="{\"role\":$role,\"alpha\":$alpha}"
fun ToggleButtonColors.json()="{\"container\":${containerColor(true,false).json()},\"content\":${contentColor(true,false).json()},\"checkedContainer\":${containerColor(true,true).json()},\"checkedContent\":${contentColor(true,true).json()},\"disabledContainer\":${containerColor(false,false).json()},\"disabledContent\":${contentColor(false,false).json()}}"
fun main(){
 val scheme=ColorScheme()
 val colors=listOf("filled" to with(ToggleButtonDefaults){scheme.defaultToggleButtonColors},"elevated" to with(ElevatedToggleButtonDefaults){scheme.defaultElevatedToggleButtonColors},"tonal" to with(FilledTonalToggleButtonDefaults){scheme.defaultFilledTonalToggleButtonColors},"outlined" to with(OutlinedToggleButtonDefaults){scheme.defaultOutlinedToggleButtonColors})
 check(with(ToggleButtonDefaults){scheme.defaultToggleButtonColors===scheme.defaultToggleButtonColorsCached})
 for((_,c)in colors){check(c.copy()==c&&c.copy().hashCode()==c.hashCode());check(c.copy(contentColor=Color.Unspecified).contentColor==c.contentColor);check(c.containerColor(false,true)==c.containerColor(false,false));check(c.contentColor(false,true)==c.contentColor(false,false))}
 check(OutlinedToggleButtonDefaults.border(true,true)==null&&OutlinedToggleButtonDefaults.border(false,true)==null)
 println(colors.joinToString(prefix="{",postfix="}"){
  val json=it.second.json()
  val enabled=OutlinedToggleButtonDefaults.border(true,false)!!
  val disabled=OutlinedToggleButtonDefaults.border(false,false)!!
  val extra=if(it.first=="outlined")",\"border\":${enabled.color.json()},\"disabledBorder\":${disabled.color.json()},\"borderWidth\":${enabled.width.value}" else ""
  "\"${it.first}\":"+json.dropLast(1)+extra+"}"
 })
}
