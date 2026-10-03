"""Execute pinned toolbar policies and their parent/padding/scroll measurement chain."""
from pathlib import Path
import hashlib, json, os, subprocess

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
FIX = ROOT / 'test/fixtures/androidx/toolbar-constraints'
CACHE = ROOT / 'research/toolbar-constraints-generator'
RUNTIME = ROOT / 'research/kotlin-runtime'
CACHE.mkdir(exist_ok=True)
for entry in json.loads((FIX / 'sources.json').read_text(encoding='utf-8'))['sources']:
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

toolbar = read('FloatingToolbar.kt')
parts = []
for axis in ['Horizontal', 'Vertical']:
    section = toolbar[toolbar.index('private fun ' + axis + 'FloatingToolbarWithFabLayout('):]
    start = section.index('val toolbarMeasurable = measurables[0]')
    end = section.index('\n    }\n}', start)
    parts.append('fun MeasureScope.' + axis.lower() + '(measurables:List<Measurable>,constraints:Constraints,expandedProgress:State<Float>,fabPosition:String,toolbarToFabGap:Dp=8.dp,collapsedShadowElevation:Dp=0.dp,expandedShadowElevation:Dp=1.dp,toolbarShape:String="capsule"):MeasureResult = run {\n' + section[start:end] + '\n}')
for name, prefix in [('Size.kt', 'private class UnspecifiedConstraintsNode('), ('Padding.kt', 'private class PaddingValuesModifier(')]:
    source = read(name)
    parts.append(block(source, source.index(prefix)).replace('private class', 'class', 1))
scroll = read('Scroll.kt')
scroll = scroll[scroll.index('internal class ScrollNode('):]
methods = [block(scroll, scroll.index('override fun MeasureScope.measure('))]
for kind in ['minIntrinsicWidth', 'minIntrinsicHeight', 'maxIntrinsicWidth', 'maxIntrinsicHeight']:
    methods.append(block(scroll, scroll.index('override fun IntrinsicMeasureScope.' + kind + '(')))
parts.append('class ScrollNode(var state:ScrollState,var reverseScrolling:Boolean,var isVertical:Boolean):LayoutModifierNode {\n' + '\n'.join(methods) + '\n}')
for name, prefix in [('Dp.kt', 'public fun lerp(start: Dp, stop: Dp, fraction: Float): Dp'), ('MathHelpers.kt', 'public fun lerp(start: Float, stop: Float, fraction: Float): Float')]:
    source = (ROOT / 'test/fixtures/androidx/toolbars' / name).read_text(encoding='utf-8')
    entry = next(e for e in json.loads((ROOT / 'test/fixtures/androidx/toolbars/sources.json').read_text())['sources'] if e['file'] == name)
    assert hashlib.sha256(source.encode()).hexdigest() == entry['sha256'], name
    parts.append(block(source, source.index(prefix)))
parts.append(next(line for line in toolbar.splitlines() if line.startswith('private fun ClosedRange<Dp>.lerp(')).replace('private fun', 'fun', 1))
(CACHE / 'Policy.kt').write_text('package androidx.compose.material3\n' + '\n'.join(parts) + '\n', encoding='utf-8')
# The complete packed Constraints implementation, with only its package/imports adapted.
constraints = read('Constraints.kt')
constraints = constraints[constraints.index('@Immutable\n@JvmInline'):]
(CACHE / 'Constraints.kt').write_text('package androidx.compose.material3\nimport kotlin.jvm.JvmInline\nimport kotlin.math.min\n' + constraints, encoding='utf-8')
# Execute original coercion and relative-placement bodies inside the host tree adapter.
placeable = read('Placeable.kt')
coercion = block(placeable, placeable.index('private fun onMeasuredSizeChanged()'))
mirroring = block(placeable, placeable.index('internal inline fun Placeable.placeAutoMirrored('))
placement = block(placeable, placeable.index('internal inline fun Placeable.placeApparentToRealOffset('))
adapter = (HERE / 'Adapter.kt').read_text(encoding='utf-8')
adapter = adapter.replace('// SOURCE_COERCION', coercion).replace('// SOURCE_MIRRORING', mirroring).replace('// SOURCE_PLACEMENT', placement)
(CACHE / 'Adapter.kt').write_text(adapter, encoding='utf-8')
cp = str(RUNTIME / 'stdlib.jar')
subprocess.run(['java', '-cp', str(RUNTIME / '*'), 'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler', '-no-stdlib', '-no-reflect', '-classpath', cp, '-jvm-target', '1.8', '-d', str(CACHE / 'oracle.jar'), *map(str, [CACHE / 'Policy.kt', CACHE / 'Constraints.kt', CACHE / 'Adapter.kt', HERE / 'Harness.kt'])], check=True)
result = subprocess.run(['java', '-cp', str(CACHE / 'oracle.jar') + os.pathsep + cp, 'androidx.compose.material3.HarnessKt'], capture_output=True, text=True, check=True)
cases = json.loads(result.stdout)
(FIX / 'layout-oracle.json').write_text(json.dumps(cases, separators=(',', ':')) + '\n', encoding='utf-8')
print('Generated', len(cases), 'original Kotlin toolbar parent/Placeable/padding/scroll cases; source-invalid constraints included.')
