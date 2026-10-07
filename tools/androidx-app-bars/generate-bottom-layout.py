"""Execute original Row/Box/Fill/Size/Padding/minimum/Placeable for bottom bars.

This constructs the public composables' default modifier tree. Leaf dimensions,
parent constraints, parent data and safe-area values are explicit host inputs.
"""
from pathlib import Path
import gzip,hashlib,json,os,subprocess

ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
FIX=ROOT/'test/fixtures/androidx/app-bars';ROWFIX=ROOT/'test/fixtures/androidx/toolbar-row'
CACHE=ROOT/'research/bottom-app-bar-generator';CACHE.mkdir(exist_ok=True)
BASE=ROOT/'research/toolbar-row-generator/oracle.jar'
TOP=ROOT/'research/top-app-bar-generator/oracle.jar'
RUNTIME=ROOT/'research/kotlin-runtime'
for directory in [FIX,ROWFIX]:
    for entry in json.loads((directory/'sources.json').read_text(encoding='utf-8'))['sources']:
        assert hashlib.sha256((directory/entry['file']).read_bytes()).hexdigest()==entry['sha256'],entry['file']
if not BASE.exists() or not TOP.exists():
    raise RuntimeError('Prepare toolbar-row and top-layout native generators first')

def block(text,prefix):
    start=text.index(prefix);cursor=text.index('(',start)+1;parens=1
    while parens:
        parens+=(text[cursor]=='(')-(text[cursor]==')');cursor+=1
    at=text.index('{',cursor);depth=1;end=at+1
    while depth:
        depth+=(text[end]=='{')-(text[end]=='}');end+=1
    return text[start:end]

size=(ROWFIX/'Size.kt').read_text(encoding='utf-8')
fill=block(size,'private class FillNode(').replace('private class','internal class',1)
types=size[size.index('internal enum class Direction {'):]
host='''package androidx.compose.material3
interface ParentDataModifierNode {fun Density.modifyParentData(parentData:Any?):Any?}
fun Int.fastCoerceIn(minimum:Int,maximum:Int)=coerceIn(minimum,maximum)
'''
(CACHE/'BottomFill.kt').write_text(host+types+'\n'+fill+'\n',encoding='utf-8')
cp=os.pathsep.join(map(str,[TOP,BASE,RUNTIME/'stdlib.jar']))
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-Xfriend-paths='+','.join(map(str,[TOP,BASE])),'-jvm-target','1.8','-d',str(CACHE/'oracle.jar'),str(CACHE/'BottomFill.kt'),str(HERE/'BottomTree.kt')],check=True)
result=subprocess.run(['java','-cp',str(CACHE/'oracle.jar')+os.pathsep+cp,'androidx.compose.material3.BottomTreeKt'],capture_output=True,text=True,check=True)
cases=json.loads(result.stdout)
with (FIX/'bottom-layout-oracle.json.gz').open('wb') as target:
    with gzip.GzipFile(filename='',mode='wb',fileobj=target,mtime=0) as compressed:
        compressed.write((json.dumps(cases,separators=(',',':'))+'\n').encode())
print('Generated',len(cases),'original bottom Row/Box/Fill/Size/Padding/minimum/Placeable trees')
