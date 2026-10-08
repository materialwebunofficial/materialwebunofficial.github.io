/** Explicit event/density/abstract press hosts for the unchanged ClickableNode. */
package androidx.compose.foundation
import kotlin.math.sqrt

@RequiresOptIn annotation class ExperimentalFoundationApi
class MutableInteractionSource
class IndicationNodeFactory
class Role
class KeyEvent
enum class PointerType { Mouse, Touch, Stylus }
enum class PointerEventPass { Main, Final }
enum class GestureState { Idle, Waiting, Recognized }
data class IntSize(val width:Int,val height:Int)
data class Size(val width:Float,val height:Float)
data class Offset(val x:Float,val y:Float){operator fun minus(other:Offset)=Offset(x-other.x,y-other.y);fun getDistance()=sqrt(x*x+y*y);fun getDistanceSquared()=x*x+y*y}
class PointerInputChange(val position:Offset,val type:PointerType,val previousPressed:Boolean,val pressed:Boolean,var isConsumed:Boolean=false){fun consume(){isConsumed=true}}
class IndirectPointerInputChange(val position:Offset,val previousPressed:Boolean,val pressed:Boolean,var isConsumed:Boolean=false){fun consume(){isConsumed=true}}
fun IndirectPointerInputChange.changedToDownIgnoreConsumed()=!previousPressed&&pressed
fun IndirectPointerInputChange.changedToUp()=!isConsumed&&previousPressed&&!pressed
class PointerButtons(val isPrimaryPressed:Boolean)
class PointerEvent(val changes:List<PointerInputChange>,val buttons:PointerButtons)
class IndirectPointerEvent(val changes:List<IndirectPointerInputChange>)
inline fun <T> List<T>.fastAll(test:(T)->Boolean)=all(test)
inline fun <T> List<T>.fastAny(test:(T)->Boolean)=any(test)
fun Boolean.toInt()=if(this)1 else 0
var primaryOnly=true
fun firstDownRefersToPrimaryMouseButtonOnly()=primaryOnly
data class DpSize(val width:Float,val height:Float)
class Density(val density:Float){fun DpSize.toSize()=Size(width*density,height*density)}
class ViewConfiguration(val minimumTouchTargetSize:DpSize=DpSize(48f,48f),val touchSlop:Float=18f)
object LocalViewConfiguration
var sceneDensity=Density(1f)
var viewConfiguration=ViewConfiguration()
fun requireDensity()=sceneDensity
fun currentValueOf(local:LocalViewConfiguration)=viewConfiguration

open class AbstractClickableNode(interactionSource:MutableInteractionSource?,indicationNodeFactory:IndicationNodeFactory?,useLocalIndication:Boolean,var enabled:Boolean,onClickLabel:String?,role:Role?,var onClick:()->Unit):OriginalPadding(){
 var gestureState=GestureState.Idle
 val interactions=mutableListOf<String>()
 var clicks=0
 open fun onPointerEvent(pointerEvent:PointerEvent,pass:PointerEventPass,bounds:IntSize){}
 open fun onIndirectPointerEvent(event:IndirectPointerEvent,pass:PointerEventPass){}
 open fun onCancelPointerInput(){}
 open fun onCancelIndirectPointerInput(){}
 open fun onClickKeyDownEvent(event:KeyEvent)=false
 open fun onClickKeyUpEvent(event:KeyEvent)=false
 fun handlePressInteractionStart(down:PointerInputChange){interactions.add("press")}
 fun handlePressInteractionStart(down:IndirectPointerInputChange){interactions.add("indirect-press")}
 fun handlePressInteractionRelease(position:Offset,indirectPointer:Boolean){interactions.add(if(indirectPointer)"indirect-release" else "release")}
 fun handlePressInteractionCancel(indirectPointer:Boolean){interactions.add(if(indirectPointer)"indirect-cancel" else "cancel")}
 fun performClick(){clicks++;onClick()}
 fun updateCommon(interactionSource:MutableInteractionSource?,indicationNodeFactory:IndicationNodeFactory?,useLocalIndication:Boolean,enabled:Boolean,onClickLabel:String?,role:Role?,onClick:()->Unit){this.enabled=enabled;this.onClick=onClick}
}

data class Input(val kind:String,val x:Float,val y:Float,val primary:Boolean=true)
fun main(){
 val records=mutableListOf<String>()
 for(type in PointerType.values())for(size in listOf(IntSize(58,32),IntSize(32,32),IntSize(160,56)))for(density in listOf(1f,1.25f,2f))for(primary in listOf(false,true))for(enabled in listOf(false,true)){
  primaryOnly=primary;sceneDensity=Density(density)
  val center=Offset(size.width/2f,size.height/2f)
  val down=Input("down",center.x,center.y);val up=Input("up",center.x,center.y)
  val histories=listOf(
   listOf(down,up),
   listOf(down,Input("move",size.width+60f,center.y),Input("move",center.x,center.y),up),
   listOf(down,Input("move",-4f,center.y),up),
   listOf(down,Input("move",size.width.toFloat(),center.y),up),
   listOf(down,Input("consume-main",center.x,center.y),up),
   listOf(down,Input("consume-final",center.x,center.y),up),
   listOf(down,Input("cancel",0f,0f),up),
   listOf(down,Input("move",size.width+60f,center.y),up,down,up),
   listOf(down.copy(primary=false),up),
   listOf(down,Input("up",size.width+60f,center.y)),
   listOf(down,Input("move",center.x,-4f),up)
  )
  for((id,history)in histories.withIndex()){
   val node=ClickableNode(null,null,true,enabled,null,null,{})
   val field=node.javaClass.getDeclaredField("downEvent");field.isAccessible=true
   var pressed=false
   val frames=mutableListOf<String>()
   for(input in history){
    val previous=pressed;if(input.kind=="down")pressed=true;if(input.kind=="up"||input.kind=="cancel")pressed=false
    if(input.kind=="cancel")node.onCancelPointerInput()else{
     val change=PointerInputChange(Offset(input.x,input.y),type,previous,pressed,input.kind=="consume-main")
     val event=PointerEvent(listOf(change),PointerButtons(input.primary))
     node.onPointerEvent(event,PointerEventPass.Main,size)
     if(input.kind=="consume-final")change.consume()
     node.onPointerEvent(event,PointerEventPass.Final,size)
    }
    frames.add("{\"event\":\"${input.kind}\",\"x\":${input.x},\"y\":${input.y},\"primary\":${input.primary},\"pending\":${field.get(node)!=null},\"state\":\"${node.gestureState}\",\"clicks\":${node.clicks},\"calls\":${node.interactions.joinToString(prefix="[",postfix="]"){"\"$it\""}}}")
   }
   records.add("{\"type\":\"$type\",\"size\":{\"width\":${size.width},\"height\":${size.height}},\"density\":$density,\"primaryOnly\":$primary,\"enabled\":$enabled,\"history\":$id,\"frames\":${frames.joinToString(prefix="[",postfix="]")}}")
  }
 }
 println(records.joinToString(prefix="[",postfix="]"))
}
