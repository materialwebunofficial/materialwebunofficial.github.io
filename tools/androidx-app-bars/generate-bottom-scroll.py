"""Execute unchanged BottomAppBarState/ExitAlways/settle/outer measure bodies.

Storage, specs, explicit frame clock and default composition are host inputs.
No native decisions are computed from the JS implementation.
"""
from pathlib import Path
import gzip,hashlib,json,os,subprocess
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
FIX=ROOT/'test/fixtures/androidx/app-bars';ROWFIX=ROOT/'test/fixtures/androidx/toolbar-row'
CACHE=ROOT/'research/bottom-app-bar-scroll-generator';CACHE.mkdir(exist_ok=True)
RUNTIME=ROOT/'research/kotlin-runtime';BASE=ROOT/'research/toolbar-scroll-generator/oracle.jar'
TOP=ROOT/'research/top-app-bar-generator/oracle.jar';ROW=ROOT/'research/toolbar-row-generator/oracle.jar'
for directory in [FIX,ROWFIX,ROOT/'test/fixtures/androidx/toolbar-scroll']:
 for entry in json.loads((directory/'sources.json').read_text(encoding='utf-8'))['sources']:
  assert hashlib.sha256((directory/entry['file']).read_bytes()).hexdigest()==entry['sha256'],entry['file']
for name,entry in json.loads((ROOT/'tools/androidx-motion/sources.json').read_text(encoding='utf-8')).items():
 assert hashlib.sha256((ROOT/'test/fixtures/androidx/motion'/name).read_bytes()).hexdigest()==entry['sha256'],name
token_files=[]
for entry in json.loads((ROOT/'test/fixtures/androidx/fab/sources.json').read_text(encoding='utf-8'))['sources']:
 if entry['file'] in ['ExpressiveMotionTokens.kt','StandardMotionTokens.kt']:
  path=ROOT/'test/fixtures/androidx/fab'/entry['file'];assert hashlib.sha256(path.read_bytes()).hexdigest()==entry['sha256'],entry['file'];token_files.append(str(path))
assert len(token_files)==2
if not all(p.exists() for p in [BASE,TOP,ROW]):raise RuntimeError('Prepare toolbar-scroll and top-layout native hosts first')
def block(text,prefix):
 start=text.index(prefix);cursor=text.index('(',start)+1;parens=1
 while parens:parens+=(text[cursor]=='(')-(text[cursor]==')');cursor+=1
 at=text.index('{',cursor);depth=1;end=at+1
 while depth:depth+=(text[end]=='{')-(text[end]=='}');end+=1
 return text[start:end]
source=(FIX/'AppBar.kt').read_text(encoding='utf-8')
bottom=block(source,'private suspend fun settleAppBarBottom(')
top=block(source,'private suspend fun settleAppBar(')
assert bottom.replace('settleAppBarBottom(','settleAppBar(').replace('BottomAppBarState','TopAppBarState')==top,'Source settling bodies differ; sharing their JS frame engine is not justified'
bodies=[block(source,p).replace('private class','class',1).replace('private suspend fun','suspend fun',1) for p in ['private class BottomAppBarStateImpl(','private class ExitAlwaysScrollBehavior(','private suspend fun settleAppBarBottom(']]
(CACHE/'BottomScrollPolicy.kt').write_text('package bottomappbaroracle\nimport kotlin.math.*\n'+'\n'.join(bodies)+'\n',encoding='utf-8')
adapter=(ROOT/'tools/androidx-toolbar-scroll/Adapter.kt').read_text(encoding='utf-8').replace('package androidx.compose.material3','package bottomappbaroracle',1)
adapter=adapter.replace('interface NestedScrollConnection {','interface NestedScrollConnection {\n fun onPreScroll(available:Offset,source:NestedScrollSource)=Offset.Zero')
adapter=adapter.replace('var watched:FloatingToolbarState?=null','var watched:BottomAppBarState?=null').replace('watched!!.offsetLimit','watched!!.heightOffsetLimit').replace('watched!!.offset','watched!!.heightOffset')
adapter=adapter.replace('scope.block();record(', 'scope.block();frameMeasure?.invoke();record(')
adapter=adapter.replace('"offset\\\":${watched!!.heightOffset},','"offset\\\":${watched!!.heightOffset},\\\"limit\\\":${watched!!.heightOffsetLimit},\\\"layout\\\":${measuredJSON},')
adapter+='''
var frameMeasure:(()->Unit)?=null
var measuredJSON="null"
interface BottomAppBarState{var heightOffsetLimit:Float;var heightOffset:Float;var contentOffset:Float;val collapsedFraction:Float}
interface BottomAppBarScrollBehavior{val state:BottomAppBarState;val isPinned:Boolean;val snapAnimationSpec:AnimationSpec<Float>?;val flingAnimationSpec:DecayAnimationSpec<Float>?;var nestedScrollConnection:NestedScrollConnection}
'''
(CACHE/'BottomScrollAdapter.kt').write_text(adapter,encoding='utf-8')
spline_dir=ROOT/'test/fixtures/androidx/toolbar-scroll';spline=(spline_dir/'SplineBasedDecay.kt').read_text(encoding='utf-8');spline=spline[spline.index('private const val Inflection'):spline.index('public fun <T> splineBasedDecay')]
calculator=(spline_dir/'FlingCalculator.kt').read_text(encoding='utf-8');calculator=calculator[calculator.index('private const val GravityEarth'):]
spec=block((spline_dir/'SplineBasedFloatDecayAnimationSpec.kt').read_text(encoding='utf-8'),'public class SplineBasedFloatDecayAnimationSpec')
(CACHE/'BottomSpline.kt').write_text('package bottomappbaroracle\nimport kotlin.math.*\n'+spline+calculator+spec+'\n',encoding='utf-8')
size=(ROWFIX/'Size.kt').read_text(encoding='utf-8');fill=block(size,'private class FillNode(').replace('private class','internal class',1)
fill_host='package androidx.compose.material3\ninterface ParentDataModifierNode {fun Density.modifyParentData(parentData:Any?):Any?}\nfun Int.fastCoerceIn(minimum:Int,maximum:Int)=coerceIn(minimum,maximum)\n'
(CACHE/'BottomFill.kt').write_text(fill_host+size[size.index('internal enum class Direction {'):]+'\n'+fill+'\n',encoding='utf-8')
# Extract the complete original outer modifier's measurement/placement lambda.
start=source.index('.layout { measurable, constraints ->',source.index('private fun BottomAppBarLayout('));at=source.index('{',start);depth=1;end=at+1
while depth:depth+=(source[end]=='{')-(source[end]=='}');end+=1
body=source[at+1:end-1].split('->',1)[1].replace('layout(placeable.width, height.roundToInt())','return layout(placeable.width, height.roundToInt())')
(CACHE/'BottomOuterMeasure.kt').write_text('package bottomappbaroracle\nimport kotlin.math.*\nimport androidx.compose.material3.MeasureScope\nimport androidx.compose.material3.MeasureResult\nfun MeasureScope.bottomSourceMeasure(measurable:androidx.compose.material3.Measurable,constraints:androidx.compose.material3.Constraints,activeScrollBehavior:BottomAppBarScrollBehavior?):MeasureResult {\n'+body+'\n}\n',encoding='utf-8')
cp=os.pathsep.join(map(str,[RUNTIME/'stdlib.jar',TOP,ROW,BASE,ROOT/'research/motion-generator/oracle.jar']))
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-Xfriend-paths='+','.join(map(str,[TOP,ROW])),'-jvm-target','1.8','-d',str(CACHE/'oracle.jar'),*[str(CACHE/name) for name in ['BottomScrollPolicy.kt','BottomScrollAdapter.kt','BottomSpline.kt','BottomFill.kt','BottomOuterMeasure.kt']],str(HERE/'BottomTree.kt'),str(HERE/'BottomScroll.kt'),*token_files],check=True)
for mode in ['state','nested','settle','reduced','mutation','coupled']:
 result=subprocess.run(['java','-cp',str(CACHE/'oracle.jar')+os.pathsep+cp,'bottomappbaroracle.BottomScrollKt',mode],capture_output=True,text=True,check=True)
 cases=json.loads(result.stdout)
 with (FIX/('bottom-scroll-'+mode+'-oracle.json.gz')).open('wb') as output:
  with gzip.GzipFile(filename='',mode='wb',fileobj=output,mtime=0) as compressed:compressed.write((json.dumps(cases,separators=(',',':'))+'\n').encode())
 print(mode,len(cases))
