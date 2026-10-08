package androidx.compose.material3
import kotlinx.coroutines.*
import kotlinx.coroutines.test.*

enum class LayoutDirection {Ltr,Rtl}
enum class TooltipAnchorPosition {Left,Right,Above,Below,Start,End,Unknown}
data class IntSize(val width:Int,val height:Int)
data class IntOffset(val x:Int,val y:Int)
data class IntRect(val left:Int,val top:Int,val right:Int,val bottom:Int){val width get()=right-left}
data class Rect(val left:Float,val right:Float)
interface PopupPositionProvider {fun calculatePosition(anchorBounds:IntRect,windowSize:IntSize,layoutDirection:LayoutDirection,popupContentSize:IntSize):IntOffset}
class MutableTransitionState<T>(initial:T):TransitionState<T>(initial)
object BasicTooltipDefaults {const val TooltipDuration=1500L}
interface TooltipState {val transition:MutableTransitionState<Boolean>;val isPersistent:Boolean;val isVisible:Boolean;suspend fun show(mutatePriority:androidx.compose.foundation.MutatePriority);fun dismiss();fun onDispose()}

@OptIn(ExperimentalCoroutinesApi::class)
fun main(){
 val positions=mutableListOf<String>(); val carets=mutableListOf<String>();val histories=mutableListOf<String>()
 val placements=listOf("left","right","top","bottom","start","end","unknown")
 val anchors=listOf(IntRect(0,0,48,48),IntRect(250,170,298,218),IntRect(-17,-19,1,1),IntRect(501,799,550,849),IntRect(0,30,1,31),IntRect(199,99,201,101),IntRect(2147483610,1,2147483647,40))
 val windows=listOf(IntSize(0,0),IntSize(390,844),IntSize(800,600),IntSize(17,21),IntSize(2147483647,100))
 val popups=listOf(IntSize(0,0),IntSize(40,24),IntSize(199,49),IntSize(320,100),IntSize(501,851))
 for((i,type) in TooltipAnchorPosition.values().withIndex())for(rtl in listOf(false,true))for(a in anchors)for(w in windows)for(p in popups)for(spacing in listOf(0,4,17)){
  val out=nativePosition(type,spacing,w,a,if(rtl)LayoutDirection.Rtl else LayoutDirection.Ltr,p)
  positions.add("{\"input\":{\"placement\":\"${placements[i]}\",\"rtl\":$rtl,\"spacing\":$spacing,\"anchor\":{\"left\":${a.left},\"top\":${a.top},\"right\":${a.right},\"bottom\":${a.bottom}},\"window\":{\"width\":${w.width},\"height\":${w.height}},\"popup\":{\"width\":${p.width},\"height\":${p.height}}},\"expected\":{\"x\":${out.x},\"y\":${out.y}}}")
 }
 for(width in listOf(0f,40f,199f,199.1f,320f,600f))for(screen in listOf(0,200,390,600))for(a in anchors){
  val rect=Rect(a.left.toFloat(),a.right.toFloat());val out=caretX(width,screen,rect)
  carets.add("{\"input\":[${width},$screen,{\"left\":${rect.left},\"right\":${rect.right}}],\"expected\":$out}")
 }
 for(persistent in listOf(false,true))for(pa in androidx.compose.foundation.MutatePriority.values())for(pb in androidx.compose.foundation.MutatePriority.values()) {
  runTest {
   val mutex=androidx.compose.foundation.MutatorMutex();val a=nativeState(persistent,mutex);val b=nativeState(false,mutex)
   val outcomes=mutableMapOf<String,String>();val events=mutableListOf<String>();val snapshots=mutableListOf<String>()
   fun snapshot(){snapshots.add("{\"time\":$currentTime,\"a\":[${a.transition.currentState},${a.transition.targetState},${a.isVisible}],\"b\":[${b.transition.currentState},${b.transition.targetState},${b.isVisible}],\"outcomes\":{${outcomes.entries.joinToString{ "\"${it.key}\":\"${it.value}\"" }}}}")}
   fun event(op:String,value:String=""){events.add("{\"op\":\"$op\",\"value\":\"$value\"}")}
   fun launchShow(state:TooltipState,id:String,p:androidx.compose.foundation.MutatePriority)=launch{try{state.show(p);outcomes[id]="resolved"}catch(e:TimeoutCancellationException){outcomes[id]="timeout"}catch(e:CancellationException){outcomes[id]="cancelled"}}
   val ja=launchShow(a,"a",pa);event("show-a",pa.name);runCurrent();snapshot()
   a.transition.currentState=a.transition.targetState;event("settle-a");runCurrent();snapshot()
   advanceTimeBy(1499);runCurrent();event("advance","1499");snapshot()
   a.dismiss();event("dismiss-a");runCurrent();snapshot()
   val jb=launchShow(b,"b",pb);event("show-b",pb.name);runCurrent();snapshot()
   advanceTimeBy(1);runCurrent();event("advance","1");snapshot()
   advanceTimeBy(1500);runCurrent();event("advance","1500");snapshot()
   a.onDispose();b.onDispose();event("dispose");runCurrent();snapshot()
   ja.cancel();jb.cancel();runCurrent()
   histories.add("{\"persistent\":$persistent,\"events\":${events.joinToString(prefix="[",postfix="]")},\"expected\":${snapshots.joinToString(prefix="[",postfix="]")}}")
  }
 }
 println("{\"positions\":${positions.joinToString(prefix="[",postfix="]")},\"carets\":${carets.joinToString(prefix="[",postfix="]")},\"histories\":${histories.joinToString(prefix="[",postfix="]")},\"transitions\":${transitionHistories().joinToString(prefix="[",postfix="]")}}")
}
