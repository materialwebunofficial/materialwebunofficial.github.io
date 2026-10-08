/** Explicit normalized-key, map, synchronous-emission and focus/delegation hosts. */
package androidx.compose.foundation
import kotlin.coroutines.*

data class Key(val keyCode:Long){companion object{val DirectionCenter=Key(23);val Enter=Key(66);val NumPadEnter=Key(160);val Spacebar=Key(62);val Tab=Key(61);val A=Key(29)}}
enum class KeyType{KeyDown,KeyUp}
val KeyDown=KeyType.KeyDown;val KeyUp=KeyType.KeyUp
data class KeyEvent(val key:Key,val type:KeyType)
interface KeyInputHost{fun onKeyEvent(event:KeyEvent):Boolean}
class PressInteraction{class Press(val position:Offset);class Release(val press:Press);class Cancel(val press:Press)}
class HoverInteraction{class Enter;class Exit(val enter:Enter)}
class MutableInteractionSource{
 val calls=mutableListOf<String>();private val ids=mutableMapOf<PressInteraction.Press,Int>()
 private fun record(value:Any){when(value){
  is PressInteraction.Press->{val id=ids.getOrPut(value){ids.size+1};calls.add("press:$id")}
  is PressInteraction.Release->calls.add("release:${ids[value.press]}")
  is PressInteraction.Cancel->calls.add("cancel:${ids[value.press]}")
  is HoverInteraction.Exit->calls.add("hover-exit")
 }}
 suspend fun emit(value:Any){record(value)}
 fun tryEmit(value:Any):Boolean{record(value);return true}
}
class Scope{fun launch(body:suspend ()->Unit){body.startCoroutine(object:Continuation<Unit>{override val context=EmptyCoroutineContext;override fun resumeWith(result:Result<Unit>){result.getOrThrow()}})}}
fun <T> MutableMap<Long,T>.forEachValue(body:(T)->Unit){values.toList().forEach(body)}
class FocusableHost{fun update(source:MutableInteractionSource?){}}

data class KeyInput(val key:Key?,val type:KeyType?=null,val operation:String="key")
fun main(){
 val records=mutableListOf<String>()
 for(key in listOf(Key.DirectionCenter,Key.Enter,Key.NumPadEnter,Key.Spacebar,Key.Tab,Key.A))for(enabled in listOf(false,true))for(provided in listOf(false,true)){
  val down=KeyInput(key,KeyDown);val up=KeyInput(key,KeyUp)
  val blur=KeyInput(null,operation="blur");val off=KeyInput(null,operation="disable");val on=KeyInput(null,operation="enable")
  val spaceDown=KeyInput(Key.Spacebar,KeyDown);val spaceUp=KeyInput(Key.Spacebar,KeyUp)
  val histories=listOf(listOf(down,up),listOf(down,down,up),listOf(up),listOf(down,spaceDown,up,spaceUp),listOf(down),
   listOf(down,blur,up),listOf(down,off,up),listOf(down,off,on,up),listOf(down,off,on,down,up),listOf(down,spaceDown,blur,up,spaceUp))
  for((id,events)in histories.withIndex()){
   val sink=if(provided)MutableInteractionSource()else null;val node=ClickableNode(sink,null,true,enabled,null,null,{})
   val frames=events.map{input->
    val consumed=when(input.operation){
     "blur"->{node.focusTest(false);false}
     "disable","enable"->{node.update(sink,null,true,input.operation=="enable",null,null,{});false}
     else->node.onKeyEvent(KeyEvent(input.key!!,input.type!!))
    }
    "{\"key\":${input.key?.keyCode},\"type\":${input.type?.let{"\"$it\""}},\"operation\":\"${input.operation}\",\"consumed\":$consumed,\"clicks\":${node.clicks},\"enabled\":${node.enabled},\"pending\":${node.currentKeyPressInteractions.keys.joinToString(prefix="[",postfix="]")},\"calls\":${sink?.calls.orEmpty().joinToString(prefix="[",postfix="]"){"\"$it\""}}}"
   }
   records.add("{\"key\":${key.keyCode},\"enabled\":$enabled,\"provided\":$provided,\"history\":$id,\"frames\":${frames.joinToString(prefix="[",postfix="]")}}")
  }
 }
 println(records.joinToString(prefix="[",postfix="]"))
}
