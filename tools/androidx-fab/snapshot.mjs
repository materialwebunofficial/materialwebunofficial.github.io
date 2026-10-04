// Execute pinned AndroidX animation and FAB policy through explicit scalar hosts.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const fix = path.join(root, 'test/fixtures/androidx/fab');
const cache = path.join(root, 'research/fab-expansion-generator');
const runtime = path.join(root, 'research/kotlin-runtime');
const read = file => fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for (const directory of ['fab', 'ripple', 'toolbar-size-motion', 'toolbars']) {
  const folder = path.join(root, 'test/fixtures/androidx', directory);
  for (const entry of JSON.parse(read(path.join(folder, 'sources.json'))).sources) {
    if (hash(path.join(folder, entry.file)) !== entry.sha256) throw Error('Source hash: ' + entry.file);
  }
}
function block(text, marker) {
  const start = text.indexOf(marker), opening = text.indexOf('{', start);
  if (start < 0) throw Error('Missing native block: ' + marker);
  let depth = 0;
  for (let end = opening; end < text.length; end++) {
    depth += (text[end] === '{') - (text[end] === '}');
    if (!depth) return text.slice(start, end + 1);
  }
  throw Error(marker);
}
fs.mkdirSync(cache, {recursive: true});
const vector = name => read(path.join(root, 'test/fixtures/androidx/toolbar-size-motion', name));
const parts = [];
for (const [name, markers] of [
  ['Animation.kt', ['public interface Animation<', 'public class TargetBasedAnimation<']],
  ['AnimationSpec.kt', ['public interface AnimationSpec<', 'public interface FiniteAnimationSpec<', 'public class SpringSpec<', 'private fun <T, V : AnimationVector> TwoWayConverter<T, V>.convert']],
  ['FloatAnimationSpec.kt', ['public interface FloatAnimationSpec', 'public class FloatSpringSpec']],
  ['VectorizedAnimationSpec.kt', ['public interface VectorizedAnimationSpec<', 'public interface VectorizedFiniteAnimationSpec<', 'public object Spring', 'internal interface Animations', 'public class VectorizedSpringSpec<', 'private object DefaultSpringAnimations', 'private fun <V : AnimationVector> createSpringAnimations', 'public class VectorizedFloatAnimationSpec<']]
]) for (const marker of markers) parts.push(block(vector(name), marker));
const converters = vector('VectorConverters.kt');
parts.push(converters.slice(converters.indexOf('public interface TwoWayConverter'), converters.indexOf('internal inline fun lerp')));
parts.push(converters.slice(converters.indexOf('private val FloatToVector:'), converters.indexOf('private val IntToVector:')).replace('private val', 'val'));
parts.push(converters.slice(converters.indexOf('private val IntSizeToVector'), converters.indexOf('/** A type converter that converts a [Rect]', converters.indexOf('private val IntSizeToVector'))).replace('private val', 'val'));
parts.push(vector('AnimationVectors.kt').split('package androidx.compose.animation.core')[1]);
fs.writeFileSync(path.join(cache, 'Source.kt'), 'package androidx.compose.animation.core\nimport kotlin.math.*\n' + parts.join('\n'));
fs.writeFileSync(path.join(cache, 'SpringEstimation.kt'), vector('SpringEstimation.kt').replace('import androidx.compose.ui.util.fastIsFinite\n', ''));
let bridge = read(path.join(root, 'tools/androidx-toolbar-size-motion/Bridge.kt'));
const transition = vector('Transition.kt');
bridge = bridge.replace('// SOURCE_UPDATE_ANIMATION', block(transition, 'private fun updateAnimation(')).replace('// SOURCE_UPDATE_TARGET', block(transition, 'internal fun updateTargetValue('));
const visibility = vector('AnimatedVisibility.kt');
const gate = visibility.indexOf('forceVisible ||', visibility.indexOf('val localPendingTargetState'));
bridge = bridge.replace('// SOURCE_PARENT_GATE', 'return ' + visibility.slice(gate, visibility.indexOf(') {', gate)).trim());
bridge = bridge.replace('// SOURCE_EXIT_FINISHED', 'return ' + visibility.split('private val Transition<EnterExitState>.exitFinished')[1].split('get() = ')[1].split('\n')[0]);
fs.writeFileSync(path.join(cache, 'Bridge.kt'), bridge);
for (const name of ['ExpressiveMotionTokens.kt', 'StandardMotionTokens.kt']) fs.copyFileSync(path.join(fix, name), path.join(cache, name));
const fab = read(path.join(root, 'test/fixtures/androidx/ripple/FloatingActionButton.kt'));
const sized = fab.slice(fab.indexOf('val sizeAnimationSpec = MotionSchemeKeyTokens.FastSpatial'));
const sizedSpecs = sized.slice(0, sized.indexOf('val expandedWidthProgress')).trim();
const collapse = fab.slice(fab.indexOf('private fun extendedFabCollapseAnimation()'), fab.indexOf('@Composable\nprivate fun extendedFabExpandAnimation()'));
const expand = fab.slice(fab.indexOf('private fun extendedFabExpandAnimation()')).trim();
const enterExit = vector('EnterExitTransition.kt');
const sizeStart = enterExit.indexOf('val sizeTransitionSpec:');
const sizeBodyStart = enterExit.indexOf('{', sizeStart);
const sizeBody = block(enterExit.slice(sizeBodyStart), '{');
const alphaStart = enterExit.indexOf('alphaAnimation?.animate(');
const alphaWhen = block(enterExit.slice(alphaStart), 'when {');
const intMath = read(path.join(root, 'test/fixtures/androidx/toolbars/MathHelpers.kt'));
const intLerp = block(intMath, 'public fun lerp(start: Int,');
const host = String.raw`package androidx.compose.animation.core
import androidx.compose.material3.tokens.*
import kotlin.math.*
var standard=false
enum class MotionSchemeKeyTokens { FastSpatial, DefaultSpatial, FastEffects, DefaultEffects;
 fun <T> value():FiniteAnimationSpec<T> {val spatial=this==FastSpatial||this==DefaultSpatial;val fast=this==FastSpatial||this==FastEffects
 val damping=if(spatial)if(standard)if(fast)StandardMotionTokens.SpringFastSpatialDamping else StandardMotionTokens.SpringDefaultSpatialDamping else if(fast)ExpressiveMotionTokens.SpringFastSpatialDamping else ExpressiveMotionTokens.SpringDefaultSpatialDamping else 1f
 val stiffness=if(spatial)if(standard)if(fast)StandardMotionTokens.SpringFastSpatialStiffness else StandardMotionTokens.SpringDefaultSpatialStiffness else if(fast)ExpressiveMotionTokens.SpringFastSpatialStiffness else ExpressiveMotionTokens.SpringDefaultSpatialStiffness else if(fast)ExpressiveMotionTokens.SpringFastEffectsStiffness else ExpressiveMotionTokens.SpringDefaultEffectsStiffness
 return SpringSpec(damping,stiffness)}
}
object Alignment {val Start=0}
class Fade(val animationSpec:FiniteAnimationSpec<Float>)
class ChangeSize(val animationSpec:FiniteAnimationSpec<IntSize>)
class Config(var fade:Fade?=null,var changeSize:ChangeSize?=null)
class Configured(val config:Config) {operator fun plus(other:Configured)=Configured(Config(config.fade?:other.config.fade,config.changeSize?:other.config.changeSize))}
fun fadeIn(animationSpec:FiniteAnimationSpec<Float>)=Configured(Config(fade=Fade(animationSpec)))
fun fadeOut(animationSpec:FiniteAnimationSpec<Float>)=Configured(Config(fade=Fade(animationSpec)))
fun expandHorizontally(animationSpec:FiniteAnimationSpec<IntSize>,expandFrom:Int)=Configured(Config(changeSize=ChangeSize(animationSpec)))
fun shrinkHorizontally(animationSpec:FiniteAnimationSpec<IntSize>,shrinkTowards:Int)=Configured(Config(changeSize=ChangeSize(animationSpec)))
${collapse}
${expand}
var enter=extendedFabExpandAnimation();var exit=extendedFabCollapseAnimation()
fun sizedSpecs():Pair<FiniteAnimationSpec<Float>,FiniteAnimationSpec<Float>> {
${sizedSpecs}
return Pair(sizeAnimationSpec,opacityAnimationSpec)
}
val DefaultAlphaSpring:FiniteAnimationSpec<Float> = SpringSpec(stiffness=400f)
val DefaultSizeAnimationSpec:FiniteAnimationSpec<IntSize> = SpringSpec(stiffness=400f,visibilityThreshold=IntSize(1,1))
class Segment(val initialState:EnterExitState,val targetState:EnterExitState) {infix fun EnterExitState.isTransitioningTo(target:EnterExitState)=this==initialState&&target==targetState}
fun sizeSpec(segment:Segment):FiniteAnimationSpec<IntSize> = with(segment) ${sizeBody}
fun alphaSpec(segment:Segment):FiniteAnimationSpec<Float> = with(segment) {${alphaWhen}}
fun Double.fastRoundToInt()=roundToInt()
${intLerp}
fun main(){val out=mutableListOf<String>()
for(scheme in listOf(false,true))for(baseline in listOf(false,true))for(minimum in if(baseline)listOf(56)else listOf(56,80,96))for(labelWidth in listOf(36,112,240))for(history in listOf(listOf(0L to true),listOf(0L to false),listOf(0L to true,64L to false,128L to true),listOf(0L to false,64L to true,128L to false))){
 standard=scheme;enter=extendedFabExpandAnimation();exit=extendedFabCollapseAnimation()
 val initial=!history.first().second;var target=if(initial)EnterExitState.Visible else EnterExitState.PreEnter;var composed=initial
 val width=SourceTransition(if(initial)1f else 0f,FloatToVector)
 val size=SourceTransition(IntSize(if(initial)labelWidth else 0,0),SizeConverter)
 val alpha=SourceTransition(if(initial)1f else 0f,FloatToVector)
 var widthStart=0L;var alphaStart=0L;var eventIndex=0
 val frames=mutableListOf<String>()
 val times=(listOf(0L,1L,16L,32L,63L,64L,80L,100L,127L,128L,144L,160L,192L,224L,256L,320L,400L,500L,700L,900L,1200L,1600L)+history.map{it.first}).distinct().sorted()
 for(time in times){width.sample(time-widthStart);size.sample(time-widthStart);alpha.sample(time-alphaStart)
 if(eventIndex<history.size&&time==history[eventIndex].first){val expanded=history[eventIndex++].second;val next=if(expanded)EnterExitState.Visible else EnterExitState.PostExit;val segment=Segment(if(!composed&&expanded)EnterExitState.PreEnter else target,next);target=next
 if(expanded)composed=true
 if(baseline){size.updateTargetValue(IntSize(if(expanded)labelWidth else 0,0),sizeSpec(segment))}else{width.updateTargetValue(if(expanded)1f else 0f,sizedSpecs().first)}
 alpha.updateTargetValue(if(expanded)1f else 0f,if(baseline)alphaSpec(segment)else sizedSpecs().second);widthStart=time;alphaStart=time
 width.sample(0);size.sample(0);alpha.sample(0)
 }
 val finished=(if(baseline)size.isFinished else width.isFinished)&&alpha.isFinished
 if(finished&&target==EnterExitState.PostExit)composed=false
 val rawWidth=if(baseline)size.value.width.toFloat()else width.value
 val renderedWidth=if(baseline)max(if(target==EnterExitState.Visible)80 else 56,if(target==EnterExitState.Visible)60+max(0,size.value.width)else 24+max(0,size.value.width))else lerp(minimum,minimum+labelWidth,width.value).coerceAtLeast(0)
 frames.add("["+time+","+rawWidth+","+alpha.value+","+renderedWidth+","+composed+","+(!finished)+"]")
 }
 val events=history.joinToString(prefix="[",postfix="]"){"["+it.first+","+it.second+"]"}
 out.add("{\"scheme\":\""+(if(standard) "standard" else "expressive")+"\",\"baseline\":"+baseline+",\"minimum\":"+minimum+",\"labelWidth\":"+labelWidth+",\"initial\":"+initial+",\"events\":"+events+",\"frames\":["+frames.joinToString()+"]}")
}
println(out.joinToString(prefix="[",postfix="]"))}
`;
fs.writeFileSync(path.join(cache, 'Snapshot.kt'), host);
const cp = ['stdlib.jar', 'androidx-annotation.jar'].map(name => path.join(runtime, name)).join(path.delimiter);
function run(args) { const r = spawnSync('java', args, {encoding:'utf8', maxBuffer:8e6}); if(r.status) throw Error(r.stderr || r.stdout); return r.stdout; }
run(['-cp', path.join(runtime, '*'), 'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler', '-no-stdlib', '-no-reflect', '-classpath', cp, '-jvm-target', '1.8', '-d', path.join(cache, 'oracle.jar'), ...['Source.kt','SpringEstimation.kt','Bridge.kt','ExpressiveMotionTokens.kt','StandardMotionTokens.kt','Snapshot.kt'].map(name=>path.join(cache,name)), path.join(root,'test/fixtures/androidx/toolbar-size-motion/SpringSimulation.kt'), path.join(root,'tools/androidx-motion/FloatPacking.kt')]);
const data=JSON.parse(run(['-cp',path.join(cache,'oracle.jar')+path.delimiter+cp,'androidx.compose.animation.core.SnapshotKt']));
fs.writeFileSync(path.join(fix,'expansion-oracle.json'), JSON.stringify(data)+'\n');
console.log(`Generated ${data.length} native FAB expansion histories / ${data.reduce((count,c)=>count+c.frames.length,0)} sampled frames.`);
