package androidx.compose.animation.core

import androidx.compose.ui.unit.*
import androidx.compose.ui.util.fastRoundToInt
import kotlinx.coroutines.*

// Node scope delivery/cancellation and cache invalidation are platform hosts.
// Native setter/start/stop/attach/detach bodies are injected unchanged.
private const val MinAnimationDuration=50
private const val MinCircularVertexCount=5
class ScalarFloatState(var floatValue:Float)
class ScalarIntState(var intValue:Int)
class CacheSignals{
 var draw=0;var cache=0
 fun invalidateDraw(){draw++}
 fun invalidateDrawCache(){cache++}
}
class VertexHost{val currentVertexCount=ScalarIntState(-1)}

class LinearOwner(wavelengthParameter:Dp,waveSpeedParameter:Dp){
 var isAttached=false;lateinit var coroutineScope:CoroutineScope
 val waveOffset=ScalarFloatState(0f)
 var offsetAnimationJob:Job?=null
 var amplitudeAnimatable:Animatable<Float,AnimationVector1D>?=null
 val cacheDrawNode=CacheSignals()
 fun invalidateDrawCache(){cacheDrawNode.invalidateDrawCache()}
 /*LINEAR*/
 val value get()=waveOffset.floatValue
 val active get()=offsetAnimationJob?.isActive==true
 fun attach(clock:PulseClock){coroutineScope=CoroutineScope(SupervisorJob()+Dispatchers.Unconfined+clock);isAttached=true;onAttach()}
 fun detach(){isAttached=false;coroutineScope.cancel();onDetach()}
}
class CircularOwner(wavelengthParameter:Dp,waveSpeedParameter:Dp,amplitudeParameter:Float){
 var isAttached=false;lateinit var coroutineScope:CoroutineScope
 val waveOffsetState=ScalarFloatState(0f)
 var offsetAnimatable:Animatable<Float,AnimationVector1D>?=null
 var offsetAnimationJob:Job?=null
 var vertexCountForCurrentAnimation=-1
 var globalRotationAnimatable:Animatable<Float,AnimationVector1D>?=null
 var additionalRotationAnimatable:Animatable<Float,AnimationVector1D>?=null
 var progressSweepAnimatable:Animatable<Float,AnimationVector1D>?=null
 var indeterminateAnimationsJob:Job?=null
 val cacheDrawNode=CacheSignals();val circularShapes=VertexHost()
 fun isDrawingWave():Boolean=amplitude>0f
 fun invalidateDrawCache(){cacheDrawNode.invalidateDrawCache()}
 /*CIRCULAR*/
 fun cache(vertices:Int){circularShapes.currentVertexCount.intValue=vertices
 /*CACHE_BRANCH*/
 }
 val value get()=waveOffsetState.floatValue
 val active get()=offsetAnimationJob?.isActive==true
 fun attach(clock:PulseClock){coroutineScope=CoroutineScope(SupervisorJob()+Dispatchers.Unconfined+clock);isAttached=true;onAttach()}
 fun detach(){isAttached=false;coroutineScope.cancel();onDetach()}
}
