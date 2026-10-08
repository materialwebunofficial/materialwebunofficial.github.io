/** Native rounded membership/point selection with explicit flat-leaf hosts. */
package androidx.compose.foundation
import kotlin.math.min

data class CornerRadius(val x:Float,val y:Float=x)
data class Rect(val left:Float,val top:Float,val right:Float,val bottom:Float){val width get()=right-left;val height get()=bottom-top}
data class RoundRect(val left:Float,val top:Float,val right:Float,val bottom:Float,val topLeftCornerRadius:CornerRadius,val topRightCornerRadius:CornerRadius=topLeftCornerRadius,val bottomRightCornerRadius:CornerRadius=topLeftCornerRadius,val bottomLeftCornerRadius:CornerRadius=topLeftCornerRadius){val width get()=right-left;val height get()=bottom-top}
sealed class Outline{class Rectangle(val rect:Rect):Outline();class Rounded(val roundRect:RoundRect):Outline();class Generic(val path:Path):Outline()}
enum class PathOperation{Intersect}
class Path{val isEmpty:Boolean get()=error("Native path geometry is outside this fitted-rounded harness");fun addRoundRect(rect:RoundRect){error("Non-fitting corners require native Path execution")};fun addRect(rect:Rect){error("Generic path geometry is not hosted")};fun op(a:Path,b:Path,c:PathOperation){error("Native path ops are not hosted")};fun reset(){}}
class MutableObjectList<T>(capacity:Int){private val items=ArrayList<T>(capacity);val size get()=items.size;fun add(value:T){items.add(value)};operator fun get(i:Int)=items[i];fun removeAt(i:Int){items.removeAt(i)};fun removeRange(start:Int,end:Int){items.subList(start,end).clear()};fun clear(){items.clear()};fun isEmpty()=items.isEmpty()}
class MutableLongList(capacity:Int){private val items=ArrayList<Long>(capacity);val size get()=items.size;fun add(value:Long){items.add(value)};operator fun get(i:Int)=items[i];fun removeAt(i:Int){items.removeAt(i)};fun removeRange(start:Int,end:Int){items.subList(start,end).clear()};fun clear(){items.clear()}}
fun unpackFloat1(value:Long)=Float.fromBits((value shr 32).toInt())
val Offset.isFinite get()=x.isFinite()&&y.isFinite()
fun Float.fastIsFinite()=isFinite()
class Modifier{class Node(val id:String)}
class HitTestSource{fun entityType()=0}
class ClipLayer(val outline:Outline){fun isInLayer(p:Offset)=isInOutline(outline,p.x,p.y)}
internal open class CoordinatorHost(val measuredWidth:Int,val measuredHeight:Int,radius:Float,density:Float,target:Float){
 val minimumTouchTargetSize=Size(target*density,target*density)
 val useOutline=true
 val lastOutlineBounds=Rect(0f,0f,measuredWidth.toFloat(),measuredHeight.toFloat())
 val isClipping=true
 val layer:ClipLayer?=ClipLayer(Outline.Rounded(RoundRect(0f,0f,measuredWidth.toFloat(),measuredHeight.toFloat(),CornerRadius(radius))))
 val node=Modifier.Node("button")
 fun head(kind:Int):Modifier.Node?=node
 // The normal Surface leaf has no expanded bounds, transparent pointer node,
 // intercepted child or nested targets. Dispatch records the native result;
 // general modifier-tree traversal is intentionally not established here.
 fun hitTestChild(source:HitTestSource,p:Offset,result:HitTestResult,type:PointerType,inLayer:Boolean){}
 fun Modifier.Node?.hit(source:HitTestSource,p:Offset,result:HitTestResult,type:PointerType,inLayer:Boolean){if(this!=null)result.hit(this,inLayer){}}
 fun Modifier.Node?.hitNear(source:HitTestSource,p:Offset,result:HitTestResult,type:PointerType,inLayer:Boolean,distance:Float){if(this!=null)result.hitInMinimumTouchTarget(this,distance,inLayer){}}
 fun Modifier.Node?.outOfBoundsHit(source:HitTestSource,p:Offset,result:HitTestResult,type:PointerType,inLayer:Boolean,distance:Float,better:Boolean){if(better&&this!=null)result.hitInMinimumTouchTarget(this,distance,inLayer){}}
}
fun main(){
 val out=mutableListOf<String>()
 for(size in listOf(IntSize(0,0),IntSize(17,17),IntSize(32,32),IntSize(58,32),IntSize(73,40),IntSize(160,56),IntSize(200,136)))for(radius in listOf(0f,min(8f,min(size.width,size.height)/2f),min(size.width,size.height)/2f))for(density in listOf(1f,1.25f,2f))for(target in listOf(48f,64f))for(type in PointerType.values()){
  val w=size.width.toFloat();val h=size.height.toFloat()
  val points=listOf(Offset(w/2,h/2),Offset(0f,0f),Offset(1f,1f),Offset(radius/2,radius/2),Offset(w/2,0f),Offset(w,h/2),Offset(w/2,h),Offset(-4f,h/2),Offset(w/2,-4f),Offset(-4f,-4f),Offset(w+1f,h/2),Offset(w/2,h+1f),Offset(w+target*density,h/2))
  for(p in points){
   val node=OriginalCoordinator(size.width,size.height,radius,density,target)
   val result=HitTestResult();node.hitTest(HitTestSource(),p,result,type,true)
   val field=result.javaClass.getDeclaredField("distanceFromEdgeAndFlags");field.isAccessible=true
   val flags=if(result.isEmpty())null else DistanceAndFlags((field.get(result)as MutableLongList)[0])
   out.add("{\"input\":{\"width\":${size.width},\"height\":${size.height},\"radius\":$radius,\"density\":$density,\"target\":$target,\"type\":\"$type\",\"x\":${p.x},\"y\":${p.y}},\"selected\":${!result.isEmpty()},\"direct\":${result.hasHit()},\"inLayer\":${flags?.isInLayer?:false},\"distance\":${flags?.distance?:"null"}}")
  }
 }
 println(out.joinToString(prefix="[",postfix="]"))
}
