// Execute unchanged SliderDefaults drawing helpers in a density-1 Kotlin recorder.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),fix=path.join(root,'test/fixtures/androidx/sliders');
const manifest=JSON.parse(fs.readFileSync(path.join(fix,'sources.json'),'utf8'));
for(const entry of manifest.sources)if(crypto.createHash('sha256').update(fs.readFileSync(path.join(fix,entry.file))).digest('hex')!==entry.sha256)throw new Error('Pinned source mismatch: '+entry.file);
const source=fs.readFileSync(path.join(fix,'Slider.kt'),'utf8');
function block(marker){const start=source.indexOf(marker),open=source.indexOf('{',start);if(start<0)throw new Error(marker);let depth=0;for(let i=open;i<source.length;i++){depth+=(source[i]==='{')-(source[i]==='}');if(depth===0)return source.slice(start,i+1);}throw new Error(marker);}
const host=`import kotlin.math.*
data class Dp(val value:Float):Comparable<Dp>{override fun compareTo(other:Dp)=value.compareTo(other.value)}
val Int.dp get()=Dp(toFloat());fun Dp.toPx()=value
typealias Color=String
enum class Orientation{Horizontal,Vertical};val Horizontal=Orientation.Horizontal;val Vertical=Orientation.Vertical
enum class LayoutDirection{Ltr,Rtl}
data class Size(val width:Float,val height:Float);data class Offset(val x:Float,val y:Float)
data class CornerRadius(val x:Float,val y:Float)
data class Rect(val offset:Offset,val size:Size)
data class RoundRect(val rect:Rect,val topLeft:CornerRadius,val topRight:CornerRadius,val bottomRight:CornerRadius,val bottomLeft:CornerRadius)
class Path{var value:RoundRect?=null;fun addRoundRect(v:RoundRect){value=v};fun rewind(){value=null}}
val trackPath=Path()
fun lerp(a:Float,b:Float,t:Float)=(1-t)*a+t*b
fun record(vararg values:Any)=values.joinToString(prefix="[",postfix="]"){if(it is String)"\\\"$it\\\"" else it.toString()}
class DrawScope(val size:Size,val layoutDirection:LayoutDirection){
 val center=Offset(size.width/2,size.height/2);val records=mutableListOf<String>()
 fun drawPath(path:Path,color:Color){val v=path.value!!;val p=v.rect.offset;val s=v.rect.size;records.add(record("path",color,p.x,p.y,p.x+s.width,p.y+s.height,v.topLeft.x,v.topRight.x,v.bottomRight.x,v.bottomLeft.x))}
 fun drawCircle(color:Color,center:Offset,radius:Float){records.add(record("circle",color,center.x,center.y,radius))}
}
`;
const helpers=['private fun DrawScope.drawTrack(','private fun DrawScope.drawTrackPath(','public fun DrawScope.drawStopIndicator(','private fun snapValueToTick(','private fun stepsToTickFractions('].map(block).join('\n');
const scalar=source.slice(source.indexOf('private fun scale(a1:'),source.indexOf('// Scale x.start,'))
 +block('private fun scale(\n    isStart:')
 +source.slice(source.indexOf('private fun calcFraction('),source.indexOf('private fun Modifier.sliderSemantics('));
const state=`
class SliderStateProjection(val totalWidth:Int,val totalHeight:Int,val orientation:Orientation,val trackRange:ClosedFloatingPointRange<Float>,steps:Int){
 val thumbWidth=4;val thumbHeight=4;val tickFractions=stepsToTickFractions(steps)
 var rawOffset=0f;var pressOffset=0f;var value=Float.NaN
 var isRtl=false;var reverseVerticalDirection=false
 fun scaleToUserValue(a:Float,b:Float,x:Float)=scale(a,b,x,trackRange.start,trackRange.endInclusive)
 ${block('internal fun onPress(pos: Offset)')}
 ${block('internal fun dispatchRawDeltaInternal(')}
}
data class SliderRange(val start:Float,val endInclusive:Float)
class RangeSliderStateProjection(var totalWidth:Int,val trackRange:ClosedFloatingPointRange<Float>,steps:Int,start:Float,end:Float){
 val startThumbWidth=4f;val endThumbWidth=4f;val tickFractions=stepsToTickFractions(steps)
 var startValue=start;var endValue=end;var rawOffsetStart=0f;var rawOffsetEnd=0f;var minPx=0f;var maxPx=0f;var isDragging=false
 fun scaleToOffset(a:Float,b:Float,x:Float)=scale(trackRange.start,trackRange.endInclusive,x,a,b)
 fun scaleToUserValue(isStart:Boolean,a:Float,b:Float,x:SliderRange)=scale(isStart,a,b,x,trackRange.start,trackRange.endInclusive)
 ${block('internal fun onDrag(\n        isStart:')}
 ${block('internal fun updateMinMaxPx()')}
}
`;
const historyCases=`
 val singles=mutableListOf<String>();val ranges=mutableListOf<String>()
 for(total in listOf(19,244,285))for(bounds in listOf(0f..100f,-50f..50f,10f..30f,0f..1f))for(steps in listOf(0,4,9))for(vertical in listOf(false,true))for(reverse in listOf(false,true)){
  val state=SliderStateProjection(total,total,if(vertical)Vertical else Horizontal,bounds,steps);state.isRtl=reverse;state.reverseVerticalDirection=reverse
  state.value=snapValueToTick(lerp(bounds.start,bounds.endInclusive,.5f),state.tickFractions,bounds.start,bounds.endInclusive)
  val frames=mutableListOf<String>()
  for(press in listOf(42.2f,total+32.1f,.00001f,122.3f)){
   state.onPress(Offset(press,press));frames.add(record("press",press,state.rawOffset,state.pressOffset,state.value,false))
   for(delta in listOf(0f,.03f,.01f,-.004f,300.1f,-2.3f,-450.2f,57.125f)){
    var changed=false;state.dispatchRawDeltaInternal(delta){changed=true;state.value=snapValueToTick(it,state.tickFractions,bounds.start,bounds.endInclusive)}
    frames.add(record("drag",delta,state.rawOffset,state.pressOffset,state.value,changed))
   }
  }
  singles.add("""{"total":$total,"min":\${bounds.start},"max":\${bounds.endInclusive},"steps":$steps,"vertical":$vertical,"reverse":$reverse,"frames":[\${frames.joinToString()}]}""")
 }
 for(total in listOf(19,244,285))for(bounds in listOf(0f..100f,-50f..50f,10f..30f,0f..1f))for(steps in listOf(0,4,9))for(fractions in listOf(.2f to .8f,.5f to .5f,0f to 1f))for(firstStart in listOf(false,true)){
  val start=snapValueToTick(lerp(bounds.start,bounds.endInclusive,fractions.first),stepsToTickFractions(steps),bounds.start,bounds.endInclusive)
  val end=snapValueToTick(lerp(bounds.start,bounds.endInclusive,fractions.second),stepsToTickFractions(steps),bounds.start,bounds.endInclusive)
  val state=RangeSliderStateProjection(total,bounds,steps,start,end);val frames=mutableListOf<String>()
  fun update(){state.updateMinMaxPx();frames.add(record("update",state.totalWidth,state.isDragging,state.rawOffsetStart,state.rawOffsetEnd,state.minPx,state.maxPx,state.startValue,state.endValue))}
  update()
  for(isStart in listOf(firstStart,!firstStart)){
   state.isDragging=true
   for((i,delta) in listOf(-50f,.03f,.01f,400f,-4.4f,-500f,25.1f).withIndex()){
    if(i==3){state.totalWidth+=37;update()}
    var changed=false;state.onDrag(isStart,delta){changed=true;state.startValue=snapValueToTick(it.start,state.tickFractions,bounds.start,bounds.endInclusive);state.endValue=snapValueToTick(it.endInclusive,state.tickFractions,bounds.start,bounds.endInclusive)}
    frames.add(record("drag",isStart,delta,state.rawOffsetStart,state.rawOffsetEnd,state.startValue,state.endValue,changed))
   }
   state.isDragging=false;update()
  }
  ranges.add("""{"total":$total,"min":\${bounds.start},"max":\${bounds.endInclusive},"steps":$steps,"start":$start,"end":$end,"frames":[\${frames.joinToString()}]}""")
 }
`;
const cases=`
fun main(){val out=mutableListOf<String>();for(length in listOf(19f,48f,240f,281f))for(end in listOf(0f,.01f,.05f,.25f,.5f,.65f,.99f,1f))for(mode in listOf("standard","centered","vertical","range"))for(steps in listOf(0,4,9))for(rtl in listOf(false,true))for(gap in listOf(0f,6f)){
 val centered=mode=="centered";val vertical=mode=="vertical";val range=mode=="range";val start=if(range)min(.25f,end)else 0f
 val scope=DrawScope(if(vertical)Size(16f,length)else Size(length,16f),if(rtl)LayoutDirection.Rtl else LayoutDirection.Ltr)
 val startHandle=if(range||(centered&&end<=.5f))4f else 0f;val endHandle=if(!centered||end>=.5f)4f else 0f
 scope.drawTrack(stepsToTickFractions(steps),start,end,"inactive","active","inactive-tick","active-tick",Dp(startHandle),Dp(startHandle),Dp(endHandle),Dp(endHandle),Dp(if(range||centered)gap else 0f),Dp(gap),Dp(2f),Dp(8f),{drawStopIndicator(it,Dp(4f),"active")},{offset,color->drawStopIndicator(offset,Dp(4f),color)},range,centered||vertical,if(vertical)Vertical else Horizontal,centered)
 val snap=snapValueToTick(end*100f,stepsToTickFractions(steps),0f,100f)
 out.add("{\\\"length\\\":$length,\\\"end\\\":$end,\\\"start\\\":$start,\\\"mode\\\":\\\"$mode\\\",\\\"steps\\\":$steps,\\\"rtl\\\":$rtl,\\\"gap\\\":$gap,\\\"snap\\\":$snap,\\\"records\\\":[$\{scope.records.joinToString()}]}")
 };
 val pointers=mutableListOf<String>();for(total in listOf(4,19,244,285))for(coordinate in listOf(-5f,0f,1f,2f,5.3f,42.2f,100f,122f,241f,244f,310f))for(bounds in listOf(0f..100f,-50f..50f,10f..30f,0f..1f,1f..1f))for(steps in listOf(0,4,9))for(vertical in listOf(false,true)){
  val state=SliderStateProjection(total,total,if(vertical)Vertical else Horizontal,bounds,steps);state.pressOffset=coordinate
  var value=Float.NaN;state.dispatchRawDeltaInternal(0f){value=it}
  pointers.add("{\\\"total\\\":$total,\\\"coordinate\\\":$coordinate,\\\"min\\\":$\{bounds.start},\\\"max\\\":$\{bounds.endInclusive},\\\"steps\\\":$steps,\\\"vertical\\\":$vertical,\\\"value\\\":$value}")
 };
 ${historyCases}
 println("""{"drawing":[\${out.joinToString()}],"pointers":[\${pointers.joinToString()}],"histories":{"single":[\${singles.joinToString()}],"range":[\${ranges.joinToString()}]}}""")}
`;
const cache=path.join(root,'research/slider-generator'),runtime=path.join(root,'research/kotlin-runtime');fs.mkdirSync(cache,{recursive:true});
fs.writeFileSync(path.join(cache,'Snapshot.kt'),(host+helpers+scalar+state+cases).replaceAll('\\\\\\"','\\"'));
function run(args){const r=spawnSync('java',args,{cwd:root,encoding:'utf8',maxBuffer:8e6});if(r.status!==0)throw new Error(r.stderr);return r.stdout;}
run(['-cp',path.join(runtime,'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',path.join(runtime,'stdlib.jar'),'-jvm-target','1.8','-d',path.join(cache,'snapshot.jar'),path.join(cache,'Snapshot.kt')]);
const data=JSON.parse(run(['-cp',path.join(cache,'snapshot.jar')+path.delimiter+path.join(runtime,'stdlib.jar'),'SnapshotKt']));
fs.writeFileSync(path.join(fix,'drawing-oracle.json'),JSON.stringify(data.drawing)+'\n');
fs.writeFileSync(path.join(fix,'pointer-oracle.json'),JSON.stringify(data.pointers)+'\n');
fs.writeFileSync(path.join(fix,'input-state-oracle.json'),JSON.stringify(data.histories)+'\n');
console.log('Slider unchanged Kotlin drawing/snap cases:',data.drawing.length,'pointer scaling cases:',data.pointers.length,'state histories:',data.histories.single.length+data.histories.range.length);
