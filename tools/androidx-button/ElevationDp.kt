package androidx.compose.ui.unit
data class Dp(val value:Float){companion object}
val Int.dp get()=Dp(toFloat())
val Double.dp get()=Dp(toFloat())
val Float.dp get()=Dp(this)
val Dp.Companion.VectorConverter get()=Unit
