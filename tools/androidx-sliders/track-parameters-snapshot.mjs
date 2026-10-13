// Execute the unchanged SliderDefaults drawTrack / drawTrackPath / drawStopIndicator
// bodies with the public Track and Thumb parameters varied: track height,
// trackCornerSize, trackInsideCornerSize, thumbTrackGapSize, thumb size along
// the track, drawStopIndicator = null and corner shrinking. Same density-1
// Kotlin host and pinned sources as snapshot.mjs.
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
fun record(vararg values:Any)=values.joinToString(prefix="[",postfix="]"){if(it is String)"\\"$it\\"" else it.toString()}
class DrawScope(val size:Size,val layoutDirection:LayoutDirection){
 val center=Offset(size.width/2,size.height/2);val records=mutableListOf<String>()
 fun drawPath(path:Path,color:Color){val v=path.value!!;val p=v.rect.offset;val s=v.rect.size;records.add(record("path",color,p.x,p.y,p.x+s.width,p.y+s.height,v.topLeft.x,v.topRight.x,v.bottomRight.x,v.bottomLeft.x))}
 fun drawCircle(color:Color,center:Offset,radius:Float){records.add(record("circle",color,center.x,center.y,radius))}
}
`;
const helpers=['private fun DrawScope.drawTrack(','private fun DrawScope.drawTrackPath(','public fun DrawScope.drawStopIndicator(','private fun stepsToTickFractions('].map(block).join('\n');
// Each case varies one group of parameters from a base, across modes, values, steps and direction.
const cases=`
fun main(){val out=mutableListOf<String>()
 val groups=listOf(
  // track height with the unspecified corner (half the height), thumb 4
  listOf(16f,24f,40f,56f,96f).map{listOf(it,it/2f,2f,6f,4f,1f,0f)},
  // trackCornerSize given (the shrinking overload)
  listOf(listOf(36f,12f,2f,6f,4f,1f,1f),listOf(40f,4f,2f,6f,4f,1f,1f),listOf(56f,0f,2f,6f,4f,1f,1f),listOf(96f,28f,2f,6f,4f,1f,1f),listOf(24f,8f,2f,6f,4f,1f,1f)),
  // inside corner, gap, thumb width along the track
  listOf(listOf(16f,8f,0f,6f,4f,1f,0f),listOf(16f,8f,4f,6f,4f,1f,0f),listOf(40f,20f,2f,0f,4f,1f,0f),listOf(40f,20f,2f,4f,6f,1f,0f),listOf(56f,28f,2f,6f,8f,1f,0f)),
  // drawStopIndicator = null
  listOf(listOf(16f,8f,2f,6f,4f,0f,0f),listOf(36f,12f,2f,6f,4f,0f,1f),listOf(96f,48f,2f,6f,4f,0f,0f))
 ).flatten()
 for(p in groups)for(length in listOf(48f,240f,281f))for(end in listOf(0f,.05f,.5f,.65f,1f))for(mode in listOf("standard","centered","vertical","range"))for(steps in listOf(0,4))for(rtl in listOf(false,true)){
  val thickness=p[0];val corner=p[1];val inside=p[2];val gap=p[3];val handle=p[4];val stop=p[5]==1f;val shrinkGiven=p[6]==1f
  val centered=mode=="centered";val vertical=mode=="vertical";val range=mode=="range";val start=if(range)min(.25f,end)else 0f
  val scope=DrawScope(if(vertical)Size(thickness,length)else Size(length,thickness),if(rtl)LayoutDirection.Rtl else LayoutDirection.Ltr)
  val startHandle=if(range||(centered&&end<=.5f))handle else 0f;val endHandle=if(!centered||end>=.5f)handle else 0f
  val shrink=shrinkGiven||centered||vertical
  scope.drawTrack(stepsToTickFractions(steps),start,end,"inactive","active","inactive-tick","active-tick",Dp(startHandle),Dp(startHandle),Dp(endHandle),Dp(endHandle),Dp(if(range||centered)gap else 0f),Dp(gap),Dp(inside),Dp(corner),if(stop){{drawStopIndicator(it,Dp(4f),"active")}}else null,{offset,color->drawStopIndicator(offset,Dp(4f),color)},range,shrink,if(vertical)Vertical else Horizontal,centered)
  out.add("{\\"length\\":$length,\\"thickness\\":$thickness,\\"corner\\":$corner,\\"insideCorner\\":$inside,\\"gap\\":$gap,\\"handle\\":$handle,\\"stopIndicators\\":$stop,\\"shrink\\":$shrink,\\"end\\":$end,\\"start\\":$start,\\"mode\\":\\"$mode\\",\\"steps\\":$steps,\\"rtl\\":$rtl,\\"records\\":[\${scope.records.joinToString()}]}")
 }
 println("[\${out.joinToString()}]")}
`;
const cache=path.join(root,'research/slider-generator'),runtime=path.join(root,'research/kotlin-runtime');fs.mkdirSync(cache,{recursive:true});
fs.writeFileSync(path.join(cache,'TrackParameters.kt'),host+helpers+cases);
function run(args){const r=spawnSync('java',args,{cwd:root,encoding:'utf8',maxBuffer:64e6});if(r.status!==0)throw new Error(r.stderr);return r.stdout;}
run(['-cp',path.join(runtime,'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',path.join(runtime,'stdlib.jar'),'-jvm-target','1.8','-d',path.join(cache,'track-parameters.jar'),path.join(cache,'TrackParameters.kt')]);
const data=JSON.parse(run(['-cp',path.join(cache,'track-parameters.jar')+path.delimiter+path.join(runtime,'stdlib.jar'),'TrackParametersKt']));
fs.writeFileSync(path.join(fix,'track-parameters-oracle.json'),JSON.stringify(data)+'\n');
console.log('Slider unchanged Kotlin drawTrack cases with Track/Thumb parameters:',data.length);
