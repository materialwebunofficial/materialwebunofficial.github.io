"""Native spring/tokens for snackbar close-during-entry, with explicit frame hosts."""
from pathlib import Path
import hashlib, json, os, subprocess

ROOT = Path(__file__).resolve().parents[2]
FIX = ROOT / 'test/fixtures/androidx/snackbar'
CACHE = ROOT / 'research/snackbar-motion-generator'
RUNTIME = ROOT / 'research/kotlin-runtime'
BASE = ROOT / 'research/motion-generator/oracle.jar'
CACHE.mkdir(exist_ok=True)
for directory, manifest_file in [(FIX, FIX/'sources.json'), (ROOT/'test/fixtures/androidx/fab', ROOT/'test/fixtures/androidx/fab/sources.json'), (ROOT/'test/fixtures/androidx/motion', ROOT/'tools/androidx-motion/sources.json')]:
    manifest = json.loads(manifest_file.read_text())
    entries = manifest.get('sources') or [dict(file=name, **entry) for name, entry in manifest.items()]
    for entry in entries:
        assert hashlib.sha256((directory/entry['file']).read_bytes()).hexdigest() == entry['sha256'], entry['file']
source = (FIX/'SnackbarHost.kt').read_text()
assert 'Animatable(if (!visible) 1f else 0.8f)' in source
assert 'alpha.animateTo(if (visible) 1f else 0f, animationSpec = animation)' in source
assert 'scale.animateTo(if (visible) 1f else 0.8f, animationSpec = animation)' in source
assert 'animation = MotionSchemeKeyTokens.FastEffects.value()' in source
assert 'animation = MotionSchemeKeyTokens.FastSpatial.value()' in source
assert BASE.exists(), 'Prepare the unchanged spring runtime with tools/androidx-motion/generate.py'
cp = os.pathsep.join([str(BASE), str(RUNTIME/'stdlib.jar')])
tokens = ROOT/'test/fixtures/androidx/fab'
subprocess.run(['java', '-cp', str(RUNTIME/'*'), 'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler', '-no-stdlib', '-no-reflect', '-Xfriend-paths='+str(BASE), '-classpath', cp, '-jvm-target', '1.8', '-d', str(CACHE/'oracle.jar'), str(tokens/'ExpressiveMotionTokens.kt'), str(tokens/'StandardMotionTokens.kt'), str(ROOT/'tools/androidx-snackbar/Motion.kt')], check=True)
result = subprocess.run(['java', '-cp', os.pathsep.join([str(CACHE/'oracle.jar'), cp]), 'androidx.compose.animation.core.MotionKt'], check=True, capture_output=True, text=True)
cases = json.loads(result.stdout)
(FIX/'motion-oracle.json').write_text(json.dumps(cases, separators=(',', ':'))+'\n')
print('Generated', len(cases), 'native snackbar close-during-entry histories.')
