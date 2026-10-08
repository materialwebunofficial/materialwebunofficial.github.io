package androidx.compose.material3
import androidx.compose.material3.tokens.*

// Color identity/alpha, scheme caches and theme lookup are explicit hosts.
// The original default ButtonColors getters execute against these hosts.
annotation class Stable
data class Color(val role:Int,val alpha:Float=1f){companion object{val Transparent=Color(-1,0f);val Unspecified=Color(-2)}}
fun Color.takeOrElse(other:()->Color)=if(this==Color.Unspecified)other()else this
class ColorScheme{
 var defaultButtonColorsCached:ButtonColors?=null
 var defaultElevatedButtonColorsCached:ButtonColors?=null
 var defaultFilledTonalButtonColorsCached:ButtonColors?=null
 var defaultOutlinedButtonColorsCached:ButtonColors?=null
 var defaultTextButtonColorsCached:ButtonColors?=null
 internal fun fromToken(token:ColorToken)=Color(token.id)
}
fun Color.json()="{\"role\":$role,\"alpha\":$alpha}"
fun ButtonColors.json()="{\"container\":${containerColor(true).json()},\"content\":${contentColor(true).json()},\"disabledContainer\":${containerColor(false).json()},\"disabledContent\":${contentColor(false).json()}}"
fun main(){
 val scheme=ColorScheme()
 val colors=with(ButtonDefaults){listOf("filled" to scheme.defaultButtonColors,"elevated" to scheme.defaultElevatedButtonColors,"tonal" to scheme.defaultFilledTonalButtonColors,"outlined" to scheme.defaultOutlinedButtonColors,"text" to scheme.defaultTextButtonColors)}
 check(with(ButtonDefaults){scheme.defaultButtonColors===scheme.defaultButtonColorsCached})
 for((_,c)in colors){check(c.copy()==c);check(c.copy(contentColor=Color.Unspecified).contentColor==c.contentColor)}
 println(colors.joinToString(prefix="{",postfix="}"){"\"${it.first}\":${it.second.json()}"})
}
