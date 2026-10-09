// JVM platform/unused annotation leaves for the original plain-text buffer.
// Native TextFieldBuffer replace/delete/revert/selection, GapBuffer and
// ChangeTracker bodies execute; no styled annotation path is supplied.
package androidx.compose.foundation.text.input.internal

import androidx.compose.ui.text.AnnotatedString

internal class OffsetMappingCalculator {
    fun recordEditOperation(start:Int,end:Int,length:Int):Unit=error("Unused output mapping")
}
internal class TextStyleBuffer<T>(other:TextStyleBuffer<T>?=null) {
    init { if(other!=null)error("Unused styled input") }
    fun replaceText(start:Int,end:Int,length:Int):Unit=error("Unused styled input")
    fun syncTo(other:TextStyleBuffer<T>):Unit=error("Unused styled input")
    fun clear():Unit=error("Unused styled input")
}
internal fun CharSequence.toCharArray(destination:CharArray,destinationOffset:Int,sourceStartIndex:Int,sourceEndIndex:Int) {
    for(index in sourceStartIndex until sourceEndIndex)destination[destinationOffset+index-sourceStartIndex]=this[index]
}
internal inline fun Int.addExactOrElse(other:Int,fallback:()->Int):Int=try{Math.addExact(this,other)}catch(e:ArithmeticException){fallback()}
internal inline fun Int.subtractExactOrElse(other:Int,fallback:()->Int):Int=try{Math.subtractExact(this,other)}catch(e:ArithmeticException){fallback()}
