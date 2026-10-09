package androidx.compose.ui.graphics
import androidx.compose.ui.graphics.colorspace.ColorSpace
import androidx.compose.ui.graphics.colorspace.ColorSpaces
// Float Oklab components are explicit leaves. Native packed Color/space
// conversion is excluded; the original converter's ordering/clamps execute.
data class Color(val red:Float,val green:Float,val blue:Float,val alpha:Float=1f,val colorSpace:ColorSpace=ColorSpaces.Oklab){
    fun convert(space:ColorSpace)=copy(colorSpace=space)
    companion object
}
