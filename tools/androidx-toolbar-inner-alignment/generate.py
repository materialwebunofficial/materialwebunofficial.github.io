"""Execute omitted composable defaults and explicit Scope.align around the native tree."""
from pathlib import Path
import gzip, hashlib, json, os, runpy, subprocess

ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
FIX=ROOT/'test/fixtures/androidx/toolbar-inner-alignment'
CACHE=ROOT/'research/toolbar-inner-alignment-generator'
RUNTIME=ROOT/'research/kotlin-runtime'
CACHE.mkdir(parents=True,exist_ok=True)
for e in json.loads((FIX/'sources.json').read_text(encoding='utf-8'))['sources']:
    assert hashlib.sha256((FIX/e['file']).read_bytes()).hexdigest()==e['sha256'],e['file']
shared=runpy.run_path(str(ROOT/'tools/androidx-toolbar-alignment/generate.py'))
base=ROOT/'research/toolbar-row-generator'
aligned=ROOT/'research/toolbar-alignment-generator'
parts=[]
for axis,fields in [('Row',['horizontalArrangement','verticalAlignment']),('Column',['verticalArrangement','horizontalAlignment'])]:
    source=(FIX/(axis+'.kt')).read_text(encoding='utf-8')
    lower=axis.lower()
    default=source[source.index('internal val Default'+axis+'MeasurePolicy'):source.index('internal fun '+lower+'MeasurePolicy(')]
    factory=source[source.index('internal fun '+lower+'MeasurePolicy('):source.index('internal data class '+axis+'MeasurePolicy(')]
    parts.append(default.replace('@PublishedApi','').replace('@Composable',''))
    parts.append(factory)
    signature=source.split('public inline fun '+axis+'(',1)[1].split('content:',1)[0]
    parameters=[line.strip() for line in signature.splitlines() if any(line.strip().startswith(field+':') for field in fields)]
    assert len(parameters)==2
    parts.append('fun source'+axis+'Policy(\n'+'\n'.join(parameters)+'\n):MeasurePolicy = '+lower+'MeasurePolicy('+','.join(fields)+')\n')
parts.append('fun <T> remember(vararg keys:Any,calculation:()->T):T=calculation()\n')
(CACHE/'Policy.kt').write_text((base/'Policy.kt').read_text(encoding='utf-8')+'\n'+'\n'.join(parts),encoding='utf-8')
toolbar=(FIX/'FloatingToolbar.kt').read_text(encoding='utf-8')
horizontal=toolbar.split('private fun HorizontalFloatingToolbarLayout(',1)[1].split('private fun HorizontalFloatingToolbarWithFabLayout(',1)[0]
vertical=toolbar.split('private fun VerticalFloatingToolbarLayout(',1)[1].split('private fun VerticalFloatingToolbarWithFabLayout(',1)[0]
assert 'verticalAlignment = Alignment.CenterVertically' in horizontal and horizontal.count('Row(content = it)')==2
assert 'horizontalAlignment = Alignment.CenterHorizontally' in vertical and vertical.count('Column(content = it)')==2
assert 'content = content' in horizontal and 'content = content' in vertical
bridge=(aligned/'Bridge.kt').read_text(encoding='utf-8').replace('val align:String="center"','val align:String="default"')
bridge=bridge.replace('val native:Boolean=true){','val native:Boolean=true,val line:Int?=null){')
bridge=bridge.replace('weight,fill,align=align)','weight,fill,line=line,align=align)')
bridge=bridge.replace('input.weight,input.fill,align=input.align)','input.weight,input.fill,line=input.line,align=input.align)')
bridge=bridge.replace('\\\"native\\\":$native}', '\\\"native\\\":$native,\\\"line\\\":${line?:"null"}}')
old='if(vertical)ColumnMeasurePolicy(Arrangement.Top,Alignment.CenterHorizontally)else RowMeasurePolicy(Arrangement.Start,Alignment.CenterVertically)'
assert old in bridge
bridge=bridge.replace(old,'if(vertical)sourceColumnPolicy()else sourceRowPolicy()')
(CACHE/'Bridge.kt').write_text(bridge,encoding='utf-8')
adapter=(aligned/'Adapter.kt').read_text(encoding='utf-8')
adapter=adapter.replace('"line"->CrossAxisAlignment.AlignmentLine(Baseline)','"line"->CrossAxisAlignment.AlignmentLine(Baseline)\n "center"->if(vertical)CrossAxisAlignment.horizontal(Alignment.CenterHorizontally)else CrossAxisAlignment.vertical(Alignment.CenterVertically)')
adapter=adapter.replace('target:(EnterExitState)->T)=Value(value)','target:(EnterExitState)->T)=Value(if(value is IntSize&&VisibilityHost.natural)target(EnterExitState.Visible)else value)')
adapter=adapter.replace('var vertical=false;var transition=','var natural=false;var vertical=false;var transition=')
adapter=adapter.replace('val alignment:String,val settled:Boolean):Measurable','val alignment:String,val settled:Boolean,val cross:Int=48):Measurable')
adapter=adapter.replace('VisibilityHost.vertical=vertical;','VisibilityHost.natural=sample<0;VisibilityHost.vertical=vertical;')
adapter=adapter.replace('IntSize(constraints.maxWidth.coerceAtMost(48),sample)else IntSize(sample,constraints.maxHeight.coerceAtMost(48))','IntSize(cross,sample.coerceAtLeast(0))else IntSize(sample.coerceAtLeast(0),cross)')
(CACHE/'Adapter.kt').write_text(adapter,encoding='utf-8')
cp=str(RUNTIME/'stdlib.jar')
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-jvm-target','1.8','-d',str(CACHE/'oracle.jar'),*map(str,[CACHE/'Policy.kt',base/'Constraints.kt',aligned/'Tree.kt',CACHE/'Adapter.kt',aligned/'Lines.kt',CACHE/'Bridge.kt',HERE/'Harness.kt'])],check=True)
r=subprocess.run(['java','-cp',str(CACHE/'oracle.jar')+os.pathsep+cp,'androidx.compose.material3.HarnessKt'],capture_output=True,text=True,check=True)
data=json.loads(r.stdout)
(FIX/'inner-oracle.json.gz').write_bytes(gzip.compress((json.dumps(data,separators=(',',':'))+'\n').encode(),mtime=0))
print('Generated',len(data),'source default/Scope.align native toolbar trees.')
