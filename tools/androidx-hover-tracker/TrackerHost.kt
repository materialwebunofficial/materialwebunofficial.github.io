/** Explicit collection, coordinate, modifier and Android-event hosts. Original
 * HitPathTracker, PointerIdArray and InternalPointerEvent controller bodies are
 * compiled separately unchanged (imports/actual declarations adapted for JVM).
 */
package androidx.compose.ui.input.pointer
import java.util.TreeMap

class LongSparseArray<T>(capacity:Int=10) {
 private val map=TreeMap<Long,T>()
 fun size()=map.size
 fun keyAt(index:Int)=map.keys.elementAt(index)
 fun valueAt(index:Int)=map.values.elementAt(index)
 fun put(key:Long,value:T){map[key]=value}
 fun remove(key:Long)=map.remove(key)
 fun clear()=map.clear()
 fun isEmpty()=map.isEmpty()
 fun containsKey(key:Long)=map.containsKey(key)
 operator fun get(key:Long)=map[key]
}
class MutableObjectList<T>(capacity:Int=10):ArrayList<T>(capacity)
class MutableVector<T>:ArrayList<T>()
fun <T> mutableVectorOf()=MutableVector<T>()
fun <T> mutableObjectListOf()=MutableObjectList<T>()
class MutableLongObjectMap<T>(capacity:Int=10) {
 private val map=linkedMapOf<Long,T>()
 fun getOrPut(key:Long,defaultValue:()->T)=map.getOrPut(key,defaultValue)
 fun forEach(callback:(Long,T)->Unit){map.forEach{(key,value)->callback(key,value)}}
 fun clear()=map.clear()
}
inline fun <T> List<T>.fastForEach(callback:(T)->Unit)=forEach(callback)
inline fun <T> List<T>.fastFirstOrNull(callback:(T)->Boolean)=firstOrNull(callback)
@JvmInline value class PointerId(val value:Long)
data class Offset(val x:Float,val y:Float) {
 fun isValid()=x.isFinite()&&y.isFinite()
}
data class IntSize(val width:Int,val height:Int)
class LayoutCoordinates(val size:IntSize,var origin:Offset=Offset(0f,0f),var scale:Float=1f) {
 fun localPositionOf(parent:LayoutCoordinates,point:Offset)=Offset((parent.origin.x+point.x*parent.scale-origin.x)/scale,(parent.origin.y+point.y*parent.scale-origin.y)/scale)
}
data class HistoricalChange(val uptimeMillis:Long,val position:Offset,val scaleFactor:Float=1f,val panOffset:Offset=Offset(0f,0f),val originalEventPosition:Offset=position)
enum class PointerType {Mouse,Touch,Stylus}
enum class PointerEventPass {Initial,Main,Final}
enum class PointerClassification {None,Pan,Pinch,Ambiguous,DeepPress}
class PointerInputChange(val id:PointerId,val position:Offset,val previousPosition:Offset,val pressed:Boolean,val previousPressed:Boolean,val type:PointerType,val historical:List<HistoricalChange> = emptyList()) {
 fun copy(previousPosition:Offset,currentPosition:Offset,historical:List<HistoricalChange>)=PointerInputChange(id,currentPosition,previousPosition,pressed,previousPressed,type,historical)
}
data class PointerInputData(val id:PointerId,val activeHover:Boolean)
class PointerInputEvent(val pointers:List<PointerInputData>,val eventType:PointerEventType,val activeGesture:PointerClassification=PointerClassification.None,val motionEvent:android.view.MotionEvent?=null)
class PointerEvent internal constructor(val changes:List<PointerInputChange>,internalPointerEvent:InternalPointerEvent) {var type=internalPointerEvent.pointerInputEvent.eventType}
object Nodes {const val PointerInput=1}
class LayoutNode {var isPlaced=true}
class Coordinator {val layoutNode=LayoutNode()}
class Modifier {
 class Node(val id:String,val layoutCoordinates:LayoutCoordinates) {
  var isAttached=true;var detachedListener:(()->Unit)?=null
  val coordinator=Coordinator()
  val events=mutableListOf<String>();internal val actor=OriginalHoverActor();val hovering get()=actor.hoverInteraction!=null
  var listener:((PointerEvent,PointerEventPass)->Unit)?=null
  fun onPointerEvent(event:PointerEvent,pass:PointerEventPass,size:IntSize) {
   events.add("${event.type}/$pass")
   actor.onPointerEvent(event,pass,size)
   listener?.invoke(event,pass)
  }
  fun onCancelPointerInput(){events.add("Cancel");actor.onCancelPointerInput()}
  fun detach(){isAttached=false;detachedListener?.invoke()}
 }
}
fun Modifier.Node.dispatchForKind(kind:Int,callback:(Modifier.Node)->Unit){callback(this)}

fun main() {
 val out=mutableListOf<String>()
 val families=listOf("checkbox" to IntSize(18,18),"radio" to IntSize(24,24),"switch" to IntSize(52,32),"fab" to IntSize(40,40),"button" to IntSize(120,40))
 for((family,size) in families)for(type in PointerType.values())for(scale in listOf(1f,1.25f,2f))for(inWindow in listOf(false,true)) {
  val root=LayoutCoordinates(IntSize(960,800));val origin=Offset(100f,150f);val coords=LayoutCoordinates(size,origin,scale);val modifier=Modifier.Node("control",coords);val tracker=HitPathTracker(root)
  val pointer=PointerId(17L)
  var previous=Offset(size.width/2f,size.height/2f);var wasPressed=false
  val frames=mutableListOf<String>()
  val steps=listOf(
   Triple("hover-center",previous,false),Triple("down-center",previous,true),
   Triple("held-corner",Offset(.5f,.5f),true),Triple("held-exact-right",Offset(size.width.toFloat(),size.height/2f),true),
   Triple("held-outside-right",Offset(size.width+1f,size.height/2f),true),Triple("held-return",previous,true),
   Triple("up-center",previous,false),Triple("hover-outside",Offset(size.width+1f,size.height/2f),false)
  )
  for((index,step) in steps.withIndex()) {
   val (label,point,pressed)=step
   if(index==0||index==1)tracker.addHitPath(pointer,listOf(modifier))
   val world=Offset(origin.x+point.x*scale,origin.y+point.y*scale);val oldWorld=Offset(origin.x+previous.x*scale,origin.y+previous.y*scale)
   val changes=LongSparseArray<PointerInputChange>();changes.put(pointer.value,PointerInputChange(pointer,world,oldWorld,pressed,wasPressed,type))
   val eventType=if(index==1)PointerEventType.Press else if(index==6)PointerEventType.Release else PointerEventType.Move
   modifier.events.clear()
   val internal=InternalPointerEvent(changes,PointerInputEvent(listOf(PointerInputData(pointer,type!=PointerType.Touch)),eventType))
   val dispatched=tracker.dispatchChanges(internal,if(index in 2..5)inWindow else true)
   frames.add("{\"label\":\"$label\",\"x\":${point.x},\"y\":${point.y},\"pressed\":$pressed,\"windowBounds\":${if(index in 2..5)inWindow else true},\"hover\":${modifier.hovering},\"dispatched\":$dispatched,\"events\":[${modifier.events.joinToString{"\"$it\""}}]}")
   previous=point;wasPressed=pressed
  }
  out.add("{\"kind\":\"layout\",\"family\":\"$family\",\"type\":\"$type\",\"size\":{\"width\":${size.width},\"height\":${size.height}},\"scale\":$scale,\"windowBounds\":$inWindow,\"frames\":[${frames.joinToString()}]}")
 }
 for(type in PointerType.values())for(mode in listOf("cancel","cancel-during-main","detach-during-initial")) {
  val root=LayoutCoordinates(IntSize(960,800));val modifier=Modifier.Node("control",LayoutCoordinates(IntSize(40,40)));val tracker=HitPathTracker(root);val pointer=PointerId(17L)
  val frames=mutableListOf<String>()
  fun dispatch(label:String,pressed:Boolean,previousPressed:Boolean,x:Float,add:Boolean=false) {
   if(add)tracker.addHitPath(pointer,listOf(modifier))
   val changes=LongSparseArray<PointerInputChange>();changes.put(pointer.value,PointerInputChange(pointer,Offset(x,20f),Offset(20f,20f),pressed,previousPressed,type))
   modifier.events.clear()
   val kind=if(pressed&&!previousPressed)PointerEventType.Press else PointerEventType.Move
   val event=InternalPointerEvent(changes,PointerInputEvent(listOf(PointerInputData(pointer,type!=PointerType.Touch)),kind))
   val dispatched=tracker.dispatchChanges(event)
   frames.add("{\"label\":\"$label\",\"hover\":${modifier.hovering},\"dispatched\":$dispatched,\"events\":[${modifier.events.joinToString{"\"$it\""}}]}")
  }
  dispatch("hover",false,false,20f,true);dispatch("down",true,false,20f,true)
  if(mode=="cancel") {
   modifier.events.clear();tracker.processCancel()
   frames.add("{\"label\":\"cancel\",\"hover\":${modifier.hovering},\"events\":[${modifier.events.joinToString{"\"$it\""}}]}")
  } else {
   modifier.listener={event,pass->
    if(event.type==PointerEventType.Move&&pass==if(mode=="cancel-during-main")PointerEventPass.Main else PointerEventPass.Initial) {
     modifier.listener=null;if(mode=="cancel-during-main")tracker.processCancel()else modifier.detach()
    }
   }
   dispatch("deferred-disposal",true,true,21f)
  }
  dispatch("held-after-cancel",true,true,22f)
  modifier.isAttached=true;dispatch("fresh-hover",false,false,20f,true)
  out.add("{\"kind\":\"lifecycle\",\"type\":\"$type\",\"mode\":\"$mode\",\"frames\":[${frames.joinToString()}]}")
 }
 for(type in PointerType.values()) {
  val root=LayoutCoordinates(IntSize(960,800));val modifier=Modifier.Node("control",LayoutCoordinates(IntSize(40,40)));val tracker=HitPathTracker(root);val pointer=PointerId(17L);val frames=mutableListOf<String>()
  fun move(label:String,x:Float,hit:Boolean) {
   if(hit)tracker.addHitPath(pointer,listOf(modifier))
   val changes=LongSparseArray<PointerInputChange>();changes.put(17L,PointerInputChange(pointer,Offset(x,20f),Offset(20f,20f),false,false,type))
   modifier.events.clear();tracker.dispatchChanges(InternalPointerEvent(changes,PointerInputEvent(listOf(PointerInputData(pointer,type!=PointerType.Touch)),PointerEventType.Move)))
   frames.add("{\"label\":\"$label\",\"hover\":${modifier.hovering},\"events\":[${modifier.events.joinToString{"\"$it\""}}]}")
  }
  move("enter",20f,true);modifier.actor.updateEnabled(false);move("disabled-move",21f,true)
  modifier.actor.updateEnabled(true);move("enabled-in-place",22f,true);move("outside",41f,false);move("fresh-reentry",20f,true)
  out.add("{\"kind\":\"enabled\",\"type\":\"$type\",\"frames\":[${frames.joinToString()}]}")
 }
 for((first,second) in listOf(PointerType.Mouse to PointerType.Stylus,PointerType.Stylus to PointerType.Mouse)) {
  val root=LayoutCoordinates(IntSize(960,800));val modifier=Modifier.Node("control",LayoutCoordinates(IntSize(40,40)));val tracker=HitPathTracker(root);val frames=mutableListOf<String>()
  fun move(label:String,id:Long,type:PointerType,x:Float,hit:Boolean) {
   val pointer=PointerId(id);if(hit)tracker.addHitPath(pointer,listOf(modifier))
   val changes=LongSparseArray<PointerInputChange>();changes.put(id,PointerInputChange(pointer,Offset(x,20f),Offset(20f,20f),false,false,type))
   modifier.events.clear();tracker.dispatchChanges(InternalPointerEvent(changes,PointerInputEvent(listOf(PointerInputData(pointer,true)),PointerEventType.Move)))
   frames.add("{\"label\":\"$label\",\"hover\":${modifier.hovering},\"events\":[${modifier.events.joinToString{"\"$it\""}}]}")
  }
  move("first-enter",1L,first,20f,true);move("second-enter",2L,second,21f,true)
  modifier.actor.updateEnabled(false);move("disabled-move",2L,second,22f,true)
  modifier.actor.updateEnabled(true);move("enabled-in-place",2L,second,23f,true)
  move("outside",2L,second,41f,false);move("fresh-reentry",2L,second,20f,true)
  out.add("{\"kind\":\"device-swap\",\"first\":\"$first\",\"type\":\"$second\",\"frames\":[${frames.joinToString()}]}")
 }
 println(out.joinToString(prefix="[",postfix="]"))
}
