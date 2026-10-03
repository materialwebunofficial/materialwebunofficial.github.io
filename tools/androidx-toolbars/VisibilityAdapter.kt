// Host-only animation values; the original node's complete measure body follows.
var transition=Host.transition
var currentAlignment:Alignment?=Host.currentAlignment
val alignment:Alignment?=Host.alignment
val exit=Exit(ChangeSize(Host.alignment,if(Host.vertical)IntSize(48,0)else IntSize(0,48)))
val sizeAnimation:Deferred<IntSize>?=Deferred(Host.animatedSize)
val offsetAnimation:Deferred<IntOffset>?=Deferred(Host.animatedOffset)
val slideAnimation:Deferred<IntOffset>?=null
val sizeTransitionSpec=Any();val slideSpec=Any()
var lookaheadSize=IntSize(-1,-1);var lookaheadConstraints=Constraints()
val graphicsLayerBlock=LayerFactory()
val mutableTransformState=TransformState()
fun isEnabled()=true
fun slideTargetValueByState(state:EnterExitState,target:IntSize)=IntOffset.Zero
fun sizeByState(state:EnterExitState,target:IntSize)=target
