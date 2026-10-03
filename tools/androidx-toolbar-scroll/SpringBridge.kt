// Interface adapters only; FloatSpringSpec body is the unchanged pinned source.
interface FloatAnimationSpec {
 fun getValueFromNanos(t:Long,from:Float,to:Float,velocity:Float):Float
 fun getVelocityFromNanos(t:Long,from:Float,to:Float,velocity:Float):Float
 fun getEndVelocity(from:Float,to:Float,velocity:Float):Float
 fun getDurationNanos(from:Float,to:Float,velocity:Float):Long
}
object Spring {const val DampingRatioNoBouncy=1f;const val StiffnessMedium=1500f;const val DefaultDisplacementThreshold=.01f}
const val MillisToNanos=1_000_000L
