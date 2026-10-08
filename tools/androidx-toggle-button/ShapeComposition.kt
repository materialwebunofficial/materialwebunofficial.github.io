package androidx.compose.animation.core
import androidx.compose.material3.tokens.*
import androidx.compose.material3.tokens.ExpressiveMotionTokens as E
import androidx.compose.material3.tokens.StandardMotionTokens as S

data class ToggleOp(val time:Long,val pressed:Boolean?=null,val checked:Boolean?=null,val size:String?=null,val square:Boolean?=null,val role:String?=null,val value:Float?=null,val percent:Boolean=false,val scheme:String?=null,val incidental:Boolean=false){
 fun json():String{val fields=mutableListOf("\"time\":$time")
  pressed?.let{fields.add("\"pressed\":$it")};checked?.let{fields.add("\"checked\":$it")}
  size?.let{fields.add("\"size\":\"$it\"")};square?.let{fields.add("\"square\":$it")}
  role?.let{fields.add("\"role\":\"$it\"");fields.add("\"value\":$value");fields.add("\"percent\":$percent")}
  scheme?.let{fields.add("\"scheme\":\"$it\"")};if(incidental)fields.add("\"incidental\":true")
  return fields.joinToString(prefix="{",postfix="}")
 }
}
fun toggleShapes(size:String,square:Boolean):ToggleButtonShapes{
 val defaults=ToggleButtonDefaults.shapesFor(height(size).dp)
 // The web square attribute is an explicit custom three-shape mapping.
 return if(square)defaults.copy(shape=squareToken(size).value,checkedShape=CircleShape)else defaults
}
fun main(){
 val histories=listOf(
  "selection" to listOf(ToggleOp(0,checked=true),ToggleOp(64,checked=false),ToggleOp(112,checked=true)),
  "press-release-selection" to listOf(ToggleOp(0,pressed=true),ToggleOp(64,pressed=false),ToggleOp(64,checked=true),ToggleOp(112,pressed=true),ToggleOp(176,pressed=false)),
  "checked-press-reversal" to listOf(ToggleOp(0,checked=true),ToggleOp(32,pressed=true),ToggleOp(64,pressed=false),ToggleOp(96,pressed=true),ToggleOp(144,pressed=false)),
  "selection-during-press" to listOf(ToggleOp(0,pressed=true),ToggleOp(32,checked=true),ToggleOp(96,checked=false),ToggleOp(144,pressed=false)),
  "equal-values" to listOf(ToggleOp(0,checked=true),ToggleOp(32,incidental=true),ToggleOp(64,pressed=true),ToggleOp(144,pressed=false)),
  "scheme-replacement" to listOf(ToggleOp(0,checked=true),ToggleOp(64,scheme="standard"),ToggleOp(96,pressed=true),ToggleOp(144,scheme="expressive"),ToggleOp(176,pressed=false)),
  "xs-small-shape-replacement" to listOf(ToggleOp(0,size="xs"),ToggleOp(1,pressed=true),ToggleOp(64,size="s"),ToggleOp(96,pressed=false)),
  "all-sizes" to listOf(ToggleOp(0,checked=true),ToggleOp(16,size="xs"),ToggleOp(32,size="s"),ToggleOp(64,size="m"),ToggleOp(96,size="l"),ToggleOp(112,size="xl"),ToggleOp(144,pressed=true),ToggleOp(176,pressed=false)),
  "custom-square" to listOf(ToggleOp(0,square=true),ToggleOp(16,checked=true),ToggleOp(64,pressed=true),ToggleOp(96,pressed=false),ToggleOp(144,square=false)),
  "unused-small-role" to listOf(ToggleOp(0,pressed=true),ToggleOp(64,role="small",value=11f),ToggleOp(96,pressed=false)),
  "checked-role-replacement" to listOf(ToggleOp(0,pressed=true),ToggleOp(64,role="medium",value=19f),ToggleOp(96,pressed=false),ToggleOp(144,checked=true)),
  "percent-checked-role" to listOf(ToggleOp(0,checked=true),ToggleOp(64,role="medium",value=25f,percent=true),ToggleOp(96,pressed=true),ToggleOp(144,pressed=false))
 )
 val cases=mutableListOf<String>()
 for(initialScheme in listOf("expressive","standard"))for((name,events)in histories){
  ButtonMemory.reset();MaterialTheme.shapes=Shapes();var size="s";var square=false;var pressed=false;var checked=false;var scheme=initialScheme
  val overrides=mutableMapOf<Int,CornerSize>()
  fun render():Shape{ButtonMemory.cursor=0;val spec=FiniteAnimationSpec<Float>(if(scheme=="standard")S.SpringFastSpatialStiffness else E.SpringFastSpatialStiffness,if(scheme=="standard")S.SpringFastSpatialDamping else E.SpringFastSpatialDamping);val shapes=toggleShapes(size,square);check(shapes.copy()==shapes&&shapes.copy().hashCode()==shapes.hashCode());return shapeByInteraction(shapes,pressed,checked,spec)}
  ButtonFrames.time=0;render();var at=0;val frames=mutableListOf<String>()
  val times=(events.map{it.time}+listOf(0L,1L,16L,32L,64L,65L,96L,112L,144L,176L,256L,400L,600L,800L,1100L)).distinct().sorted()
  for(time in times){ButtonFrames.time=time
   while(at<events.size&&events[at].time<=time){val e=events[at++];e.pressed?.let{pressed=it};e.checked?.let{checked=it};e.size?.let{size=it};e.square?.let{square=it};e.scheme?.let{scheme=it}
    e.role?.let{overrides[roleId(it)]=if(e.percent)PercentCorner(e.value!!)else PixelCorner(e.value!!);MaterialTheme.shapes=Shapes(overrides.toMap())};render()
   }
   val renderer=render();val state=ButtonMemory.cells[0].value as AnimatedShapeState
   val bounds=Size(if(time>=144)240f else 320f,if(time>=144)180f else 160f)
   val radius=(state.getMorphedShape() as RoundedCornerShape).topStart.toPx(bounds,Density())
   // Execute the complete original CornerBasedShape outline scaling and
   // precondition body, with a uniform final-outline value/raster host.
   val outline=try{renderer.createOutline(bounds,LayoutDirection.Ltr,Density()).radius.toString()}catch(e:IllegalArgumentException){"null"}
   frames.add("{\"time\":$time,\"generation\":${ButtonMemory.generation},\"progress\":${state.progress.value},\"velocity\":${state.progress.velocity},\"radius\":$radius,\"outlineRadius\":$outline}")
  }
  cases.add("{\"name\":\"$name\",\"scheme\":\"$initialScheme\",\"events\":${events.joinToString(prefix="[",postfix="]"){it.json()}},\"frames\":${frames.joinToString(prefix="[",postfix="]")}}")
 }
 println(cases.joinToString(prefix="[",postfix="]"))
}
