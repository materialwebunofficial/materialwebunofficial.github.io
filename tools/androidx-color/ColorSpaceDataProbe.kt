package androidx.compose.ui.graphics.colorspace

private fun arrayJson(v:FloatArray)=v.joinToString(",","[","]"){it.toString()}
private fun paramsJson(p:TransferParameters?)=if(p==null)"null"else "{\"gamma\":${p.gamma},\"a\":${p.a},\"b\":${p.b},\"c\":${p.c},\"d\":${p.d},\"e\":${p.e},\"f\":${p.f}}"
private fun matrix(owner:Any,name:String):FloatArray{val field=owner::class.java.getDeclaredField(name);field.isAccessible=true;return field.get(owner) as FloatArray}
fun main(){
 val spaces=ColorSpaces.ColorSpacesArray.map{space->
  val rgb=space as? Rgb;val adapted=rgb?.adapt(Illuminant.D50) as? Rgb
  "{\"id\":${space.id},\"name\":\"${space.name}\",\"rgb\":${rgb!=null},\"isSrgb\":${space.isSrgb},\"min\":${arrayJson(FloatArray(3){space.getMinValue(it)})},\"max\":${arrayJson(FloatArray(3){space.getMaxValue(it)})},\"parameters\":${paramsJson(rgb?.transferParameters)},\"toD50\":${if(adapted==null)"null"else arrayJson(adapted.transform)},\"fromD50\":${if(adapted==null)"null"else arrayJson(adapted.inverseTransform)}}"
 }
 val connectors=mutableListOf<String>()
 for(src in ColorSpaces.ColorSpacesArray)for(dst in ColorSpaces.ColorSpacesArray)for(intent in listOf(RenderIntent.Perceptual,RenderIntent.Relative,RenderIntent.Saturation,RenderIntent.Absolute)){
  if(src===dst)continue
  val c=src.connect(dst,intent)
  if(c is Connector.RgbConnector)connectors.add("\"${src.id}:${dst.id}:${intent.value}\":{\"rgb\":${arrayJson(matrix(c,"mTransform"))}}")
  else{val field=Connector::class.java.getDeclaredField("transform");field.isAccessible=true;val scale=field.get(c) as FloatArray?;if(scale!=null)connectors.add("\"${src.id}:${dst.id}:${intent.value}\":{\"scale\":${arrayJson(scale)}}")}
 }
 val oklab=Oklab::class.java;val matrices=listOf("M1","M2","InverseM1","InverseM2").map{name->val field=oklab.getDeclaredField(name);field.isAccessible=true;"\"$name\":${arrayJson(field.get(null) as FloatArray)}"}
 println("{\"spaces\":${spaces.joinToString(",","[","]")},\"connectors\":{${connectors.joinToString(",")}},\"oklab\":{${matrices.joinToString(",")}},\"d50\":${arrayJson(Illuminant.D50Xyz)}}")
}
