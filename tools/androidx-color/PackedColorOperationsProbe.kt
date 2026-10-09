package androidx.compose.ui.graphics
import androidx.compose.ui.graphics.colorspace.ColorSpaces
private fun bits(v:FloatArray)=v.joinToString(",","[","]"){it.toRawBits().toUInt().toString()}
private fun color(c:Color)="{\"packed\":\"${c.value.toString(16).padStart(16,'0')}\",\"space\":${c.colorSpace.id},\"bits\":${bits(floatArrayOf(c.red,c.green,c.blue,c.alpha))}}"
fun main(){
 val rows=mutableListOf<String>();val input=listOf(floatArrayOf(.5f,.01f,-.04f,1f),floatArrayOf(.7f,.04f,.01f,.38f),floatArrayOf(.125f,.25f,.75f,.125f),floatArrayOf(1f,180f/255f,171f/255f,.38f))
 for(space in ColorSpaces.ColorSpacesArray)for(v in input){val c=Color(v[0],v[1],v[2],v[3],space);for(alpha in listOf(-1f,-0f,0f,.001f,.1f,.38f,.5f,.9f,1f,1.5f)){rows.add("{\"type\":\"copy\",\"input\":${color(c)},\"alpha\":${alpha.toRawBits().toUInt()},\"value\":${color(c.copy(alpha=alpha))}}")}}
 for(from in ColorSpaces.ColorSpacesArray)for(to in ColorSpaces.ColorSpacesArray)for(i in listOf(0,2)){val a=input[i];val b=input[i+1];val start=Color(a[0],a[1],a[2],a[3],from);val stop=Color(b[0],b[1],b[2],b[3],to)
  for(t in listOf(-1f,-0f,0f,.0001f,.01f,.2f,.5f,.999f,1f,1.5f)){rows.add("{\"type\":\"lerp\",\"start\":${color(start)},\"stop\":${color(stop)},\"fraction\":${t.toRawBits().toUInt()},\"value\":${color(lerp(start,stop,t))}}")}
 }
 println(rows.joinToString(",","[","]"))
}
