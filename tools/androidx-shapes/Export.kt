import androidx.compose.animation.core.estimateAnimationDurationMillis
import androidx.compose.material3.*
import androidx.graphics.shapes.*
import kotlin.math.*
fun Cubic.json()=listOf(anchor0X,anchor0Y,control0X,control0Y,control1X,control1Y,anchor1X,anchor1Y).joinToString(prefix="[",postfix="]")
fun List<Cubic>.json()=joinToString(prefix="[",postfix="]"){it.json()}
fun factor(polygons:List<RoundedPolygon>):Float {
 var factor=1f
 for(p in polygons){
  val b=p.calculateBounds();val m=p.calculateMaxBounds()
  factor=min(factor,max((b[2]-b[0])/(m[2]-m[0]),(b[3]-b[1])/(m[3]-m[1])))
 }
 return factor*38f/48f
}
fun exportSequence(polygons:List<RoundedPolygon>,circular:Boolean):String {
 val pairs=polygons.zipWithNext().toMutableList()
 if(circular)pairs.add(polygons.last() to polygons.first())
 val morphs=pairs.joinToString(prefix="[",postfix="]"){(a,b)->
  val m=Morph(a.normalized(),b.normalized())
  "[${m.asCubics(0f).json()},${m.asCubics(1f).json()}]"
 }
 return "{\"scale\":${factor(polygons)},\"morphs\":$morphs}"
}
fun main(args:Array<String>){
 if(args.firstOrNull()=="catalog") {
  println(catalog().entries.joinToString(prefix="{",postfix="}"){(name,polygon)-> "\"$name\":${polygon.cubics.json()}"});return
 }

 val indeterminate=listOf(MaterialShapes.SoftBurst,MaterialShapes.Cookie9Sided,MaterialShapes.Pentagon,MaterialShapes.Pill,MaterialShapes.Sunny,MaterialShapes.Cookie4Sided,MaterialShapes.Oval)
 val determinate=listOf(MaterialShapes.Circle.transformed(Matrix().apply{rotateZ(18f)}),MaterialShapes.SoftBurst)
 if(args.firstOrNull()=="oracle") {
  val samples=indeterminate.zipWithNext().plus(indeterminate.last() to indeterminate.first()).map { (a,b) ->
   val m=Morph(a.normalized(),b.normalized())
   listOf(0.25f,0.5f,0.75f,1.05f).joinToString(prefix="[",postfix="]"){m.asCubics(it).json()}
  }
  println(samples.joinToString(prefix="[",postfix="]"));return
 }
 val duration=estimateAnimationDurationMillis(stiffness=200f,dampingRatio=.6f,initialVelocity=0f,initialDisplacement=-10f,delta=1f)
 println("{\"morphDuration\":$duration,\"indeterminate\":"+exportSequence(indeterminate,true)+",\"determinate\":"+exportSequence(determinate,false)+"}")
}
