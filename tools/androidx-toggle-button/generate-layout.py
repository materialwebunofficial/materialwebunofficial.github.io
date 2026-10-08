"""Execute the original Toggle Row/Box/Spacer tree with explicit measured leaves."""
from pathlib import Path
import gzip, hashlib, json, os, subprocess, sys, urllib.request

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
FIX = ROOT / 'test/fixtures/androidx/toggle-button'
CACHE = ROOT / 'research/toggle-layout-generator'
RUNTIME = ROOT / 'research/kotlin-runtime'
CACHE.mkdir(exist_ok=True)
for name in ['toggle-button', 'button', 'tooltip', 'toolbar-row', 'toolbar-alignment']:
    directory = ROOT / 'test/fixtures/androidx' / name
    for entry in json.loads((directory / 'sources.json').read_text())['sources']:
        assert hashlib.sha256((directory / entry['file']).read_bytes()).hexdigest() == entry['sha256'], entry['file']

def block(source, marker):
    start = source.index(marker)
    opening = source.index('{', start)
    end, depth = opening + 1, 1
    while depth:
        depth += (source[end] == '{') - (source[end] == '}')
        end += 1
    return source[start:end]

def statement(source, marker):
    start = source.index(marker)
    return source[start:source.index('\n\n', start)]

def call(source, marker):
    start = source.index(marker)
    opening = source.index('(', start)
    end, depth = opening + 1, 1
    while depth:
        depth += (source[end] == '(') - (source[end] == ')')
        end += 1
    # Include the original Row lambda, not just its call arguments.
    opening = source.index('{', end)
    end, depth = opening + 1, 1
    while depth:
        depth += (source[end] == '{') - (source[end] == '}')
        end += 1
    return source[start:end]

source = (FIX / 'ToggleButton.kt').read_text(encoding='utf-8')
parts = [source[source.index(marker):].splitlines()[0] for marker in ['private val ToggleButtonStartPadding', 'private val ToggleButtonEndPadding']]
parts += [statement(source, marker) for marker in [
    'private val ExtraSmallContentPadding', 'private fun getMediumContentPadding',
    'private fun getLargeContentPadding', 'private val ExtraLargeContentPadding',
    'private fun getSmallContentPadding', 'private val smallVerticalPadding',
    'private val iconSmallHorizontalPadding']]
parts.append(block(source, 'public fun contentPaddingFor(\n        buttonHeight:'))
start = source.index('private val MediumLeadingPadding')
parts.append(source[start:source.index('\n\n', source.index('private val IconLargeTrailingPadding', start))])
parts.append('val MinHeight get() = ButtonDefaults.MinHeight')
(CACHE / 'Defaults.kt').write_text('package androidx.compose.material3\nimport androidx.compose.material3.tokens.*\nobject ToggleLayoutDefaults{\n' + '\n'.join(parts) + '\n}\n')
row = call(source, 'Row(\n                Modifier.defaultMinSize(minHeight = buttonSize.height)')
row = row.replace('Modifier.', 'TooltipModifier.')
(CACHE / 'Content.kt').write_text('package androidx.compose.material3\nfun nativeToggleContent(buttonSize:ToggleLayoutSize,contentPadding:PaddingValues,iconSize:Dp,iconSpacing:Dp,icon:(()->Unit)?,content:()->Unit){\n' + row + '\n}\n')

revision = json.loads((FIX / 'sources.json').read_text())['revision']
url = f'https://raw.githubusercontent.com/androidx/androidx/{revision}/compose/foundation/foundation-layout/src/commonMain/kotlin/androidx/compose/foundation/layout/Spacer.kt'
spacer_path = FIX / 'Spacer.kt'
if spacer_path.exists():
    spacer_bytes = spacer_path.read_bytes()
else:
    spacer_bytes = urllib.request.urlopen(url).read()
    (CACHE / 'Spacer.kt').write_bytes(spacer_bytes)
spacer = spacer_bytes.decode('utf-8')
policy = block(spacer, 'private object SpacerMeasurePolicy').replace('private object', 'internal object', 1).replace(': MeasurePolicy', ': BoxHostPolicy', 1)
(CACHE / 'SpacerBody.kt').write_text('package androidx.compose.material3\n' + policy + '\n')
dependencies = [ROOT / 'research/button-generator/layout.jar', ROOT / 'research/tooltip-layout-generator/layout.jar', ROOT / 'research/toolbar-alignment-generator/oracle.jar', RUNTIME / 'stdlib.jar']
assert all(path.exists() for path in dependencies), 'Prepare the existing original Button/Tooltip/Row runtimes first'
cp = os.pathsep.join(map(str, dependencies))
files = [CACHE / 'Defaults.kt', CACHE / 'Content.kt', CACHE / 'SpacerBody.kt', HERE / 'Layout.kt']
subprocess.run(['java', '-cp', str(RUNTIME / '*'), 'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler', '-no-stdlib', '-no-reflect', '-classpath', cp, '-Xfriend-paths=' + ','.join(map(str, dependencies[:-1])), '-jvm-target', '1.8', '-d', str(CACHE / 'layout.jar'), *map(str, files)], check=True)
command = ['java', '-cp', str(CACHE / 'layout.jar') + os.pathsep + cp, 'androidx.compose.material3.LayoutKt']
result = subprocess.run(command, capture_output=True, text=True, check=True)
output = CACHE / 'layout-oracle.json' if '--research-only' in sys.argv else FIX / 'layout-oracle.json.gz'
payload = (json.dumps(json.loads(result.stdout), separators=(',', ':')) + '\n').encode()
output.write_bytes(payload if '--research-only' in sys.argv else gzip.compress(payload, mtime=0))
print('Generated', len(json.loads(result.stdout)['cases']), 'original Toggle Row/Box/Spacer/defaultMin/padding trees:', output)
if '--browser' in sys.argv:
    inputs = json.loads((ROOT / 'research/toggle-browser-layout-inputs.json').read_text())
    rows = []
    for case in inputs:
        v = case['input']
        head = [v['height'], int(v['rtl']), *v['constraints'].values()]
        encode = lambda items: '-' if items is None else ';'.join(','.join(map(str, [p['width'], p['height'], int(p.get('required', False))])) for p in items)
        rows.append(','.join(map(str, head)) + '|' + encode(v['icon']) + '|' + encode(v['content']))
    (CACHE / 'browser.csv').write_text('\n'.join(rows) + '\n')
    native = json.loads(subprocess.run(command + [str(CACHE / 'browser.csv')], capture_output=True, text=True, check=True).stdout)['cases']
    for actual, expected in zip(inputs, native):
        actual.pop('rendered', None)
        actual['expected'] = expected
    destination = CACHE if '--research-only' in sys.argv else FIX
    (destination / 'browser-layout-oracle.json').write_text(json.dumps(inputs, indent=2) + '\n')
    print('Generated', len(inputs), 'native Toggle browser trees with explicit font/element leaves.')
