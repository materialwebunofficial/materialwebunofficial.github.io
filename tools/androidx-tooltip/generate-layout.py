"""Execute original plain/rich tooltip bodies with original foundation measurement.

Composition emission, drawing values, density1 and measured font/control leaves
are explicit hosts. This does not run the Compose compiler or Android UI.
"""
from pathlib import Path
import gzip, hashlib, json, os, re, subprocess, sys
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
FIX=ROOT/'test/fixtures/androidx/tooltip'
CACHE=ROOT/'research/tooltip-layout-generator'
BASE=ROOT/'research/toolbar-alignment-generator/oracle.jar'
RUNTIME=ROOT/'research/kotlin-runtime'
CACHE.mkdir(exist_ok=True)
for directory in [FIX,ROOT/'test/fixtures/androidx/toolbar-row',ROOT/'test/fixtures/androidx/toolbar-alignment',ROOT/'test/fixtures/androidx/snackbar']:
    for entry in json.loads((directory/'sources.json').read_text())['sources']:
        assert hashlib.sha256((directory/entry['file']).read_bytes()).hexdigest()==entry['sha256'],entry['file']
if not BASE.exists():
    raise RuntimeError('Prepare tools/androidx-toolbar-alignment/generate.py first')
def block(text,marker):
    start=text.index(marker);opening=text.index('{',start);end=opening+1;depth=1
    while depth:
        depth+=(text[end]=='{')-(text[end]=='}');end+=1
    return text[start:end]
source=(FIX/'Tooltip.kt').read_text(encoding='utf-8')
parts=[block(source,'public fun TooltipScope.'+name+'(') for name in ['PlainTooltip','RichTooltip']]
parts.append(block(source,'internal fun Modifier.textVerticalPadding('))
parts.append(source[source.index('internal val SpacingBetweenTooltipAndAnchor'):])
# Modifier type relocation only. The source function bodies stay unchanged.
parts=[re.sub(r'\bModifier\b','TooltipModifier',part) for part in parts]
defaults='\n'.join(re.search(r'public val '+name+r': Dp = [^\n]+',source)[0] for name in ['plainTooltipMaxWidth','richTooltipMaxWidth'])
header='''package androidx.compose.material3
typealias Color=Int
object TooltipDefaults{
 val plainTooltipContainerShape:Shape=DefaultShape
 val plainTooltipContentColor=0
 val plainTooltipContainerColor=0
 val richTooltipContainerShape:Shape=DefaultShape
 fun richTooltipColors()=RichTooltipColors()
'''+defaults+'\n}\n'
(CACHE/'TooltipBodies.kt').write_text(header+'\n'.join(parts))
box=(FIX/'Box.kt').read_text()
box_header='''package androidx.compose.material3
import kotlin.math.max
interface BoxHostPolicy{fun MeasureScope.measure(measurables:List<Measurable>,constraints:Constraints):MeasureResult}
class BoxData(val alignment:Alignment?)
val Measurable.boxChildDataNode:BoxData? get()=null
val Measurable.matchesParentSize get()=false
inline fun <T> List<T>.fastForEachIndexed(block:(Int,T)->Unit)=forEachIndexed(block)
fun Placeable.place(position:IntOffset)=placeAt(position+apparentToRealOffset,0f,null)
'''
(CACHE/'Box.kt').write_text(box_header+block(box,'private data class BoxMeasurePolicy(').replace('private data class','internal data class',1).replace(': MeasurePolicy',': BoxHostPolicy',1)+'\n'+block(box,'private fun Placeable.PlacementScope.placeInBox('))
align=(ROOT/'test/fixtures/androidx/snackbar/AlignmentLine.kt').read_text()
padding=align[align.index('private fun MeasureScope.alignmentLineOffsetMeasure('):]
(CACHE/'Baseline.kt').write_text('package androidx.compose.material3\nimport kotlin.math.max\nimport kotlin.math.min\n'+padding+'\nfun tooltipNativeBaseline(c:Constraints,leaf:Measurable,line:AlignmentLine,before:Dp,after:Dp)=with(Scope){alignmentLineOffsetMeasure(line,before,after,leaf,c)}\n')
bridge=(ROOT/'tools/androidx-toolbar-alignment/Bridge.kt').read_text()
original=ROOT/'test/fixtures/androidx/toolbar-alignment'
bridge=bridge.replace('// SOURCE_COORDINATOR_GET',block((original/'LookaheadDelegate.kt').read_text(),'final override fun get(alignmentLine: AlignmentLine): Int'))
bridge=bridge.replace('// SOURCE_PARENT_POSITION',block((original/'NodeCoordinator.kt').read_text(),'open fun toParentPosition('))
bridge=bridge.replace('val outer:NodeCoordinator=innerCoordinator','var outer:NodeCoordinator=innerCoordinator')
bridge+='\n'+block((original/'LayoutModifierNodeCoordinator.kt').read_text(),'private fun LookaheadCapablePlaceable.calculateAlignmentAndPlaceChildAsNeeded(')
(CACHE/'Bridge.kt').write_text(bridge)
# The nonclickable Surface uses a Box with min constraints propagated.
surface=(FIX/'Surface.kt').read_text()
assert 'propagateMinConstraints = true' in block(surface,'fun Surface(')
cp=os.pathsep.join([str(BASE),str(RUNTIME/'stdlib.jar')])
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-Xfriend-paths='+str(BASE),'-jvm-target','1.8','-d',str(CACHE/'layout.jar'),*map(str,[CACHE/'TooltipBodies.kt',CACHE/'Box.kt',CACHE/'Baseline.kt',CACHE/'Bridge.kt',HERE/'TooltipLayout.kt'])],check=True)
result=subprocess.run(['java','-cp',str(CACHE/'layout.jar')+os.pathsep+cp,'androidx.compose.material3.TooltipLayoutKt'],capture_output=True,text=True,check=True)
cases=json.loads(result.stdout)
(FIX/'layout-oracle.json.gz').write_bytes(gzip.compress((json.dumps(cases,separators=(',',':'))+'\n').encode(),mtime=0))
print('Generated',len(cases),'original plain/rich tooltip composition/measurement trees.')
if '--browser' in sys.argv:
    inputs=json.loads((ROOT/'research/tooltip-browser-layout-inputs.json').read_text())
    rows=[]
    for case in inputs:
        data=case['input']
        sections=[','.join(map(str,[int(data['rich']),int(data['rtl']),data['constraints']['maxWidth'],data['constraints']['maxHeight'],data['maxWidth']]))]
        measured={entry['id']:entry['constraints'] for entry in case['measurements']}
        for name,key in [('title','title'),('body','text'),('action','action')]:
            leaves=data[key]
            if leaves is None:
                sections.append('-');continue
            values=[]
            for index,leaf in enumerate(leaves):
                c=measured[f'{name}-{index}']
                values.append(','.join(map(str,[leaf['width'],leaf['height'],leaf.get('first',-2147483648),leaf.get('last',-2147483648),int(leaf.get('required',False)),c['minWidth'],c['maxWidth'],c['minHeight'],c['maxHeight']])))
            sections.append(';'.join(values))
        rows.append('|'.join(sections))
    (CACHE/'browser.csv').write_text('\n'.join(rows)+'\n')
    result=subprocess.run(['java','-cp',str(CACHE/'layout.jar')+os.pathsep+cp,'androidx.compose.material3.TooltipLayoutKt',str(CACHE/'browser.csv')],capture_output=True,text=True)
    if result.returncode:
        print(result.stderr);result.check_returncode()
    expected=json.loads(result.stdout)
    for case,native in zip(inputs,expected):
        case.pop('rendered',None);case['expected']=native
    (FIX/'browser-layout-oracle.json').write_text(json.dumps(inputs,indent=2)+'\n')
    print('Generated',len(inputs),'browser references, checking original child constraints and placements with explicit Chromium font/control leaves.')
