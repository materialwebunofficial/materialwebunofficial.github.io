package androidx.compose.animation.core
internal inline fun checkPrecondition(value:Boolean,lazyMessage:()->String){check(value,lazyMessage)}
