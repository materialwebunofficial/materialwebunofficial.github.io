package androidx.compose.animation.core
import kotlin.math.*

data class IntSize(val width:Int,val height:Int){companion object}
fun Float.fastRoundToInt()=roundToInt()
fun Int.fastCoerceAtLeast(value:Int)=coerceAtLeast(value)
fun Float.fastIsFinite()=isFinite()
fun Double.fastIsFinite()=isFinite()
inline fun checkPrecondition(value:Boolean,message:()->String){check(value,message)}
internal fun throwIllegalArgumentException(message:String):Nothing=throw IllegalArgumentException(message)
const val MillisToNanos=1_000_000L
val Animation<*,*>.durationMillis:Long get()=durationNanos/MillisToNanos
val SizeConverter:TwoWayConverter<IntSize,AnimationVector2D> get()=IntSizeToVector
fun <T> spring(visibilityThreshold:T?=null):FiniteAnimationSpec<T> = SpringSpec(visibilityThreshold=visibilityThreshold)
fun <T> delayed(spec:FiniteAnimationSpec<T>,delay:Long):FiniteAnimationSpec<T>{check(delay==0L);return spec}
annotation class InternalAnimationApi

// Host scheduling presents elapsed time relative to each new target. Seeking,
// delayed specs and initial-value handoffs are outside this executable boundary.
class SourceTransition<T,V:AnimationVector>(initialValue:T,val typeConverter:TwoWayConverter<T,V>){
 var value=initialValue
 var targetValue=initialValue
 var animationSpec:FiniteAnimationSpec<T> = spring()
 var velocityVector=typeConverter.convertToVector(initialValue).newInstance()
 var animation=TargetBasedAnimation(animationSpec,typeConverter,initialValue,initialValue,velocityVector)
 var initialValueAnimation:TargetBasedAnimation<T,V>?=null
 var useOnlyInitialValue=false
 var durationNanos=0L
 var resetSnapValue=NoReset
 val isSeeking=false
 val playTimeNanos=0L
 var isFinished=true
 val interruptionSpec:FiniteAnimationSpec<T> = spring()
 fun onChildAnimationUpdated(){}
 fun sample(ms:Long){value=animation.getValueFromNanos(ms*MillisToNanos);velocityVector=animation.getVelocityVectorFromNanos(ms*MillisToNanos).copy();isFinished=animation.isFinishedFromNanos(ms*MillisToNanos)}
 // SOURCE_UPDATE_ANIMATION
 // SOURCE_UPDATE_TARGET
}
const val NoReset=-1f
const val ResetNoSnap=-2f
const val ResetAnimationSnap=-3f

enum class EnterExitState{PreEnter,Visible,PostExit}
val PostExit=EnterExitState.PostExit
class ParentTransition(val currentState:Boolean,val targetState:Boolean,val isSeeking:Boolean,val hasInitialValueAnimations:Boolean)
fun parentGate(transition:ParentTransition,localPendingTargetState:Boolean?,forceVisible:Boolean):Boolean{
 val visible:(Boolean)->Boolean={it}
 // SOURCE_PARENT_GATE
}
fun exitFinished(currentState:EnterExitState,targetState:EnterExitState):Boolean{
 // SOURCE_EXIT_FINISHED
}
fun composed(parent:ParentTransition,pending:Boolean?,force:Boolean,current:EnterExitState,target:EnterExitState):Boolean{
 val shouldDisposeBlock:(EnterExitState,EnterExitState)->Boolean={current,target -> current == target && target == PostExit}
 val finished=exitFinished(current,target)
 val shouldDisposeAfterExit=if(finished)shouldDisposeBlock(current,target)else false
 return parentGate(parent,pending,force)&&(!finished||!shouldDisposeAfterExit)
}
