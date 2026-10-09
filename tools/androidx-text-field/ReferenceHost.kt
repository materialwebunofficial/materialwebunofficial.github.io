package reference

// Symbolic roles and alpha-copy descriptors, not native packed Color values.
enum class ColorSchemeKeyTokens {/*TOKEN_NAMES*/}
typealias ColorToken=ColorSchemeKeyTokens
class Color(val role:String,val alpha:Float=1f,val copied:Boolean=false){
    fun copy(alpha:Float=this.alpha)=Color(role,alpha,true)
    companion object {val Transparent=Color("transparent",0f)}
}
fun fromToken(token:ColorSchemeKeyTokens)=Color(token.name)
class TextSelectionColors
object LocalTextSelectionColors {val current=TextSelectionColors()}
data class Spec(val name:String)
data class State<T>(val value:T,val spec:Spec)
enum class MotionSchemeKeyTokens {FastSpatial,FastEffects,SlowEffects;
    fun <T> value()=Spec(name)
}
class Segment<T>(val initial:T,val target:T){
    infix fun T.isTransitioningTo(other:T)=initial==this&&target==other
}
class Transition<T>(val initial:T,val target:T){
    fun animateFloat(label:String,transitionSpec:Segment<T>.()->Spec,targetValueByState:(T)->Float):State<Float> =
        State(targetValueByState(target),Segment(initial,target).transitionSpec())
}

fun main(){
    val rows=mutableListOf<String>()
    for(variant in listOf("filled","outlined"))for(enabled in listOf(false,true))for(error in listOf(false,true))for(focused in listOf(false,true)){
        val colors=if(variant=="filled")filled()else outlined()
        val values=linkedMapOf("text" to colors.textColor(enabled,error,focused),"container" to colors.containerColor(enabled,error,focused),"indicator" to colors.indicatorColor(enabled,error,focused),"leading" to colors.leadingIconColor(enabled,error,focused),"trailing" to colors.trailingIconColor(enabled,error,focused),"label" to colors.labelColor(enabled,error,focused),"placeholder" to colors.placeholderColor(enabled,error,focused),"supporting" to colors.supportingTextColor(enabled,error,focused),"prefix" to colors.prefixColor(enabled,error,focused),"suffix" to colors.suffixColor(enabled,error,focused),"cursor" to colors.cursorColor(error))
        val json=values.entries.joinToString(","){(name,color)->"\"$name\":{\"role\":\"${color.role}\",\"alpha\":${color.alpha},\"copied\":${color.copied}}"}
        rows.add("{\"kind\":\"colors\",\"variant\":\"$variant\",\"enabled\":$enabled,\"error\":$error,\"focused\":$focused,\"values\":{$json}}")
    }
    for(initial in InputPhase.values())for(target in InputPhase.values())for(expanded in listOf(false,true)){
        val transition=Transition(initial,target)
        val values=linkedMapOf("label" to transition.labelProgress(expanded),"placeholder" to transition.placeholderOpacity(expanded),"affix" to transition.affixOpacity(expanded))
        val json=values.entries.joinToString(","){(name,state)->"\"$name\":{\"value\":${state.value},\"spec\":\"${state.spec.name}\"}"}
        rows.add("{\"kind\":\"transition\",\"initial\":\"$initial\",\"target\":\"$target\",\"expanded\":$expanded,\"values\":{$json}}")
    }
    println(rows.joinToString(",","[","]"))
}
