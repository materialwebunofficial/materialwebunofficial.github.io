package androidx.compose.material3

fun main(){
 val profiles=paddingProfiles.toMutableList()
 for(absolute in listOf(false,true))for(index in 0..3)for(value in listOf(-1f,Float.NaN,Float.POSITIVE_INFINITY)){
  val s=floatArrayOf(0f,0f,0f,0f);s[index]=value;profiles.add(PaddingProfile(absolute,s[0],s[1],s[2],s[3]))
 }
 val out=mutableListOf<String>()
 for(pad in profiles)for(rtl in listOf(false,true)){
  Host.rtl=rtl;val input="{\"contentPadding\":${pad.json()},\"rtl\":$rtl}"
  try{
   val p=pad.values();val d=if(rtl)LayoutDirection.Rtl else LayoutDirection.Ltr
   val l=p.calculateLeftPadding(d).roundToPx();val r=p.calculateRightPadding(d).roundToPx();val t=p.calculateTopPadding().roundToPx();val b=p.calculateBottomPadding().roundToPx()
   out.add("{\"input\":$input,\"resolved\":{\"left\":$l,\"top\":$t,\"right\":$r,\"bottom\":$b,\"horizontal\":${l+r},\"vertical\":${t+b}}}")
  }catch(e:IllegalArgumentException){out.add("{\"input\":$input,\"error\":\"invalid-padding\"}")}
 }
 println(out.joinToString(prefix="[",postfix="]"))
}
