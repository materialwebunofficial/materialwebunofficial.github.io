package reference

fun main(){
 val records=mutableListOf<String>()
 val profiles=listOf(
  listOf(Leaf(TextFieldId,200,24)),
  listOf(Leaf(TextFieldId,200,72),Leaf(LabelId,96,16),Leaf(SupportingId,240,20)),
  listOf(Leaf(TextFieldId,248,24),Leaf(LabelId,140,24),Leaf(LeadingId,48,48),Leaf(TrailingId,48,48)),
  listOf(Leaf(TextFieldId,200,120),Leaf(LabelId,136,20),Leaf(LeadingId,48,48),Leaf(PrefixId,24,24),Leaf(SuffixId,32,24),Leaf(SupportingId,240,36)),
  listOf(Leaf(TextFieldId,1,24),Leaf(PlaceholderId,180,48),Leaf(LabelId,280,40),Leaf(TrailingId,64,60),Leaf(PrefixId,32,24),Leaf(SuffixId,40,36))
 )
 val bounds=listOf(Constraints(minWidth=280,minHeight=56),Constraints(minWidth=320,maxWidth=320,minHeight=56),Constraints(maxWidth=96,maxHeight=100),Constraints(minWidth=40,maxWidth=40,minHeight=56,maxHeight=80),Constraints(maxWidth=0,maxHeight=0))
 for(kind in listOf("inside","cutout"))for(above in listOf(false,true))for(single in listOf(false,true))for(rtl in listOf(false,true))
 for(g in listOf(0f,.25f,.5f,.75f,1f,1.05f))for(profile in profiles)for(c in bounds){
  val padding=if(kind=="inside"&&profile.any{it.id==LabelId}&&!above)PaddingValues(16f,8f,16f,8f)else PaddingValues(16f,16f,16f,16f)
  val position=if(above)TextFieldLabelPosition.Above()else if(kind=="inside")TextFieldLabelPosition.Inside()else TextFieldLabelPosition.Cutout()
  val scope=Scope(if(rtl)LayoutDirection.Rtl else LayoutDirection.Ltr);Host.direction=scope.layoutDirection;Host.reset();var labelSize:Size?=null
  val policy:MeasurePolicy=if(kind=="inside")TextFieldMeasurePolicy(single,position,{g},{.37f},{.61f},padding,8.dp)else OutlinedTextFieldMeasurePolicy({labelSize=it},single,position,{g},{.37f},{.61f},padding,12.dp)
  val leaves=profile+Leaf(ContainerId,0,0)
  try{
  val result=with(policy){with(scope){measure(leaves,c)}};Host.parentWidth=result.width;result.block(Placeable.PlacementScope())
  val intrinsic=with(policy){with(scope){listOf(minIntrinsicWidth(leaves,100),maxIntrinsicWidth(leaves,100),minIntrinsicHeight(leaves,320),maxIntrinsicHeight(leaves,320))}}
  val places=Host.placements.entries.joinToString(","){(id,p)->"\"$id\":{\"x\":${p.x},\"y\":${p.y},\"width\":${p.width},\"height\":${p.height},\"alpha\":${p.alpha}}"}
  val label=labelSize?.let{"{\"width\":${it.width},\"height\":${it.height}}"}?:"null"
  records.add("{\"kind\":\"$kind\",\"above\":$above,\"singleLine\":$single,\"rtl\":$rtl,\"progress\":$g,\"placeholderAlpha\":0.37,\"affixAlpha\":0.61,\"padding\":{\"start\":16,\"top\":${padding.top},\"end\":16,\"bottom\":${padding.bottom}},\"constraints\":${c.json()},\"leaves\":[${leaves.joinToString(","){it.json()}}],\"result\":{\"width\":${result.width},\"height\":${result.height}},\"measurements\":[${Host.measurements.joinToString(",")}],\"placements\":{$places},\"labelMeasured\":$label,\"intrinsic\":$intrinsic}")
  }catch(error:IllegalArgumentException){
   val message=error.message!!.replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n")
   records.add("{\"kind\":\"$kind\",\"above\":$above,\"singleLine\":$single,\"rtl\":$rtl,\"progress\":$g,\"placeholderAlpha\":0.37,\"affixAlpha\":0.61,\"padding\":{\"start\":16,\"top\":${padding.top},\"end\":16,\"bottom\":${padding.bottom}},\"constraints\":${c.json()},\"leaves\":[${leaves.joinToString(","){it.json()}}],\"error\":\"$message\",\"measurements\":[${Host.measurements.joinToString(",")}]}" )
  }
 }
 println(records.joinToString(",","[","]"))
}
