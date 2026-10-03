// Runs the pinned graphics-shapes implementation used by CircularShapes in
// CircularWavyProgressModifiers.kt. These are production cubic coefficients.
import androidx.graphics.shapes.*
fun Cubic.json()=listOf(anchor0X,anchor0Y,control0X,control0Y,control1X,control1Y,anchor1X,anchor1Y).joinToString(prefix="[",postfix="]")
fun List<Cubic>.json()=joinToString(prefix="[",postfix="]"){it.json()}
fun main(){
 println((5..256).joinToString(prefix="{",postfix="}"){n->
  val circle=RoundedPolygon.circle(numVertices=n).normalized()
  val star=RoundedPolygon.star(numVerticesPerRadius=n,innerRadius=.75f,rounding=CornerRounding(.35f,.4f),innerRounding=CornerRounding(.5f)).normalized()
  val morph=Morph(circle,star)
  val from=morph.asCubics(0f);val to=morph.asCubics(1f)
  val full=from.size%n!=0 || n==9
  val a=if(full)from else from.take(from.size/n);val b=if(full)to else to.take(to.size/n)
  val c=if(full)circle.cubics else circle.cubics.take(circle.cubics.size/n)
  val s=if(full)star.cubics else star.cubics.take(star.cubics.size/n)
  "\"$n\":[${if(full)0 else 1},${circle.centerX},${circle.centerY},${star.centerX},${star.centerY},${a.json()},${b.json()},${c.json()},${s.json()}]"
 })
}
