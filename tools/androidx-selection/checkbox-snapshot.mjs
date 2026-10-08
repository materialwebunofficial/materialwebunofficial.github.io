// Execute unchanged CheckboxColors/default getter, drawCheck and drawBox.
// Token-role/color/path/density hosts are explicit; this does not run Compose.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),fix=path.join(root,'test/fixtures/androidx/selection');
const cache=path.join(root,'research/checkbox-md3-generator'),runtime=path.join(root,'research/kotlin-runtime');
const read=name=>fs.readFileSync(path.join(fix,name),'utf8').replaceAll('\r\n','\n');
for(const [file,s]of Object.entries(JSON.parse(read('sources.json')))){
  const bytes=fs.readFileSync(path.join(fix,file.replace('tokens/','')));
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==s.sha256)throw Error('Original source hash: '+file);
}
function block(source,marker){
  const start=source.indexOf(marker),open=source.indexOf('{',start);if(start<0)throw Error(marker);
  let depth=0;for(let end=open;end<source.length;end++){
    depth+=(source[end]==='{')-(source[end]==='}');if(!depth)return source.slice(start,end+1);
  }throw Error(marker);
}
const checkbox=read('Checkbox.kt'),tokens=read('CheckboxTokens.kt');
const tokenSource=tokens.replace(/^package .*\n/m,'').replace(/^import .*\n/gm,'');
const roles=[...new Set([...tokens.matchAll(/ColorSchemeKeyTokens\.(\w+)/g)].map(m=>m[1]))];
const shapes=[...new Set([...tokens.matchAll(/ShapeKeyTokens\.(\w+)/g)].map(m=>m[1]))];
const colorClass=block(checkbox,'public class CheckboxColors');
const defaultGetter=block(checkbox,'internal val ColorScheme.defaultCheckboxColors: CheckboxColors');
const drawCheck=block(checkbox,'private fun DrawScope.drawCheck(');
const drawBox=block(checkbox,'private fun DrawScope.drawBox(');
const cacheStart=checkbox.indexOf('private class CheckDrawingCache(');
const drawingCache=checkbox.slice(cacheStart,checkbox.indexOf('\n/**',cacheStart));
const host=`import kotlin.math.*
import androidx.compose.ui.unit.*
annotation class Immutable
annotation class ExperimentalMaterial3Api
enum class ColorSchemeKeyTokens {${roles.join(',')}}
typealias ColorToken=ColorSchemeKeyTokens
enum class ShapeKeyTokens {${shapes.join(',')}}
typealias ShapeToken=ShapeKeyTokens
class RoundedCornerShape(val radius:Dp)
enum class ToggleableState {On,Off,Indeterminate}
object ComposeMaterial3Flags {var isCheckboxStylingFixEnabled=false}
data class Color(val role:String,val alpha:Float=1f){companion object{val Transparent=Color("Transparent",0f);val Unspecified=Color("Unspecified")}}
inline fun Color.takeOrElse(default:()->Color)=if(role=="Unspecified")default()else this
class ColorScheme {var defaultCheckboxColorsCached:CheckboxColors?=null;fun fromToken(token:ColorToken)=Color(token.name)}
${tokenSource}
${colorClass}
${defaultGetter}
data class Size(val width:Float,val height:Float)
data class Offset(val x:Float,val y:Float)
data class CornerRadius(val value:Float)
enum class StrokeCap {Square}
data class Stroke(val width:Float,val cap:StrokeCap=StrokeCap.Square)
object Fill
class Path {val points=mutableListOf<Offset>();var fraction=0f;fun rewind(){points.clear();fraction=0f};fun moveTo(x:Float,y:Float){points.add(Offset(x,y))};fun lineTo(x:Float,y:Float){points.add(Offset(x,y))}}
// Record the normalized segment request. No Skia PathMeasure is substituted.
class PathMeasure {val length=1f;fun setPath(path:Path,closed:Boolean){};fun getSegment(start:Float,stop:Float,target:Path,startWithMoveTo:Boolean){target.fraction=stop}}
class DrawScope(val size:Size){val boxes=mutableListOf<String>();fun drawPath(path:Path,color:Color,style:Stroke){};fun drawRoundRect(color:Color,topLeft:Offset=Offset(0f,0f),size:Size=this.size,cornerRadius:CornerRadius,style:Any){boxes.add("""{"color":"$\{color.role}","alpha":$\{color.alpha},"offset":[$\{topLeft.x},$\{topLeft.y}],"size":[$\{size.width},$\{size.height}],"radius":$\{cornerRadius.value},"stroke":$\{if(style is Stroke)style.width else 0f}}""")}}
fun lerp(start:Float,stop:Float,fraction:Float)=(1-fraction)*start+fraction*stop
${drawingCache}
${drawCheck}
${drawBox}
fun colorJson(c:Color)="""{"role":"$\{c.role}","alpha":$\{c.alpha}}"""
fun main(){val marks=mutableListOf<String>();val colors=mutableListOf<String>();val boxes=mutableListOf<String>();val scheme=ColorScheme();val defaults=scheme.defaultCheckboxColors
for(fix in listOf(false,true)){ComposeMaterial3Flags.isCheckboxStylingFixEnabled=fix
for(width in listOf(18f,20f))for(gravity in listOf(-.2f,0f,.25f,.5f,.75f,1f,1.2f))for(fraction in listOf(0f,.01f,.5f,1f,1.1f)){
val scope=DrawScope(Size(width,width));val cache=CheckDrawingCache();with(scope){drawCheck(Color("OnPrimary"),fraction,gravity,Stroke(2f),cache)}
val points=cache.checkPath.points.joinToString{ "[$\{it.x},$\{it.y}]" };marks.add("""{"md3":$fix,"width":$width,"gravity":$gravity,"fraction":$fraction,"points":[$points],"segmentFraction":$\{cache.pathToDraw.fraction}}""")}
for(enabled in listOf(false,true))for(state in ToggleableState.values()){
colors.add("""{"md3":$fix,"enabled":$enabled,"state":"$state","mark":$\{colorJson(if(fix)defaults.checkmarkColor(enabled,state)else defaults.checkmarkColor(state))},"box":$\{colorJson(defaults.boxColor(enabled,state))},"border":$\{colorJson(defaults.borderColor(enabled,state))},"ripple":$\{colorJson(if(fix)defaults.indicatorColor(state)else Color.Unspecified)}}""")}
}
for(width in listOf(18f,20f))for(stroke in listOf(0f,1f,2f,3f,6f))for(filled in listOf(false,true)){
val scope=DrawScope(Size(width,width));with(scope){drawBox(if(filled)Color("Primary")else Color.Transparent,Color("Primary"),2f,Stroke(stroke))};boxes.add("""{"width":$width,"stroke":$stroke,"filled":$filled,"rects":[$\{scope.boxes.joinToString()}]}""")}
println("""{"marks":[$\{marks.joinToString()}],"colors":[$\{colors.joinToString()}],"boxes":[$\{boxes.joinToString()}]}""")}
`;
fs.mkdirSync(cache,{recursive:true});
fs.writeFileSync(path.join(cache,'Units.kt'),'package androidx.compose.ui.unit\ndata class Dp(val value:Float)\nval Double.dp get()=Dp(toFloat())\n');
fs.writeFileSync(path.join(cache,'Snapshot.kt'),host);
function run(args){const r=spawnSync('java',args,{encoding:'utf8',maxBuffer:8e6});if(r.status!==0)throw Error(r.stderr||r.stdout);return r.stdout;}
run(['-cp',path.join(runtime,'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',path.join(runtime,'stdlib.jar'),'-jvm-target','1.8','-d',path.join(cache,'oracle.jar'),path.join(cache,'Snapshot.kt'),path.join(cache,'Units.kt')]);
const records=JSON.parse(run(['-cp',path.join(cache,'oracle.jar')+path.delimiter+path.join(runtime,'stdlib.jar'),'SnapshotKt']));
fs.writeFileSync(path.join(fix,'md3-checkbox-drawing-oracle.json'),JSON.stringify(records)+'\n');
console.log('Original Checkbox MD2/MD3 preparation:',records.marks.length,'control-point/segment request records,',records.colors.length,'native role decisions,',records.boxes.length,'native box drawing records. Runtime untouched; path/raster/layout hosts remain explicit.');
