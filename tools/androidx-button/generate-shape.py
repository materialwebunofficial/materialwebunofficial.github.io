"""Original AnimatedShapeState and interpolation, with native spring frame host."""
from pathlib import Path
import hashlib,json,os,subprocess
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
FIX=ROOT/'test/fixtures/androidx/button'
CACHE=ROOT/'research/button-shape-generator'
RUNTIME=ROOT/'research/kotlin-runtime'
BASE=ROOT/'research/motion-generator/oracle.jar'
CACHE.mkdir(exist_ok=True)
for directory,manifest_path in [(FIX,FIX/'sources.json'),(ROOT/'test/fixtures/androidx/fab',ROOT/'test/fixtures/androidx/fab/sources.json'),(ROOT/'test/fixtures/androidx/motion',ROOT/'tools/androidx-motion/sources.json')]:
    manifest=json.loads(manifest_path.read_text())
    entries=manifest.get('sources') or [dict(file=name,**data) for name,data in manifest.items()]
    for entry in entries:assert hashlib.sha256((directory/entry['file']).read_bytes()).hexdigest()==entry['sha256'],entry['file']
def block(text,marker):
    start=text.index(marker);opening=text.index('{',start);end=opening+1;depth=1
    while depth:depth+=(text[end]=='{')-(text[end]=='}');end+=1
    return text[start:end]
source=(FIX/'AnimatedShape.kt').read_text(encoding='utf-8')
state=block(source,'internal class AnimatedShapeState(')
interpolatable=(FIX/'Interpolatable.kt').read_text(encoding='utf-8')
parts=[state,interpolatable[interpolatable.index('public interface Interpolatable {'):]]
rounded=(FIX/'RoundedCornerShape.kt').read_text(encoding='utf-8')
parts.extend(block(rounded,marker)for marker in ['internal fun lerp(a: RoundedCornerShape','internal fun lerp(a: CornerSize'])
parts.append(block((FIX/'MathHelpers.kt').read_text(encoding='utf-8'),'public fun lerp(start: Float'))
spring=block((ROOT/'test/fixtures/androidx/motion/AnimationSpec.kt').read_text(encoding='utf-8'),'public class SpringSpec<T>(')
# Original SpringSpec equality/hash bodies; type name relocation only. Its
# vectorization is not needed by the explicit scalar frame host.
identity=spring[spring.index('    override fun equals('):].replace('SpringSpec<*>','FiniteAnimationSpec<*>')
parts.append('class FiniteAnimationSpec<T>(val stiffness:Float,val dampingRatio:Float,val visibilityThreshold:Float?=null){\nval damping get()=dampingRatio\n'+identity)
(CACHE/'Original.kt').write_text('package androidx.compose.animation.core\n'+'\n'.join(parts))
button=(FIX/'Button.kt').read_text(encoding='utf-8')
assert 'val defaultAnimationSpec = MotionSchemeKeyTokens.DefaultEffects.value<Float>()' in button
assert BASE.exists(),'Prepare tools/androidx-motion/generate.py first'
cp=os.pathsep.join([str(BASE),str(RUNTIME/'stdlib.jar')])
tokens=ROOT/'test/fixtures/androidx/fab'
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-Xfriend-paths='+str(BASE),'-jvm-target','1.8','-d',str(CACHE/'oracle.jar'),str(tokens/'ExpressiveMotionTokens.kt'),str(tokens/'StandardMotionTokens.kt'),str(CACHE/'Original.kt'),str(HERE/'ShapeMotion.kt')],check=True)
result=subprocess.run(['java','-cp',str(CACHE/'oracle.jar')+os.pathsep+cp,'androidx.compose.animation.core.ShapeMotionKt'],capture_output=True,text=True,check=True)
cases=json.loads(result.stdout)
(FIX/'shape-oracle.json').write_text(json.dumps(cases,separators=(',',':'))+'\n')
print('Generated',len(cases),'original AnimatedShapeState/shape interpolation histories with native DefaultEffects progress frames.')
