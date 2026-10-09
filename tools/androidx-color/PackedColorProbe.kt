package androidx.compose.ui.graphics

import androidx.compose.ui.graphics.colorspace.*
import androidx.compose.animation.VectorConverter
import androidx.compose.animation.core.AnimationVector4D

private fun bits(values:FloatArray)=values.joinToString(",","[","]"){it.toRawBits().toUInt().toString()}
private fun colorJson(color:Color)="{\"packed\":\"${color.value.toString(16).padStart(16,'0')}\",\"space\":${color.colorSpace.id},\"bits\":${bits(floatArrayOf(color.red,color.green,color.blue,color.alpha))}}"
private fun vectorJson(color:Color):String {val v=Color.VectorConverter(color.colorSpace).convertToVector(color);return bits(floatArrayOf(v.v1,v.v2,v.v3,v.v4))}

fun main(){
 val rows=mutableListOf<String>()
 // Every half bit pattern, including signed zeros, subnormals, infinities and
 // NaN payloads. Recording raw bits avoids JSON normalizing numeric special values.
 for(h in 0..65535){val f=halfToFloat(h.toShort());rows.add("{\"type\":\"half\",\"half\":$h,\"bits\":${f.toRawBits().toUInt()},\"roundTrip\":${floatToHalf(f).toInt() and 65535}}")}
 // Both signs and all finite positive half rounding boundaries, adjacent Float
 // values included. The native routine rounds halfway up, not ties-to-even.
 for(h in 0 until 0x7bff){val lo=halfToFloat(h.toShort());val hi=halfToFloat((h+1).toShort());val middle=(lo+hi)*.5f;val at=middle.toRawBits()
  for(delta in -1..1)for(sign in listOf(0,Int.MIN_VALUE)){val b=(at+delta) or sign;val f=Float.fromBits(b);rows.add("{\"type\":\"float\",\"bits\":${b.toUInt()},\"half\":${floatToHalf(f).toInt() and 65535}}")}
 }
 val special=listOf(0x7f7fffff,0x7f800000,0x7fc00000,0x7fa12345,0x477ff000,0x47800000,0x47880000,0x7fffffff)
 for(b in special)for(sign in listOf(0,Int.MIN_VALUE)){val raw=b or sign;rows.add("{\"type\":\"float\",\"bits\":${raw.toUInt()},\"half\":${floatToHalf(Float.fromBits(raw)).toInt() and 65535}}")}
 val inputs=listOf(floatArrayOf(0f,0f,0f,0f),floatArrayOf(1f,1f,1f,1f),floatArrayOf(.5f,.01f,-.04f,1f),floatArrayOf(.95f,.4f,-.4f,.3f),floatArrayOf(.5f,-0f,-0f,.5f),floatArrayOf(-.5f,.5f,1.5f,1.5f),floatArrayOf(-1f,-2f,3f,-1f),floatArrayOf(.125f,.25f,.75f,.125f),floatArrayOf(103f/255f,80f/255f,164f/255f,1f),floatArrayOf(255f/255f,180f/255f,171f/255f,.38f),floatArrayOf(.00001f,.04045f,.0031308f,.001f),floatArrayOf(.003921569f,.99607843f,.5019608f,.5019608f))
 for(space in ColorSpaces.ColorSpacesArray)for(input in inputs){val c=Color(input[0],input[1],input[2],input[3],space);rows.add("{\"type\":\"color\",\"space\":${space.id},\"input\":${bits(input)},\"value\":${colorJson(c)},\"vector\":${vectorJson(c)}}")}
 for(source in ColorSpaces.ColorSpacesArray)for(destination in ColorSpaces.ColorSpacesArray)for(intent in listOf(RenderIntent.Perceptual,RenderIntent.Relative,RenderIntent.Saturation,RenderIntent.Absolute))for(input in inputs.takeLast(2)){
  val c=Color(input[0],input[1],input[2],input[3],source);val result=source.connect(destination,intent).transformToColor(c)
  rows.add("{\"type\":\"convert\",\"source\":${source.id},\"destination\":${destination.id},\"intent\":${intent.value},\"input\":${colorJson(c)},\"value\":${colorJson(result)}}")
 }
 for(destination in ColorSpaces.ColorSpacesArray)for(input in inputs){val v=AnimationVector4D(input[3],input[0],input[1],input[2]);val converter=Color.VectorConverter(destination);val c=converter.convertFromVector(v);rows.add("{\"type\":\"vector\",\"space\":${destination.id},\"input\":${bits(floatArrayOf(v.v1,v.v2,v.v3,v.v4))},\"value\":${colorJson(c)},\"roundTrip\":${vectorJson(c)}}")}
 println(rows.joinToString(",","[","]"))
}
