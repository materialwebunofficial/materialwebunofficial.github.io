// Execute unchanged native elevation/state-layer spec selection, Float tweens,
// source interaction ordering and FAB target calculation through scalar hosts.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const fix = path.join(root, 'test/fixtures/androidx/ripple');
const cache = path.join(root, 'research/fab-interaction-generator');
const rippleCache = path.join(root, 'research/ripple-generator');
const runtime = path.join(root, 'research/kotlin-runtime');
const read = p => fs.readFileSync(p, 'utf8').replaceAll('\r\n', '\n');
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for (const source of JSON.parse(read(path.join(fix, 'sources.json'))).sources) {
  if (hash(path.join(fix, source.file)) !== source.sha256) throw Error('Source hash: ' + source.file);
}
function block(text, marker) {
  const start = text.indexOf(marker), open = text.indexOf('{', start);
  if (start < 0) throw Error(marker);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    depth += (text[i] === '{') - (text[i] === '}');
    if (!depth) return text.slice(start, i + 1);
  }
  throw Error(marker);
}
fs.mkdirSync(cache, {recursive: true});
const drawer = path.join(root, 'test/fixtures/androidx/navigation-drawer');
const manifest = JSON.parse(read(path.join(drawer, 'sources.json'))).files;
for (const name of ['Easing.kt', 'Bezier.kt', 'MathHelpers.kt']) {
  if (hash(path.join(drawer, name)) !== manifest[name].sha256) throw Error(name);
}
for (const [name, original, markers] of [
  ['Bezier.kt', 'Bezier.kt', ['private fun evaluateCubic(p0:', 'public fun evaluateCubic(p1:', 'public fun findFirstCubicRoot(', 'private fun findQuadraticRoots(', 'public fun computeCubicVerticalBounds(', 'private inline fun clampValidRootInUnitRange(', 'private fun writeValidRootInUnitRange(']],
  ['Math.kt', 'MathHelpers.kt', ['public fun fastCbrt(', 'public fun lerp(start: Float,']]
]) {
  const text = read(path.join(rippleCache, name)), native = read(path.join(drawer, original));
  for (const marker of markers) if (!text.includes(block(native, marker))) throw Error('Changed arithmetic: ' + marker);
  fs.writeFileSync(path.join(cache, name), text);
}
const easing = read(path.join(drawer, 'Easing.kt')).replaceAll('import androidx.compose.runtime.Immutable\n', '').replaceAll('import androidx.compose.runtime.Stable\n', '').replaceAll('@Stable\n', '').replaceAll('@Immutable\n', '');
fs.writeFileSync(path.join(cache, 'Easing.kt'), easing);
const tweenFile = path.join(root, 'test/fixtures/androidx/motion/FloatAnimationSpec.kt');
const tweenHash = JSON.parse(read(path.join(root, 'tools/androidx-motion/sources.json')))['FloatAnimationSpec.kt'].sha256;
if (hash(tweenFile) !== tweenHash) throw Error('FloatAnimationSpec');
fs.writeFileSync(path.join(cache, 'Tween.kt'), 'package androidx.compose.animation.core\nimport androidx.compose.ui.util.*\n' + block(read(tweenFile), 'public class FloatTweenSpec('));
for (const name of ['Pair.kt', 'Bridge.kt']) fs.copyFileSync(path.join(rippleCache, name), path.join(cache, name));
fs.copyFileSync(path.join(fix, 'Elevation.kt'), path.join(cache, 'Elevation.kt'));
fs.copyFileSync(path.join(fix, 'ElevationTokens.kt'), path.join(cache, 'ElevationTokens.kt'));
fs.writeFileSync(path.join(cache, 'Dp.kt'), `package androidx.compose.ui.unit
data class Dp(val value:Float)
val Double.dp get()=Dp(toFloat());val Float.dp get()=Dp(this);val Int.dp get()=Dp(toFloat())
`);
fs.writeFileSync(path.join(cache, 'Interactions.kt'), `package androidx.compose.foundation.interaction
interface Interaction
class HoverInteraction { class Enter:Interaction;class Exit(val enter:Enter):Interaction }
class FocusInteraction { class Focus:Interaction;class Unfocus(val focus:Focus):Interaction }
class PressInteraction { class Press:Interaction;class Release(val press:Press):Interaction;class Cancel(val press:Press):Interaction }
class DragInteraction { class Start:Interaction;class Stop(val start:Start):Interaction;class Cancel(val start:Start):Interaction }
class Other:Interaction
`);
fs.writeFileSync(path.join(cache, 'SpecHost.kt'), `package androidx.compose.animation.core
interface AnimationSpec<T>
class TweenSpec<T>(val durationMillis:Int,val easing:Easing):AnimationSpec<T>
class Animatable<T,V>(var value:T) { var targetValue=value;var lastSpec:AnimationSpec<T>?=null
suspend fun animateTo(target:T,spec:AnimationSpec<T>){targetValue=target;lastSpec=spec}
suspend fun snapTo(target:T){targetValue=target;value=target;lastSpec=null}
}
`);
const fab = read(path.join(fix, 'FloatingActionButton.kt'));
const collect = fab.slice(fab.indexOf('val interactions = mutableListOf<Interaction>()'));
const fabWhen = block(collect, 'when (interaction)');
const target = block(fab, 'private fun Interaction?.calculateTarget(): Dp');
const ripple = read(path.join(fix, 'M3Ripple.kt'));
const layerCollect = ripple.slice(ripple.indexOf('val wasFocused = isFocused'));
const layerWhen = block(layerCollect, 'when (interaction)');
const incomingLayer = block(ripple, 'private fun incomingStateLayerAnimationSpecFor(');
const outgoingLayer = block(ripple, 'private fun outgoingStateLayerAnimationSpecFor(');
const defaultLayer = ripple.match(/private val DefaultTweenSpec = .*/)[0];
const tokens = read(path.join(fix, 'FabPrimaryContainerTokens.kt'));
const defaults = ['ContainerElevation', 'PressedContainerElevation', 'FocusedContainerElevation', 'HoveredContainerElevation'].map(name => {
  const match = tokens.match(new RegExp('val ' + name + ':[^\\n]+\\n\\s+get\\(\\) = ([^\\n]+)'));
  if (!match) throw Error(name); return match[1];
});
const host = `import androidx.compose.animation.core.*
import androidx.compose.foundation.interaction.*
import androidx.compose.material3.internal.animateElevation
import androidx.compose.material3.tokens.ElevationTokens
import androidx.compose.ui.unit.*
import kotlin.coroutines.*
private var defaultElevation=${defaults[0]};private var pressedElevation=${defaults[1]};private var focusedElevation=${defaults[2]};private var hoveredElevation=${defaults[3]}
${target}
${incomingLayer}
${outgoingLayer}
${defaultLayer}
fun <T> List<T>.fastAny(predicate:(T)->Boolean)=any(predicate)
fun runSuspend(block:suspend ()->Unit){block.startCoroutine(object:Continuation<Unit>{override val context=EmptyCoroutineContext;override fun resumeWith(result:Result<Unit>){result.getOrThrow()}})}
fun interaction(kind:String?):Interaction?=when(kind){"hover"->HoverInteraction.Enter();"focus"->FocusInteraction.Focus();"press"->PressInteraction.Press();"drag"->DragInteraction.Start();null->null;else->Other()}
fun name(interaction:Interaction?):String=when(interaction){is HoverInteraction.Enter->"hover";is FocusInteraction.Focus->"focus";is PressInteraction.Press->"press";is DragInteraction.Start->"drag";null->"null";else->"other"}
fun quoted(kind:String?)=if(kind==null)"null" else "\\\"$kind\\\""
fun specJson(spec:TweenSpec<*>?)=if(spec==null)"{\\\"duration\\\":0}" else "{\\\"duration\\\":$\{spec.durationMillis},\\\"easing\\\":\\\"$\{if(spec.easing===FastOutSlowInEasing)"incoming" else if(spec.easing===LinearEasing)"linear" else "outgoing"}\\\"}"
fun main(){val elevations=mutableListOf<String>();val layers=mutableListOf<String>();val kinds=listOf(null,"hover","focus","press","drag","other");val times=listOf(0,1,16,32,45,64,75,90,119,120,121,149,150,200)
for(fromKind in kinds)for(toKind in kinds)for((from,to)in listOf(6f to 8f,8f to 6f,1f to 3f,7.123456f to 1.25f)){
val anim=Animatable<Dp,Any>(Dp(from));runSuspend{anim.animateElevation(Dp(to),interaction(fromKind),interaction(toKind))};val spec=anim.lastSpec as? TweenSpec<*>
val tween=spec?.let{FloatTweenSpec(it.durationMillis,0,it.easing)};val frames=times.map{time->"[$time,$\{tween?.getValueFromNanos(time*1000000L,from,to,0f)?:to}]"}
elevations.add("""{"fromKind":$\{quoted(fromKind)},"toKind":$\{quoted(toKind)},"from":$from,"to":$to,"spec":$\{specJson(spec)},"frames":[$\{frames.joinToString()}]}""")
val layerSpec=(if(toKind!=null)incomingStateLayerAnimationSpecFor(interaction(toKind)!!)else outgoingStateLayerAnimationSpecFor(interaction(fromKind))) as TweenSpec<*>
if(from==6f&&to==8f)for((alphaFrom,alphaTo)in listOf(0f to .08f,0f to .1f,.08f to .1f,.1f to .08f,.1f to 0f,.08f to 0f)){
val layerTween=FloatTweenSpec(layerSpec.durationMillis,0,layerSpec.easing);val layerFrames=times.map{time->"[$time,$\{layerTween.getValueFromNanos(time*1000000L,alphaFrom,alphaTo,0f)}]"}
layers.add("""{"fromKind":$\{quoted(fromKind)},"toKind":$\{quoted(toKind)},"from":$alphaFrom,"to":$alphaTo,"spec":$\{specJson(layerSpec)},"frames":[$\{layerFrames.joinToString()}]}""")}
}
val interrupted=mutableListOf<String>();val hoverTween=FloatTweenSpec(120,0,FastOutSlowInEasing)
for(cut in listOf(16,32,64,90)){val from=hoverTween.getValueFromNanos(cut*1000000L,6f,8f,0f);val anim=Animatable<Dp,Any>(Dp(from));runSuspend{anim.animateElevation(6.dp,HoverInteraction.Enter(),PressInteraction.Press())};val spec=anim.lastSpec as TweenSpec<*>;val tween=FloatTweenSpec(spec.durationMillis,0,spec.easing);val frames=times.map{time->"[$time,$\{tween.getValueFromNanos(time*1000000L,from,6f,0f)}]"};interrupted.add("""{"cut":$cut,"from":$from,"frames":[$\{frames.joinToString()}]}""")}
val orders=mutableListOf<String>();val histories=listOf(listOf("hover+","press+","hover-","press-"),listOf("focus+","hover+","press+","press-","hover-","focus-"),listOf("hover+","focus+","focus-","hover-"),listOf("press+","hover+","hover-","press-"),listOf("focus+","press+","hover+","press-","focus-","hover-"))
for(history in histories){val interactions=mutableListOf<Interaction>();val layerInteractions=mutableListOf<Interaction>();val active=mutableMapOf<String,Interaction>();val records=mutableListOf<String>();var isFocused=false;var layerTarget:Interaction?=null
for(event in history){val kind=event.dropLast(1);val start=event.endsWith("+");val interaction=if(start)interaction(kind)!!.also{active[kind]=it}else when(val old=active.remove(kind)){is HoverInteraction.Enter->HoverInteraction.Exit(old);is FocusInteraction.Focus->FocusInteraction.Unfocus(old);is PressInteraction.Press->PressInteraction.Release(old);else->error("history")}
run { ${fabWhen};val latest=interactions.lastOrNull();records.add("""{"event":"$event","fab":"$\{name(latest)}","target":$\{latest.calculateTarget().value}""") }
run collect@{val interactions=layerInteractions; ${layerWhen};layerTarget=interactions.lastOrNull()}
records[records.lastIndex]+=",\\\"layer\\\":\\\"$\{name(layerTarget)}\\\"}"
};orders.add("["+records.joinToString()+"]")}
println("""{"elevations":[$\{elevations.joinToString()}],"layers":[$\{layers.joinToString()}],"interrupted":[$\{interrupted.joinToString()}],"orders":[$\{orders.joinToString()}]}""")}
`;
fs.writeFileSync(path.join(cache, 'Snapshot.kt'), host);
function run(args) {
  const result = spawnSync('java', args, {cwd: root, encoding: 'utf8', maxBuffer: 12e6});
  if (result.status !== 0) throw Error(result.stderr); return result.stdout;
}
run(['-cp', path.join(runtime, '*'), 'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler', '-no-stdlib', '-no-reflect', '-classpath', path.join(runtime, 'stdlib.jar'), '-jvm-target', '1.8', '-d', path.join(cache, 'oracle.jar'), ...fs.readdirSync(cache).filter(name => name.endsWith('.kt')).map(name => path.join(cache, name))]);
const cases = JSON.parse(run(['-cp', path.join(cache, 'oracle.jar') + path.delimiter + path.join(runtime, 'stdlib.jar'), 'SnapshotKt']));
fs.writeFileSync(path.join(fix, 'interaction-oracle.json'), JSON.stringify(cases) + '\n');
console.log('Native FAB interaction cases:', cases.elevations.length, 'elevation,', cases.layers.length, 'state-layer,', cases.orders.length, 'histories.');
