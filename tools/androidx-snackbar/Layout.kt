package androidx.compose.material3

data class SnackInput(val width:Int,val height:Int,val first:Int?=null,val last:Int?=first,val required:Boolean=false){
 fun json()="{\"width\":$width,\"height\":$height,\"first\":${first?:"null"},\"last\":${last?:"null"},\"required\":$required}"
}
class SnackLeaf(val id:String,val input:SnackInput):Measurable{
 override fun measure(c:Constraints)=Placeable(if(id=="dismissAction")"dismiss" else id,
  Scope.layout(if(input.required)input.width else c.constrainWidth(input.width),if(input.required)input.height else c.constrainHeight(input.height)){},c)
  .also{if(input.first!=null)it.lines[FirstBaseline]=input.first;if(input.last!=null)it.lines[LastBaseline]=input.last}
 override fun minIntrinsicWidth(height:Int)=input.width
 override fun maxIntrinsicWidth(height:Int)=input.width
 override fun minIntrinsicHeight(width:Int)=input.height
 override fun maxIntrinsicHeight(width:Int)=input.height
}
fun snackBounds(c:Constraints)="{\"minWidth\":${c.minWidth},\"maxWidth\":${c.maxWidth},\"minHeight\":${c.minHeight},\"maxHeight\":${c.maxHeight}}"
fun snackOutput(id:String,result:MeasureResult,c:Constraints):String{
 val root=Placeable(id,result,c);Host.boxes.clear();Host.origin=IntOffset.Zero
 with(Placeable.PlacementScope(0,IntOffset.Zero)){placeRoot(root)}
 return "\"size\":${IntSize(root.width,root.height).json()},\"requested\":${IntSize(result.width,result.height).json()},\"placements\":${Host.boxes.entries.joinToString(prefix="{",postfix="}"){"\"${it.key}\":${it.value.json()}"}}"
}
fun main(args:Array<String>){
 if(args.isNotEmpty()){
  val records=java.io.File(args[0]).readLines().map{line->
   val values=line.split(',').map{it.toInt()};val index=values[0];Host.rtl=values[1]!=0;val newLine=values[2]!=0;val width=values[3]
   fun content(at:Int):SnackInput?=if(values[at]<0)null else SnackInput(values[at],values[at+1],if(values[at+2]==Int.MIN_VALUE)null else values[at+2],if(values[at+3]==Int.MIN_VALUE)null else values[at+3])
   val text=content(4)!!;val action=content(8);val dismiss=content(12);val c=Constraints(0,width,0,Constraints.Infinity)
   Host.boxes.clear();Host.origin=IntOffset.Zero;val root=snackPresenter(c,text,action,dismiss,newLine)
   Host.boxes.clear();Host.origin=IntOffset.Zero;with(Placeable.PlacementScope(0,IntOffset.Zero)){placeRoot(root)}
   "{\"index\":$index,\"size\":${IntSize(root.width,root.height).json()},\"placements\":${Host.boxes.entries.joinToString(prefix="{",postfix="}"){"\"${it.key}\":${it.value.json()}"}}}"
  };println(records.joinToString(prefix="[",postfix="]"));return
 }
 val inputs=listOf(SnackInput(90,32,21),SnackInput(210,52,21,41),SnackInput(310,92,21,81),SnackInput(0,0),SnackInput(81,77),SnackInput(97,31,11,11),SnackInput(102,51,0,40),SnackInput(80,32,21,null),SnackInput(91,100,50,80),SnackInput(151,99,20,20,true))
 val bounds=listOf(Constraints(0,0,0,0),Constraints(0,17,0,17),Constraints(0,93,0,41),Constraints(0,301,0,80),Constraints(0,600,0,200),Constraints(0,900,0,200),Constraints(20,160,20,99),Constraints(199,301,64,99),Constraints.fixed(250,70),Constraints(0,Constraints.Infinity,0,Constraints.Infinity))
 val controls=listOf(SnackInput(48,48,29),SnackInput(91,48,29),SnackInput(0,0),SnackInput(111,77),SnackInput(311,101,38,38,true))
 val rows=mutableListOf<String>();val baselines=mutableListOf<String>();val newlines=mutableListOf<String>();val presenters=mutableListOf<String>()
 for(rtl in listOf(false,true))for(c in bounds)for(text in inputs)for(action in listOf(null)+controls)for(dismiss in listOf(null,SnackInput(48,48),SnackInput(0,0))){
  Host.rtl=rtl;val leaves=mutableListOf<Measurable>(SnackLeaf("text",text))
  if(action!=null)leaves.add(SnackLeaf("action",action));if(dismiss!=null)leaves.add(SnackLeaf("dismissAction",dismiss))
  val result=with(Scope){nativeRow(leaves,c)}
  rows.add("{\"input\":{\"rtl\":$rtl,\"constraints\":${snackBounds(c)},\"text\":${text.json()},\"action\":${action?.json()?:"null"},\"dismiss\":${dismiss?.json()?:"null"}},${snackOutput("row",result,c)}}")
 }
 for(rtl in listOf(false,true))for(c in bounds)for(text in inputs)for(action in listOf(null)+controls)for(dismiss in listOf(null,SnackInput(48,48),SnackInput(0,0)))for(newLine in listOf(false,true)){
  Host.rtl=rtl;Host.boxes.clear();Host.origin=IntOffset.Zero;val root=snackPresenter(c,text,action,dismiss,newLine)
  Host.boxes.clear();Host.origin=IntOffset.Zero;with(Placeable.PlacementScope(0,IntOffset.Zero)){placeRoot(root)}
  val rectangles=Host.boxes.entries.joinToString(prefix="{",postfix="}"){"\"${it.key}\":${it.value.json()}"}
  presenters.add("{\"input\":{\"rtl\":$rtl,\"newLine\":$newLine,\"constraints\":${snackBounds(c)},\"text\":${text.json()},\"action\":${action?.json()?:"null"},\"dismiss\":${dismiss?.json()?:"null"}},\"size\":${IntSize(root.width,root.height).json()},\"requested\":${root.measuredSize.json()},\"placements\":$rectangles}")
 }
 for(rtl in listOf(false,true))for(c in bounds)for(text in inputs)for(action in controls)for(dismiss in listOf(null,SnackInput(48,48),SnackInput(0,0))){
  Host.rtl=rtl;Host.boxes.clear();Host.origin=IntOffset.Zero
  val root=snackNewLine(c,text,action,dismiss);Host.boxes.clear();Host.origin=IntOffset.Zero
  with(Placeable.PlacementScope(0,IntOffset.Zero)){placeRoot(root)}
  val rectangles=Host.boxes.entries.joinToString(prefix="{",postfix="}"){"\"${it.key}\":${it.value.json()}"}
  newlines.add("{\"input\":{\"rtl\":$rtl,\"constraints\":${snackBounds(c)},\"text\":${text.json()},\"action\":${action.json()},\"dismiss\":${dismiss?.json()?:"null"}},\"size\":${IntSize(root.width,root.height).json()},\"requested\":${root.measuredSize.json()},\"placements\":$rectangles}")
 }
 for(rtl in listOf(false,true))for(c in bounds)for(content in inputs)for(first in listOf(false,true))for(offset in listOf(0,12,30,77))for(before in listOf(false,true)){
  Host.rtl=rtl;val leaf=SnackLeaf("content",content);val line=if(first)FirstBaseline else LastBaseline
  val result=nativeBaseline(c,leaf,line,if(before)offset.dp else Dp.Unspecified,if(before)Dp.Unspecified else offset.dp)
  baselines.add("{\"input\":{\"rtl\":$rtl,\"constraints\":${snackBounds(c)},\"content\":${content.json()},\"line\":\"${if(first)"first" else "last"}\",\"before\":${if(before)offset else "null"},\"after\":${if(before)"null" else offset}},${snackOutput("padding",result,c)}}")
 }
 println("{\"row\":${rows.joinToString(prefix="[",postfix="]")},\"baseline\":${baselines.joinToString(prefix="[",postfix="]")},\"newline\":${newlines.joinToString(prefix="[",postfix="]")},\"presenter\":${presenters.joinToString(prefix="[",postfix="]")}}")
}
