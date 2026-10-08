package androidx.compose.material3

// Field/container hosts around the unchanged Transition update/end/dispose bodies.
class HostAnimation {var resets=0;fun resetAnimation(){resets++}}
data class SegmentImpl<T>(val initialState:T,val targetState:T)
object AnimationConstants {const val UnspecifiedTime=Long.MIN_VALUE}
open class TransitionState<T>(initial:T){var currentState=initial;var targetState=initial;var isRunning=false;var removed=0;fun transitionRemoved(){removed++}}
class DeferredTransitionState<T>(initial:T):TransitionState<T>(initial)
inline fun <T> List<T>.fastForEach(block:(T)->Unit)=forEach(block)

fun transitionHistories():List<String>{
 val cases=mutableListOf<String>()
 for(initial in listOf(false,true))for(sequence in listOf(
  listOf("true","run","false","end"),listOf("true","end","false","run","dispose"),
  listOf("false","false","true","run","false","true","end"),listOf("true","run","false","run","dispose"))) {
  val state=MutableTransitionState(initial);val native=NativeTransition(state);val snapshots=mutableListOf<String>()
  for(op in sequence){
   if(op=="true"||op=="false"){state.targetState=op=="true";native.updateTarget(state.targetState)}
   if(op=="run")state.isRunning=true
   if(op=="end")native.onTransitionEnd()
   if(op=="dispose")native.onDisposed()
   snapshots.add("{\"current\":${state.currentState},\"target\":${state.targetState},\"visible\":${state.currentState||state.targetState},\"idle\":${state.currentState==state.targetState&&!state.isRunning},\"resets\":${native._animations.sumOf{it.resets}},\"removed\":${state.removed}}")
  }
  cases.add("{\"initial\":$initial,\"events\":${sequence.joinToString(prefix="[",postfix="]"){"\"$it\""}},\"expected\":${snapshots.joinToString(prefix="[",postfix="]")}}")
 }
 return cases
}
