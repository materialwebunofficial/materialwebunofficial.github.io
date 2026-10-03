"""Execute original Row/Column measurement, intrinsic, alignment and toolbar modifiers."""
from pathlib import Path
import gzip, hashlib, json, os, subprocess

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
FIX = ROOT / 'test/fixtures/androidx/toolbar-row'
CACHE = ROOT / 'research/toolbar-row-generator'
RUNTIME = ROOT / 'research/kotlin-runtime'
CACHE.mkdir(exist_ok=True)
for entry in json.loads((FIX / 'sources.json').read_text())['sources']:
    assert hashlib.sha256((FIX / entry['file']).read_bytes()).hexdigest() == entry['sha256'], entry['file']

def read(name):
    return (FIX / name).read_text(encoding='utf-8')

def block(source, start):
    opening = source.index('{', start)
    depth, i = 1, opening + 1
    while depth:
        if source[i] == '{':
            depth += 1
        elif source[i] == '}':
            depth -= 1
        i += 1
    return source[start:i]

header = 'package androidx.compose.material3\nimport kotlin.jvm.JvmInline\nimport kotlin.math.*\n'
constraints = read('Constraints.kt')
(CACHE / 'Constraints.kt').write_text(header + constraints[constraints.index('@Immutable\n@JvmInline'):])
parts = []
for name, prefix in [('Alignment.kt', 'public fun interface Alignment'), ('Arrangement.kt', 'public object Arrangement')]:
    source = read(name)
    parts.append(source[source.index(prefix):])
for axis in ['Row', 'Column']:
    source = read(axis + '.kt')
    parts.append(block(source, source.index('internal data class ' + axis + 'MeasurePolicy(')))
    parts.append(block(source, source.index('internal fun create' + axis + 'Constraints(')))
source = read('RowColumnMeasurePolicy.kt')
parts.append(source[source.index('internal interface RowColumnMeasurePolicy'):])
source = read('RowColumnImpl.kt')
for prefix in ['internal sealed class CrossAxisAlignment', 'internal object IntrinsicMeasureBlocks', 'private inline fun intrinsicMainAxisSize(', 'private inline fun intrinsicCrossAxisSize(', 'internal fun interface AlignmentLineProviderBlock', 'internal sealed class AlignmentLineProvider']:
    parts.append(block(source, source.index(prefix)))
parts.append(source[source.index('internal val IntrinsicMeasurable.rowColumnParentData:'):source.index('internal object IntrinsicMeasureBlocks')])
start = source.index('internal data class RowColumnParentData(')
parts.append(source[start:source.index('\n)', start) + 2])
for name, prefix in [('Size.kt', 'private class SizeNode('), ('Padding.kt', 'private class PaddingValuesModifier('), ('FloatingToolbar.kt', 'private class MinimumInteractiveBalancedPaddingNode('), ('InteractiveComponentSize.kt', 'internal class MinimumInteractiveModifierNode :')]:
    source = read(name)
    parts.append(block(source, source.index(prefix)).replace('private class', 'class', 1))
visibility = read('EnterExitTransition.kt')
visibility = visibility[visibility.index('private class EnterExitTransitionModifierNode('):]
parts.append('class VisibilityPolicy:LayoutModifierNode {\n' + (HERE / 'VisibilityAdapter.kt').read_text() + '\n' + block(visibility, visibility.index('fun targetOffsetByState(')) + '\n' + block(visibility, visibility.index('override fun MeasureScope.measure(')) + '\n}')
(CACHE / 'Policy.kt').write_text(header + '\n'.join(parts) + '\n')
# Share only host tree wiring; the three inserted Placeable bodies remain original.
adapter = (ROOT / 'tools/androidx-toolbar-constraints/Adapter.kt').read_text()
adapter = adapter[:adapter.index('class Policy(')]
adapter = adapter.replace('annotation class Stable', 'annotation class Stable\nannotation class JvmDefaultWithCompatibility\ninterface Density')
adapter = adapter.replace('fun Int.fastCoerceAtLeast(min:Int)=coerceAtLeast(min)', 'fun Int.fastCoerceAtLeast(min:Int)=coerceAtLeast(min)\nfun Int.fastCoerceAtMost(max:Int)=coerceAtMost(max)\nfun Float.fastRoundToInt()=roundToInt()\ninline fun checkPrecondition(value:Boolean,message:()->String){check(value,message)}\ninline fun <T> List<T>.fastForEach(block:(T)->Unit)=forEach(block)')
adapter += '\nfun Long.fastCoerceAtLeast(min:Long)=coerceAtLeast(min)\n'
adapter = adapter.replace('data class IntSize(val width:Int,val height:Int){', 'data class IntSize(val width:Int,val height:Int){val isValid get()=width>=0&&height>=0;')
adapter = adapter.replace('data class IntOffset(val x:Int,val y:Int){', 'data class IntOffset(val x:Int,val y:Int){companion object{val Zero=IntOffset(0,0)};operator fun minus(other:IntOffset)=IntOffset(x-other.x,y-other.y);')
adapter = adapter.replace('object Modifier{open class Node}', 'object Modifier{open class Node{val coroutineScope=CoroutineScope()}}')
adapter = adapter.replace('val coroutineScope=CoroutineScope()', 'val coroutineScope=CoroutineScope();val isAttached=true')
adapter = adapter.replace('class MeasureResult(val width:Int,val height:Int,val place:Placeable.PlacementScope.()->Unit)', 'class MeasureResult(val width:Int,val height:Int,val alignmentLines:Map<AlignmentLine,Int> = emptyMap(),val place:Placeable.PlacementScope.()->Unit)')
adapter = adapter.replace('fun layout(width:Int,height:Int,block:Placeable.PlacementScope.()->Unit)=MeasureResult(width,height,block)', 'fun layout(width:Int,height:Int,alignmentLines:Map<AlignmentLine,Int> = emptyMap(),block:Placeable.PlacementScope.()->Unit)=MeasureResult(width,height,alignmentLines,block)')
adapter = adapter.replace('interface IntrinsicMeasurable{', 'interface IntrinsicMeasurable{val parentData:Any? get()=null;')
adapter = adapter.replace('interface IntrinsicMeasureScope', 'interface IntrinsicMeasureScope:Density')
adapter = adapter.replace('val layoutDirection get()', 'val isLookingAhead get()=false\n val layoutDirection get()', 1)
adapter = adapter.replace('var width=0;var height=0', 'var parentData:Any?=null;val lines=mutableMapOf<AlignmentLine,Int>();operator fun get(line:AlignmentLine)=lines[line]?:AlignmentLine.Unspecified\n var width=0;var height=0')
adapter = adapter.replace('val measurementConstraints:Constraints){', 'val measurementConstraints:Constraints):Measured{')
adapter = adapter.replace('init{onMeasuredSizeChanged();', 'init{lines.putAll(result.alignmentLines);onMeasuredSizeChanged();')
adapter = adapter.replace('fun Placeable.placeRelative(x:Int,y:Int)', 'fun Placeable.placeWithLayer(x:Int,y:Int,zIndex:Float,block:GraphicsLayerScope.()->Unit)=placeApparentToRealOffset(IntOffset(x,y),zIndex,block)\n  fun Placeable.placeRelative(x:Int,y:Int)')
placeable = read('Placeable.kt')
for marker, prefix in [('SOURCE_COERCION', 'private fun onMeasuredSizeChanged()'), ('SOURCE_MIRRORING', 'internal inline fun Placeable.placeAutoMirrored('), ('SOURCE_PLACEMENT', 'internal inline fun Placeable.placeApparentToRealOffset(')]:
    adapter = adapter.replace('// ' + marker, block(placeable, placeable.index(prefix)))
(CACHE / 'Tree.kt').write_text(adapter)
cp = str(RUNTIME / 'stdlib.jar')
subprocess.run(['java', '-cp', str(RUNTIME / '*'), 'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler', '-no-stdlib', '-no-reflect', '-classpath', cp, '-jvm-target', '1.8', '-d', str(CACHE / 'oracle.jar'), *map(str, [CACHE / 'Policy.kt', CACHE / 'Constraints.kt', CACHE / 'Tree.kt', HERE / 'Adapter.kt', HERE / 'Harness.kt'])], check=True)
for mode in ['row', 'toolbar', 'icon']:
    result = subprocess.run(['java', '-cp', str(CACHE / 'oracle.jar') + os.pathsep + cp, 'androidx.compose.material3.HarnessKt', mode], capture_output=True, text=True, check=True)
    cases = json.loads(result.stdout)
    payload=(json.dumps(cases, separators=(',', ':')) + '\n').encode()
    (FIX / (mode + '-oracle.json.gz')).write_bytes(gzip.compress(payload,mtime=0))
    print('Generated', len(cases), 'unchanged Kotlin', mode, 'cases.')
