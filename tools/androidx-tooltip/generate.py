"""Execute unchanged native tooltip position/state bodies and real MutatorMutex/coroutines.
Host transition storage / integer geometry replace Compose dependencies; no production JS is read.
"""
from pathlib import Path
import gzip, hashlib, json, os, subprocess
ROOT=Path(__file__).resolve().parents[2]
FIX=ROOT/'test/fixtures/androidx/tooltip'
CACHE=ROOT/'research/tooltip-generator'
RUNTIME=ROOT/'research/kotlin-runtime'
COROUTINES=ROOT/'research/tooltip-runtime'
CACHE.mkdir(exist_ok=True)
for directory in [FIX,COROUTINES]:
    for item in json.loads((directory/'sources.json').read_text())['sources']:
        assert hashlib.sha256((directory/item['file']).read_bytes()).hexdigest()==item['sha256'], item['file']
source=(FIX/'Tooltip.kt').read_text(encoding='utf-8')
def block(text,start):
    begin=text.index('{',start); depth=1; end=begin+1
    while depth:
        depth += (text[end]=='{')-(text[end]=='}');end+=1
    return text[start:end]
position=block(source,source.index('private class TooltipPositionProviderImpl('))
state=block(source,source.index('private class TooltipStateImpl('))
caret=block(source,source.index('internal fun caretX('))
basic=(FIX/'BasicTooltip.kt').read_text(encoding='utf-8')
assert 'const val TooltipDuration = 1500L' in basic
assert 'MotionSchemeKeyTokens.FastSpatial.value<Float>()' in source
assert 'MotionSchemeKeyTokens.FastEffects.value<Float>()' in source
transition=(FIX/'Transition.kt').read_text(encoding='utf-8')
methods='\n'.join(block(transition,transition.index('internal fun '+name+'(')) for name in ['updateTarget','onTransitionEnd','onDisposed'])
(CACHE/'TransitionPolicy.kt').write_text('''package androidx.compose.material3
class NativeTransition<S>(val transitionState:TransitionState<S>){
 var targetState=transitionState.currentState
 var segment=SegmentImpl(targetState,targetState)
 var startTimeNanos=0L
 var playTimeNanos=0L
 val isRunning get()=transitionState.isRunning
 var updateChildrenNeeded=false
 val _animations=listOf(HostAnimation(),HostAnimation())
 val animations get()=_animations
 val _transitions=mutableListOf<NativeTransition<*>>()
'''+methods+'\n}\n')
(CACHE/'Policies.kt').write_text('''package androidx.compose.material3
import androidx.compose.foundation.MutatorMutex
import androidx.compose.foundation.MutatePriority
import kotlinx.coroutines.*
'''+position+'\n'+state+'\n'+caret+'''
fun nativePosition(type:TooltipAnchorPosition,spacing:Int,window:IntSize,anchor:IntRect,rtl:LayoutDirection,popup:IntSize)=
 TooltipPositionProviderImpl(type,spacing,window).calculatePosition(anchor,IntSize(13,17),rtl,popup)
fun nativeState(persistent:Boolean,mutex:MutatorMutex):TooltipState=TooltipStateImpl(false,persistent,mutex)
''')
(CACHE/'Atomic.kt').write_text('package androidx.compose.foundation\ntypealias AtomicReference<T> = java.util.concurrent.atomic.AtomicReference<T>\n')
(CACHE/'Stable.kt').write_text('package androidx.compose.runtime\nannotation class Stable\n')
(CACHE/'Exception.kt').write_text('package androidx.compose.foundation.internal\nopen class PlatformOptimizedCancellationException(message:String):kotlinx.coroutines.CancellationException(message)\n')
cp=os.pathsep.join(map(str,[RUNTIME/'stdlib.jar',COROUTINES/'kotlinx-coroutines-core-jvm.jar',COROUTINES/'kotlinx-coroutines-test-jvm.jar']))
files=[CACHE/'Policies.kt',CACHE/'TransitionPolicy.kt',CACHE/'Atomic.kt',CACHE/'Stable.kt',CACHE/'Exception.kt',FIX/'MutatorMutex.kt',Path(__file__).parent/'Oracle.kt',Path(__file__).parent/'TransitionHost.kt']
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-jvm-target','1.8','-d',str(CACHE/'oracle.jar')]+list(map(str,files)),check=True)
result=subprocess.run(['java','-cp',str(CACHE/'oracle.jar')+os.pathsep+cp,'androidx.compose.material3.OracleKt'],capture_output=True,text=True,check=True)
cases=json.loads(result.stdout)
(FIX/'oracle.json.gz').write_bytes(gzip.compress((json.dumps(cases,separators=(',',':'))+'\n').encode(),mtime=0))
print('Generated',len(cases['positions']),'native positions,',len(cases['carets']),'caret coordinates,',len(cases['histories']),'real coroutine state/mutex histories and',len(cases['transitions']),'unchanged transition bookkeeping histories.')
