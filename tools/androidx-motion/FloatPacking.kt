package androidx.compose.ui.util
internal fun packFloats(a:Float,b:Float):Long = (a.toRawBits().toLong() shl 32) or (b.toRawBits().toLong() and 0xffffffffL)
internal fun unpackFloat1(value:Long):Float = Float.fromBits((value shr 32).toInt())
internal fun unpackFloat2(value:Long):Float = Float.fromBits(value.toInt())
