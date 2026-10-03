"""Compile unchanged pinned AndroidX tween/decay/easing functions (private Kotlin cache)."""
from pathlib import Path
import hashlib
import json
import os
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
FIXTURES = ROOT / 'test/fixtures/androidx/navigation-drawer'
CACHE = ROOT / 'research/drawer-generator'
RUNTIME = ROOT / 'research/kotlin-runtime'
CACHE.mkdir(parents=True, exist_ok=True)

def block(text, marker):
    start = text.index(marker)
    opening = text.index('{', start)
    depth = 1
    end = opening + 1
    while depth:
        depth += (text[end] == '{') - (text[end] == '}')
        end += 1
    return text[start:end]

manifest_path = FIXTURES / 'sources.json'
manifest = json.loads(manifest_path.read_text())
base = f'https://raw.githubusercontent.com/androidx/androidx/{manifest["revision"]}/compose/'
locations = {
    'AnchoredDraggable.kt': 'foundation/foundation/src/commonMain/kotlin/androidx/compose/foundation/gestures/',
    'Draggable.kt': 'foundation/foundation/src/commonMain/kotlin/androidx/compose/foundation/gestures/',
    'DragGestureDetector.kt': 'foundation/foundation/src/commonMain/kotlin/androidx/compose/foundation/gestures/',
    'ComposeFoundationFlags.kt': 'foundation/foundation/src/commonMain/kotlin/androidx/compose/foundation/',
    'ViewConfiguration.kt': 'ui/ui/src/commonMain/kotlin/androidx/compose/ui/platform/',
    'AndroidViewConfiguration.android.kt': 'ui/ui/src/androidMain/kotlin/androidx/compose/ui/platform/',
    'FloatDecayAnimationSpec.kt': 'animation/animation-core/src/commonMain/kotlin/androidx/compose/animation/core/',
    'Easing.kt': 'animation/animation-core/src/commonMain/kotlin/androidx/compose/animation/core/',
    'Bezier.kt': 'ui/ui-graphics/src/commonMain/kotlin/androidx/compose/ui/graphics/',
    'MathHelpers.kt': 'ui/ui-util/src/commonMain/kotlin/androidx/compose/ui/util/',
    'VelocityTracker.kt': 'ui/ui/src/commonMain/kotlin/androidx/compose/ui/input/pointer/util/',
    'PlatformVelocityTracker.android.kt': 'ui/ui/src/androidMain/kotlin/androidx/compose/ui/input/pointer/util/',
    'PlatformVelocityTracker.kt': 'ui/ui/src/commonMain/kotlin/androidx/compose/ui/input/pointer/util/',
    'ComposeUiFlags.kt': 'ui/ui/src/commonMain/kotlin/androidx/compose/ui/',
    'AndroidComposeUiFlags.android.kt': 'ui/ui/src/androidMain/kotlin/androidx/compose/ui/',
}
for name, location in locations.items():
    actual = {'url': base + location + name, 'sha256': hashlib.sha256((FIXTURES/name).read_bytes()).hexdigest()}
    if name in manifest['files'] and manifest['files'][name] != actual:
        raise RuntimeError(f'Source hash mismatch: {name}')
    manifest['files'][name] = actual
for name, entry in manifest['files'].items():
    if hashlib.sha256((FIXTURES/name).read_bytes()).hexdigest() != entry['sha256']:
        raise RuntimeError(f'Source hash mismatch: {name}')
manifest_path.write_text(json.dumps(manifest, indent=2)+'\n')

decay = (FIXTURES/'FloatDecayAnimationSpec.kt').read_text()
decay = decay[:decay.index('/**\n * Creates a [Animation]')]
(CACHE/'Decay.kt').write_text(decay)
tween = (ROOT/'test/fixtures/androidx/motion/FloatAnimationSpec.kt').read_text()
tween_manifest = json.loads((ROOT/'tools/androidx-motion/sources.json').read_text())['FloatAnimationSpec.kt']
if hashlib.sha256((ROOT/'test/fixtures/androidx/motion/FloatAnimationSpec.kt').read_bytes()).hexdigest() != tween_manifest['sha256']:
    raise RuntimeError('FloatAnimationSpec source hash mismatch')
(CACHE/'Tween.kt').write_text('package androidx.compose.animation.core\nimport androidx.compose.ui.util.*\n' + block(tween, 'public class FloatTweenSpec('))
easing = (FIXTURES/'Easing.kt').read_text().replace('import androidx.compose.runtime.Immutable\n', '').replace('import androidx.compose.runtime.Stable\n', '').replace('@Stable\n','').replace('@Immutable\n','')
(CACHE/'Easing.kt').write_text(easing)
bezier = (FIXTURES/'Bezier.kt').read_text()
parts = [block(bezier, marker) for marker in [
    'private fun evaluateCubic(p0:', 'public fun evaluateCubic(p1:',
    'public fun findFirstCubicRoot(', 'private fun findQuadraticRoots(',
    'public fun computeCubicVerticalBounds(', 'private inline fun clampValidRootInUnitRange(',
    'private fun writeValidRootInUnitRange(']]
parts += [bezier[bezier.index('private inline fun findLineRoot('):bezier.index('/**',bezier.index('private inline fun findLineRoot('))],
          'internal inline fun Double.closeTo(b: Double) = abs(this-b) < Epsilon']
(CACHE/'Bezier.kt').write_text('package androidx.compose.ui.graphics\nimport kotlin.math.*\nimport androidx.compose.ui.util.*\nimport androidx.collection.FloatFloatPair\nprivate const val Tau = PI*2.0\nprivate const val Epsilon = 1e-7\nprivate const val FloatEpsilon=1.05e-6f\n'+'\n'.join(parts))
math = (FIXTURES/'MathHelpers.kt').read_text()
(CACHE/'Math.kt').write_text('package androidx.compose.ui.util\n' + block(math,'public fun fastCbrt(') + '\nfun floatFromBits(bits:Int)=Float.fromBits(bits)\n' + block(math,'public fun lerp(start: Float,') + '\nfun Float.fastCoerceIn(a:Float,b:Float)=coerceIn(a,b)\nfun Double.fastCoerceIn(a:Double,b:Double)=coerceIn(a,b)\nfun Long.fastCoerceIn(a:Long,b:Long)=coerceIn(a,b)\n')
(CACHE/'Pair.kt').write_text('package androidx.collection\ndata class FloatFloatPair(val first:Float,val second:Float)')
velocity=(FIXTURES/'VelocityTracker.kt').read_text()
velocity=velocity[velocity.index('public class VelocityTracker1D'):]
velocity=velocity.replace('@OptIn(ExperimentalComposeUiApi::class)','')
(CACHE/'Velocity.kt').write_text('''package androidx.compose.ui.input.pointer.util
import kotlin.math.*
import androidx.compose.ui.util.fastCoerceAtLeast
private const val AssumePointerMoveStoppedMilliseconds=40
private const val HistorySize=20
private const val HorizonMilliseconds=100
object ComposeUiFlags { var isVelocityTrackerMinSampleSizeFixEnabled=true }
fun checkPrecondition(value:Boolean, message:()->String) { require(value,message) }
fun throwIllegalArgumentException(message:String):Nothing=throw IllegalArgumentException(message)
'''+velocity)
with (CACHE/'Math.kt').open('a') as file:
    file.write('fun Float.fastCoerceAtLeast(value:Float)=coerceAtLeast(value)\n')
touch=(FIXTURES/'DragGestureDetector.kt').read_text()
detector=block(touch,'internal class TouchSlopDetector(')
slop=touch[touch.index('private val mouseSlop'):]
(CACHE/'TouchSlop.kt').write_text('''package androidx.compose.foundation.gestures
import androidx.compose.ui.geometry.Offset
import kotlin.math.absoluteValue
import kotlin.math.sign
import androidx.compose.ui.unit.dp
enum class Orientation { Horizontal, Vertical }
enum class PointerType { Mouse, Touch, Stylus }
class ViewConfiguration(val touchSlop:Float)
'''+detector+'\n'+slop)
(CACHE/'Offset.kt').write_text('''package androidx.compose.ui.geometry
import kotlin.math.sqrt
data class Offset(val x:Float,val y:Float) {
 operator fun plus(other:Offset)=Offset(x+other.x,y+other.y)
 operator fun minus(other:Offset)=Offset(x-other.x,y-other.y)
 operator fun div(value:Float)=Offset(x/value,y/value)
 operator fun times(value:Float)=Offset(x*value,y*value)
 fun getDistance()=sqrt(x*x+y*y)
 val isSpecified get()=!x.isNaN()&&!y.isNaN()
 companion object { val Zero=Offset(0f,0f);val Unspecified=Offset(Float.NaN,Float.NaN) }
}
''')
(CACHE/'Dp.kt').write_text('package androidx.compose.ui.unit\nval Double.dp get()=toFloat()\nval Int.dp get()=toFloat()\n')
(CACHE/'Bridge.kt').write_text('''package androidx.compose.animation.core
const val MillisToNanos=1000000L
const val DefaultDurationMillis=300
fun requirePrecondition(value:Boolean, message:()->String) { require(value,message) }
interface FloatAnimationSpec {
 fun getValueFromNanos(t:Long,from:Float,to:Float,v:Float):Float
 fun getVelocityFromNanos(t:Long,from:Float,to:Float,v:Float):Float
 fun getDurationNanos(from:Float,to:Float,v:Float):Long
}
''')
classpath = os.pathsep.join(str(RUNTIME/name) for name in ['stdlib.jar','androidx-annotation.jar'])
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler',
    '-no-stdlib','-no-reflect','-classpath',classpath,'-jvm-target','1.8','-d',str(CACHE/'oracle.jar'),
    *[str(p) for p in CACHE.glob('*.kt')],str(HERE/'Export.kt')],check=True)
result = subprocess.run(['java','-cp',str(CACHE/'oracle.jar')+os.pathsep+classpath,
    'androidx.compose.animation.core.ExportKt'],check=True,capture_output=True,text=True)
data=json.loads(result.stdout)
(FIXTURES/'settle-oracle.json').write_text(json.dumps(data,separators=(',',':'))+'\n')
print(f'Generated {len(data)} independent Kotlin drawer tween/decay cases.')
result=subprocess.run(['java','-cp',str(CACHE/'oracle.jar')+os.pathsep+classpath,
    'androidx.compose.animation.core.ExportKt','velocity'],check=True,capture_output=True,text=True)
data=json.loads(result.stdout)
(FIXTURES/'velocity-oracle.json').write_text(json.dumps(data,separators=(',',':'))+'\n')
print(f'Generated {len(data)} independent Kotlin Lsq2 velocity cases.')
result=subprocess.run(['java','-cp',str(CACHE/'oracle.jar')+os.pathsep+classpath,
    'androidx.compose.animation.core.ExportKt','slop'],check=True,capture_output=True,text=True)
data=json.loads(result.stdout)
(FIXTURES/'slop-oracle.json').write_text(json.dumps(data,separators=(',',':'))+'\n')
print(f'Generated {len(data)} independent Kotlin horizontal touch-slop cases.')
