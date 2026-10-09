package androidx.compose.material3
import kotlin.math.*

@Target(AnnotationTarget.FUNCTION,AnnotationTarget.TYPE,AnnotationTarget.EXPRESSION)
@Retention(AnnotationRetention.SOURCE)
annotation class Composable
class Color(val role:String="unset")
class TextStyle
class Provided<T>(val local:Local<T>,val next:T){fun enter():()->Unit{val old=local.value;local.value=next;return{local.value=old}}}
class Local<T>(var value:T){infix fun provides(value:T)=Provided(this,value)}
val LocalContentColor=Local(Color());val LocalTextStyle=Local(TextStyle())
fun CompositionLocalProvider(vararg values:Provided<*>,content:()->Unit){val restores=values.map{it.enter()};try{content()}finally{restores.asReversed().forEach{it()}}}
class MutableValue<T>(override var value:T):State<T>
fun <T> mutableStateOf(value:T)=MutableValue(value)
object RememberHost{val slots=mutableListOf<Any?>();var cursor=0;fun reset(){slots.clear();cursor=0}}
@Suppress("UNCHECKED_CAST")
fun <T> remember(block:()->T):T{val index=RememberHost.cursor++;if(index==RememberHost.slots.size)RememberHost.slots.add(block());return RememberHost.slots[index] as T}
class FiniteAnimationSpec<T>
class Effect{operator fun plus(other:Effect)=this}
fun expandHorizontally(animationSpec:FiniteAnimationSpec<IntSize>,expandFrom:Alignment.Horizontal)=Effect()
fun shrinkHorizontally(animationSpec:FiniteAnimationSpec<IntSize>,shrinkTowards:Alignment.Horizontal)=Effect()
fun fadeIn(animationSpec:FiniteAnimationSpec<Float>)=Effect()
fun fadeOut(animationSpec:FiniteAnimationSpec<Float>)=Effect()
enum class IntrinsicSize{Min,Max}
val maxChipWidth=1000.dp
operator fun Dp.plus(other:Dp)=Dp(value+other.value)
operator fun Dp.div(value:Int)=Dp(this.value/value)
object SuggestionChipDefaults{val HorizontalSpacing=8.dp}
fun Modifier.width(value:Dp)=Modifier(nodes+SizeNode(minWidth=value,maxWidth=value,enforceIncoming=true),data)
fun Modifier.width(value:IntrinsicSize)=Modifier(nodes+IntrinsicWidthNode(value,true),data)
fun Modifier.widthIn(max:Dp)=Modifier(nodes+SizeNode(maxWidth=max,enforceIncoming=true),data)
fun Modifier.defaultMinSize(minHeight:Dp)=Modifier(nodes+UnspecifiedConstraintsNode(minHeight=minHeight),data)
fun Modifier.padding(value:PaddingValues)=Modifier(nodes+PaddingValuesModifier(value),data)
class RowScope{fun Modifier.weight(value:Float,fill:Boolean=true)=Modifier(nodes,RowColumnParentData(weight=value,fill=fill,crossAxisAlignment=null))}
class BoxScope
inline fun <T> List<T>.fastForEachIndexed(block:(Int,T)->Unit)=forEachIndexed(block)
data class BoxChildDataNode(val alignment:Alignment,val matchParentSize:Boolean)
val IntrinsicMeasurable.boxChildDataNode get()=parentData as? BoxChildDataNode
val IntrinsicMeasurable.matchesParentSize get()=boxChildDataNode?.matchParentSize?:false

// Native policy default-intrinsic framework boundary: fixed/wrapping host leaves,
// queried through measurement proxies. Original Row intrinsic bodies run directly.
fun chipDefaultIntrinsic(policy:MeasurePolicy,children:List<IntrinsicMeasurable>,available:Int,width:Boolean,minimum:Boolean):Int{
 val proxies=children.map{child->object:Measurable{
  override val parentData=child.parentData
  override fun measure(c:Constraints):Placeable{
   val size=if(width)IntSize(if(minimum)child.minIntrinsicWidth(c.maxHeight)else child.maxIntrinsicWidth(c.maxHeight),0)else IntSize(0,if(minimum)child.minIntrinsicHeight(c.maxWidth)else child.maxIntrinsicHeight(c.maxWidth))
   return Placeable("intrinsic",Scope.layout(size.width,size.height){},c)
  }
  override fun minIntrinsicWidth(h:Int)=0;override fun maxIntrinsicWidth(h:Int)=0;override fun minIntrinsicHeight(w:Int)=0;override fun maxIntrinsicHeight(w:Int)=0
 }}
 val c=if(width)Constraints(maxHeight=available)else Constraints(maxWidth=available)
 val measured=with(policy){with(Scope){measure(proxies,c)}}
 return if(width)measured.width else measured.height
}

class ChipWrapped(val id:String,val node:LayoutModifierNode,val child:Measurable,override val parentData:Any?=child.parentData):Measurable{
 override fun measure(c:Constraints)=Placeable(id,with(node){with(Scope){measure(child,c)}},c)
 private fun intrinsic(available:Int,width:Boolean,minimum:Boolean):Int{
  if(node is PaddingValuesModifier){val p=node.paddingValues;val horizontal=p.calculateLeftPadding(Scope.layoutDirection).roundToPx()+p.calculateRightPadding(Scope.layoutDirection).roundToPx();val vertical=p.calculateTopPadding().roundToPx()+p.calculateBottomPadding().roundToPx();return query(child,if(available==Constraints.Infinity)available else (available-if(width)vertical else horizontal).coerceAtLeast(0),width,minimum)+if(width)horizontal else vertical}
  return with(node){with(Scope){if(width)if(minimum)minIntrinsicWidth(child,available)else maxIntrinsicWidth(child,available)else if(minimum)minIntrinsicHeight(child,available)else maxIntrinsicHeight(child,available)}}
 }
 override fun minIntrinsicWidth(h:Int)=intrinsic(h,true,true);override fun maxIntrinsicWidth(h:Int)=intrinsic(h,true,false)
 override fun minIntrinsicHeight(w:Int)=intrinsic(w,false,true);override fun maxIntrinsicHeight(w:Int)=intrinsic(w,false,false)
}
fun query(child:IntrinsicMeasurable,available:Int,width:Boolean,minimum:Boolean)=if(width)if(minimum)child.minIntrinsicWidth(available)else child.maxIntrinsicWidth(available)else if(minimum)child.minIntrinsicHeight(available)else child.maxIntrinsicHeight(available)
class ChipGroup(val id:String,val children:List<Measurable>,val policy:MeasurePolicy,override val parentData:Any?):Measurable{
 override fun measure(c:Constraints)=Placeable(id,with(policy){with(Scope){measure(children,c)}},c)
 override fun minIntrinsicWidth(h:Int)=with(policy){with(Scope){minIntrinsicWidth(children,h)}}
 override fun maxIntrinsicWidth(h:Int)=with(policy){with(Scope){maxIntrinsicWidth(children,h)}}
 override fun minIntrinsicHeight(w:Int)=with(policy){with(Scope){minIntrinsicHeight(children,w)}}
 override fun maxIntrinsicHeight(w:Int)=with(policy){with(Scope){maxIntrinsicHeight(children,w)}}
}
object ContentHost{var count=0;var depth=0;var sample=1f;val stack=mutableListOf<MutableList<Measurable>>();var root:Measurable?=null;var row:ChipGroup?=null;val outerIds=mutableListOf<String>()
 fun id()="node"+count++
 fun add(node:Measurable){if(stack.isEmpty())root=node else stack.last().add(node)}
}
fun wrap(id:String,modifier:Modifier,node:Measurable):Measurable{var result=node;for((i,n)in modifier.nodes.withIndex().reversed())result=ChipWrapped(if(i==0)id else id+"-modifier"+i,n,result,modifier.data);return result}
fun Row(modifier:Modifier=Modifier,verticalAlignment:Alignment.Vertical=Alignment.Top,horizontalArrangement:Arrangement.Horizontal=Arrangement.Start,content:RowScope.()->Unit){
 val outer=ContentHost.depth==0;val id=ContentHost.id();ContentHost.depth++;ContentHost.stack.add(mutableListOf());RowScope().content();val children=ContentHost.stack.removeAt(ContentHost.stack.lastIndex);ContentHost.depth--
 val group=ChipGroup(id+"-row",children,RowMeasurePolicy(horizontalArrangement,verticalAlignment),modifier.data)
 if(outer){ContentHost.row=group;ContentHost.outerIds.clear();ContentHost.outerIds.addAll(children.map{when(it){is ChipGroup->it.id;is ChipWrapped->it.id;is ChipLeaf->it.id;else->error("unexpected")}})}
 ContentHost.add(wrap(id,modifier,group))
}
fun Box(modifier:Modifier=Modifier,contentAlignment:Alignment=Alignment.TopStart,content:BoxScope.()->Unit){val id=ContentHost.id();ContentHost.stack.add(mutableListOf());BoxScope().content();val children=ContentHost.stack.removeAt(ContentHost.stack.lastIndex);ContentHost.add(wrap(id,modifier,ChipGroup(id,children,BoxMeasurePolicy(contentAlignment,false),modifier.data)))}
fun Spacer(modifier:Modifier){val id=ContentHost.id();ContentHost.add(wrap(id,modifier,ChipLeaf(id,0,0,false)))}
fun RowScope.AnimatedVisibility(visible:Boolean,enter:Effect,exit:Effect,content:()->Unit){if(!visible)return;val id=ContentHost.id();ContentHost.stack.add(mutableListOf());content();val children=ContentHost.stack.removeAt(ContentHost.stack.lastIndex);val group=ChipGroup(id+"-full",children,BoxMeasurePolicy(Alignment.TopStart,false),null);ContentHost.add(AtomicVisibility(id,group,ContentHost.sample))}
class AtomicVisibility(val id:String,val child:Measurable,val sample:Float):Measurable{
 override fun measure(c:Constraints):Placeable{val full=child.measure(c);val width=(full.width*sample).roundToInt().coerceIn(c.minWidth,c.maxWidth);return Placeable(id,Scope.layout(width,full.height){full.place(0,0)},c)}
 override fun minIntrinsicWidth(h:Int)=child.minIntrinsicWidth(h);override fun maxIntrinsicWidth(h:Int)=child.maxIntrinsicWidth(h)
 override fun minIntrinsicHeight(w:Int)=child.minIntrinsicHeight(w);override fun maxIntrinsicHeight(w:Int)=child.maxIntrinsicHeight(w)
}
class ChipLeaf(val id:String,val width:Int,val height:Int,val wrap:Boolean):Measurable{
 override fun measure(c:Constraints):Placeable{LeafConstraints.values[id]=c;val w=c.constrainWidth(width);val h=c.constrainHeight(height*if(wrap)ceil(width.toDouble()/max(1,w)).toInt().coerceAtLeast(1)else 1);return Placeable(id,Scope.layout(w,h){},c)}
 override fun minIntrinsicWidth(h:Int)=if(wrap)min(width,30)else width;override fun maxIntrinsicWidth(h:Int)=width
 override fun minIntrinsicHeight(w:Int)=height*if(wrap)ceil(width.toDouble()/max(1,w)).toInt().coerceAtLeast(1)else 1;override fun maxIntrinsicHeight(w:Int)=minIntrinsicHeight(w)
}
class ChipPadding(val start:Int,val end:Int):PaddingValues{
 override fun calculateLeftPadding(direction:LayoutDirection)=(if(direction==LayoutDirection.Rtl)end else start).dp
 override fun calculateRightPadding(direction:LayoutDirection)=(if(direction==LayoutDirection.Rtl)start else end).dp
 override fun calculateTopPadding()=0.dp;override fun calculateBottomPadding()=0.dp
}
fun main(args:Array<String>){if(args.firstOrNull()=="retained"){retainedHistories();return};val out=mutableListOf<String>();val bounds=listOf(intArrayOf(0,Constraints.Infinity,0,Constraints.Infinity),intArrayOf(0,1,0,1),intArrayOf(0,17,0,31),intArrayOf(0,79,0,Constraints.Infinity),intArrayOf(120,120,0,Constraints.Infinity),intArrayOf(140,140,5,5),intArrayOf(5,260,1,90),intArrayOf(0,1200,0,Constraints.Infinity))
 for(animated in listOf(false,true))for(family in if(animated)listOf("filter","input")else listOf("assist","suggestion"))for(rtl in listOf(false,true))for(leading in listOf(0,18,24))for(trailing in listOf(0,18))for(label in listOf(0,50,240,1200))for(wrap in listOf(false,true))for(arrangement in listOf("compact","start","end","center","space-between"))for(b in bounds)for(sample in if(animated&&leading+trailing>0)listOf(0f,.5f,1f)else listOf(1f)){
  Host.rtl=rtl;Host.boxes.clear();Host.sizes.clear();LeafConstraints.values.clear();ContentHost.count=0;ContentHost.depth=0;ContentHost.stack.clear();ContentHost.sample=sample;RememberHost.reset()
  val lead:(()->Unit)?=if(leading==0)null else{ {ContentHost.add(ChipLeaf("leadingInk",leading,if(leading==24)24 else 18,false))} }
  val trail:(()->Unit)?=if(trailing==0)null else{ {ContentHost.add(ChipLeaf("trailingInk",trailing,18,false))} }
  val avatar=if(leading==24)lead else null;val icon=if(leading==18)lead else null
  val pad=if(family=="input")ChipPadding(if(avatar!=null||icon==null)4 else 8,if(trail!=null)8 else 4)else ChipPadding(8,8)
  val leadingGap=if(leading>0)4.dp else 8.dp;val trailingGap=if(trailing>0)4.dp else 8.dp
  val horizontal=if(arrangement=="compact")if(animated)ChipArrangement(leadingGap,trailingGap)else ChipArrangement(8.dp,8.dp)else horizontalArrangement(if(arrangement=="space-between")"between" else arrangement)
  val leaf={ContentHost.add(ChipLeaf("labelInk",label,20,wrap))}
  if(animated)AnimatingChipContent(leaf,TextStyle(),Color(),icon,avatar,trail,Color(),Color(),32.dp,horizontal,pad,FiniteAnimationSpec(),FiniteAnimationSpec(),FiniteAnimationSpec(),FiniteAnimationSpec())else ChipContent(leaf,TextStyle(),Color(),icon,avatar,trail,Color(),Color(),32.dp,horizontal,pad)
  val root=ContentHost.root!!;val c=Constraints(b[0],b[1],b[2],b[3]);val p=root.measure(c);with(Placeable.PlacementScope(0,IntOffset.Zero)){placeRoot(p)}
  val groups=ContentHost.outerIds.joinToString(prefix="[",postfix="]"){Host.boxes.getValue(it).json()};val inks=listOf("leadingInk","labelInk","trailingInk").joinToString(prefix="[",postfix="]"){Host.boxes[it]?.json()?:"null"}
  val intrinsics=listOf(0,77,Constraints.Infinity).joinToString(prefix="[",postfix="]"){available->"{\"available\":$available,\"minWidth\":${root.minIntrinsicWidth(available)},\"maxWidth\":${root.maxIntrinsicWidth(available)},\"minHeight\":${root.minIntrinsicHeight(available)},\"maxHeight\":${root.maxIntrinsicHeight(available)}}"}
  out.add("{\"input\":{\"animated\":$animated,\"family\":\"$family\",\"rtl\":$rtl,\"leading\":$leading,\"trailing\":$trailing,\"label\":$label,\"wrap\":$wrap,\"arrangement\":\"$arrangement\",\"minWidth\":${b[0]},\"maxWidth\":${b[1]},\"minHeight\":${b[2]},\"maxHeight\":${b[3]},\"sample\":$sample},\"size\":${IntSize(p.width,p.height).json()},\"groups\":$groups,\"inks\":$inks,\"intrinsics\":$intrinsics}")
 }
 println(out.joinToString(prefix="[",postfix="]"))
}
object RetainedOutput{var emitted:String?=null}
fun retainedHistories(){val out=mutableListOf<String>()
 for(owner in listOf("leading","trailing"))for(history in listOf(listOf("none","icon","none","none","icon","none"),listOf("icon","icon","none","icon","none","none"),listOf("avatar","none","icon","none","avatar","none"),listOf("none","none","none","icon","icon","none"))){
  RememberHost.reset()
  for((frame,kind)in history.withIndex()){
   RememberHost.cursor=0;RetainedOutput.emitted=null;val role="role$frame";val labelRole="label$frame"
   val icon:(()->Unit)?=if(kind=="icon")({RetainedOutput.emitted="icon:"+LocalContentColor.value.role})else null
   val avatar:(()->Unit)?=if(kind=="avatar")({RetainedOutput.emitted="avatar:"+LocalContentColor.value.role})else null
   val target=if(owner=="leading")leadingContent(avatar,icon,Color(role))else trailingContent(icon?:avatar,Color(role))
   val retained=rememberRetainedState(target)
   CompositionLocalProvider(LocalContentColor provides Color(labelRole)){retained.value?.invoke()}
   out.add("{\"owner\":\"$owner\",\"history\":${history.joinToString(prefix="[",postfix="]"){"\"$it\""}},\"frame\":$frame,\"kind\":\"$kind\",\"role\":\"$role\",\"labelRole\":\"$labelRole\",\"emitted\":${RetainedOutput.emitted?.let{"\"$it\""}?:"null"}}")
  }
 }
 println(out.joinToString(prefix="[",postfix="]"))
}
