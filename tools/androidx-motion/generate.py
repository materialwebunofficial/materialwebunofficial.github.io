"""Run pinned AndroidX spring code with a private Kotlin compiler (Python3, Java8+).
Normal tests consume the committed JSON; generation needs network only for cache misses.
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
RAW = f'https://raw.githubusercontent.com/androidx/androidx/{REVISION}/compose/animation/animation-core/src/commonMain/kotlin/androidx/compose/animation/core/'
FIXTURES = ROOT / 'test/fixtures/androidx/motion'
CACHE = ROOT / 'research/motion-generator'
RUNTIME = ROOT / 'research/kotlin-runtime'
COLOR_FIXTURES = ROOT / 'test/fixtures/androidx/color'
for directory in (FIXTURES, CACHE, RUNTIME, COLOR_FIXTURES):
    directory.mkdir(parents=True, exist_ok=True)
central = 'https://repo.maven.apache.org/maven2/'
artifacts = {
    'compiler.jar': central + 'org/jetbrains/kotlin/kotlin-compiler-embeddable/1.9.24/kotlin-compiler-embeddable-1.9.24.jar',
    'stdlib.jar': central + 'org/jetbrains/kotlin/kotlin-stdlib/1.9.24/kotlin-stdlib-1.9.24.jar',
    'reflect.jar': central + 'org/jetbrains/kotlin/kotlin-reflect/1.6.10/kotlin-reflect-1.6.10.jar',
    'daemon.jar': central + 'org/jetbrains/kotlin/kotlin-daemon-embeddable/1.9.24/kotlin-daemon-embeddable-1.9.24.jar',
    'trove.jar': central + 'org/jetbrains/intellij/deps/trove4j/1.0.20200330/trove4j-1.0.20200330.jar',
    'annotations.jar': central + 'org/jetbrains/annotations/13.0/annotations-13.0.jar',
    'androidx-annotation.jar': 'https://dl.google.com/dl/android/maven2/androidx/annotation/annotation-jvm/1.8.0/annotation-jvm-1.8.0.jar',
}
sources = ['SpringEstimation.kt', 'SpringSimulation.kt', 'FloatAnimationSpec.kt',
           'VectorizedAnimationSpec.kt', 'AnimateAsState.kt', 'AnimationSpec.kt', 'Transition.kt']
color_raw = f'https://raw.githubusercontent.com/androidx/androidx/{REVISION}/compose/'
color_sources = {
    'ColorVectorConverter.kt': color_raw+'animation/animation/src/commonMain/kotlin/androidx/compose/animation/ColorVectorConverter.kt',
    'Oklab.kt': color_raw+'ui/ui-graphics/src/commonMain/kotlin/androidx/compose/ui/graphics/colorspace/Oklab.kt',
    'Color.kt': color_raw+'ui/ui-graphics/src/commonMain/kotlin/androidx/compose/ui/graphics/Color.kt',
}
def download(item):
    path, url = item
    if not path.exists():
        path.write_bytes(urllib.request.urlopen(url, timeout=60).read())
with concurrent.futures.ThreadPoolExecutor() as pool:
    list(pool.map(download, [(RUNTIME/name, url) for name, url in artifacts.items()] +
                  [(FIXTURES/name, RAW+name) for name in sources] +
                  [(COLOR_FIXTURES/name, url) for name, url in color_sources.items()]))
color_manifest = {name: {'url': url, 'sha256': hashlib.sha256((COLOR_FIXTURES/name).read_bytes()).hexdigest()}
                  for name, url in color_sources.items()}
color_manifest_path = COLOR_FIXTURES/'sources.json'
if color_manifest_path.exists() and json.loads(color_manifest_path.read_text()) != color_manifest:
    raise RuntimeError('Cached AndroidX color source hash mismatch')
color_manifest_path.write_text(json.dumps(color_manifest, indent=2)+'\n')
manifest = {name: {'url': RAW+name, 'sha256': hashlib.sha256((FIXTURES/name).read_bytes()).hexdigest()} for name in sources}
manifest_path = HERE / 'sources.json'
if manifest_path.exists():
    for name, entry in json.loads(manifest_path.read_text()).items():
        if manifest.get(name) != entry:
            raise RuntimeError(f'Cached AndroidX source hash mismatch: {name}')
spring = (FIXTURES/'SpringEstimation.kt').read_text().replace('import androidx.compose.ui.util.fastIsFinite\n', '').replace('fastIsFinite()', 'isFinite()')
assert 'StiffnessMediumLow: Float = 400f' in (FIXTURES/'VectorizedAnimationSpec.kt').read_text()
(CACHE/'SpringEstimation.kt').write_text(spring)
classpath = os.pathsep.join(str(RUNTIME/name) for name in ['stdlib.jar', 'androidx-annotation.jar'])
subprocess.run(['java', '-cp', str(RUNTIME/'*'), 'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler',
    '-no-stdlib', '-no-reflect', '-classpath', classpath, '-jvm-target', '1.8',
    '-d', str(CACHE/'oracle.jar'), str(CACHE/'SpringEstimation.kt'), str(FIXTURES/'SpringSimulation.kt'),
    str(HERE/'Bridge.kt'), str(HERE/'FloatPacking.kt'), str(HERE/'Export.kt')], check=True)
result = subprocess.run(['java', '-cp', str(CACHE/'oracle.jar')+os.pathsep+classpath,
    'androidx.compose.animation.core.ExportKt'], check=True, capture_output=True, text=True)
data = json.loads(result.stdout)
(FIXTURES/'spring-oracle.json').write_text(json.dumps(data, separators=(',', ':'))+'\n')
vectors = subprocess.run(['java', '-cp', str(CACHE/'oracle.jar')+os.pathsep+classpath,
    'androidx.compose.animation.core.ExportKt', 'vectors'], check=True, capture_output=True, text=True)
vector_data = json.loads(vectors.stdout)
(FIXTURES/'color-vector-oracle.json').write_text(json.dumps(vector_data, separators=(',', ':'))+'\n')
toolbar = subprocess.run(['java', '-cp', str(CACHE/'oracle.jar')+os.pathsep+classpath,
    'androidx.compose.animation.core.ExportKt', 'toolbars'], check=True, capture_output=True, text=True)
(ROOT/'test/fixtures/androidx/toolbars/motion-oracle.json').write_text(json.dumps(json.loads(toolbar.stdout),separators=(',',':'))+'\n')
manifest_path.write_text(json.dumps(manifest, indent=2)+'\n')
print(f'Generated {len(data)} independent Kotlin spring cases.')
print(f'Generated {len(vector_data)} independent Kotlin color-vector cases.')
