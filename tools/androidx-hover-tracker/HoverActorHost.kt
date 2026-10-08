/** AbstractClickable event/emission/update bodies are generated from the pinned
 * original source. Delegation, indication creation and synchronous coroutine
 * emission are explicit hosts; full Compose/coroutine scheduling is excluded.
 */
package androidx.compose.ui.input.pointer
class IndicationNodeFactory
class Role
class FocusableHost {fun update(source:MutableInteractionSource?) {}}
class CoroutineHost {fun launch(callback:()->Unit){callback()}}
class HoverInteraction {class Enter;class Exit(val enter:Enter)}
class PressInteraction {class Press;class Cancel(val press:Press)}
class MutableInteractionSource {val events=mutableListOf<Any>();fun emit(event:Any){events.add(event)};fun tryEmit(event:Any):Boolean{events.add(event);return true}}
class KeyInteractionHost {fun forEachValue(callback:(PressInteraction.Press)->Unit){};fun clear(){}}
enum class GestureState {Idle}
data class IntOffset(val x:Int,val y:Int){fun toOffset()=Offset(x.toFloat(),y.toFloat())}
val IntSize.center get()=IntOffset(width/2,height/2)
open class HoverActorHost {
 var enabled=true
 var interactionSource:MutableInteractionSource?=MutableInteractionSource()
 var userProvidedInteractionSource=interactionSource
 var indicationNodeFactory:IndicationNodeFactory?=null
 var useLocalIndication=false
 var onClickLabel:String?=null
 var role:Role?=null
 var onClick:()->Unit={}
 var lazilyCreateIndication=false
 var indicationNode:Any?=null
 var gestureNode:Any?=null
 var gestureState=GestureState.Idle
 val focusableNode=FocusableHost()
 var centerOffset=Offset(0f,0f)
 val coroutineScope=CoroutineHost()
 var hoverInteraction:HoverInteraction.Enter?=null
 var pressInteraction:PressInteraction.Press?=null
 var indirectPointerPressInteraction:PressInteraction.Press?=null
 var indirectPointerEventPressPosition:Offset?=null
 val currentKeyPressInteractions=KeyInteractionHost()
 fun <T> delegate(value:T)=value
 fun undelegate(value:Any){}
 fun invalidateSemantics(){}
 fun onObservedReadsChanged(){}
 fun shouldLazilyCreateIndication()=false
 fun recreateIndicationIfNeeded(){}
 fun initializeIndicationAndInteractionSourceIfNeeded(){}
 fun initializeGestureCoordination(){}
 open fun onPointerEvent(event:PointerEvent,pass:PointerEventPass,bounds:IntSize){}
 open fun onCancelPointerInput(){}
}
