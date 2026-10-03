package androidx.compose.material3

fun main(){
 val out=mutableListOf<String>()
 val bounds=listOf(
  intArrayOf(0,10000,0,10000),intArrayOf(0,0,0,0),intArrayOf(0,15,0,15),
  intArrayOf(0,100,0,50),intArrayOf(0,159,0,64),intArrayOf(0,160,0,80),
  intArrayOf(0,223,0,120),intArrayOf(0,300,0,120),
  intArrayOf(0,10000,20,50),intArrayOf(0,10000,64,64),
  intArrayOf(0,10000,99,120),intArrayOf(0,10000,200,240),
  intArrayOf(20,100,0,80),intArrayOf(160,160,0,80),
  intArrayOf(0,10000,0,0),intArrayOf(0,10000,0,15),
  intArrayOf(0,100,0,67),intArrayOf(0,Constraints.Infinity,0,Constraints.Infinity)
 )
 for(vertical in listOf(false,true))for(contentAxis in listOf(0,144,203))for(contentCross in listOf(16,48,96))for(b in bounds)for(progress in listOf(-.1f,0f,.125f,.5f,1f,1.08f))for(atEnd in listOf(false,true))for(rtl in listOf(false,true))for(scroll in listOf(0,37)){
  Host.rtl=rtl;Host.boxes.clear();Host.sizes.clear()
  val position=if(vertical)if(atEnd)"bottom" else "top" else if(atEnd)"end" else "start"
  val constraints=if(vertical)Constraints(b[2],b[3],b[0],b[1])else Constraints(b[0],b[1],b[2],b[3])
  val input="{\"vertical\":$vertical,\"contentAxis\":$contentAxis,\"contentCross\":$contentCross,\"minAxis\":${b[0]},\"maxAxis\":${b[1]},\"minCross\":${b[2]},\"maxCross\":${b[3]},\"progress\":$progress,\"position\":\"$position\",\"rtl\":$rtl,\"scroll\":$scroll}"
  val state=ScrollState(scroll)
  val content=Content(if(vertical)IntSize(contentCross,contentAxis)else IntSize(contentAxis,contentCross))
  val viewport=Wrapped("viewport",ScrollNode(state,false,vertical),content)
  val toolbar=Wrapped("toolbar",PaddingValuesModifier(Padding8),viewport,true)
  val policy=Policy(vertical,progress,position,toolbar)
  val root=Wrapped("root",if(vertical)UnspecifiedConstraintsNode(minWidth=80.dp)else UnspecifiedConstraintsNode(minHeight=80.dp),policy)
  try{
   val result=root.measure(constraints)
   with(Placeable.PlacementScope(0,IntOffset(0,0))){placeRoot(result)}
   val boxes=Host.boxes.filterKeys{it in listOf("toolbar","fab","viewport","content")}.entries.joinToString(prefix="{",postfix="}"){(id,r)->"\"$id\":${r.json()}"}
   out.add("{\"input\":$input,\"size\":${IntSize(result.width,result.height).json()},\"requested\":${Host.sizes.getValue("policy").json()},\"placements\":$boxes,\"scroll\":{\"max\":${state.maxValue},\"viewport\":${state.viewportSize},\"content\":${state.contentSize}}}")
  }catch(e:IllegalArgumentException){out.add("{\"input\":$input,\"error\":\"invalid-constraints\"}")}
 }
 println(out.joinToString(prefix="[",postfix="]"))
}
