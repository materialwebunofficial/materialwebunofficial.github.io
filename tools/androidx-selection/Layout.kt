package androidx.compose.material3
val Double.dp get()=Dp(toFloat())
operator fun Dp.div(value:Int)=Dp(this.value/value)
annotation class ExperimentalMaterial3Api

// Recording composition/input attachment and density1 are supplied hosts.
// Each concrete measurement policy is the unchanged original native body.
enum class ToggleableState {Off,On,Indeterminate}
enum class Role {Checkbox,RadioButton,Switch}
class RoundedCornerShape(val radius:Int)
val CircleShape=Any()
fun ripple(bounded:Boolean=true,radius:Dp=0.dp,color:Any?=null,focusRingShape:Any?=null)=Any()
open class SelectionModifier(val nodes:List<Pair<String,LayoutModifierNode?>> = emptyList()){
 companion object:SelectionModifier()
 fun then(other:SelectionModifier)=SelectionModifier(nodes+other.nodes)
}
fun SelectionModifier.minimumInteractiveComponentSize()=then(SelectionModifier(listOf("minimum" to SelectionMinimumNode())))
fun SelectionModifier.selectable(selected:Boolean,onClick:()->Unit,enabled:Boolean,role:Role,interactionSource:Any?,indication:Any?)=then(SelectionModifier(listOf("input" to null)))
fun SelectionModifier.triStateToggleable(state:ToggleableState,onClick:()->Unit,enabled:Boolean,role:Role,interactionSource:Any?,indication:Any?)=then(SelectionModifier(listOf("input" to null)))
fun SelectionModifier.toggleable(value:Boolean,onValueChange:(Boolean)->Unit,enabled:Boolean,role:Role,interactionSource:Any?,indication:Any?)=then(SelectionModifier(listOf("input" to null)))
fun SelectionModifier.wrapContentSize(align:Alignment)=then(SelectionModifier(listOf("wrap" to SelectionWrapNode(Direction.Both,false){size,direction->align.align(IntSize(0,0),size,direction)})))
fun SelectionModifier.padding(all:Dp)=then(SelectionModifier(listOf("padding" to SelectionPaddingNode(all,all,all,all,true))))
fun SelectionModifier.requiredSize(size:Dp)=requiredSize(size,size)
fun SelectionModifier.requiredSize(width:Dp,height:Dp)=then(SelectionModifier(listOf("required" to SelectionSizeNode(width,height,width,height,false))))
fun SelectionModifier.border(width:Dp,color:Any?,shape:Any?)=this
fun SelectionModifier.background(color:Any?,shape:Any?)=this

fun chain(modifier:SelectionModifier):Measurable{
 var input=false
 val names=modifier.nodes.mapIndexed{index,(name,node)->
  if(node==null){input=true;null}else{val label=if(input){input=false;"input"}else "$name-$index";label to node}
 }.filterNotNull()
 var result:Measurable=Content(IntSize(0,0))
 for((name,node) in names.reversed())result=Wrapped(name,node,result)
 return result
}
fun main(){
 val bounds=listOf(Constraints(0,Constraints.Infinity,0,Constraints.Infinity),Constraints(0,0,0,0),Constraints(0,17,0,17),Constraints(0,19,0,23),Constraints(0,48,0,48),Constraints(0,100,0,80),Constraints(30,80,20,90),Constraints.fixed(47,51),Constraints.fixed(100,60))
 val records=mutableListOf<String>()
 for(kind in listOf("checkbox","radio","switch"))for(clickable in listOf(false,true))for(enabled in listOf(false,true))for(rtl in listOf(false,true))for(minimum in listOf(Float.NaN,-1f,0f,20f,20.25f,20.5f,47f,47.5f,48f,80f))for(c in bounds){
  Host.rtl=rtl;MinimumHost.size=minimum;Host.boxes.clear();Host.sizes.clear();Host.origin=IntOffset.Zero
  val onClick:(()->Unit)?=if(clickable)({})else null
  val modifier=when(kind){"radio"->nativeRadio(SelectionModifier,onClick,enabled);"switch"->nativeSwitch(SelectionModifier,onClick,enabled);else->nativeCheckbox(SelectionModifier,onClick,enabled)}
  val root=chain(modifier).measure(c)
  with(Placeable.PlacementScope(0,IntOffset.Zero)){placeRoot(root)}
  val boxes=Host.boxes.entries.joinToString(prefix="{",postfix="}"){(name,rect)->"\"$name\":${rect.json()}"}
  val sizes=Host.sizes.entries.joinToString(prefix="{",postfix="}"){(name,size)->"\"$name\":${size.json()}"}
  records.add("{\"kind\":\"$kind\",\"clickable\":$clickable,\"enabled\":$enabled,\"rtl\":$rtl,\"minimum\":${if(minimum.isNaN()) "null" else minimum},\"constraints\":{\"minWidth\":${c.minWidth},\"maxWidth\":${c.maxWidth},\"minHeight\":${c.minHeight},\"maxHeight\":${c.maxHeight}},\"size\":${IntSize(root.width,root.height).json()},\"requested\":${root.measuredSize.json()},\"placements\":$boxes,\"measured\":$sizes}")
 }
 println(records.joinToString(prefix="[",postfix="]"))
}
