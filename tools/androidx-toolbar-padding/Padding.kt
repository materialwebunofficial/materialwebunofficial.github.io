// Host profile storage. Logical/absolute validation/calculation bodies are original.
data class PaddingProfile(val absolute:Boolean,val a:Float,val top:Float,val b:Float,val bottom:Float){
 fun values():PaddingValues=if(absolute)Absolute(Dp(a),Dp(top),Dp(b),Dp(bottom))else PaddingValuesImpl(Dp(a),Dp(top),Dp(b),Dp(bottom))
 fun json():String{
  fun n(v:Float)=if(v.isNaN())"\"NaN\"" else if(v.isInfinite())"\"${v}\"" else v.toString()
  return if(absolute)"{\"left\":${n(a)},\"top\":${n(top)},\"right\":${n(b)},\"bottom\":${n(bottom)}}" else "{\"start\":${n(a)},\"top\":${n(top)},\"end\":${n(b)},\"bottom\":${n(bottom)}}"
 }
}
val paddingProfiles=listOf(
 PaddingProfile(false,8f,8f,8f,8f),PaddingProfile(false,0f,0f,0f,0f),
 PaddingProfile(false,3f,5f,17f,11f),PaddingProfile(true,3f,5f,17f,11f),
 PaddingProfile(false,2.5f,1.4999999f,10.49f,.5f),PaddingProfile(true,2.5f,1.4999999f,10.49f,.5f),
 PaddingProfile(false,40f,70f,50f,30f),PaddingProfile(true,40f,70f,50f,30f),
 PaddingProfile(false,0f,6.5f,30f,1.5f)
)
