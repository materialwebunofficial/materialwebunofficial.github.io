"""Execute unchanged TopAppBarMeasurePolicy against explicit measured slot hosts."""
from pathlib import Path
import gzip, hashlib, json, os, subprocess

ROOT=Path(__file__).resolve().parents[2]
FIX=ROOT/'test/fixtures/androidx/app-bars'
CACHE=ROOT/'research/top-app-bar-generator'
BASE=ROOT/'research/toolbar-row-generator/oracle.jar'
EASING=ROOT/'research/drawer-generator/oracle.jar'
RUNTIME=ROOT/'research/kotlin-runtime'
CACHE.mkdir(exist_ok=True)
for directory in [FIX, ROOT/'test/fixtures/androidx/toolbar-row', ROOT/'test/fixtures/androidx/navigation-drawer']:
    manifest=json.loads((directory/'sources.json').read_text())
    entries=manifest['sources'] if 'sources' in manifest else [dict(file=name,**e) for name,e in manifest['files'].items()]
    for e in entries:
        assert hashlib.sha256((directory/e['file']).read_bytes()).hexdigest()==e['sha256'],e['file']
if not BASE.exists():
    raise RuntimeError('Prepare the native modifier host with tools/androidx-toolbar-row/generate.py --icon-expressive-only')
source=(FIX/'AppBar.kt').read_text(encoding='utf-8')
start=source.index('private class TopAppBarMeasurePolicy(')
opening=source.index('{',start);depth=1;end=opening+1
while depth:
    depth+=(source[end]=='{')-(source[end]=='}');end+=1
policy=source[start:end].replace('private class TopAppBarMeasurePolicy','internal class TopAppBarMeasurePolicy',1)
host='''package androidx.compose.material3
import kotlin.math.max
import kotlin.math.roundToInt
typealias FloatProducer=()->Float
object LastBaseline:AlignmentLine()
operator fun Dp.minus(other:Dp)=Dp(value-other.value)
private val TopAppBarHorizontalPadding get()=4.dp
private val TopAppBarTitleInset=16.dp-TopAppBarHorizontalPadding
inline fun <T> List<T>.fastFirst(predicate:(T)->Boolean)=first(predicate)
inline fun <T> List<T>.fastSumBy(selector:(T)->Int)=sumOf(selector)
inline fun <T> List<T>.fastMaxOfOrNull(selector:(T)->Int)=maxOfOrNull(selector)
fun PaddingValues.calculateStartPadding(d:LayoutDirection)=if(d==LayoutDirection.Rtl)calculateRightPadding(d)else calculateLeftPadding(d)
fun PaddingValues.calculateEndPadding(d:LayoutDirection)=if(d==LayoutDirection.Rtl)calculateLeftPadding(d)else calculateRightPadding(d)
val Measurable.layoutId get()=when(this){is Slot->id;is Named->id;else->error("Unnamed slot")}
class Pads(val sides:List<Float>):PaddingValues{
 override fun calculateLeftPadding(d:LayoutDirection)=Dp(if(d==LayoutDirection.Rtl)sides[2]else sides[0])
 override fun calculateRightPadding(d:LayoutDirection)=Dp(if(d==LayoutDirection.Rtl)sides[0]else sides[2])
 override fun calculateTopPadding()=Dp(sides[1])
 override fun calculateBottomPadding()=Dp(sides[3])
}
class Slot(val id:String,val width:Int,val height:Int,val baseline:Int?):Measurable{
 override fun measure(c:Constraints)=Placeable(id,Scope.layout(c.constrainWidth(width),c.constrainHeight(height)){},c).also{if(baseline!=null)it.lines[LastBaseline]=baseline}
 override fun minIntrinsicWidth(h:Int)=width
 override fun maxIntrinsicWidth(h:Int)=width
 override fun minIntrinsicHeight(w:Int)=height
 override fun maxIntrinsicHeight(w:Int)=height
}
'''
(CACHE/'TopPolicy.kt').write_text(host+policy,encoding='utf-8')
alpha=next(line for line in source.splitlines() if line.startswith('internal val TopTitleAlphaEasing'))
(CACHE/'Alpha.kt').write_text('package androidx.compose.material3\nimport androidx.compose.animation.core.CubicBezierEasing\n'+alpha+'\n')
def block(text,marker):
    start=text.index(marker);opening=text.index('{',start);depth=1;end=opening+1
    while depth:
        depth+=(text[end]=='{')-(text[end]=='}');end+=1
    return text[start:end]
box_source=(FIX/'Box.kt').read_text(encoding='utf-8')
box_policy=block(box_source,'private data class BoxMeasurePolicy(').replace('private data class','internal data class',1).replace(': MeasurePolicy',': BoxHostPolicy',1)
box_host='''package androidx.compose.material3
import kotlin.math.max
interface BoxHostPolicy{fun MeasureScope.measure(measurables:List<Measurable>,constraints:Constraints):MeasureResult}
class BoxData(val alignment:Alignment?)
val Measurable.boxChildDataNode:BoxData? get()=null
val Measurable.matchesParentSize get()=false
inline fun <T> List<T>.fastForEachIndexed(block:(Int,T)->Unit)=forEachIndexed(block)
// Resolve the IntOffset overload through the original Placeable coercion host.
fun Placeable.place(position:IntOffset)=placeAt(position+apparentToRealOffset,0f,null)
'''
(CACHE/'Box.kt').write_text(box_host+box_policy+'\n'+block(box_source,'private fun Placeable.PlacementScope.placeInBox('))
cp=os.pathsep.join([str(BASE),str(EASING),str(RUNTIME/'stdlib.jar')])
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-Xfriend-paths='+str(BASE),'-classpath',cp,'-jvm-target','1.8','-d',str(CACHE/'oracle.jar'),str(CACHE/'TopPolicy.kt'),str(CACHE/'Alpha.kt'),str(CACHE/'Box.kt'),str(ROOT/'tools/androidx-app-bars/TopHarness.kt'),str(ROOT/'tools/androidx-app-bars/TopMotion.kt'),str(ROOT/'tools/androidx-app-bars/TopTree.kt')],check=True)
result=subprocess.run(['java','-cp',os.pathsep.join([str(CACHE/'oracle.jar'),cp]),'androidx.compose.material3.TopHarnessKt'],check=True,capture_output=True,text=True)
cases=json.loads(result.stdout)
(FIX/'top-layout-oracle.json.gz').write_bytes(gzip.compress((json.dumps(cases,separators=(',',':'))+'\n').encode(),mtime=0))
print('Generated',len(cases),'unchanged TopAppBarMeasurePolicy cases.')
result=subprocess.run(['java','-cp',os.pathsep.join([str(CACHE/'oracle.jar'),cp]),'androidx.compose.material3.TopMotionKt'],check=True,capture_output=True,text=True)
cases=json.loads(result.stdout)
(FIX/'top-motion-oracle.json').write_text(json.dumps(cases,separators=(',',':'))+'\n')
print('Generated',len(cases),'unchanged cubic-easing cases.')
result=subprocess.run(['java','-cp',os.pathsep.join([str(CACHE/'oracle.jar'),cp]),'androidx.compose.material3.TopTreeKt'],check=True,capture_output=True,text=True)
cases=json.loads(result.stdout)
(FIX/'top-tree-oracle.json.gz').write_bytes(gzip.compress((json.dumps(cases,separators=(',',':'))+'\n').encode(),mtime=0))
print('Generated',len(cases),'source Box/Column/Row/padding/minimum-size tree cases (baseline host unspecified).')
