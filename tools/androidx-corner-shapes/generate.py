"""Project unchanged corner/outline Kotlin bodies through explicit JVM hosts."""
from pathlib import Path
import gzip
import hashlib
import json
import os
import subprocess

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
FIX = ROOT / 'test/fixtures/androidx/corner-shapes'
CACHE = ROOT / 'research/corner-shapes-generator'
RUNTIME = ROOT / 'research/kotlin-runtime'
CACHE.mkdir(parents=True, exist_ok=True)
for entry in json.loads((FIX / 'sources.json').read_text(encoding='utf-8'))['sources']:
    assert hashlib.sha256((FIX / entry['file']).read_bytes()).hexdigest() == entry['sha256'], entry['file']


def read(name):
    return (FIX / (name + '.kt')).read_text(encoding='utf-8')


def block(source, start):
    opening = source.index('{', start)
    depth = 1
    index = opening + 1
    while depth:
        depth += (source[index] == '{') - (source[index] == '}')
        index += 1
    return source[start:index]


def relocate(source):
    return '\n'.join(line for line in source.splitlines()
                     if not line.startswith(('package ', 'import ')))


assert 'ShapeKeyTokens.CornerFull -> CircleShape' in read('Shapes')
assert 'get() = ShapeKeyTokens.CornerFull' in read('FloatingToolbarTokens')
assert 'public val CircleShape: RoundedCornerShape = RoundedCornerShape(50)' in read('RoundedCornerShape')
assert 'min(unpackAbsFloat1(packedValue), unpackAbsFloat2(packedValue))' in read('Size')

for name in ['CornerBasedShape', 'CornerSize', 'RoundedCornerShape', 'CutCornerShape',
             'AbsoluteRoundedCornerShape', 'AbsoluteCutCornerShape', 'Shape', 'RectangleShape']:
    source = relocate(read(name))
    if name == 'CornerSize':
        source += '\nfun sourcePercent(value:Float):CornerSize = PercentCornerSize(value)\n'
    (CACHE / (name + '.kt')).write_text('package androidx.compose.foundation.shape\nimport androidx.compose.foundation.shape.LayoutDirection.Ltr\n' + source + '\n', encoding='utf-8')

round_rect = read('RoundRect')
projected = block(round_rect, round_rect.index('public data class RoundRect('))
prefix = 'public fun RoundRect(\n    rect: Rect,\n    topLeft:'
start = round_rect.index(prefix)
end = round_rect.index('\n/**', start)
projected += '\n' + round_rect[start:end]
float_lerp = read('MathHelpers')
projected += '\n' + block(float_lerp, float_lerp.index('public fun lerp(start: Float'))
(CACHE / 'Geometry.kt').write_text('package androidx.compose.foundation.shape\nimport kotlin.math.*\n' + projected + '\n', encoding='utf-8')

density_line = next(line.strip() for line in read('Density').splitlines() if 'fun Dp.toPx(): Float =' in line)
host = (HERE / 'Host.kt').read_text(encoding='utf-8').replace('/* ORIGINAL_DP_TO_PX */', density_line)
(CACHE / 'Host.kt').write_text(host, encoding='utf-8')
files = sorted(CACHE.glob('*.kt')) + [HERE / 'Harness.kt']
jar = CACHE / 'oracle.jar'
stdlib = str(RUNTIME / 'stdlib.jar')
subprocess.run(['java', '-cp', str(RUNTIME / '*'), 'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler',
                '-no-stdlib', '-no-reflect', '-classpath', stdlib, '-jvm-target', '1.8',
                '-d', str(jar), *map(str, files)], check=True)
result = subprocess.run(['java', '-cp', str(jar) + os.pathsep + stdlib,
                         'androidx.compose.foundation.shape.HarnessKt'], capture_output=True,
                        text=True, encoding='utf-8', check=True)
cases = json.loads(result.stdout)
data = (json.dumps(cases, separators=(',', ':'), allow_nan=False) + '\n').encode()
(FIX / 'outline-oracle.json.gz').write_bytes(gzip.compress(data, mtime=0))
print('Generated', len(cases), 'original corner/outline/point-containment cases.')
