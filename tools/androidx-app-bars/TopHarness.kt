package androidx.compose.material3
fun main(){
 val profiles=listOf(
  listOf(4,0,8,0,4,0,0),listOf(52,48,104,28,100,48,21),
  listOf(4,0,158,56,148,48,49),listOf(84,60,240,48,24,32,39),
  listOf(148,96,288,88,244,72,78))
 val bounds=listOf(listOf(0,390,0,2147483647),listOf(0,390,0,200),listOf(0,199,0,63),listOf(160,160,48,48),listOf(0,0,0,0),listOf(0,17,0,17),listOf(49,301,32,99))
 val pads=listOf(listOf(0f,0f,0f,0f),listOf(8f,8f,8f,8f),listOf(7.5f,2.5f,19.5f,6.5f),listOf(40f,0f,60f,0f))
 val records=mutableListOf<String>()
 for(profile in profiles)for(b in bounds)for(p in pads)for(rtl in listOf(false,true))for(alignment in listOf("start","center","end"))for(vertical in listOf("center","bottom"))for(offset in listOf(0f,-.5f,-17.5f,-48f))for(height in listOf(48f,64f)){
  Host.rtl=rtl;Host.boxes.clear();Host.sizes.clear()
  val c=Constraints(b[0],b[1],b[2],b[3])
  val slots=listOf(Slot("navigationIcon",profile[0],profile[1],null),Slot("title",profile[2],profile[3],profile[6]),Slot("actionIcons",profile[4],profile[5],null))
  val policy=TopAppBarMeasurePolicy({offset},if(vertical=="bottom")Arrangement.Bottom else Arrangement.Center,when(alignment){"center"->Alignment.CenterHorizontally;"end"->Alignment.End;else->Alignment.Start},24,Dp(height),Pads(p))
  val result=with(policy){with(Scope){measure(slots,c)}}
  val root=Placeable("row",result,c);with(Placeable.PlacementScope(0,IntOffset.Zero)){placeRoot(root)}
  val boxes=Host.boxes.entries.joinToString(prefix="{",postfix="}"){(id,r)->"\"$id\":${r.json()}"}
  records.add("{\"input\":{\"minWidth\":${b[0]},\"maxWidth\":${b[1]},\"minHeight\":${b[2]},\"maxHeight\":${b[3]},\"rtl\":$rtl,\"height\":$height,\"scrolledOffset\":$offset,\"alignment\":\"$alignment\",\"vertical\":\"$vertical\",\"titleBottomPadding\":24,\"contentPadding\":{\"start\":${p[0]},\"top\":${p[1]},\"end\":${p[2]},\"bottom\":${p[3]}},\"navigationIcon\":{\"width\":${profile[0]},\"height\":${profile[1]}},\"title\":{\"width\":${profile[2]},\"height\":${profile[3]},\"baseline\":${profile[6]}},\"actionIcons\":{\"width\":${profile[4]},\"height\":${profile[5]}}},\"size\":${IntSize(root.width,root.height).json()},\"requested\":${root.measuredSize.json()},\"placements\":$boxes}")
 }
 println(records.joinToString(prefix="[",postfix="]"))
}
