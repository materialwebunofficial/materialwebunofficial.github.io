"""Execute original key filters/handlers/lifecycle with the full ClickableNode.
Indication initialization, normalized key values, collection, delegation and
coroutine emission are explicit platform hosts, not full native scheduling.
"""
from pathlib import Path
import gzip, hashlib, json, os, subprocess
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
CACHE=ROOT/'research/button-keyboard-generator';CACHE.mkdir(exist_ok=True)
for family in ['ripple','pointer']:
 directory=ROOT/'test/fixtures/androidx'/family
 for entry in json.loads((directory/'sources.json').read_text())['sources']:
  assert hashlib.sha256((directory/entry['file']).read_bytes()).hexdigest()==entry['sha256'],entry['file']
source=(ROOT/'test/fixtures/androidx/ripple/FoundationClickable.kt').read_text(encoding='utf-8')
pointer=(ROOT/'test/fixtures/androidx/pointer/PointerEvent.kt').read_text(encoding='utf-8')
tap=(ROOT/'test/fixtures/androidx/pointer/TapGestureDetector.kt').read_text(encoding='utf-8')
def block(text,marker):
 start=text.index(marker);end=text.index('{',start)+1;depth=1
 while depth:
  depth+=(text[end]=='{')-(text[end]=='}');end+=1
 return text[start:end]
parts=[block(source,'internal open class ClickableNode('),block(tap,'internal fun PointerEvent.isChangedToDown('),block(pointer,'public fun PointerInputChange.isOutOfBounds(size: IntSize, extendedTouchPadding: Size)')]
for name in ['changedToDown','changedToDownIgnoreConsumed','changedToUp','changedToUpIgnoreConsumed']:
 start=pointer.index('public fun PointerInputChange.'+name+'()');parts.append(pointer[start:pointer.index('\n',start)])
props=source[source.index('private val KeyEvent.isPress:'):source.index('private class ClickableElement(')]
(CACHE/'Source.kt').write_text('package androidx.compose.foundation\nimport kotlin.math.abs\nimport kotlin.math.max\n\n'+'\n\n'.join(parts)+'\n')
(CACHE/'Padding.kt').write_text('package androidx.compose.foundation\nimport kotlin.math.max\nopen class OriginalPadding{\n'+block(source,'protected fun getExtendedTouchPadding(size: IntSize)')+'\n}\n')
host=(HERE/'Pointer.kt').read_text(encoding='utf-8').split('data class Input(')[0]
host=host.replace('class MutableInteractionSource\n','').replace('class KeyEvent\n','')
host=host.replace('AbstractClickableNode(interactionSource:','AbstractClickableNode(private var interactionSource:')
host=host.replace('?,indicationNodeFactory:', '?,private var indicationNodeFactory:').replace('?,useLocalIndication:', '?,private var useLocalIndication:')
host=host.replace(',onClickLabel:String?',',private var onClickLabel:String?').replace(',role:Role?',',private var role:Role?')
fields='''
 val currentKeyPressInteractions=mutableMapOf<Long,PressInteraction.Press>()
 val centerOffset=Offset(0f,0f);val coroutineScope=Scope();val focusableNode=FocusableHost()
 private var userProvidedInteractionSource=interactionSource
 private var pressInteraction:PressInteraction.Press?=null;private var indirectPointerPressInteraction:PressInteraction.Press?=null
 private var indirectPointerEventPressPosition:Offset?=null;private var hoverInteraction:HoverInteraction.Enter?=null
 private var gestureNode:Any?=null;private var indicationNode:Any?=null;private var lazilyCreateIndication=false
 fun initializeIndicationAndInteractionSourceIfNeeded(){};fun onObservedReadsChanged(){}
 fun delegate(node:Any){};fun undelegate(node:Any){};fun invalidateSemantics(){}
 fun shouldLazilyCreateIndication()=false;fun recreateIndicationIfNeeded(){}
 fun onCancelKeyInput(){};fun focusTest(focused:Boolean)=onFocusChange(focused)
'''
methods='\n'.join(block(source,marker) for marker in ['final override fun onKeyEvent(','private fun onFocusChange(','protected fun disposeInteractions()','protected fun updateCommon('])
start=host.index(' fun updateCommon(');end=host.index('\n}',start)
host=host[:start]+host[end:]
host=host.replace(':OriginalPadding(){',':OriginalPadding(),KeyInputHost{\n'+fields+methods+'\n')
(CACHE/'Host.kt').write_text(host+'\n'+props)
runtime=ROOT/'research/kotlin-runtime'
files=[CACHE/'Host.kt',CACHE/'Source.kt',CACHE/'Padding.kt',HERE/'Keyboard.kt']
subprocess.run(['java','-cp',str(runtime/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',str(runtime/'stdlib.jar'),'-jvm-target','1.8','-d',str(CACHE/'keyboard.jar'),*map(str,files)],check=True)
result=subprocess.run(['java','-cp',str(CACHE/'keyboard.jar')+os.pathsep+str(runtime/'stdlib.jar'),'androidx.compose.foundation.KeyboardKt'],capture_output=True,text=True,check=True)
data=json.loads(result.stdout)
output=ROOT/'test/fixtures/androidx/button/keyboard-oracle.json.gz'
output.write_bytes(gzip.compress((json.dumps(data,separators=(',',':'))+'\n').encode(),mtime=0))
print('Original key filters/ClickableNode/base key/focus/dispose/update:',len(data),'histories/',sum(len(c['frames']) for c in data),'frames. Explicit key/map/emission/delegation/indication hosts; full native frame/input tree is not executed.')
