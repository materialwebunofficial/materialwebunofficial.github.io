"""Execute unchanged AppBar state/scroll/settle bodies in an explicit frame host.

The adapter supplies only runtime state storage, vectors, specs and frames.
No native decisions are restated in Kotlin or derived from the JS port.
"""
from pathlib import Path
import gzip, hashlib, json, os, subprocess

ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
FIX=ROOT/'test/fixtures/androidx/app-bars'
CACHE=ROOT/'research/top-app-bar-scroll-generator'
RUNTIME=ROOT/'research/kotlin-runtime'
BASE=ROOT/'research/toolbar-scroll-generator/oracle.jar'
TOP=ROOT/'research/top-app-bar-generator/oracle.jar'
ROW=ROOT/'research/toolbar-row-generator/oracle.jar'
CACHE.mkdir(exist_ok=True)
for directory in [FIX, ROOT/'test/fixtures/androidx/toolbar-scroll', ROOT/'test/fixtures/androidx/toolbar-row']:
    for entry in json.loads((directory/'sources.json').read_text(encoding='utf-8'))['sources']:
        assert hashlib.sha256((directory/entry['file']).read_bytes()).hexdigest()==entry['sha256'],entry['file']
for name,entry in json.loads((ROOT/'tools/androidx-motion/sources.json').read_text(encoding='utf-8')).items():
    assert hashlib.sha256((ROOT/'test/fixtures/androidx/motion'/name).read_bytes()).hexdigest()==entry['sha256'],name
if not all(path.exists() for path in [BASE,TOP,ROW]):
    raise RuntimeError('Prepare the toolbar-scroll and top-layout native generators first')

def block(text,prefix):
    start=text.index(prefix); cursor=text.index('(',start)+1; parens=1
    while parens:
        parens+=(text[cursor]=='(')-(text[cursor]==')');cursor+=1
    at=text.index('{',cursor); depth=1; end=at+1
    while depth:
        depth+=(text[end]=='{')-(text[end]=='}');end+=1
    return text[start:end]

source=(FIX/'AppBar.kt').read_text(encoding='utf-8')
prefixes=['public class TopAppBarState(', 'private class PinnedScrollBehavior(',
          'private class EnterAlwaysScrollBehavior(', 'private class LegacyEnterAlwaysScrollBehavior(',
          'private class ExitUntilCollapsedScrollBehavior(', 'private suspend fun settleAppBar(']
bodies=[block(source,p).replace('private class','class',1).replace('private suspend fun','suspend fun',1) for p in prefixes]
(CACHE/'TopScrollPolicy.kt').write_text('package topappbaroracle\nimport kotlin.math.*\n'+ '\n'.join(bodies)+'\n',encoding='utf-8')
adapter=(ROOT/'tools/androidx-toolbar-scroll/Adapter.kt').read_text(encoding='utf-8')
adapter=adapter.replace('package androidx.compose.material3','package topappbaroracle',1)
adapter=adapter.replace('interface NestedScrollConnection {','interface NestedScrollConnection {\n fun onPreScroll(available:Offset,source:NestedScrollSource)=Offset.Zero')
adapter=adapter.replace('var watched:FloatingToolbarState?=null','var watched:TopAppBarState?=null')
adapter=adapter.replace('watched!!.offsetLimit','watched!!.heightOffsetLimit').replace('watched!!.offset','watched!!.heightOffset')
adapter=adapter.replace('scope.block();record(', 'scope.block();frameMeasure?.invoke();record(')
adapter=adapter.replace('"offset\\\":${watched!!.heightOffset},', '"offset\\\":${watched!!.heightOffset},\\\"limit\\\":${watched!!.heightOffsetLimit},\\\"layout\\\":${measuredRowJSON},')
adapter+='''
var frameMeasure:(()->Unit)?=null
var measuredRowHeight=0
var measuredRowJSON="null"
interface TopAppBarScrollBehavior {
 val state:TopAppBarState; val isPinned:Boolean
 val snapAnimationSpec:AnimationSpec<Float>?; val flingAnimationSpec:DecayAnimationSpec<Float>?
 val nestedScrollConnection:NestedScrollConnection
}
class Saver<T,U>
fun <T> listSaver(save:(T)->List<Float>,restore:(List<Float>)->T)=Saver<T,List<Float>>()
'''
(CACHE/'TopScrollAdapter.kt').write_text(adapter,encoding='utf-8')
# Compile the unchanged Android spline directly from hashed originals, rather
# than trusting an editable generated Kotlin file from a previous preparation.
spline_dir=ROOT/'test/fixtures/androidx/toolbar-scroll'
spline=(spline_dir/'SplineBasedDecay.kt').read_text(encoding='utf-8')
spline=spline[spline.index('private const val Inflection'):spline.index('public fun <T> splineBasedDecay')]
calculator=(spline_dir/'FlingCalculator.kt').read_text(encoding='utf-8')
calculator=calculator[calculator.index('private const val GravityEarth'):]
spec=(spline_dir/'SplineBasedFloatDecayAnimationSpec.kt').read_text(encoding='utf-8')
spec=block(spec,'public class SplineBasedFloatDecayAnimationSpec')
(CACHE/'TopSpline.kt').write_text('package topappbaroracle\nimport kotlin.math.*\n'+spline+calculator+spec+'\n',encoding='utf-8')
cp=os.pathsep.join(map(str,[RUNTIME/'stdlib.jar',TOP,ROW,BASE,ROOT/'research/motion-generator/oracle.jar']))
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-Xfriend-paths='+str(TOP),'-jvm-target','1.8','-d',str(CACHE/'oracle.jar'),str(CACHE/'TopScrollPolicy.kt'),str(CACHE/'TopScrollAdapter.kt'),str(CACHE/'TopSpline.kt'),str(HERE/'TopScroll.kt'),str(HERE/'TopScrollMeasure.kt')],check=True)
for mode in ['state','nested','settle','reduced','mutation','coupled']:
    result=subprocess.run(['java','-cp',str(CACHE/'oracle.jar')+os.pathsep+cp,'topappbaroracle.TopScrollKt',mode],capture_output=True,text=True,check=True)
    cases=json.loads(result.stdout)
    with (FIX/('top-scroll-'+mode+'-oracle.json.gz')).open('wb') as output:
        with gzip.GzipFile(filename='',mode='wb',fileobj=output,mtime=0) as compressed:
            compressed.write((json.dumps(cases,separators=(',',':'))+'\n').encode())
    print(mode,len(cases))
