package androidx.compose.animation.core

// One-dimensional record host. Numerical interpolation/repetition/easing execute upstream.
open class AnimationVector(var value: Float) {
    val size = 1
    operator fun get(index: Int): Float = if (index == 0) value else 0f
    operator fun set(index: Int, number: Float) { if (index == 0) value = number }
}
class AnimationVector1D(value: Float) : AnimationVector(value)
@Suppress("UNCHECKED_CAST")
fun <V : AnimationVector> V.newInstance(): V = AnimationVector1D(0f) as V

// These scalar descriptors never request ArcSpline. Fail if that scope changes.
data class ArcMode(val value: Int) { companion object { val ArcLinear = ArcMode(0) } }
class ArcSpline(arcModes: IntArray, timePoints: FloatArray, y: Array<FloatArray>) {
    fun getPos(time: Float, v: FloatArray): Nothing = error("ArcSpline is outside this scalar host")
    fun getSlope(time: Float, v: FloatArray): Nothing = error("ArcSpline is outside this scalar host")
}
enum class RepeatMode { Restart, Reverse }
data class StartOffset(val value: Long)
const val SecondsToMillis = 1000

// Typed descriptor/DSL host only: all sampled values delegate to original classes.
class HostSpec<T>(val native: VectorizedDurationBasedAnimationSpec<AnimationVector1D>)
typealias AnimationSpec<T> = HostSpec<T>
class HostInfiniteSpec<T>(val native: VectorizedInfiniteRepeatableSpec<AnimationVector1D>)
class Keyframe(val value: Float, var easing: Easing = LinearEasing)
class KeyframesBuilder {
    var durationMillis = 0
    val values = linkedMapOf<Int, Keyframe>()
    infix fun Float.at(time: Int): Keyframe = Keyframe(this).also { values[time] = it }
    infix fun Keyframe.using(easing: Easing): Keyframe = also { this.easing = easing }
}
fun keyframes(init: KeyframesBuilder.() -> Unit): HostSpec<Float> {
    val config = KeyframesBuilder().apply(init)
    return HostSpec(VectorizedKeyframesSpec(config.values.mapValues {
        AnimationVector1D(it.value.value) to it.value.easing
    }, config.durationMillis))
}
private class TweenVectorSpec(
    override val durationMillis: Int,
    easing: Easing,
) : VectorizedDurationBasedAnimationSpec<AnimationVector1D> {
    override val delayMillis = 0
    private val spec = FloatTweenSpec(durationMillis, easing = easing)
    override fun getValueFromNanos(playTimeNanos: Long, initialValue: AnimationVector1D,
        targetValue: AnimationVector1D, initialVelocity: AnimationVector1D): AnimationVector1D =
        AnimationVector1D(spec.getValueFromNanos(playTimeNanos, initialValue.value, targetValue.value, initialVelocity.value))
    override fun getVelocityFromNanos(playTimeNanos: Long, initialValue: AnimationVector1D,
        targetValue: AnimationVector1D, initialVelocity: AnimationVector1D): AnimationVector1D =
        AnimationVector1D(spec.getVelocityFromNanos(playTimeNanos, initialValue.value, targetValue.value, initialVelocity.value))
}
fun tween(durationMillis: Int, easing: Easing): HostSpec<Float> = HostSpec(TweenVectorSpec(durationMillis, easing))
fun <T> infiniteRepeatable(animation: HostSpec<T>, repeatMode: RepeatMode = RepeatMode.Restart): HostInfiniteSpec<T> =
    HostInfiniteSpec(VectorizedInfiniteRepeatableSpec(animation.native, repeatMode))
