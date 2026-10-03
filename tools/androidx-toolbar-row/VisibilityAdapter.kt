var transition=VisibilityHost.transition
var currentAlignment:Alignment?=VisibilityHost.currentAlignment
val alignment:Alignment?=VisibilityHost.alignment
val exit=Exit(ChangeSize(VisibilityHost.alignment,if(VisibilityHost.vertical)IntSize(48,0)else IntSize(0,48)))
val sizeAnimation:Deferred<IntSize>?=Deferred(VisibilityHost.animatedSize)
val offsetAnimation:Deferred<IntOffset>?=Deferred(VisibilityHost.animatedOffset)
val slideAnimation:Deferred<IntOffset>?=null
val sizeTransitionSpec=Any();val slideSpec=Any()
var lookaheadSize=IntSize(-1,-1);var lookaheadConstraints=Constraints()
val graphicsLayerBlock=LayerFactory()
val mutableTransformState=TransformState()
fun isEnabled()=true
fun slideTargetValueByState(state:EnterExitState,target:IntSize)=IntOffset.Zero
fun sizeByState(state:EnterExitState,target:IntSize)=target
