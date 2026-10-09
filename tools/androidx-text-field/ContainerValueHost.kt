package androidx.compose.ui.unit
data class Dp(val value:Float){companion object}
val Dp.Companion.VisibilityThreshold get()=Dp(.1f)
