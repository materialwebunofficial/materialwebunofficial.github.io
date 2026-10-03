
data class Offset(val x:Float,val y:Float) {
 operator fun minus(o:Offset)=Offset(x-o.x,y-o.y)
 operator fun plus(o:Offset)=Offset(x+o.x,y+o.y)
 operator fun times(v:Float)=Offset(x*v,y*v)
 fun getDistance()=sqrt(x*x+y*y)
 companion object { val Zero=Offset(0f,0f) }
}
class Matrix {
 var a=1f; var b=0f; var c=0f; var d=1f
 fun rotateZ(degrees:Float) {
  val radians=degrees*(PI/180.0)
  val cs=cos(radians).toFloat();val sn=sin(radians).toFloat()
  val aa=a*cs+c*sn;val bb=b*cs+d*sn
  c=-a*sn+c*cs;d=-b*sn+d*cs;a=aa;b=bb
 }
 fun scale(x:Float,y:Float){a*=x;b*=x;c*=y;d*=y}
}
fun RoundedPolygon.transformed(m:Matrix)=transformed { x,y -> FloatFloatPair(m.a*x+m.c*y,m.b*x+m.d*y) }
