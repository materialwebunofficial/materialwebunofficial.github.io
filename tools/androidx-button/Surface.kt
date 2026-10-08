package androidx.compose.material3

import Color as SourceColor
import ColorScheme as SourceColorScheme
import Dp as SourceDp
import color
import argb

// Composition locals/emission, Dp/density and modifier/ripple/semantics calls are
// explicit hosts. Original complete Surface bodies choose and order these calls.
@Target(AnnotationTarget.FUNCTION,AnnotationTarget.TYPE)
annotation class Composable
annotation class NonRestartableComposable
annotation class ReadOnlyComposable
annotation class Stable
val Int.dp get()=SourceDp(toFloat())
operator fun SourceDp.plus(other:SourceDp)=SourceDp(value+other.value)
fun SourceColor.takeOrElse(block:()->SourceColor)=if(this!=SourceColor.Unspecified)this else block()
class Shape(val name:String)
val RectangleShape=Shape("rectangle")
class BorderStroke(val name:String)
class MutableInteractionSource
fun <T> remember(calculation:()->T)=calculation()
class Local<T>(var current:T){infix fun provides(value:T)=Provided(this,value)}
class Provided<T>(val local:Local<T>,val value:T){
 fun scoped(content:()->Unit){val old=local.current;local.current=value;try{content()}finally{local.current=old}}
}
fun CompositionLocalProvider(vararg values:Provided<*>,content:()->Unit){fun next(i:Int){if(i==values.size)content()else values[i].scoped{next(i+1)}};next(0)}
val LocalContentColor=Local(color(0xff123456L))
val LocalAbsoluteTonalElevation=Local(0.dp)
val LocalTonalElevationEnabled=Local(true)
class Density(val density:Float){fun SourceDp.toPx()=value*density}
val LocalDensity=Local(Density(1f))
object RippleThemeConfiguration{sealed class Focus{class InsetRing:Focus();class Other:Focus()}}
class RippleConfiguration(val focus:RippleThemeConfiguration.Focus)
val LocalRippleThemeConfiguration=Local(RippleConfiguration(RippleThemeConfiguration.Focus.Other()))
class Ripple(val press:Boolean,val focus:Boolean,val drag:Boolean,val hover:Boolean)
fun ripple(focusRingShape:Shape,enablePressIndication:Boolean=true,enableFocusIndication:Boolean=true,enableDragIndication:Boolean=true,enableHoverIndication:Boolean=true)=Ripple(enablePressIndication,enableFocusIndication,enableDragIndication,enableHoverIndication)
fun Ripple.json()="{\"press\":$press,\"focus\":$focus,\"drag\":$drag,\"hover\":$hover}"
open class Modifier(val records:List<String> = emptyList()){
 companion object:Modifier()
 fun then(other:Modifier)=Modifier(records+other.records)
 fun add(record:String)=then(Modifier(listOf(record)))
}
fun Modifier.minimumInteractiveComponentSize()=add("{\"kind\":\"minimum-interactive\"}")
fun Modifier.indication(interactionSource:MutableInteractionSource,indication:Ripple)=add("{\"kind\":\"indication\",\"ripple\":${indication.json()}}")
fun Modifier.graphicsLayer(shadowElevation:Float,shape:Shape,clip:Boolean)=add("{\"kind\":\"shadow\",\"elevation\":$shadowElevation,\"shape\":\"${shape.name}\",\"clip\":$clip}")
fun Modifier.border(border:BorderStroke,shape:Shape)=add("{\"kind\":\"border\",\"name\":\"${border.name}\",\"shape\":\"${shape.name}\"}")
fun Modifier.background(color:SourceColor,shape:Shape)=add("{\"kind\":\"background\",\"argb\":${argb(color)},\"shape\":\"${shape.name}\"}")
fun Modifier.clip(shape:Shape)=add("{\"kind\":\"clip\",\"shape\":\"${shape.name}\"}")
fun Modifier.clickable(interactionSource:MutableInteractionSource,indication:Ripple,enabled:Boolean,onClick:()->Unit)=add("{\"kind\":\"clickable\",\"enabled\":$enabled,\"ripple\":${indication.json()}}")
fun Modifier.toggleable(value:Boolean,interactionSource:MutableInteractionSource,indication:Ripple,enabled:Boolean,onValueChange:(Boolean)->Unit)=add("{\"kind\":\"toggleable\",\"value\":$value,\"enabled\":$enabled,\"ripple\":${indication.json()}}")
fun Modifier.childSemantics()=add("{\"kind\":\"child-semantics\"}")
var emission=""
fun Box(modifier:Modifier,propagateMinConstraints:Boolean,content:()->Unit){
 emission="\"commands\":${modifier.records.joinToString(prefix="[",postfix="]")},\"propagateMinConstraints\":$propagateMinConstraints,\"contentArgb\":${argb(LocalContentColor.current)},\"absoluteElevation\":${LocalAbsoluteTonalElevation.current.value}"
 content()
}
object MaterialTheme{lateinit var colorScheme:SourceColorScheme}
fun main(){
 val names=listOf("primary","onPrimary","secondary","onSecondary","tertiary","onTertiary","background","onBackground","error","onError","primaryContainer","onPrimaryContainer","secondaryContainer","onSecondaryContainer","tertiaryContainer","onTertiaryContainer","errorContainer","onErrorContainer","inverseSurface","inverseOnSurface","surface","onSurface","surfaceVariant","onSurfaceVariant","surfaceBright","surfaceContainer","surfaceContainerHigh","surfaceContainerHighest","surfaceContainerLow","surfaceContainerLowest","surfaceDim","primaryFixed","onPrimaryFixed","primaryFixedDim","secondaryFixed","onSecondaryFixed","secondaryFixedDim","tertiaryFixed","onTertiaryFixed","tertiaryFixedDim","surfaceTint")
 // Constructor argument order comes from the already source-executed color fixture.
 fun scheme():SourceColorScheme{val c=names.mapIndexed{i,name->color(when(name){"surface"->0xfffffbfeL;"surfaceTint","primary"->0xff6750a4L;else->0xff000000L+i})};return SourceColorScheme(c[0],c[1],c[2],c[3],c[4],c[5],c[6],c[7],c[8],c[9],c[10],c[11],c[12],c[13],c[14],c[15],c[16],c[17],c[18],c[19],c[20],c[21],c[22],c[23],c[24],c[25],c[26],c[27],c[28],c[29],c[30],c[31],c[32],c[33],c[34],c[35],c[36],c[37],c[38],c[39],c[40])}
 MaterialTheme.colorScheme=scheme()
 val out=mutableListOf<String>()
 for(mode in listOf("button","off","on"))for(enabled in listOf(false,true))for(inset in listOf(false,true))for(density in listOf(1f,1.25f,2f))for(background in listOf(0xfffffbfeL,0xff6750a4L,0x80112233L))for(parent in listOf(0f,1.5f,6f,24f))for(tonal in listOf(0f,2f,6f))for(shadow in listOf(-1f,0f,1f,3f))for(border in listOf(false,true))for(tonalEnabled in listOf(false,true)){
  LocalAbsoluteTonalElevation.current=SourceDp(parent);LocalTonalElevationEnabled.current=tonalEnabled;LocalDensity.current=Density(density);LocalRippleThemeConfiguration.current=RippleConfiguration(if(inset)RippleThemeConfiguration.Focus.InsetRing()else RippleThemeConfiguration.Focus.Other())
  val contentColor=color(0xff112233L)
  val modifier=Modifier.add("{\"kind\":\"caller\",\"role\":\"${if(mode=="button") "Button" else "Checkbox"}\"}")
  if(mode=="button")Surface(onClick={},modifier=modifier,enabled=enabled,shape=Shape("button"),color=color(background),contentColor=contentColor,tonalElevation=SourceDp(tonal),shadowElevation=SourceDp(shadow),border=if(border)BorderStroke("outline")else null,interactionSource=MutableInteractionSource()){}
  else Surface(checked=mode=="on",onCheckedChange={},modifier=modifier,enabled=enabled,shape=Shape("button"),color=color(background),contentColor=contentColor,tonalElevation=SourceDp(tonal),shadowElevation=SourceDp(shadow),border=if(border)BorderStroke("outline")else null,interactionSource=MutableInteractionSource()){}
  out.add("{\"input\":{\"mode\":\"$mode\",\"enabled\":$enabled,\"inset\":$inset,\"density\":$density,\"background\":$background,\"parent\":$parent,\"tonal\":$tonal,\"shadow\":$shadow,\"border\":$border,\"tonalEnabled\":$tonalEnabled},$emission}")
 }
 println(out.joinToString(prefix="[",postfix="]"))
}
