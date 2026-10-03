"""Generate exact loading morph pairs using pinned AndroidX Kotlin sources.

Requires Python 3 and Java 8+. Downloads a local Kotlin compiler into ignored research/;
does not install software or change PATH. Normal package builds use checked-in output.
"""
from pathlib import Path
import concurrent.futures
import hashlib
import json
import os
import subprocess
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
REVISION = 'a095da93f8e98dea8748ceed79ea8427aade245f'
RAW = f'https://raw.githubusercontent.com/androidx/androidx/{REVISION}/'
CACHE = ROOT / 'research' / 'shape-generator'
RUNTIME = ROOT / 'research' / 'kotlin-runtime'
SOURCE = CACHE / 'upstream'
for directory in (CACHE, RUNTIME, SOURCE):
    directory.mkdir(parents=True, exist_ok=True)

central = 'https://repo.maven.apache.org/maven2/'
artifacts = {
    'compiler.jar': central + 'org/jetbrains/kotlin/kotlin-compiler-embeddable/1.9.24/kotlin-compiler-embeddable-1.9.24.jar',
    'stdlib.jar': central + 'org/jetbrains/kotlin/kotlin-stdlib/1.9.24/kotlin-stdlib-1.9.24.jar',
    'reflect.jar': central + 'org/jetbrains/kotlin/kotlin-reflect/1.6.10/kotlin-reflect-1.6.10.jar',
    'daemon.jar': central + 'org/jetbrains/kotlin/kotlin-daemon-embeddable/1.9.24/kotlin-daemon-embeddable-1.9.24.jar',
    'trove.jar': central + 'org/jetbrains/intellij/deps/trove4j/1.0.20200330/trove4j-1.0.20200330.jar',
    'annotations.jar': central + 'org/jetbrains/annotations/13.0/annotations-13.0.jar',
    'collection.jar': 'https://dl.google.com/dl/android/maven2/androidx/collection/collection-jvm/1.4.0/collection-jvm-1.4.0.jar',
    'androidx-annotation.jar': 'https://dl.google.com/dl/android/maven2/androidx/annotation/annotation-jvm/1.8.0/annotation-jvm-1.8.0.jar',
}
source_names = ['CornerRounding', 'Cubic', 'FeatureDetector', 'FeatureMapping', 'Features',
                'FeatureSerializer', 'FloatMapping', 'Morph', 'Point', 'PolygonMeasure',
                'PolygonValidation', 'RoundedPolygon', 'Shapes', 'SvgPathParser', 'Utils']
sources = {name + '.kt': RAW + 'graphics/graphics-shapes/src/commonMain/kotlin/androidx/graphics/shapes/' + name + '.kt' for name in source_names}
sources['MaterialShapes.kt'] = RAW + 'compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/MaterialShapes.kt'
sources['SpringEstimation.kt'] = RAW + 'compose/animation/animation-core/src/commonMain/kotlin/androidx/compose/animation/core/SpringEstimation.kt'


def download(item):
    path, url = item
    if not path.exists():
        path.write_bytes(urllib.request.urlopen(url, timeout=60).read())
    return path


with concurrent.futures.ThreadPoolExecutor() as pool:
    list(pool.map(download, [(RUNTIME / name, url) for name, url in artifacts.items()] +
                  [(SOURCE / name, url) for name, url in sources.items()]))

manifest_path = HERE / 'sources.json'
if manifest_path.exists():
    previous = json.loads(manifest_path.read_text())
    for name, entry in previous['sources'].items():
        actual = hashlib.sha256((SOURCE / name).read_bytes()).hexdigest()
        if actual != entry['sha256']:
            raise RuntimeError(f'Cached AndroidX source hash mismatch: {name}')

original = (SOURCE / 'MaterialShapes.kt').read_text(encoding='utf-8')
license_header = original.split('package ')[0]
# Only Compose UI adapters are substituted. Polygon construction and Morph matching
# execute unchanged upstream code. fastMap is allocation-optimized List.map.
body = original[original.index('public sealed class MaterialShapes'):].replace('.fastMap ', '.map ')
imports = 'package androidx.compose.material3\nimport androidx.graphics.shapes.*\nimport androidx.collection.FloatFloatPair\nimport kotlin.math.*\n'
(CACHE / 'MaterialShapes.kt').write_text(license_header + imports + body + (HERE / 'GeometryBridge.kt.inc').read_text(), encoding='utf-8')
(CACHE / 'Format.kt').write_text('package androidx.graphics.shapes\ninternal fun Float.toStringWithLessPrecision():String=toString()\n')
spring = (SOURCE / 'SpringEstimation.kt').read_text(encoding='utf-8').replace('import androidx.compose.ui.util.fastIsFinite\n', '').replace('fastIsFinite()', 'isFinite()')
(CACHE / 'SpringEstimation.kt').write_text(spring, encoding='utf-8')
catalog = json.loads((HERE / 'catalog.json').read_text())
(CACHE / 'Catalog.kt').write_text('import androidx.compose.material3.MaterialShapes\nfun catalog() = linkedMapOf(\n' + ',\n'.join(f'"{key}" to MaterialShapes.{name}' for key, name in catalog.items()) + '\n)\n')

classpath = os.pathsep.join(str(RUNTIME / name) for name in ['stdlib.jar', 'collection.jar', 'androidx-annotation.jar'])
subprocess.run(['java', '-cp', str(RUNTIME / '*'), 'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler',
                '-no-stdlib', '-no-reflect', '-classpath', classpath, '-jvm-target', '1.8',
                '-d', str(CACHE / 'generator.jar'),
                *[str(SOURCE / (name + '.kt')) for name in source_names],
                str(CACHE / 'MaterialShapes.kt'), str(CACHE / 'Format.kt'), str(CACHE / 'SpringEstimation.kt'), str(CACHE / 'Catalog.kt'), str(HERE / 'Export.kt')], check=True)


def run(*args):
    result = subprocess.run(['java', '-cp', str(CACHE / 'generator.jar') + os.pathsep + classpath,
                             'ExportKt', *args], check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


data = run()
catalog_cubics = run('catalog')


def svg_path(cubics):
    def number(value):
        return f'{value * 380:.6f}'.rstrip('0').rstrip('.') or '0'
    start = 'M' + ' '.join(number(v) for v in cubics[0][:2])
    return start + ''.join('C' + ' '.join(number(v) for v in c[2:]) for c in cubics) + 'Z'


(ROOT / 'src/tokens/shapes.js').write_text(license_header +
    f'// Generated from AndroidX MaterialShapes at {REVISION}. ViewBox: 0 0 380 380.\n' +
    "import { SHAPE_EXTENSIONS } from './shape-extensions.js';\n" +
    'const canonical = ' + json.dumps({name: svg_path(cubics) for name, cubics in catalog_cubics.items()}, indent=2) + ';\n' +
    'export const MATERIAL_SHAPE_NAMES = Object.keys(canonical);\n' +
    'export const MATERIAL_SHAPES_SVG_PATHS = { ...SHAPE_EXTENSIONS, ...canonical };\n', encoding='utf-8')
(ROOT / 'test/fixtures/androidx/material-shapes-cubics.json').write_text(json.dumps(catalog_cubics, separators=(',', ':')) + '\n')
(ROOT / 'src/tokens/loading-morphs.js').write_text(
    license_header + f'// Generated from AndroidX {REVISION}.\n'
    '// Run python tools/androidx-shapes/generate.py to reproduce.\n'
    'export const LOADING_MORPHS = ' + json.dumps(data, separators=(',', ':')) + ';\n', encoding='utf-8')
fixture = ROOT / 'test/fixtures/androidx/loading-morph-oracle.json'
fixture.write_text(json.dumps({'progress': [.25, .5, .75, 1.05], 'morphs': run('oracle')}, separators=(',', ':')) + '\n')
manifest = {'revision': REVISION, 'sources': {name: {'url': url, 'sha256': hashlib.sha256((SOURCE / name).read_bytes()).hexdigest()} for name, url in sources.items()}}
(HERE / 'sources.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('Generated AndroidX loading cubic pairs and independent Kotlin interpolation fixtures.')
