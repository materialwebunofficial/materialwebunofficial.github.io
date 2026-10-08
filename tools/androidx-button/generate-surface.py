"""Original clickable/toggle Surface composition and draw order; explicit hosts."""
from pathlib import Path
import gzip, hashlib, json, os, subprocess, sys
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
CACHE=ROOT/'research/button-surface-generator'
CACHE.mkdir(exist_ok=True)
RUNTIME=ROOT/'research/kotlin-runtime'
COLOR=ROOT/'research/fab-surface-generator/oracle.jar'
for name in ['button','toggle-button','fab-surface']:
    directory=ROOT/'test/fixtures/androidx'/name
    for entry in json.loads((directory/'sources.json').read_text())['sources']:
        assert hashlib.sha256((directory/entry['file']).read_bytes()).hexdigest()==entry['sha256'],entry['file']
assert COLOR.exists(),'Prepare tools/androidx-fab/surface-snapshot.mjs first, with readers closed'
def block(source,marker):
    start=source.index(marker);opening=source.index('{',start);end=opening+1;depth=1
    while depth:
        depth+=(source[end]=='{')-(source[end]=='}');end+=1
    return source[start:end]
def statement(source,marker):
    start=source.index(marker);return source[start:source.index('\n\n',start)]
surface=(ROOT/'test/fixtures/androidx/fab-surface/Surface.kt').read_text(encoding='utf-8')
scheme=(ROOT/'test/fixtures/androidx/fab-surface/ColorScheme.kt').read_text(encoding='utf-8')
parts=[block(surface,'public fun Surface(\n    onClick:'),block(surface,'public fun Surface(\n    checked:'),statement(surface,'private fun Modifier.surface('),statement(surface,'private fun surfaceColorAtElevation('),block(scheme,'internal fun ColorScheme.applyTonalElevation('),statement(scheme,'public fun contentColorFor(backgroundColor:')]
# Package/type relocation and native extension imports; bodies are unchanged.
header='''package androidx.compose.material3
import Color as SourceColor
import ColorScheme as SourceColorScheme
import Dp as SourceDp
import contentColorFor
import surfaceColorAtElevation
typealias Color=SourceColor
typealias ColorScheme=SourceColorScheme
typealias Dp=SourceDp
'''
(CACHE/'Bodies.kt').write_text(header+'\n\n'.join(parts)+'\n')
cp=os.pathsep.join([str(COLOR),str(RUNTIME/'stdlib.jar')])
files=[CACHE/'Bodies.kt',HERE/'Surface.kt']
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-jvm-target','1.8','-d',str(CACHE/'surface.jar'),*map(str,files)],check=True)
result=subprocess.run(['java','-cp',str(CACHE/'surface.jar')+os.pathsep+cp,'androidx.compose.material3.SurfaceKt'],capture_output=True,text=True,check=True)
data=json.loads(result.stdout)
directory=CACHE if '--research-only' in sys.argv else ROOT/'test/fixtures/androidx/button'
payload=(json.dumps(data,separators=(',',':'))+'\n').encode()
(directory/'surface-composition-oracle.json.gz').write_bytes(gzip.compress(payload,mtime=0))
print('Generated',len(data),'original clickable/toggle Surface composition/draw-order records.')
