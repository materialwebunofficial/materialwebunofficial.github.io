// Execute unchanged current Material3 RippleAnimation drawing with native FloatTweenSpec/easing.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),fix=path.join(root,'test/fixtures/androidx/ripple'),cache=path.join(root,'research/ripple-generator'),runtime=path.join(root,'research/kotlin-runtime');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const s of JSON.parse(fs.readFileSync(path.join(fix,'sources.json'))).sources)if(hash(path.join(fix,s.file))!==s.sha256)throw Error('Source hash: '+s.file);
const drawer=path.join(root,'test/fixtures/androidx/navigation-drawer'),drawerCache=path.join(root,'research/drawer-generator');
const drawerManifest=JSON.parse(fs.readFileSync(path.join(drawer,'sources.json'))).files;
for(const name of ['Easing.kt','Bezier.kt','MathHelpers.kt'])if(hash(path.join(drawer,name))!==drawerManifest[name].sha256)throw Error('Source hash: '+name);
const read=p=>fs.readFileSync(p,'utf8').replaceAll('\r\n','\n');
const source=read(path.join(fix,'M3RippleAnimation.kt'));
function block(text,marker){const start=text.indexOf(marker),open=text.indexOf('{',start);if(start<0)throw Error(marker);let depth=0;for(let i=open;i<text.length;i++){depth+=(text[i]==='{')-(text[i]==='}');if(!depth)return text.slice(start,i+1);}throw Error(marker);}
fs.mkdirSync(cache,{recursive:true});
// Reuse field-host bridges after checking each native arithmetic body against its pinned original.
for(const [name,original,markers]of [
 ['Bezier.kt','Bezier.kt',['private fun evaluateCubic(p0:','public fun evaluateCubic(p1:','public fun findFirstCubicRoot(','private fun findQuadraticRoots(','public fun computeCubicVerticalBounds(','private inline fun clampValidRootInUnitRange(','private fun writeValidRootInUnitRange(']],
 ['Math.kt','MathHelpers.kt',['public fun fastCbrt(','public fun lerp(start: Float,']]
]){const text=read(path.join(drawerCache,name)),native=read(path.join(drawer,original));for(const marker of markers)if(!text.includes(block(native,marker)))throw Error('Changed native body: '+marker);fs.writeFileSync(path.join(cache,name),text);}
const easing=read(path.join(drawer,'Easing.kt')).replaceAll('import androidx.compose.runtime.Immutable\n','').replaceAll('import androidx.compose.runtime.Stable\n','').replaceAll('@Stable\n','').replaceAll('@Immutable\n','');fs.writeFileSync(path.join(cache,'Easing.kt'),easing);
const tweenSource=path.join(root,'test/fixtures/androidx/motion/FloatAnimationSpec.kt'),tweenManifest=JSON.parse(fs.readFileSync(path.join(root,'tools/androidx-motion/sources.json')))['FloatAnimationSpec.kt'];if(hash(tweenSource)!==tweenManifest.sha256)throw Error('Source hash: FloatAnimationSpec');
fs.writeFileSync(path.join(cache,'Tween.kt'),'package androidx.compose.animation.core\nimport androidx.compose.ui.util.*\n'+block(read(tweenSource),'public class FloatTweenSpec('));
for(const name of ['Pair.kt','Bridge.kt'])fs.copyFileSync(path.join(drawerCache,name),path.join(cache,name));
const draw=block(source,'fun DrawScope.draw(color: Color)'),end=block(source,'internal fun Density.getRippleEndRadius('),start=source.match(/internal fun getRippleStartRadius\(size: Size\) = .*/)[0];
const host=`import kotlin.math.*
import androidx.compose.animation.core.*
data class Size(val width:Float,val height:Float)
data class Offset(val x:Float,val y:Float){fun getDistance()=sqrt(x*x+y*y)}
data class Color(val alpha:Float)
data class Dp(val value:Float);val Int.dp get()=Dp(toFloat());fun Dp.toPx()=value
interface Density;val BoundedRippleExtraRadius=10.dp
fun lerp(a:Float,b:Float,t:Float)=(1-t)*a+t*b
${start}
${end}
class DrawScope(val size:Size){val center=Offset(size.width/2,size.height/2);var record="";fun clipRect(block:DrawScope.()->Unit)=block();fun drawCircle(color:Color,radius:Float,centerOffset:Offset){record="[$radius,$\{centerOffset.x},$\{centerOffset.y},$\{color.alpha}]"}}
class Value(val value:Float)
class Projection(var origin:Offset?,val radius:Float,val bounded:Boolean,val animatedAlpha:Value,val animatedRadiusPercent:Value,val animatedCenterPercent:Value,val finishRequested:Boolean,val finishedFadingIn:Boolean){var startRadius:Float?=null;var targetCenter:Offset?=null;${draw}}
fun main(){val out=mutableListOf<String>();val density=object:Density{};val radiusTween=FloatTweenSpec(225,0,FastOutSlowInEasing);val alphaIn=FloatTweenSpec(75,0,LinearEasing);val alphaOut=FloatTweenSpec(150,0,LinearEasing);val centerTween=FloatTweenSpec(225,0,LinearEasing)
for((w,h)in listOf(40f to 40f,56f to 56f,80f to 80f,96f to 96f,240f to 40f,24f to 24f,350f to 28f,0f to 0f))for(bounded in listOf(false,true))for(origin in listOf(Offset(w/2,h/2),Offset(5f,6f),Offset(w*.25f,h*.75f)))for(finish in listOf(-1,0,16,74,150,225,500))for(time in listOf(0,1,16,32,64,74,75,128,224,225,226,300,374,375,500,512,650)){
val fadeStart=max(225,finish);val fadingOut=finish>=0&&time>=fadeStart;val alpha=if(fadingOut)alphaOut.getValueFromNanos((time-fadeStart)*1000000L,1f,0f,0f)else alphaIn.getValueFromNanos(time*1000000L,0f,1f,0f)
val radius=with(density){getRippleEndRadius(bounded,Size(w,h))};val p=Projection(if(bounded)origin else null,radius,bounded,Value(alpha),Value(radiusTween.getValueFromNanos(time*1000000L,0f,1f,0f)),Value(centerTween.getValueFromNanos(time*1000000L,0f,1f,0f)),finish>=0&&time>=finish,time>=225);val scope=DrawScope(Size(w,h));with(p){scope.draw(Color(.1f))}
out.add("""{"width":$w,"height":$h,"bounded":$bounded,"originX":$\{origin.x},"originY":$\{origin.y},"finishAt":$\{if(finish<0)"null" else finish},"time":$time,"circle":$\{scope.record}}""")
};println("["+out.joinToString()+"]")}
`;
fs.writeFileSync(path.join(cache,'Snapshot.kt'),host);
function run(args){const r=spawnSync('java',args,{cwd:root,encoding:'utf8',maxBuffer:12e6});if(r.status!==0)throw Error(r.stderr);return r.stdout;}
run(['-cp',path.join(runtime,'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',path.join(runtime,'stdlib.jar'),'-jvm-target','1.8','-d',path.join(cache,'oracle.jar'),...fs.readdirSync(cache).filter(n=>n.endsWith('.kt')).map(n=>path.join(cache,n))]);
const cases=JSON.parse(run(['-cp',path.join(cache,'oracle.jar')+path.delimiter+path.join(runtime,'stdlib.jar'),'SnapshotKt']));fs.writeFileSync(path.join(fix,'drawing-oracle.json'),JSON.stringify(cases)+'\n');console.log('Current Material3 common ripple native draw/tween cases:',cases.length);
