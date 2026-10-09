package reference
import java.io.File

fun main(args:Array<String>){
 val records=File(args[0]).readLines().map { line ->
  val parts=line.split('\t');val kind=parts[0];val above=parts[1].toBoolean();val single=parts[2].toBoolean();val rtl=parts[3].toBoolean();val g=parts[4].toFloat();val placeholder=parts[5].toFloat();val affix=parts[6].toFloat();val width=parts[7].toInt();val minimized=BiasAlignment.Horizontal(parts[8].toFloat());val expanded=BiasAlignment.Horizontal(parts[9].toFloat())
  val leaves=parts[10].split(';').map { entry ->val p=entry.split(',');Leaf(p[0],p[1].toInt(),p[2].toInt()) }
  val padding=if(kind=="inside"&&!above)PaddingValues(16f,8f,16f,8f)else PaddingValues(16f,16f,16f,16f)
  val position=if(above)TextFieldLabelPosition.Above(minimized)else if(kind=="inside")TextFieldLabelPosition.Inside(minimizedAlignment=minimized,expandedAlignment=expanded)else TextFieldLabelPosition.Cutout(minimizedAlignment=minimized,expandedAlignment=expanded)
  val scope=Scope(if(rtl)LayoutDirection.Rtl else LayoutDirection.Ltr);Host.direction=scope.layoutDirection;Host.reset();var labelSize:Size?=null
  val policy:MeasurePolicy=if(kind=="inside")TextFieldMeasurePolicy(single,position,{g},{placeholder},{affix},padding,8.dp)else OutlinedTextFieldMeasurePolicy({labelSize=it},single,position,{g},{placeholder},{affix},padding,12.dp)
  val result=with(policy){with(scope){measure(leaves,Constraints(minWidth=width,maxWidth=width,minHeight=56))}};Host.parentWidth=result.width;result.block(Placeable.PlacementScope())
  val places=Host.placements.entries.joinToString(","){(id,p)->"\"$id\":{\"x\":${p.x},\"y\":${p.y},\"width\":${p.width},\"height\":${p.height},\"alpha\":${p.alpha}}"}
  val label=labelSize?.let{"{\"width\":${it.width},\"height\":${it.height}}"}?:"null"
  "{\"result\":{\"width\":${result.width},\"height\":${result.height}},\"measurements\":[${Host.measurements.joinToString(",")}],\"placements\":{$places},\"labelMeasured\":$label}"
 }
 println(records.joinToString(",","[","]"))
}
