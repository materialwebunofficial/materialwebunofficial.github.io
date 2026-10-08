"""Original direct ClickableNode gesture execution with explicit platform hosts."""
from pathlib import Path
import gzip, hashlib, json, os, subprocess, sys

ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
CACHE=ROOT/'research/button-pointer-generator'
CACHE.mkdir(exist_ok=True)
RUNTIME=ROOT/'research/kotlin-runtime'
for name in ['button','toggle-button','ripple']:
    directory=ROOT/'test/fixtures/androidx'/name
    for entry in json.loads((directory/'sources.json').read_text())['sources']:
        assert hashlib.sha256((directory/entry['file']).read_bytes()).hexdigest()==entry['sha256'],entry['file']
original=ROOT/'test/fixtures/androidx/pointer'
hashes={'NodeCoordinator.kt':'4b5e401afd4e97b546b5869dfa0e7da3fdb2ba5d5be2c325f665239dc2c23a7b','TapGestureDetector.kt':'428b13231ef8d2684c7338f6f59509994eb98f382eed3bcc980bddd515be497b','PointerEvent.kt':'f60630e089f455d8d84817f1f631eaebc6e00032f508ebab04f5a298bfc4d024','ShapeContainingUtil.kt':'5a6194401ff4df9944b6cf1afe81579356b66a5d3e66db278ef219bfa4d75d1f','HitTestResult.kt':'8e1b8114f236654904c692b4905f2d5b68bce1964fec9857fff5b96284bc18f4'}
for name,sha in hashes.items():
    assert hashlib.sha256((original/name).read_bytes()).hexdigest()==sha,name

def block(source,marker):
    start=source.index(marker);opening=source.index('{',start);end=opening+1;depth=1
    while depth:
        depth+=(source[end]=='{')-(source[end]=='}');end+=1
    return source[start:end]

def expression(source,marker):
    start=source.index(marker);return source[start:source.index('\n',start)]

click=(ROOT/'test/fixtures/androidx/ripple/FoundationClickable.kt').read_text(encoding='utf-8')
pointer=(original/'PointerEvent.kt').read_text(encoding='utf-8')
tap=(original/'TapGestureDetector.kt').read_text(encoding='utf-8')
parts=[block(click,'internal open class ClickableNode('),block(tap,'internal fun PointerEvent.isChangedToDown('),block(pointer,'public fun PointerInputChange.isOutOfBounds(size: IntSize, extendedTouchPadding: Size)')]
parts += [expression(pointer,'public fun PointerInputChange.'+name+'()') for name in ['changedToDown','changedToDownIgnoreConsumed','changedToUp','changedToUpIgnoreConsumed']]
padding=block(click,'protected fun getExtendedTouchPadding(size: IntSize)')
(CACHE/'Bodies.kt').write_text('package androidx.compose.foundation\nimport kotlin.math.abs\nimport kotlin.math.max\n\n'+'\n\n'.join(parts)+'\n')
(CACHE/'Padding.kt').write_text('package androidx.compose.foundation\nimport kotlin.math.max\nopen class OriginalPadding {\n'+padding+'\nfun padding(size:IntSize)=getExtendedTouchPadding(size)\n}\n')
def relocate(source):
    return '\n'.join('package androidx.compose.foundation' if line.startswith('package ') else line for line in source.splitlines() if not line.startswith('import androidx.'))
(CACHE/'ShapeBodies.kt').write_text(relocate((original/'ShapeContainingUtil.kt').read_text(encoding='utf-8'))+'\n')
(CACHE/'HitResultBodies.kt').write_text(relocate((original/'HitTestResult.kt').read_text(encoding='utf-8'))+'\n')
coord=(original/'NodeCoordinator.kt').read_text(encoding='utf-8')
methods=[block(coord,marker) for marker in ['fun hitTest(','protected fun withinLayerBounds(','protected fun isPointerInBounds(','private fun offsetFromEdge(','protected fun calculateMinimumTouchTargetPadding(','protected fun distanceInMinimumTouchTarget(']]
(CACHE/'CoordinatorBodies.kt').write_text('package androidx.compose.foundation\ninternal class OriginalCoordinator(width:Int,height:Int,radius:Float,density:Float,target:Float):CoordinatorHost(width,height,radius,density,target){\n'+'\n\n'.join(methods)+'\n}\n')
files=[CACHE/'Bodies.kt',CACHE/'Padding.kt',CACHE/'ShapeBodies.kt',CACHE/'HitResultBodies.kt',CACHE/'CoordinatorBodies.kt',HERE/'Pointer.kt',HERE/'PointerHit.kt']
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',str(RUNTIME/'stdlib.jar'),'-jvm-target','1.8','-d',str(CACHE/'pointer.jar'),*map(str,files)],check=True)
result=subprocess.run(['java','-cp',str(CACHE/'pointer.jar')+os.pathsep+str(RUNTIME/'stdlib.jar'),'androidx.compose.foundation.PointerKt'],capture_output=True,text=True,check=True)
data=json.loads(result.stdout)
# Already-routed direct ClickableNode events and a fitted rounded normal leaf.
# Native abstract interaction emission, modifier-tree/ancestor routing and
# closest-sibling arbitration are not supplied by these platform hosts.
(original/'pointer-oracle.json.gz').write_bytes(gzip.compress((json.dumps(data,separators=(',',':'))+'\n').encode(),mtime=0))
print('Generated',len(data),'original direct ClickableNode histories;',sum(len(c['frames']) for c in data),'native event frames.')
hits=subprocess.run(['java','-cp',str(CACHE/'pointer.jar')+os.pathsep+str(RUNTIME/'stdlib.jar'),'androidx.compose.foundation.PointerHitKt'],capture_output=True,text=True,check=True)
hitdata=json.loads(hits.stdout)
(original/'hit-oracle.json.gz').write_bytes(gzip.compress((json.dumps(hitdata,separators=(',',':'))+'\n').encode(),mtime=0))
print('Generated',len(hitdata),'original rounded-outline/coordinator/hit-result records.')
