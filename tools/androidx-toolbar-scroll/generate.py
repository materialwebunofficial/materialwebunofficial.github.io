"""Execute original toolbar scroll bodies with explicit host frames/coordinates."""
from pathlib import Path
import hashlib,json,os,subprocess,math
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
FIX=ROOT/'test/fixtures/androidx/toolbar-scroll';CACHE=ROOT/'research/toolbar-scroll-generator'
CACHE.mkdir(exist_ok=True);RUNTIME=ROOT/'research/kotlin-runtime'
for e in json.loads((FIX/'sources.json').read_text(encoding='utf-8'))['sources']:
    assert hashlib.sha256((FIX/e['file']).read_bytes()).hexdigest()==e['sha256'],e['file']
for name,e in json.loads((ROOT/'tools/androidx-motion/sources.json').read_text(encoding='utf-8')).items():
    assert hashlib.sha256((ROOT/'test/fixtures/androidx/motion'/name).read_bytes()).hexdigest()==e['sha256'],name
def block(s,start):
    at=s.index('{',start);depth=1;i=at+1
    while depth:
        if s[i]=='{':depth+=1
        elif s[i]=='}':depth-=1
        i+=1
    return s[start:i]
decay=(FIX/'SplineBasedDecay.kt').read_text(encoding='utf-8')
decay=decay[decay.index('private const val Inflection'):decay.index('public fun <T> splineBasedDecay')]
calc=(FIX/'FlingCalculator.kt').read_text(encoding='utf-8');calc=calc[calc.index('private const val GravityEarth'):]
spec=(FIX/'SplineBasedFloatDecayAnimationSpec.kt').read_text(encoding='utf-8');spec=block(spec,spec.index('public class SplineBasedFloatDecayAnimationSpec'))
(CACHE/'Spline.kt').write_text('package androidx.compose.material3\nimport kotlin.math.*\n'+decay+calc+spec+'\n')
toolbar=(FIX/'FloatingToolbar.kt').read_text(encoding='utf-8');bodies=[]
for prefix in ['private class ExitAlwaysFloatingToolbarScrollBehavior(', 'internal class VerticalNestedScrollExpansionNode(', 'private class FloatingToolbarStateImpl(', 'private suspend fun settleFloatingToolbar(']:
    bodies.append(block(toolbar,toolbar.index(prefix)).replace('private class','class',1).replace('internal class','class',1).replace('private suspend fun','suspend fun',1))
start=toolbar.index('private fun FloatingToolbarState.collapsedFraction()');end=toolbar.index('\n\n',start)
bodies.append(toolbar[start:end])
(CACHE/'Policy.kt').write_text('package androidx.compose.material3\nimport kotlin.math.*\nimport kotlin.reflect.KProperty\n'+ '\n'.join(bodies)+'\n')
java=(FIX/'ViewConfiguration.java').read_text(encoding='utf-8');assert 'SCROLL_FRICTION = 0.015f' in java
spring=(ROOT/'test/fixtures/androidx/motion/FloatAnimationSpec.kt').read_text(encoding='utf-8')
spring=block(spring,spring.index('public class FloatSpringSpec('))
(CACHE/'Spring.kt').write_text('@file:Suppress("INVISIBLE_MEMBER","INVISIBLE_REFERENCE")\npackage androidx.compose.animation.core\n'+spring+'\n'+(HERE/'SpringBridge.kt').read_text(encoding='utf-8'))
cp=os.pathsep.join(map(str,[RUNTIME/'stdlib.jar',ROOT/'research/motion-generator/oracle.jar']))
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-jvm-target','1.8','-d',str(CACHE/'oracle.jar'),str(CACHE/'Spline.kt'),str(CACHE/'Policy.kt'),str(CACHE/'Spring.kt'),str(HERE/'Adapter.kt'),str(HERE/'Harness.kt')],check=True)
for mode in ['spline','expansion','exit','settle','settle-reduced','snap-mutation']:
    result=subprocess.run(['java','-cp',str(CACHE/'oracle.jar')+os.pathsep+cp,'androidx.compose.material3.HarnessKt',mode],capture_output=True,text=True,check=True)
    def finite(value):
        if isinstance(value,float) and not math.isfinite(value):return str(value)
        if isinstance(value,list):return list(map(finite,value))
        if isinstance(value,dict):return {k:finite(v) for k,v in value.items()}
        return value
    cases=finite(json.loads(result.stdout));(FIX/(mode+'-oracle.json')).write_text(json.dumps(cases,separators=(',',':'),allow_nan=False)+'\n');print(mode,len(cases))
