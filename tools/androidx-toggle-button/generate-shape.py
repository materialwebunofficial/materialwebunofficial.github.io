"""Original public ToggleButtonShapes/defaults/remembered shape bodies."""
from pathlib import Path
import hashlib,json,os,subprocess
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
FIX=ROOT/'test/fixtures/androidx/toggle-button'
BUTTON=ROOT/'test/fixtures/androidx/button'
CACHE=ROOT/'research/toggle-button-shape-generator'
RUNTIME=ROOT/'research/kotlin-runtime'
BASE=ROOT/'research/motion-generator/oracle.jar'
CACHE.mkdir(exist_ok=True)
for directory,manifest_path in [(FIX,FIX/'sources.json'),(BUTTON,BUTTON/'sources.json'),(ROOT/'test/fixtures/androidx/fab',ROOT/'test/fixtures/androidx/fab/sources.json'),(ROOT/'test/fixtures/androidx/motion',ROOT/'tools/androidx-motion/sources.json')]:
    manifest=json.loads(manifest_path.read_text())
    entries=manifest.get('sources') or [dict(file=name,**data) for name,data in manifest.items()]
    for entry in entries:assert hashlib.sha256((directory/entry['file']).read_bytes()).hexdigest()==entry['sha256'],entry['file']

def block(text,marker):
    start=text.index(marker);opening=text.index('{',start);end=opening+1;depth=1
    while depth:depth+=(text[end]=='{')-(text[end]=='}');end+=1
    return text[start:end]

animated=(BUTTON/'AnimatedShape.kt').read_text(encoding='utf-8')
interpolatable=(BUTTON/'Interpolatable.kt').read_text(encoding='utf-8')
parts=[block(animated,'internal class AnimatedShapeState('),interpolatable[interpolatable.index('public interface Interpolatable {'):]]
rounded=(BUTTON/'RoundedCornerShape.kt').read_text(encoding='utf-8')
parts.extend(block(rounded,m) for m in ['internal fun lerp(a: RoundedCornerShape','internal fun lerp(a: CornerSize'])
parts.append(block((BUTTON/'MathHelpers.kt').read_text(encoding='utf-8'),'public fun lerp(start: Float'))
spring=block((ROOT/'test/fixtures/androidx/motion/AnimationSpec.kt').read_text(encoding='utf-8'),'public class SpringSpec<T>(')
identity=spring[spring.index('    override fun equals('):].replace('SpringSpec<*>','FiniteAnimationSpec<*>')
parts.append('class FiniteAnimationSpec<T>(val stiffness:Float,val dampingRatio:Float,val visibilityThreshold:Float?=null){\nval damping get()=dampingRatio\n'+identity)
parts.extend(block(animated,m) for m in ['internal fun rememberAnimatedShape(state: AnimatedShapeState)','internal fun rememberAnimatedShape(\n'])
button=(BUTTON/'Button.kt').read_text(encoding='utf-8')
parts.append(block(button,'public class ButtonShapes('))
parts.append(button[button.index('internal val ButtonShapes.hasRoundedCornerShapes:'):].replace('private fun shapeByInteraction','internal fun shapeByInteraction',1))
defaults=button[button.index('public val MinWidth:'):button.index('public val squareShape')].rsplit('/**',1)[0]
defaults+=button[button.index('public val squareShape'):button.index('internal val Shapes.defaultButtonShapes:')]+block(button,'internal val Shapes.defaultButtonShapes:')+'\n'+block(button,'public fun shapesFor(')
parts.append('object ButtonDefaults{\n'+defaults+'\n}')
toggle=(FIX/'ToggleButton.kt').read_text(encoding='utf-8')
parts.append(block(toggle,'public class ToggleButtonShapes('))
shape_defaults=block(toggle,'internal val Shapes.defaultToggleButtonShapes:')
shape_defaults+='\n'+toggle[toggle.index('public val shape:'):toggle.index('public fun colors():')].rsplit('/**',1)[0]
shape_defaults+='\n'+block(toggle,'public fun shapesFor(buttonHeight: Dp)')
parts.append('object ToggleButtonDefaults{\n'+shape_defaults+'\n}')
parts.append(toggle[toggle.index('internal val ToggleButtonShapes.hasRoundedCornerShapes:'):toggle.index('@Composable\nprivate fun animateBorderStrokeAsState')].replace('private fun shapeByInteraction','internal fun shapeByInteraction',1))
(CACHE/'Original.kt').write_text('package androidx.compose.animation.core\nimport androidx.compose.material3.tokens.*\n'+'\n'.join(parts))
tokens=[]
for name in ['ButtonXSmall','ButtonSmall','ButtonMedium','ButtonLarge','ButtonXLarge','ShapeKey','Shape']:
    file=BUTTON/(name+'Tokens.kt');text=file.read_text(encoding='utf-8')
    for package in ['androidx.compose.ui.unit','androidx.compose.ui.graphics','androidx.compose.foundation.shape']:
        text=text.replace(package,'androidx.compose.animation.core')
    path=CACHE/file.name;path.write_text(text);tokens.append(path)
# Reuse the exact explicit slot/effect/density/uniform-outline hosts of Button.
host=(ROOT/'tools/androidx-button/ShapeComposition.kt').read_text(encoding='utf-8')
host=host.replace('var defaultButtonShapesCached:ButtonShapes?=null','var defaultButtonShapesCached:ButtonShapes?=null\n var defaultToggleButtonShapesCached:ToggleButtonShapes?=null')
(CACHE/'SharedComposition.kt').write_text(host)
cp=os.pathsep.join([str(BASE),str(RUNTIME/'stdlib.jar')])
motion=ROOT/'test/fixtures/androidx/fab'
shape_host=(ROOT/'tools/androidx-button/ShapeMotion.kt').read_text(encoding='utf-8')
corner=(BUTTON/'CornerBasedShape.kt').read_text(encoding='utf-8')
outline=block(corner,'public final override fun createOutline(')
original_host='abstract class CornerBasedShape:Shape{abstract val topStart:CornerSize;abstract val topEnd:CornerSize;abstract val bottomEnd:CornerSize;abstract val bottomStart:CornerSize}'
outline_host=original_host[:-1]+'\n'+outline+'\nabstract fun createOutline(size:Size,topStart:Float,topEnd:Float,bottomEnd:Float,bottomStart:Float,layoutDirection:LayoutDirection):Outline\n}'
shape_host=shape_host.replace(original_host,outline_host)
shape_host=shape_host.replace('override fun createOutline(size:Size,layoutDirection:LayoutDirection,density:Density)=Outline(topStart.toPx(size,density))','override fun createOutline(size:Size,topStart:Float,topEnd:Float,bottomEnd:Float,bottomStart:Float,layoutDirection:LayoutDirection)=Outline(topStart)')
shape_host+='\nfun requirePrecondition(value:Boolean,message:()->String){require(value,message)}\n'
(CACHE/'ShapeHost.kt').write_text(shape_host)
files=[motion/'ExpressiveMotionTokens.kt',motion/'StandardMotionTokens.kt',*tokens,CACHE/'Original.kt',CACHE/'ShapeHost.kt',CACHE/'SharedComposition.kt',HERE/'ShapeComposition.kt']
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-Xfriend-paths='+str(BASE),'-jvm-target','1.8','-d',str(CACHE/'oracle.jar'),*map(str,files)],check=True)
result=subprocess.run(['java','-cp',str(CACHE/'oracle.jar')+os.pathsep+cp,'androidx.compose.animation.core.ShapeCompositionKt'],capture_output=True,text=True,check=True)
cases=json.loads(result.stdout)
(FIX/'composition-oracle.json').write_text(json.dumps(cases,separators=(',',':'))+'\n')
print('Generated',len(cases),'original ToggleButton public three-shape/FastSpatial/default/remember histories with explicit composition/frame/outline hosts.')
