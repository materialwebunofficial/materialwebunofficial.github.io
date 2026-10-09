package androidx.compose.runtime.collection

// MutableVector storage adapter; no composition/snapshot observation.
class Vector<T>{
 private val values=mutableListOf<T>()
 fun add(value:T){values.add(value)}
 fun remove(value:T){values.remove(value)}
 fun asMutableList():MutableList<T> = values
 fun forEach(action:(T)->Unit){values.forEach(action)}
}
fun <T> mutableVectorOf():Vector<T> = Vector()
