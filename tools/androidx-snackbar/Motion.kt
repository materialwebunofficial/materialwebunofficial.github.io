package androidx.compose.animation.core
import androidx.compose.material3.tokens.ExpressiveMotionTokens as E
import androidx.compose.material3.tokens.StandardMotionTokens as S

private fun duration(from: Float, to: Float, velocity: Float, stiffness: Float, damping: Float) =
    estimateAnimationDurationMillis(stiffness, damping, velocity / .01f, (from - to) / .01f, 1f).coerceAtLeast(0)
private fun sample(from: Float, to: Float, velocity: Float, stiffness: Float, damping: Float, time: Long): Motion =
    if (time >= duration(from, to, velocity, stiffness, damping)) Motion(to, 0f)
    else SpringSimulation(to).also { it.stiffness = stiffness; it.dampingRatio = damping }.updateValues(from, velocity, time)
private fun channel(from: Float, to: Float, stiffness: Float, damping: Float, cut: Long): String {
    val initial = sample(from, to, 0f, stiffness, damping, cut)
    val end = from
    val duration = duration(initial.value, end, initial.velocity, stiffness, damping)
    val times = (listOf(0L, 1L, 16L, 32L, 64L, 96L, duration - 1, duration)).filter { it >= 0 }.distinct().sorted()
    val frames = times.joinToString(prefix = "[", postfix = "]") { time ->
        val state = sample(initial.value, end, initial.velocity, stiffness, damping, time)
        "{\"time\":$time,\"position\":${state.value},\"velocity\":${state.velocity}}"
    }
    return "{\"from\":${initial.value},\"to\":$end,\"velocity\":${initial.velocity},\"duration\":$duration,\"frames\":$frames}"
}
fun main() {
    val cases = mutableListOf<String>()
    for (standard in listOf(false, true)) for (cut in listOf(0L, 16L, 64L, 96L, 256L)) {
        val spatialStiffness = if (standard) S.SpringFastSpatialStiffness else E.SpringFastSpatialStiffness
        val spatialDamping = if (standard) S.SpringFastSpatialDamping else E.SpringFastSpatialDamping
        val effectsStiffness = if (standard) S.SpringFastEffectsStiffness else E.SpringFastEffectsStiffness
        val effectsDamping = if (standard) S.SpringFastEffectsDamping else E.SpringFastEffectsDamping
        val scale = channel(.8f, 1f, spatialStiffness, spatialDamping, cut)
        val alpha = channel(0f, 1f, effectsStiffness, effectsDamping, cut)
        cases.add("{\"scheme\":\"${if (standard) "standard" else "expressive"}\",\"cut\":$cut,\"scale\":$scale,\"alpha\":$alpha}")
    }
    println(cases.joinToString(prefix = "[", postfix = "]"))
}
