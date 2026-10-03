package androidx.compose.animation.core
import kotlin.math.roundToInt

fun main(args: Array<String>) {
    if (args.firstOrNull() == "vectors") { exportColorVectors(); return }
    if (args.firstOrNull() == "toolbars") { exportToolbarMotion(); return }
    val cases = mutableListOf<String>()
    // Every Material motion role, plus critical/overdamped inflection cases.
    for ((damping, stiffness) in listOf(.6f to 800f, .8f to 380f, .8f to 200f,
        .9f to 1400f, .9f to 700f, .9f to 300f, 1f to 3800f, 1f to 1600f,
        1f to 800f, 1.5f to 380f, 1f to 1500f)) {
        val hoverAt64 = SpringSimulation(12f).also { it.stiffness=stiffness;it.dampingRatio=damping }.updateValues(4f,0f,64)
        val selectedAt64 = SpringSimulation(16f).also { it.stiffness=stiffness;it.dampingRatio=damping }.updateValues(4f,0f,64)
        val menuAt64 = SpringSimulation(1f).also { it.stiffness=stiffness;it.dampingRatio=damping }.updateValues(.8f,0f,64)
        val markerAt64 = SpringSimulation(20f).also { it.stiffness=stiffness;it.dampingRatio=damping }.updateValues(0f,0f,64)
        val shrinkingMarkerAt64 = SpringSimulation(0f).also { it.stiffness=stiffness;it.dampingRatio=damping }.updateValues(20f,0f,64)
        val tabOffsetAt64 = SpringSimulation(100f).also { it.stiffness=stiffness;it.dampingRatio=damping }.updateValues(0f,0f,64)
        val tabWidthAt64 = SpringSimulation(100f).also { it.stiffness=stiffness;it.dampingRatio=damping }.updateValues(24f,0f,64)
        for ((from, to, velocity) in listOf(Triple(hoverAt64.value,16f,hoverAt64.velocity), Triple(selectedAt64.value,4f,selectedAt64.velocity),Triple(0f,1f,0f), Triple(1f,0f,0f),
            Triple(0f,6f,0f), Triple(6f,0f,0f), Triple(.4f,1f,-12f),
            Triple(.8f,0f,20f), Triple(1f,0f,-80f), Triple(0f,0f,20f),
            Triple(1f,1f,0f), Triple(16f,24f,0f), Triple(8f,24f,0f),
            Triple(28f,16f,0f), Triple(2f,8f,0f), Triple(28f,24f,0f), Triple(22f,24f,0f),
            Triple(96f,220f,0f), Triple(220f,96f,0f), Triple(96f,360f,0f), Triple(360f,96f,0f),
            Triple(4f,0f,0f), Triple(0f,4f,0f), Triple(64f,48f,0f), Triple(48f,64f,0f),
            Triple(80f,220f,0f), Triple(220f,80f,0f), Triple(80f,360f,0f), Triple(360f,80f,0f),
            // Expressive list shape and dragged elevation channels.
            Triple(4f,12f,0f), Triple(12f,4f,0f), Triple(4f,16f,0f), Triple(16f,4f,0f),
            Triple(12f,16f,0f), Triple(16f,12f,0f), Triple(0f,8f,0f), Triple(8f,0f,0f),
            // Popup scale, selected-leading IntSize and group shape channels.
            Triple(.8f,1f,0f), Triple(1f,.8f,0f), Triple(menuAt64.value,.8f,menuAt64.velocity),
            Triple(markerAt64.value.roundToInt().toFloat(),0f,markerAt64.velocity),
            Triple(shrinkingMarkerAt64.value.roundToInt().toFloat(),20f,shrinkingMarkerAt64.velocity),
            Triple(0f,20f,0f), Triple(20f,0f,0f), Triple(16f,8f,0f), Triple(8f,16f,0f),
            Triple(12f,8f,0f), Triple(8f,12f,0f),
            // Tab indicator Dp width/offset, independent interruption and scroll Float.
            Triple(0f,100f,0f), Triple(100f,0f,0f), Triple(0f,200f,0f), Triple(200f,0f,0f),
            Triple(24f,44f,0f), Triple(44f,24f,0f), Triple(24f,100f,0f), Triple(100f,24f,0f),
            Triple(tabOffsetAt64.value,0f,tabOffsetAt64.velocity), Triple(tabWidthAt64.value,24f,tabWidthAt64.velocity),
            // Drawer anchors, drag release in both directions, reversal, and
            // release at the target anchor with residual pointer velocity.
            Triple(-360f,0f,0f), Triple(0f,-360f,0f), Triple(-240f,0f,0f), Triple(0f,-240f,0f),
            Triple(-320f,0f,0f), Triple(0f,-320f,0f),
            Triple(-180f,0f,900f), Triple(-180f,-360f,-900f),
            Triple(-180f,0f,-900f), Triple(-180f,-360f,900f),
            Triple(0f,0f,-900f), Triple(-360f,-360f,900f))) {
            val duration = estimateAnimationDurationMillis(stiffness, damping,
                velocity/.01f, (from-to)/.01f, 1f).coerceAtLeast(0)
            val simulation = SpringSimulation(to).also { it.stiffness=stiffness; it.dampingRatio=damping }
            val times = listOf(0L,1L,16L,32L,64L,80L,100L,128L,150L,160L,192L,200L,224L,256L,300L,320L,duration-1,duration)
                .filter { it>=0 }.distinct().sorted()
            val samples = times.joinToString(prefix="[",postfix="]") { time ->
                val motion = if(time>=duration) Motion(to,0f) else simulation.updateValues(from,velocity,time)
                "{\"time\":$time,\"position\":${motion.value},\"velocity\":${motion.velocity}}"
            }
            cases.add("{\"from\":$from,\"to\":$to,\"velocity\":$velocity,\"stiffness\":$stiffness,\"dampingRatio\":$damping,\"duration\":$duration,\"samples\":$samples}")
        }
    }
    println(cases.joinToString(prefix="[",postfix="]"))
}

fun exportToolbarMotion() {
 val out=mutableListOf<String>()
 fun add(from:Float,to:Float,velocity:Float,stiffness:Float,damping:Float,threshold:Float) {
  val duration=estimateAnimationDurationMillis(stiffness,damping,velocity/threshold,(from-to)/threshold,1f).coerceAtLeast(0)
  val sim=SpringSimulation(to).also{it.stiffness=stiffness;it.dampingRatio=damping}
  val samples=listOf(0L,16L,32L,64L,80L,128L,192L,256L,duration).distinct().sorted().joinToString(prefix="[",postfix="]"){time->val state=if(time>=duration)Motion(to,0f)else sim.updateValues(from,velocity,time);"{\"time\":$time,\"position\":${state.value},\"velocity\":${state.velocity}}"}
  out.add("{\"from\":$from,\"to\":$to,\"velocity\":$velocity,\"stiffness\":$stiffness,\"dampingRatio\":$damping,\"visibilityThreshold\":$threshold,\"duration\":$duration,\"samples\":$samples}")
 }
 for((damping,stiffness) in listOf(.6f to 800f,.9f to 1400f)) {
  for(distance in listOf(1f,48f)) {
   val at64=SpringSimulation(distance).also{it.stiffness=stiffness;it.dampingRatio=damping}.updateValues(0f,0f,64)
   add(0f,distance,0f,stiffness,damping,.01f);add(distance,0f,0f,stiffness,damping,.01f)
   if(distance==1f)add(at64.value,0f,at64.velocity,stiffness,damping,.01f)
   else {
    add(at64.value.roundToInt().toFloat(),0f,at64.velocity,400f,1f,1f)
    val shrinking=SpringSimulation(0f).also{it.stiffness=stiffness;it.dampingRatio=damping}.updateValues(distance,0f,64)
    add(shrinking.value.roundToInt().toFloat(),distance,shrinking.velocity,400f,1f,1f)
   }
  }
 }
 for(distance in listOf(-48f,48f)) {
  val at64=SpringSimulation(distance).also{it.stiffness=400f;it.dampingRatio=1f}.updateValues(0f,0f,64)
  add(0f,distance,0f,400f,1f,1f);add(distance,0f,0f,400f,1f,1f);add(at64.value.roundToInt().toFloat(),0f,at64.velocity,400f,1f,1f)
 }
 println(out.joinToString(prefix="[",postfix="]"))
}

// ColorVectorConverter uses [alpha, L, a, b]. All components share the maximum
// FloatSpringSpec duration, as in VectorizedFloatAnimationSpec.getDurationNanos.
fun exportColorVectors() {
    val cases = mutableListOf<String>()
    val vectors = listOf(
        Triple(listOf(1f,.5f,.01f,-.04f),listOf(1f,.7f,.04f,.01f),listOf(0f,0f,0f,0f)),
        Triple(listOf(1f,.7f,.04f,.01f),listOf(1f,.5f,.01f,-.04f),listOf(0f,0f,0f,0f)),
        Triple(listOf(1f,.7f,.04f,.01f),listOf(1f,.45f,.03f,.02f),listOf(0f,0f,0f,0f)),
        Triple(listOf(1f,.5f,.01f,-.04f),listOf(.38f,.5f,.01f,-.04f),listOf(0f,0f,0f,0f)),
        Triple(listOf(.38f,.5f,.01f,-.04f),listOf(1f,.7f,.04f,.01f),listOf(0f,0f,0f,0f)),
        Triple(listOf(1f,.5f,.008f,-.04f),listOf(.38f,.67f,.019f,.14f),listOf(0f,0f,0f,0f)),
        Triple(listOf(.7f,.4f,-.08f,.2f),listOf(1f,.8f,.2f,-.1f),listOf(2f,-4f,1f,-6f)),
        Triple(listOf(1f,.5f,.01f,-.04f),listOf(1f,.5f,.01f,-.04f),listOf(0f,0f,0f,0f))
    )
    fun json(value:List<Float>)=value.joinToString(prefix="[",postfix="]")
    for (stiffness in listOf(800f,1600f,3800f)) for ((from,to,velocity) in vectors) {
        val duration=from.indices.maxOf { i -> estimateAnimationDurationMillis(stiffness,1f,
            velocity[i]/.01f,(from[i]-to[i])/.01f,1f).coerceAtLeast(0) }
        val simulations=to.map { target -> SpringSimulation(target).also { it.stiffness=stiffness;it.dampingRatio=1f } }
        val times=listOf(0L,1L,16L,32L,64L,80L,100L,128L,160L,192L,224L,256L,320L,duration-1,duration)
            .filter { it>=0 }.distinct().sorted()
        val samples=times.joinToString(prefix="[",postfix="]") { time ->
            val states=from.indices.map { i -> if(time>=duration) Motion(to[i],0f) else simulations[i].updateValues(from[i],velocity[i],time) }
            "{\"time\":$time,\"value\":${json(states.map { it.value })},\"velocity\":${json(states.map { it.velocity })}}"
        }
        cases.add("{\"from\":${json(from)},\"to\":${json(to)},\"velocity\":${json(velocity)},\"stiffness\":$stiffness,\"dampingRatio\":1,\"duration\":$duration,\"samples\":$samples}")
    }
    println(cases.joinToString(prefix="[",postfix="]"))
}
