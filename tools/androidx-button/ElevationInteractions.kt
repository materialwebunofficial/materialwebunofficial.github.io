package androidx.compose.foundation.interaction
import androidx.compose.material3.Offset
import androidx.compose.material3.runSuspend
interface Interaction
class HoverInteraction{class Enter:Interaction;class Exit(val enter:Enter):Interaction}
class FocusInteraction{class Focus:Interaction;class Unfocus(val focus:Focus):Interaction}
class PressInteraction{class Press(val position:Offset=Offset.Zero):Interaction;class Release(val press:Press):Interaction;class Cancel(val press:Press):Interaction}
class DragInteraction{class Start:Interaction}
class InteractionFlow{
 var collector:(suspend(Interaction)->Unit)?=null
 suspend fun collect(block:suspend(Interaction)->Unit){collector=block}
 fun emit(event:Interaction){collector?.let{runSuspend{it(event)}}}
}
class InteractionSource{val interactions=InteractionFlow()}
