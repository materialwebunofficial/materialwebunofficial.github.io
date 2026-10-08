"""Original ButtonShapes/defaults, shapeByInteraction and remembered shape bodies."""
from pathlib import Path
import hashlib,json,os,subprocess
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
FIX=ROOT/'test/fixtures/androidx/button'
CACHE=ROOT/'research/button-composition-generator'
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
interpolatable=(FIX/'Interpolatable.kt').read_text(encoding='utf-8')
parts=[block(source,'internal class AnimatedShapeState('),interpolatable[interpolatable.index('public interface Interpolatable {'):]]
rounded=(FIX/'RoundedCornerShape.kt').read_text(encoding='utf-8')
parts.extend(block(rounded,marker)for marker in ['internal fun lerp(a: RoundedCornerShape','internal fun lerp(a: CornerSize'])
parts.append(block((FIX/'MathHelpers.kt').read_text(encoding='utf-8'),'public fun lerp(start: Float'))
spring=block((ROOT/'test/fixtures/androidx/motion/AnimationSpec.kt').read_text(encoding='utf-8'),'public class SpringSpec<T>(')
identity=spring[spring.index('    override fun equals('):].replace('SpringSpec<*>','FiniteAnimationSpec<*>')
parts.append('class FiniteAnimationSpec<T>(val stiffness:Float,val dampingRatio:Float,val visibilityThreshold:Float?=null){\nval damping get()=dampingRatio\n'+identity)
parts.extend(block(source,marker)for marker in ['internal fun rememberAnimatedShape(state: AnimatedShapeState)','internal fun rememberAnimatedShape(\n'])
button=(FIX/'Button.kt').read_text(encoding='utf-8')
parts.append(block(button,'public class ButtonShapes('))
parts.append(button[button.index('internal val ButtonShapes.hasRoundedCornerShapes:'):].replace('private fun shapeByInteraction','internal fun shapeByInteraction',1))
defaults=button[button.index('public val MinWidth:'):button.index('public val squareShape')].rsplit('/**',1)[0]
start=button.index('public val squareShape');end=button.index('internal val Shapes.defaultButtonShapes:')
defaults+=button[start:end]+block(button,'internal val Shapes.defaultButtonShapes:')+'\n'+block(button,'public fun shapesFor(')
parts.append('object ButtonDefaults{\n'+defaults+'\n}')
(CACHE/'Original.kt').write_text('package androidx.compose.animation.core\nimport androidx.compose.material3.tokens.*\n'+'\n'.join(parts))
tokens=[]
for name in ['ButtonXSmall','ButtonSmall','ButtonMedium','ButtonLarge','ButtonXLarge','ShapeKey','Shape']:
    file=FIX/(name+'Tokens.kt');text=file.read_text(encoding='utf-8')
    # Package/type relocation only; original token bodies remain unchanged.
    for package in ['androidx.compose.ui.unit','androidx.compose.ui.graphics','androidx.compose.foundation.shape']:
        text=text.replace(package,'androidx.compose.animation.core')
    path=CACHE/file.name;path.write_text(text);tokens.append(path)
cp=os.pathsep.join([str(BASE),str(RUNTIME/'stdlib.jar')])
motion=ROOT/'test/fixtures/androidx/fab'
files=[motion/'ExpressiveMotionTokens.kt',motion/'StandardMotionTokens.kt',*tokens,CACHE/'Original.kt',HERE/'ShapeMotion.kt',HERE/'ShapeComposition.kt']
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-Xfriend-paths='+str(BASE),'-jvm-target','1.8','-d',str(CACHE/'oracle.jar'),*map(str,files)],check=True)
result=subprocess.run(['java','-cp',str(CACHE/'oracle.jar')+os.pathsep+cp,'androidx.compose.animation.core.ShapeCompositionKt'],capture_output=True,text=True,check=True)
cases=json.loads(result.stdout)
(FIX/'composition-oracle.json').write_text(json.dumps(cases,separators=(',',':'))+'\n')
print('Generated',len(cases),'original ButtonShapes/defaults/shapeByInteraction/rememberAnimatedShape histories with explicit slot/effect/theme/frame/outline hosts.')
