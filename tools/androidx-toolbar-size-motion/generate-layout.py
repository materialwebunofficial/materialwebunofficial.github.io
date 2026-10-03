"""Execute the original visibility composition predicates around the native source tree."""
from pathlib import Path
import gzip, json, os, runpy, subprocess

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
CACHE = ROOT / 'research/toolbar-size-motion-generator'
FIX = ROOT / 'test/fixtures/androidx/toolbar-size-motion'
RUNTIME = ROOT / 'research/kotlin-runtime'
# Refresh and hash-verify every shared Row/Column, native and coordinator body.
runpy.run_path(str(ROOT / 'tools/androidx-toolbar-alignment/generate.py'))
base = ROOT / 'research/toolbar-row-generator'
aligned = ROOT / 'research/toolbar-alignment-generator'
adapter = (aligned / 'Adapter.kt').read_text()
adapter = adapter.replace('val alignment:String,val settled:Boolean):Measurable', 'val alignment:String,val settled:Boolean,val cross:Int=48):Measurable')
adapter = adapter.replace('IntSize(constraints.maxWidth.coerceAtMost(48),sample)else IntSize(sample,constraints.maxHeight.coerceAtMost(48))', 'IntSize(cross,sample)else IntSize(sample,cross)')
(CACHE / 'LayoutAdapter.kt').write_text(adapter)
cp = os.pathsep.join([str(RUNTIME / 'stdlib.jar'), str(CACHE / 'oracle.jar')])
subprocess.run(['java', '-cp', str(RUNTIME / '*'), 'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler',
                '-no-stdlib', '-no-reflect', '-classpath', cp, '-jvm-target', '1.8',
                '-d', str(CACHE / 'layout.jar'), *map(str, [base / 'Policy.kt', base / 'Constraints.kt',
                aligned / 'Tree.kt', CACHE / 'LayoutAdapter.kt', aligned / 'Lines.kt', aligned / 'Bridge.kt', HERE / 'LayoutHarness.kt'])], check=True)
r = subprocess.run(['java', '-cp', str(CACHE / 'layout.jar') + os.pathsep + cp,
                    'androidx.compose.material3.LayoutHarnessKt'], capture_output=True, text=True, check=True)
cases = json.loads(r.stdout)
(FIX / 'layout-oracle.json.gz').write_bytes(gzip.compress((json.dumps(cases, separators=(',', ':')) + '\n').encode(), mtime=0))
print('Generated', len(cases), 'source native visibility/composition modifier trees.')
