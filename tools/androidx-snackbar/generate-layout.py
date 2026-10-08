"""Run unchanged Snackbar lambda / baseline-offset bodies on measured JVM leaves.

The cached alignment host executes packed Constraints and original Placeable
coercion/relative placement. Leaves supply dimensions and alignment lines;
this runner does not execute Text, composition, Box propagation or a Scaffold.
"""
from pathlib import Path
import gzip, hashlib, json, os, re, subprocess, sys

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
FIX = ROOT / 'test/fixtures/androidx/snackbar'
CACHE = ROOT / 'research/snackbar-layout-generator'
BASE = ROOT / 'research/toolbar-alignment-generator/oracle.jar'
RUNTIME = ROOT / 'research/kotlin-runtime'
CACHE.mkdir(exist_ok=True)
for directory in [FIX, ROOT / 'test/fixtures/androidx/toolbar-row', ROOT / 'test/fixtures/androidx/toolbar-alignment']:
    for entry in json.loads((directory / 'sources.json').read_text())['sources']:
        assert hashlib.sha256((directory / entry['file']).read_bytes()).hexdigest() == entry['sha256'], entry['file']
if not BASE.exists():
    raise RuntimeError('Prepare the original alignment host with tools/androidx-toolbar-alignment/generate.py first')

def block(source, start):
    opening = source.index('{', start)
    end, depth = opening + 1, 1
    while depth:
        depth += (source[end] == '{') - (source[end] == '}')
        end += 1
    return source[start:end]

source = (FIX / 'Snackbar.kt').read_text()
start = source.index('private fun LegacyOneRowSnackbar(')
start = source.index('{ measurables, constraints ->', start)
policy = block(source, start)
constants = source[source.index('private val ContainerMaxWidth'):]
tokens = (FIX / 'SnackbarTokens.kt').read_text()
tokens = '\n'.join(re.search(r'    inline val ' + name + r':[^\n]+\n        get\(\) = [^\n]+', tokens)[0] for name in ['SingleLineContainerHeight', 'TwoLinesContainerHeight'])
tokens = tokens.replace('androidx.compose.ui.unit.Dp', 'Dp')  # package relocation only
alignment = (FIX / 'AlignmentLine.kt').read_text()
padding = alignment[alignment.index('private fun MeasureScope.alignmentLineOffsetMeasure('):]
header = '''package androidx.compose.material3
import kotlin.math.max
import kotlin.math.min
val Double.dp get()=Dp(toFloat())
inline fun <T> List<T>.fastFirstOrNull(predicate:(T)->Boolean)=firstOrNull(predicate)
inline fun <T> List<T>.fastFirst(predicate:(T)->Boolean)=first(predicate)
val Measurable.layoutId get()=(this as SnackLeaf).id
private val textTag="text"
private val actionTag="action"
private val dismissActionTag="dismissAction"
'''
(CACHE / 'Policies.kt').write_text(header + constants + '\nobject SnackbarTokens {\n' + tokens + '\n}\n' +
    'val nativeRow:MeasureScope.(List<Measurable>,Constraints)->MeasureResult = ' + policy + '\n' + padding + '''
fun nativeBaseline(c:Constraints, leaf:Measurable, line:AlignmentLine, before:Dp, after:Dp) =
    with(Scope){alignmentLineOffsetMeasure(line,before,after,leaf,c)}
''')
# Original fillMaxWidth node and its enum, relocated to the same host package.
size = (ROOT / 'test/fixtures/androidx/toolbar-row/Size.kt').read_text()
(CACHE / 'Fill.kt').write_text('package androidx.compose.material3\nimport kotlin.math.roundToInt\ninterface ParentDataModifierNode {fun Density.modifyParentData(parentData:Any?):Any?}\n' +
    size[size.index('internal enum class Direction {'):] + '\n' +
    block(size, size.index('private class FillNode(')).replace('private class', 'internal class', 1))
cp = os.pathsep.join([str(BASE), str(RUNTIME / 'stdlib.jar')])
subprocess.run(['java', '-cp', str(RUNTIME / '*'), 'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler', '-no-stdlib', '-no-reflect',
    '-classpath', cp, '-Xfriend-paths=' + str(BASE), '-jvm-target', '1.8', '-d', str(CACHE / 'layout.jar'),
    str(CACHE / 'Policies.kt'), str(CACHE / 'Fill.kt'), str(HERE / 'Layout.kt'), str(HERE / 'SnackTree.kt')], check=True)
result = subprocess.run(['java', '-cp', str(CACHE / 'layout.jar') + os.pathsep + cp,
    'androidx.compose.material3.LayoutKt'], capture_output=True, text=True)
if result.returncode:
    print(result.stderr)
    result.check_returncode()
cases = json.loads(result.stdout)
(FIX / 'layout-oracle.json.gz').write_bytes(gzip.compress((json.dumps(cases, separators=(',', ':')) + '\n').encode(), mtime=0))
print('Generated', len(cases['row']), 'native complete one-row policies and', len(cases['baseline']), 'native alignment-line padding cases.')
if '--browser' in sys.argv:
    inputs = json.loads((ROOT / 'research/snackbar-browser-layout-inputs.json').read_text())
    rows = []
    for i, case in enumerate(inputs):
        data = case['input']
        values = [i, int(data['rtl']), int(data['newLine']), data['availableWidth']]
        for name in ['text', 'action', 'dismiss']:
            item = data[name]
            values.extend([-1, 0, -2147483648, -2147483648] if item is None else [item['width'], item['height'], item.get('first', -2147483648), item.get('last', -2147483648)])
        rows.append(','.join(map(str, values)))
    (CACHE / 'browser.csv').write_text('\n'.join(rows) + '\n')
    result = subprocess.run(['java', '-cp', str(CACHE / 'layout.jar') + os.pathsep + cp,
        'androidx.compose.material3.LayoutKt', str(CACHE / 'browser.csv')], capture_output=True, text=True, check=True)
    expected = json.loads(result.stdout)
    for actual, native in zip(inputs, expected):
        actual.pop('rendered', None)
        actual['expected'] = native
    (FIX / 'browser-layout-oracle.json').write_text(json.dumps(inputs, indent=2) + '\n')
    print('Generated', len(inputs), 'browser geometry references from unchanged native layout bodies with explicit Chromium font leaves.')
