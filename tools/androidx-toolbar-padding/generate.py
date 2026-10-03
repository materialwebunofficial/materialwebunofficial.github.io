"""Execute original logical/absolute padding, intrinsic fallback and toolbar trees."""
from pathlib import Path
import gzip, hashlib, json, os, runpy, subprocess

ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
FIX=ROOT/'test/fixtures/androidx/toolbar-padding'
CACHE=ROOT/'research/toolbar-padding-generator'
RUNTIME=ROOT/'research/kotlin-runtime'
CACHE.mkdir(parents=True,exist_ok=True)
for e in json.loads((FIX/'sources.json').read_text(encoding='utf-8'))['sources']:
    assert hashlib.sha256((FIX/e['file']).read_bytes()).hexdigest()==e['sha256'],e['file']
shared=runpy.run_path(str(ROOT/'tools/androidx-toolbar-inner-alignment/generate.py'))
fabshared=runpy.run_path(str(ROOT/'tools/androidx-toolbar-constraints/generate.py'))
block=fabshared['block']
padding=(FIX/'Padding.kt').read_text(encoding='utf-8')
values=block(padding,padding.index('internal class PaddingValuesImpl('))+'\n'+block(padding,padding.index('public class Absolute('))
density=(FIX/'Density.kt').read_text(encoding='utf-8')
rounding=block(density,density.index('public fun Dp.roundToPx()'))
rounding=rounding[rounding.index('{')+1:-1]
profiles=(HERE/'Padding.kt').read_text(encoding='utf-8')
base=ROOT/'research/toolbar-row-generator'
inner=ROOT/'research/toolbar-inner-alignment-generator'
aligned=ROOT/'research/toolbar-alignment-generator'
cp=str(RUNTIME/'stdlib.jar')

def write(name,text):
    (CACHE/name).write_text(text,encoding='utf-8')

def generate(mode,files,main):
    jar=CACHE/(mode+'.jar')
    subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-jvm-target','1.8','-d',str(jar),*map(str,files)],check=True)
    r=subprocess.run(['java','-cp',str(jar)+os.pathsep+cp,'androidx.compose.material3.'+main],capture_output=True,text=True,encoding='utf-8',check=True)
    data=json.loads(r.stdout)
    (FIX/(mode+'-oracle.json.gz')).write_bytes(gzip.compress((json.dumps(data,separators=(',',':'))+'\n').encode(),mtime=0))
    print('Generated',len(data),mode,'original padding cases.')

write('RowPolicy.kt',(inner/'Policy.kt').read_text(encoding='utf-8')+'\n'+values+'\n'+profiles)
tree=(aligned/'Tree.kt').read_text(encoding='utf-8')
assert 'fun roundToPx()=value.roundToInt()' in tree
tree=tree.replace('fun roundToPx()=value.roundToInt()','fun roundToPx():Int{'+rounding+'}')
write('RowTree.kt',tree)
harness=(ROOT/'tools/androidx-toolbar-inner-alignment/Harness.kt').read_text(encoding='utf-8')
harness=harness.replace('val out=mutableListOf<String>()','val out=mutableListOf<String>()\n val selected=listOf(profiles[0],profiles[3],profiles[7],profiles[8])')
harness=harness.replace('for(profile in profiles)','for(pad in paddingProfiles)for(profile in selected)').replace('for(presence in 0..3)','for(presence in listOf(0,3))')
harness=harness.replace('PaddingValuesModifier(Padding8)','PaddingValuesModifier(pad.values())')
harness=harness.replace('\\\"vertical\\\":$vertical,','\\\"contentPadding\\\":${pad.json()},\\\"vertical\\\":$vertical,')
write('RowHarness.kt',harness)
generate('row',[CACHE/'RowPolicy.kt',base/'Constraints.kt',CACHE/'RowTree.kt',inner/'Adapter.kt',aligned/'Lines.kt',inner/'Bridge.kt',CACHE/'RowHarness.kt'],'RowHarnessKt')

# Complete original default intrinsic methods and non-Approach implementation.
node=(FIX/'LayoutModifierNode.kt').read_text(encoding='utf-8')
interface=block(node,node.index('public interface LayoutModifierNode : DelegatableNode')).replace(' : DelegatableNode','')
intrinsics=[block(node,node.index('internal fun interface MeasureBlock'))]
for name in ['minWidth','minHeight','maxWidth','maxHeight']:
    intrinsics.append(block(node,node.index('internal fun '+name+'(\n        measureBlock: MeasureBlock,')))
intrinsics.append(block(node,node.index('private class DefaultIntrinsicMeasurable(')))
for name in ['IntrinsicMinMax','IntrinsicWidthHeight']:
    intrinsics.append(block(node,node.index('private enum class '+name)))
# Empty placeable storage/coercion and density-1 scope delegation are host wiring.
intrinsics.append('private fun EmptyPlaceable(w:Int,h:Int)=Placeable("intrinsic-empty",Scope.layout(w,h){},Constraints())')
intrinsics='internal object NodeMeasuringIntrinsics{\n'+'\n'.join(intrinsics)+'\n}\n'
fab=ROOT/'research/toolbar-constraints-generator'
policy=(fab/'Policy.kt').read_text(encoding='utf-8')
write('FabPolicy.kt',policy+'\n'+values+'\n'+profiles+'\n'+intrinsics)
adapter=(fab/'Adapter.kt').read_text(encoding='utf-8')
old=block(adapter,adapter.index('interface LayoutModifierNode{'))
adapter=adapter.replace(old,interface)
adapter=adapter.replace('interface IntrinsicMeasurable{','interface IntrinsicMeasurable{val parentData:Any? get()=null;')
adapter=adapter.replace('interface IntrinsicMeasureScope','interface IntrinsicMeasureScope{val layoutDirection get()=if(Host.rtl)LayoutDirection.Rtl else LayoutDirection.Ltr}')
adapter=adapter.replace('interface MeasureScope:IntrinsicMeasureScope{\n val layoutDirection get()=if(Host.rtl)LayoutDirection.Rtl else LayoutDirection.Ltr','interface MeasureScope:IntrinsicMeasureScope{')
adapter=adapter.replace('fun roundToPx()=value.roundToInt()','fun roundToPx():Int{'+rounding+'}')
adapter+='\nfun Float.fastRoundToInt()=roundToInt()\nclass IntrinsicsMeasureScope(val delegate:IntrinsicMeasureScope,override val layoutDirection:LayoutDirection):MeasureScope\nconst val LargeDimension=32767\n'
adapter=adapter.replace('if(paddingIntrinsic)child.maxIntrinsicWidth((height-16).coerceAtLeast(0))+16 else ','')
adapter=adapter.replace('if(paddingIntrinsic)child.maxIntrinsicHeight((width-16).coerceAtLeast(0))+16 else ','')
write('FabAdapter.kt',adapter)
generate('fab',[CACHE/'FabPolicy.kt',fab/'Constraints.kt',CACHE/'FabAdapter.kt',HERE/'FabHarness.kt'],'FabHarnessKt')
generate('values',[CACHE/'FabPolicy.kt',fab/'Constraints.kt',CACHE/'FabAdapter.kt',HERE/'ValuesHarness.kt'],'ValuesHarnessKt')
