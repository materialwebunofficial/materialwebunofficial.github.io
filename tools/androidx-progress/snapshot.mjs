// Execute unchanged standard indicator Canvas bodies through a density-1 draw recorder.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
const root=fileURLToPath(new URL('../../',import.meta.url)),fix=path.join(root,'test/fixtures/androidx/progress-indicators');
const manifest=JSON.parse(fs.readFileSync(path.join(fix,'sources.json'),'utf8'));
for(const entry of manifest.sources)if(crypto.createHash('sha256').update(fs.readFileSync(path.join(fix,entry.file))).digest('hex')!==entry.sha256)throw new Error('Pinned source hash mismatch: '+entry.file);
const source=fs.readFileSync(path.join(fix,'ProgressIndicator.kt'),'utf8');
function block(marker){const start=source.indexOf(marker),open=source.indexOf('{',start);let depth=0;for(let i=open;i<source.length;i++){depth+=(source[i]==='{')-(source[i]==='}');if(depth===0)return source.slice(start,i+1);}throw new Error(marker);}
function canvas(marker){const start=source.indexOf(marker),open=source.lastIndexOf(') {',start)+2;let depth=0;for(let i=open;i<source.length;i++){depth+=(source[i]==='{')-(source[i]==='}');if(depth===0)return source.slice(open+1,i);}throw new Error(marker);}
const host=`import kotlin.math.*
data class Dp(val value:Float){operator fun plus(other:Dp)=Dp(value+other.value);operator fun div(other:Dp)=value/other.value;operator fun div(other:Int)=Dp(value/other)}
fun Float.toDp()=Dp(this);fun Dp.toPx()=value
enum class StrokeCap{Butt,Round,Square};enum class LayoutDirection{Ltr,Rtl}
typealias Color=String
data class Size(val width:Float,val height:Float);data class Offset(val x:Float,val y:Float);data class Stroke(val width:Float,val cap:StrokeCap)
fun Float.fastCoerceIn(a:Float,b:Float)=coerceIn(a,b);fun Float.fastCoerceAtMost(a:Float)=coerceAtMost(a)
val StopIndicatorTrailingSpace=Dp(6f)
class DrawScope(val size:Size,val layoutDirection:LayoutDirection=LayoutDirection.Ltr){
 val records=mutableListOf<String>()
 fun drawLine(color:Color,start:Offset,end:Offset,strokeWidth:Float,cap:StrokeCap=StrokeCap.Butt){records.add("[\\\"line\\\",\\\"$color\\\",$\{start.x},$\{start.y},$\{end.x},$\{end.y},$strokeWidth,\\\"$cap\\\"]")}
 fun drawCircle(color:Color,radius:Float,center:Offset){records.add("[\\\"circle\\\",\\\"$color\\\",$\{center.x},$\{center.y},$radius]")}
 fun drawRect(color:Color,topLeft:Offset,size:Size){records.add("[\\\"rect\\\",\\\"$color\\\",$\{topLeft.x},$\{topLeft.y},$\{size.width},$\{size.height}]")}
 fun drawArc(color:Color,startAngle:Float,sweepAngle:Float,useCenter:Boolean,topLeft:Offset,size:Size,style:Stroke){records.add("[\\\"arc\\\",\\\"$color\\\",$startAngle,$sweepAngle,$\{size.width/2},$\{style.width},\\\"$\{style.cap}\\\"]")}
 fun scale(scaleX:Float,scaleY:Float,draw:DrawScope.()->Unit){check(scaleX==1f&&scaleY==1f);draw()}
}
`;
const functions=block('private fun DrawScope.drawLinearIndicator(')+'\n'+block('private fun DrawScope.drawCircularIndicator(')+'\n'+block('public fun drawStopIndicator(');
const wrappers=`
fun DrawScope.drawDeterminateCircularIndicator(startAngle:Float,sweep:Float,color:Color,stroke:Stroke)=drawCircularIndicator(startAngle,sweep,color,stroke)
fun DrawScope.linear(p:Float,gapSize:Dp,strokeCap:StrokeCap){val coercedProgress={p};val trackColor="track";val color="active";val drawStopIndicator:DrawScope.()->Unit={drawStopIndicator(this,Dp(4f),color,strokeCap)};${canvas('val strokeWidth = size.height')}}
fun DrawScope.circular(p:Float,gapSize:Dp,strokeCap:StrokeCap,strokeWidth:Dp){val coercedProgress={p};val trackColor="track";val color="active";val stroke=Stroke(strokeWidth.toPx(),strokeCap);${canvas('val startAngle = 270f')}}
fun main(){val out=mutableListOf<String>();for(kind in listOf("linear","circular"))for(w in if(kind=="linear")listOf(2f,19f,240f,281f)else listOf(40f,48f))for(p in listOf(0f,.001f,.05f,.65f,.99f,1f))for(gap in listOf(0f,4f))for(cap in StrokeCap.values()){
 val scope=DrawScope(Size(w,if(kind=="linear")4f else w));if(kind=="linear")scope.linear(p,Dp(gap),cap)else scope.circular(p,Dp(gap),cap,Dp(4f))
 out.add("{\\\"kind\\\":\\\"$kind\\\",\\\"width\\\":$w,\\\"progress\\\":$p,\\\"gap\\\":$gap,\\\"cap\\\":\\\"$cap\\\",\\\"records\\\":[$\{scope.records.joinToString()}]}")
};println(out.joinToString(prefix="[",postfix="]"))}
`;
const cache=path.join(root,'research/progress-generator'),runtime=path.join(root,'research/kotlin-runtime');fs.mkdirSync(cache,{recursive:true});
// Undo the extra JSON-string escapes needed in the JS template, leaving Kotlin's escaped quotes.
fs.writeFileSync(path.join(cache,'Snapshot.kt'),(host+functions+wrappers).replaceAll('\\\\\\"','\\"'));
function run(args){const result=spawnSync('java',args,{cwd:root,encoding:'utf8',maxBuffer:4e6});if(result.status!==0)throw new Error(result.stderr);return result.stdout;}
run(['-cp',path.join(runtime,'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',path.join(runtime,'stdlib.jar'),'-jvm-target','1.8','-d',path.join(cache,'snapshot.jar'),path.join(cache,'Snapshot.kt')]);
const data=JSON.parse(run(['-cp',path.join(cache,'snapshot.jar')+path.delimiter+path.join(runtime,'stdlib.jar'),'SnapshotKt']));
fs.writeFileSync(path.join(fix,'standard-drawing-oracle.json'),JSON.stringify(data)+'\n');console.log('Generated',data.length,'unchanged source drawing cases.');
