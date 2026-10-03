"""Execute the source alignment-line machinery around the shared source Row tree."""
from pathlib import Path
import gzip, hashlib, json, os, runpy, subprocess

ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
FIX=ROOT/'test/fixtures/androidx/toolbar-alignment'
CACHE=ROOT/'research/toolbar-alignment-generator'
RUNTIME=ROOT/'research/kotlin-runtime'
CACHE.mkdir(exist_ok=True)
for e in json.loads((FIX/'sources.json').read_text())['sources']:
    assert hashlib.sha256((FIX/e['file']).read_bytes()).hexdigest()==e['sha256'],e['file']
# The shared generator independently projects and verifies its thirteen originals.
shared=runpy.run_path(str(ROOT/'tools/androidx-toolbar-row/generate.py'))
block=shared['block'];base=ROOT/'research/toolbar-row-generator'
header=shared['header']
parts=[]
source=(FIX/'AlignmentLine.kt').read_text()
parts.append(source[source.index('@Immutable\npublic sealed class AlignmentLine'):])
source=(FIX/'LayoutNodeAlignmentLines.kt').read_text()
parts.append(source[source.index('internal sealed class AlignmentLines('):source.index('/** AlignmentLines impl that are specific to lookahead pass.')].replace('internal sealed class AlignmentLines','sealed class AlignmentLines',1).replace('internal class LayoutNodeAlignmentLines','class LayoutNodeAlignmentLines',1))
source=(FIX/'LayoutModifierNodeCoordinator.kt').read_text()
modifier_line=block(source,source.index('private fun LookaheadCapablePlaceable.calculateAlignmentAndPlaceChildAsNeeded('))
(CACHE/'Lines.kt').write_text(header+'\n'.join(parts))
bridge=(HERE/'Bridge.kt').read_text()
source=(FIX/'LookaheadDelegate.kt').read_text()
bridge=bridge.replace('// SOURCE_COORDINATOR_GET',block(source,source.index('final override fun get(alignmentLine: AlignmentLine): Int')))
source=(FIX/'NodeCoordinator.kt').read_text()
bridge=bridge.replace('// SOURCE_PARENT_POSITION',block(source,source.index('open fun toParentPosition(')))
(CACHE/'Bridge.kt').write_text(bridge+'\n'+modifier_line+'\n')
tree=(base/'Tree.kt').read_text().replace('class Placeable(', 'open class Placeable(')
tree=tree.replace('import kotlin.math.roundToInt','import kotlin.math.roundToInt\nimport kotlin.contracts.*')
tree=tree.replace('inline fun checkPrecondition(value:Boolean,message:()->String){check(value,message)}','@OptIn(ExperimentalContracts::class)\ninline fun checkPrecondition(value:Boolean,message:()->String){contract{returns() implies value};check(value,message)}')
tree=tree.replace('operator fun get(line:', 'open operator fun get(line:')
tree=tree.replace('fun placeAt(position:', 'open fun placeAt(position:')
(CACHE/'Tree.kt').write_text(tree)
adapter=(ROOT/'tools/androidx-toolbar-row/Adapter.kt').read_text()
start=adapter.index('open class AlignmentLine');end=adapter.index('interface CompositionLocalConsumerModifierNode')
adapter=adapter[:start]+'val Baseline=HorizontalAlignmentLine(::minOf)\nval MinimumInteractiveTopAlignmentLine=HorizontalAlignmentLine(::minOf)\nval MinimumInteractiveLeftAlignmentLine=VerticalAlignmentLine(::minOf)\n'+adapter[end:]
(CACHE/'Adapter.kt').write_text(adapter)
cp=str(RUNTIME/'stdlib.jar')
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-jvm-target','1.8','-d',str(CACHE/'oracle.jar'),*map(str,[base/'Policy.kt',base/'Constraints.kt',CACHE/'Tree.kt',CACHE/'Adapter.kt',CACHE/'Lines.kt',CACHE/'Bridge.kt',HERE/'Harness.kt'])],check=True)
r=subprocess.run(['java','-cp',str(CACHE/'oracle.jar')+os.pathsep+cp,'androidx.compose.material3.HarnessKt'],capture_output=True,text=True,check=True)
cases=json.loads(r.stdout)
(FIX/'alignment-oracle.json.gz').write_bytes(gzip.compress((json.dumps(cases,separators=(',',':'))+'\n').encode(),mtime=0))
print('Generated',len(cases),'unchanged Kotlin automatic alignment toolbar cases.')
