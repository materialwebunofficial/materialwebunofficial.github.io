package androidx.compose.animation.core

// Constants and error helper only; the simulation/estimator execute upstream code.
internal object Spring { const val StiffnessVeryLow=50f; const val DampingRatioNoBouncy=1f }
internal fun throwIllegalArgumentException(message:String):Nothing = throw IllegalArgumentException(message)
