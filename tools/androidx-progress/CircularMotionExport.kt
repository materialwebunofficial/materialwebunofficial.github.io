package androidx.compose.animation.core

fun main(args: Array<String>) {
    if (args.firstOrNull() == "easing") { exportEasing(); return }
    if (args.firstOrNull() == "linear") { exportLinear(); return }
    if (args.firstOrNull() == "amplitude") { exportAmplitude(); return }
    if (args.firstOrNull() == "offset") { exportOffset(); return }
    val global = circularIndeterminateGlobalRotationAnimationSpec.native
    val additional = circularIndeterminateRotationAnimationSpec.native
    val progress = circularIndeterminateProgressAnimationSpec.native
    val times = sortedSetOf<Long>()
    for (time in 0L..6000L) times.add(time * MillisToNanos)
    for (cycle in 0L..3L) for (boundary in listOf(0L, 1L, 299L, 300L, 301L,
        1499L, 1500L, 1799L, 1800L, 2999L, 3000L, 3299L, 3300L, 4499L,
        4500L, 4799L, 4800L, 5999L, 6000L)) {
        for (fraction in listOf(0L, 1L, 125000L, 900000L, 999999L)) {
            times.add((cycle * 6000L + boundary) * MillisToNanos + fraction)
        }
    }
    for (frame in 0L..1200L) times.add(frame * 1000000000L / 60L)
    val records = times.joinToString(prefix = "[", postfix = "]") { nanos ->
        val zero = AnimationVector1D(0f)
        val g = global.getValueFromNanos(nanos, zero, AnimationVector1D(CircularGlobalRotationDegreesTarget), zero).value
        val a = additional.getValueFromNanos(nanos, zero, AnimationVector1D(CircularAdditionalRotationDegreesTarget), zero).value
        val p = progress.getValueFromNanos(nanos, AnimationVector1D(CircularIndeterminateMinProgress),
            AnimationVector1D(CircularIndeterminateMaxProgress), zero).value
        if (args.firstOrNull() == "draw-rotation") "{\"nanos\":$nanos,\"degrees\":${drawingRotation(g, a)}}"
        else "{\"nanos\":$nanos,\"global\":$g,\"additional\":$a,\"rotation\":${g + a},\"progress\":$p}"
    }
    println(records)
}

private fun exportLinear() {
    val specs = listOf(linearIndeterminateFirstLineTailAnimationSpec.native,
        linearIndeterminateFirstLineHeadAnimationSpec.native,
        linearIndeterminateSecondLineTailAnimationSpec.native,
        linearIndeterminateSecondLineHeadAnimationSpec.native)
    val times = sortedSetOf<Long>()
    for (time in 0L..1750L) times.add(time * MillisToNanos)
    for (cycle in 0L..3L) for (boundary in listOf(0L, 249L, 250L, 649L, 650L,
        899L, 900L, 999L, 1000L, 1249L, 1250L, 1499L, 1500L, 1749L, 1750L)) {
        for (fraction in listOf(0L, 1L, 125000L, 900000L, 999999L))
            times.add((cycle * 1750L + boundary) * MillisToNanos + fraction)
    }
    for (frame in 0L..420L) times.add(frame * 1000000000L / 60L)
    println(times.joinToString(prefix = "[", postfix = "]") { nanos ->
        val values = specs.map { it.getValueFromNanos(nanos, AnimationVector1D(0f),
            AnimationVector1D(1f), AnimationVector1D(0f)).value }
        "{\"nanos\":$nanos,\"fractions\":${values.joinToString(prefix = "[", postfix = "]")}}"
    })
}

private fun exportAmplitude() {
    val times = sortedSetOf<Long>()
    for (time in 0L..650L) times.add(time * MillisToNanos)
    for (time in listOf(0L, 1L, 249L, 250L, 499L, 500L, 501L))
        for (fraction in listOf(1L, 125000L, 900000L, 999999L)) times.add(time * MillisToNanos + fraction)
    for (frame in 0L..40L) times.add(frame * 1000000000L / 60L)
    val pairs = listOf(0f to 1f, 1f to 0f, .27f to .83f, .83f to .27f, .5f to .5f)
    println(pairs.flatMap { (from, to) -> times.map { nanos ->
        val spec = if (from < to) IncreasingAmplitudeAnimationSpec.native else DecreasingAmplitudeAnimationSpec.native
        val value = spec.getValueFromNanos(nanos, AnimationVector1D(from), AnimationVector1D(to), AnimationVector1D(0f)).value
        "{\"nanos\":$nanos,\"from\":$from,\"to\":$to,\"value\":$value}"
    } }.joinToString(prefix = "[", postfix = "]"))
}

private fun exportOffset() {
    val records = mutableListOf<String>()
    for (duration in listOf(50, 1000, 1234, 9000, 10000)) for (from in listOf(0f, .17f, .75f, .99999994f)) {
        val spec = offsetAnimationSpec(duration).native
        val times = sortedSetOf<Long>()
        if (from == 0f && duration in listOf(50, 1000, 9000))
            for (time in 0L..duration.toLong()) times.add(time * MillisToNanos)
        for (step in 0L..400L) times.add(duration * MillisToNanos * step / 100L)
        for (cycle in 0L..3L) for (boundary in listOf(0L, 1L, duration / 2L, duration - 1L, duration.toLong()))
            for (fraction in listOf(0L, 1L, 125000L, 900000L, 999999L))
                times.add((cycle * duration + boundary) * MillisToNanos + fraction)
        val zero = AnimationVector1D(0f)
        for (nanos in times) {
            val value = spec.getValueFromNanos(nanos, AnimationVector1D(from), AnimationVector1D(from + 1f), zero).value % 1f
            records.add("{\"nanos\":$nanos,\"from\":$from,\"duration\":$duration,\"value\":$value}")
        }
    }
    println(records.joinToString(prefix = "[", postfix = "]"))
}

private fun exportEasing() {
    val curves = listOf(
        floatArrayOf(.2f, 0f, 0f, 1f), floatArrayOf(.3f, 0f, .8f, .15f),
        floatArrayOf(.05f, .7f, .1f, 1f), floatArrayOf(.4f, 0f, .2f, 1f),
        floatArrayOf(.4f, 0f, .6f, 1f), floatArrayOf(0f, 0f, 1f, 1f),
        floatArrayOf(0f, 0f, 0f, 1f), floatArrayOf(1f, 0f, 1f, 1f),
        floatArrayOf(1f / 3f, 0f, 2f / 3f, 1f), floatArrayOf(.5f, .5f, .5f, .5f),
        floatArrayOf(.2f, 1.5f, .8f, 1.5f), floatArrayOf(.2f, -.5f, .8f, -.5f),
        floatArrayOf(1.2f, 0f, -.2f, 1f), floatArrayOf(0f, .2f, 1f, .8f),
    )
    val fractions = (0..1000).map { it / 1000f } +
        listOf(-.1f, 1.1f, .00000001f, .99999994f, .16666667f, .33333334f, .6666667f)
    val records = curves.joinToString(prefix = "[", postfix = "]") { curve ->
        val easing = CubicBezierEasing(curve[0], curve[1], curve[2], curve[3])
        val samples = fractions.joinToString(prefix = "[", postfix = "]") { fraction ->
            "{\"fraction\":$fraction,\"value\":${easing.transform(fraction)}}"
        }
        "{\"curve\":${curve.joinToString(prefix = "[", postfix = "]")},\"samples\":$samples}"
    }
    println(records)
}
