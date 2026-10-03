"""Execute native centered Row/Column inside original with-FAB padding/scroll tree."""
from pathlib import Path
import gzip, hashlib, json, os, runpy, subprocess

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
FIX = ROOT / 'test/fixtures/androidx/toolbar-fab-content'
CACHE = ROOT / 'research/toolbar-fab-content-generator'
RUNTIME = ROOT / 'research/kotlin-runtime'
CACHE.mkdir(parents=True, exist_ok=True)
for entry in json.loads((FIX / 'sources.json').read_text(encoding='utf-8'))['sources']:
    assert hashlib.sha256((FIX / entry['file']).read_bytes()).hexdigest() == entry['sha256'], entry['file']

shared = runpy.run_path(str(ROOT / 'tools/androidx-toolbar-padding/generate.py'))
block = shared['block']
base = ROOT / 'research/toolbar-row-generator'
inner = ROOT / 'research/toolbar-inner-alignment-generator'
aligned = ROOT / 'research/toolbar-alignment-generator'
padding = ROOT / 'research/toolbar-padding-generator'
fab = ROOT / 'research/toolbar-constraints-generator'

def write(name, text):
    (CACHE / name).write_text(text, encoding='utf-8')

source = (FIX / 'FloatingToolbar.kt').read_text(encoding='utf-8')
assert '.padding(toolbarContentPadding)\n                        .horizontalScroll(' in source
assert '.padding(toolbarContentPadding)\n                        .verticalScroll(' in source
assert 'verticalAlignment = Alignment.CenterVertically,' in source[source.index('private fun HorizontalFloatingToolbarWithFabLayout'):]
assert 'horizontalAlignment = Alignment.CenterHorizontally,' in source[source.index('private fun VerticalFloatingToolbarWithFabLayout'):]

fab_policy = (padding / 'FabPolicy.kt').read_text(encoding='utf-8')
parts = [block(fab_policy, fab_policy.index('fun MeasureScope.' + axis + '(')) for axis in ['horizontal', 'vertical']]
parts.append(block(fab_policy, fab_policy.index('class ScrollNode(')))
parts.append(block(fab_policy, fab_policy.index('class UnspecifiedConstraintsNode(')))
for prefix in ['public fun lerp(start: Dp', 'public fun lerp(start: Float']:
    parts.append(block(fab_policy, fab_policy.index(prefix)))
parts.append(next(line for line in fab_policy.splitlines() if line.startswith('fun ClosedRange<Dp>.lerp(')))
parts.append(block(fab_policy, fab_policy.index('internal object NodeMeasuringIntrinsics{')))
write('Policy.kt', (padding / 'RowPolicy.kt').read_text(encoding='utf-8') + '\n' + '\n'.join(parts) + '\n')

tree = (padding / 'RowTree.kt').read_text(encoding='utf-8')
adapter = (padding / 'FabAdapter.kt').read_text(encoding='utf-8')
interface = block(adapter, adapter.index('public interface LayoutModifierNode'))
tree = tree.replace(block(tree, tree.index('interface LayoutModifierNode{')), interface)
tree = tree.replace('interface IntrinsicMeasureScope:Density', 'interface IntrinsicMeasureScope:Density{val layoutDirection get()=if(Host.rtl)LayoutDirection.Rtl else LayoutDirection.Ltr}')
tree = tree.replace('\n val layoutDirection get()=if(Host.rtl)LayoutDirection.Rtl else LayoutDirection.Ltr\n', '\n')
tree = tree.replace('if(paddingIntrinsic)child.maxIntrinsicWidth((height-16).coerceAtLeast(0))+16 else ', '')
tree = tree.replace('if(paddingIntrinsic)child.maxIntrinsicHeight((width-16).coerceAtLeast(0))+16 else ', '')
constant = next(line for line in (FIX / 'Layout.kt').read_text(encoding='utf-8').splitlines() if line.startswith('internal const val LargeDimension'))
tree += '\nclass IntrinsicsMeasureScope(val delegate:IntrinsicMeasureScope,override val layoutDirection:LayoutDirection):MeasureScope\n' + constant + '\n'
write('Tree.kt', tree)

host_adapter = (inner / 'Adapter.kt').read_text(encoding='utf-8')
assert 'Animatable(if (hasVisibleLeadingContent || hasVisibleTrailingContent) 0f else 1f)' in source
host_adapter = host_adapter.replace('object PaddingHost{var progress=1f}', 'object PaddingHost{var progress=1f;var natural=false}')
host_adapter = host_adapter.replace('class Animatable<T,V>(initial:T){val value:Float get()=PaddingHost.progress;', 'class Animatable<T,V>(val initial:T){val value:Float get()=if(PaddingHost.natural)initial as Float else PaddingHost.progress;')
start = host_adapter.index('fun iconMeasure(')
end = host_adapter.index('\nfun iconAt(', start)
host_adapter = host_adapter[:start] + '''fun iconTree(width:Int=40,height:Int=40):Measurable{
 val body=Wrapped("body",SizeNode(minWidth=width.dp,maxWidth=width.dp,minHeight=height.dp,maxHeight=height.dp,enforceIncoming=true),Content(IntSize(24,24)))
 return Wrapped("touch",MinimumInteractiveModifierNode(),body)
}
fun iconMeasure(c:Constraints,width:Int=40,height:Int=40)=iconTree(width,height).measure(c)
''' + host_adapter[end:]
write('Adapter.kt', host_adapter)

bridge = (inner / 'Bridge.kt').read_text(encoding='utf-8')
bridge = bridge.replace('class AlignedRow(val id:String,val inputs:List<NativeInput>,val vertical:Boolean)', 'class AlignedRow(val id:String,val inputs:List<NativeInput>,val vertical:Boolean,val centered:Boolean=true)')
bridge = bridge.replace('override fun minIntrinsicWidth(h:Int)=maxOf(48,input.width);override fun maxIntrinsicWidth(h:Int)=maxOf(48,input.width)', 'override fun minIntrinsicWidth(h:Int)=iconTree(input.width,input.height).minIntrinsicWidth(h);override fun maxIntrinsicWidth(h:Int)=iconTree(input.width,input.height).maxIntrinsicWidth(h)')
bridge = bridge.replace('override fun minIntrinsicHeight(w:Int)=maxOf(48,input.height);override fun maxIntrinsicHeight(w:Int)=maxOf(48,input.height)', 'override fun minIntrinsicHeight(w:Int)=iconTree(input.width,input.height).minIntrinsicHeight(w);override fun maxIntrinsicHeight(w:Int)=iconTree(input.width,input.height).maxIntrinsicHeight(w)')
bridge = bridge.replace('val policy=if(vertical)sourceColumnPolicy()else sourceRowPolicy()', 'val policy=policy()')
bridge = bridge.replace(' lateinit var owner:Owner\n override fun measure(c:Constraints):Placeable{\n  val leaves=inputs.mapIndexed', ' lateinit var owner:Owner\n fun policy()=if(vertical){if(centered)sourceColumnPolicy(horizontalAlignment=Alignment.CenterHorizontally)else sourceColumnPolicy()}else{if(centered)sourceRowPolicy(verticalAlignment=Alignment.CenterVertically)else sourceRowPolicy()}\n fun leaves():List<Measurable> =inputs.mapIndexed{i,input->if(input.native)NativeLeaf(id+"-$i",input,vertical)else Leaf(id+"-$i",LeafInput(if(vertical)input.height else input.width,if(vertical)input.width else input.height,input.weight,input.fill,line=input.line,align=input.align),vertical)}\n override fun measure(c:Constraints):Placeable{\n  val leaves=inputs.mapIndexed')
bridge = bridge.replace(' override fun minIntrinsicWidth(h:Int)=0;override fun maxIntrinsicWidth(h:Int)=0\n override fun minIntrinsicHeight(w:Int)=0;override fun maxIntrinsicHeight(w:Int)=0', ''' override fun minIntrinsicWidth(h:Int)=with(policy()){with(Scope){minIntrinsicWidth(leaves(),h)}}
 override fun maxIntrinsicWidth(h:Int)=with(policy()){with(Scope){maxIntrinsicWidth(leaves(),h)}}
 override fun minIntrinsicHeight(w:Int)=with(policy()){with(Scope){minIntrinsicHeight(leaves(),w)}}
 override fun maxIntrinsicHeight(w:Int)=with(policy()){with(Scope){maxIntrinsicHeight(leaves(),w)}}''')
assert 'fun policy()' in bridge and 'maxIntrinsicWidth(leaves(),h)' in bridge
write('Bridge.kt', bridge)
fab_adapter = (fab / 'Adapter.kt').read_text(encoding='utf-8')
write('Fab.kt', 'package androidx.compose.material3\n' + block(fab_adapter, fab_adapter.index('class Policy(')) + '\n')

jar = CACHE / 'oracle.jar'
cp = str(RUNTIME / 'stdlib.jar')
files = [CACHE / name for name in ['Policy.kt', 'Tree.kt', 'Adapter.kt', 'Bridge.kt', 'Fab.kt']] + [base / 'Constraints.kt', aligned / 'Lines.kt', HERE / 'Harness.kt']
subprocess.run(['java', '-cp', str(RUNTIME / '*'), 'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler', '-no-stdlib', '-no-reflect', '-classpath', cp, '-jvm-target', '1.8', '-d', str(jar), *map(str, files)], check=True)
result = subprocess.run(['java', '-cp', str(jar) + os.pathsep + cp, 'androidx.compose.material3.HarnessKt'], capture_output=True, text=True, encoding='utf-8', check=True)
cases = json.loads(result.stdout)
for name, values in cases.items():
    (FIX / (name + '-oracle.json.gz')).write_bytes(gzip.compress((json.dumps(values, separators=(',', ':')) + '\n').encode(), mtime=0))
    print('Generated', len(values), name, 'original native with-FAB cases.')
