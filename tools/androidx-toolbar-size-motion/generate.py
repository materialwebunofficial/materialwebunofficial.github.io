"""Execute pinned original vector, converter, TargetBasedAnimation and Transition bodies."""
from pathlib import Path
import gzip, hashlib, json, os, subprocess

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
FIX = ROOT / 'test/fixtures/androidx/toolbar-size-motion'
CACHE = ROOT / 'research/toolbar-size-motion-generator'
RUNTIME = ROOT / 'research/kotlin-runtime'
CACHE.mkdir(parents=True, exist_ok=True)
for entry in json.loads((FIX / 'sources.json').read_text())['sources']:
    assert hashlib.sha256((FIX / entry['file']).read_bytes()).hexdigest() == entry['sha256'], entry['file']

def source(name):
    return (FIX / name).read_text(encoding='utf-8')

def block(text, marker):
    start = text.index(marker)
    opening = text.index('{', start)
    depth = 0
    for end in range(opening, len(text)):
        depth += (text[end] == '{') - (text[end] == '}')
        if depth == 0:
            return text[start:end + 1] + '\n'
    raise ValueError(marker)

parts = []
for name, markers in [
    ('Animation.kt', ['public interface Animation<', 'public class TargetBasedAnimation<']),
    ('AnimationSpec.kt', ['public interface AnimationSpec<', 'public interface FiniteAnimationSpec<',
                          'public class SpringSpec<', 'private fun <T, V : AnimationVector> TwoWayConverter<T, V>.convert']),
    ('FloatAnimationSpec.kt', ['public interface FloatAnimationSpec', 'public class FloatSpringSpec']),
    ('VectorizedAnimationSpec.kt', ['public interface VectorizedAnimationSpec<',
                                  'public interface VectorizedFiniteAnimationSpec<', 'public object Spring',
                                  'internal interface Animations', 'public class VectorizedSpringSpec<',
                                  'private object DefaultSpringAnimations', 'private fun <V : AnimationVector> createSpringAnimations',
                                  'public class VectorizedFloatAnimationSpec<']),
]:
    parts += [block(source(name), marker) for marker in markers]
converters = source('VectorConverters.kt')
parts += [converters[converters.index('public interface TwoWayConverter'):converters.index('internal inline fun lerp')]]
parts += [converters[converters.index('private val IntSizeToVector'):converters.index('/** A type converter that converts a [Rect]', converters.index('private val IntSizeToVector'))]]
parts += [source('AnimationVectors.kt').split('package androidx.compose.animation.core', 1)[1]]
header = 'package androidx.compose.animation.core\nimport kotlin.math.*\n'
(CACHE / 'Source.kt').write_text(header + '\n'.join(parts).replace('private val IntSizeToVector', 'val IntSizeToVector'), encoding='utf-8')
estimation = source('SpringEstimation.kt').replace('import androidx.compose.ui.util.fastIsFinite\n', '')
(CACHE / 'SpringEstimation.kt').write_text(estimation, encoding='utf-8')
bridge = (HERE / 'Bridge.kt').read_text(encoding='utf-8')
transition = source('Transition.kt')
bridge = bridge.replace('// SOURCE_UPDATE_ANIMATION', block(transition, 'private fun updateAnimation('))
bridge = bridge.replace('// SOURCE_UPDATE_TARGET', block(transition, 'internal fun updateTargetValue('))
visibility = source('AnimatedVisibility.kt')
gate = visibility[visibility.index('forceVisible ||', visibility.index('val localPendingTargetState')):visibility.index(') {', visibility.index('forceVisible ||', visibility.index('val localPendingTargetState')))]
bridge = bridge.replace('// SOURCE_PARENT_GATE', 'return ' + gate.strip())
bridge = bridge.replace('// SOURCE_EXIT_FINISHED', 'return ' + visibility.split('private val Transition<EnterExitState>.exitFinished', 1)[1].split('get() = ', 1)[1].split('\n', 1)[0])
(CACHE / 'Bridge.kt').write_text(bridge, encoding='utf-8')
cp = os.pathsep.join(str(RUNTIME / name) for name in ['stdlib.jar', 'androidx-annotation.jar'])
subprocess.run(['java', '-cp', str(RUNTIME / '*'), 'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler',
                '-no-stdlib', '-no-reflect', '-classpath', cp, '-jvm-target', '1.8',
                '-d', str(CACHE / 'oracle.jar'), str(CACHE / 'Source.kt'), str(CACHE / 'SpringEstimation.kt'),
                str(FIX / 'SpringSimulation.kt'), str(ROOT / 'tools/androidx-motion/FloatPacking.kt'),
                str(CACHE / 'Bridge.kt'), str(HERE / 'Harness.kt')], check=True)
r = subprocess.run(['java', '-cp', str(CACHE / 'oracle.jar') + os.pathsep + cp,
                    'androidx.compose.animation.core.HarnessKt'], capture_output=True, text=True, check=True)
data = json.loads(r.stdout)
(FIX / 'size-oracle.json.gz').write_bytes(gzip.compress((json.dumps(data, separators=(',', ':')) + '\n').encode(), mtime=0))
print('Generated', len(data['vectors']), 'source IntSize trajectories and', len(data['composition']), 'source composition gates.')
