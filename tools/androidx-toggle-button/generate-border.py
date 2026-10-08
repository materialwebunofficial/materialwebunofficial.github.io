"""Original border/animate*AsState bodies with explicit runtime/converted-color hosts."""
from pathlib import Path
import hashlib,json,os,subprocess
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
FIX=ROOT/'test/fixtures/androidx/toggle-button'
BUTTON=ROOT/'test/fixtures/androidx/button'
CACHE=ROOT/'research/toggle-border-generator'
RUNTIME=ROOT/'research/kotlin-runtime'
BASE=ROOT/'research/toolbar-size-motion-generator/oracle.jar'
CACHE.mkdir(exist_ok=True)
for directory,manifest_path in [(FIX,FIX/'sources.json'),(BUTTON,BUTTON/'sources.json'),(ROOT/'test/fixtures/androidx/toolbar-size-motion',ROOT/'test/fixtures/androidx/toolbar-size-motion/sources.json'),(ROOT/'test/fixtures/androidx/fab',ROOT/'test/fixtures/androidx/fab/sources.json'),(ROOT/'test/fixtures/androidx/motion',ROOT/'tools/androidx-motion/sources.json'),(ROOT/'test/fixtures/androidx/color',ROOT/'test/fixtures/androidx/color/sources.json')]:
    manifest=json.loads(manifest_path.read_text())
    entries=manifest.get('sources') or [dict(file=name,**data) for name,data in manifest.items()]
    for entry in entries:assert hashlib.sha256((directory/entry['file']).read_bytes()).hexdigest()==entry['sha256'],entry['file']

def block(text,marker):
    start=text.index(marker)
    signature=text.index('(',start);end=signature+1;depth=1
    while depth:depth+=(text[end]=='(')-(text[end]==')');end+=1
    opening=text.index('{',end);end=opening+1;depth=1
    while depth:depth+=(text[end]=='{')-(text[end]=='}');end+=1
    return text[start:end]

toggle=(FIX/'ToggleButton.kt').read_text(encoding='utf-8')
parts=[block(toggle,'private fun animateBorderStrokeAsState(').replace('private fun','internal fun',1)]
parts.append('object OutlinedToggleButtonDefaults{\n'+block(toggle,'public fun border(enabled: Boolean, checked: Boolean)')+'\n}')
button=(BUTTON/'Button.kt').read_text(encoding='utf-8')
start=button.index('public fun outlinedButtonBorder(enabled: Boolean = true)')
parts.append('object ButtonDefaults{\n'+button[start:button.index('\n\n',start)]+'\n}')
animated=(ROOT/'test/fixtures/androidx/motion/AnimateAsState.kt').read_text(encoding='utf-8')
parts.extend(block(animated,marker) for marker in ['public fun animateDpAsState(','public fun <T, V : AnimationVector> animateValueAsState(','private class AnimateAsState<T, V : AnimationVector>('])
single=(FIX/'SingleValueAnimation.kt').read_text(encoding='utf-8')
parts.append(block(single,'public fun animateColorAsState('))
converter=(ROOT/'test/fixtures/androidx/color/ColorVectorConverter.kt').read_text(encoding='utf-8')
parts.append(converter[converter.index('private val ColorToVector:'):])
(CACHE/'Original.kt').write_text('package androidx.compose.animation.core\n'+'\n'.join(parts))
outlined=(BUTTON/'OutlinedButtonTokens.kt').read_text(encoding='utf-8')
small=(BUTTON/'ButtonSmallTokens.kt').read_text(encoding='utf-8')
token_parts=['object ButtonSmallTokens{\n'+small[small.index('inline val OutlinedOutlineWidth:'):small.index('\n\n',small.index('inline val OutlinedOutlineWidth:'))]+'\n}', 'object OutlinedButtonTokens{\n'+outlined[outlined.index('inline val OutlineColor:'):outlined.index('\n\n',outlined.index('inline val OutlineColor:'))]+'\n'+next(line.strip() for line in outlined.splitlines() if 'const val DisabledContainerOpacity =' in line)+'\n}']
(CACHE/'Tokens.kt').write_text(('package androidx.compose.animation.core\n'+'\n'.join(token_parts)).replace('androidx.compose.ui.unit','androidx.compose.animation.core'))
border=(FIX/'Border.kt').read_text(encoding='utf-8')
paint=border[border.index('val hasValidBorderParams ='):border.index('when (val outline =')]
(CACHE/'Paint.kt').write_text('package androidx.compose.animation.core\nimport kotlin.math.*\nfun nativeBorderStroke(width:Dp,size:Size):Float = run {\n'+paint+'\nstrokeWidthPx\n}\n}\n')
cp=os.pathsep.join([str(BASE),str(RUNTIME/'stdlib.jar')])
motion=ROOT/'test/fixtures/androidx/fab'
files=[motion/'ExpressiveMotionTokens.kt',motion/'StandardMotionTokens.kt',CACHE/'Original.kt',CACHE/'Tokens.kt',CACHE/'Paint.kt',HERE/'Border.kt']
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-Xfriend-paths='+str(BASE),'-jvm-target','1.8','-d',str(CACHE/'oracle.jar'),*map(str,files)],check=True)
result=subprocess.run(['java','-cp',str(CACHE/'oracle.jar')+os.pathsep+cp,'androidx.compose.animation.core.BorderKt'],capture_output=True,text=True,check=True)
data=json.loads(result.stdout)
(FIX/'border-oracle.json').write_text(json.dumps(data,separators=(',',':'))+'\n')
print('Generated',len(data),'original border/animateDp/animateColor/animateValue/AnimateAsState histories with native TargetBasedAnimation/vector springs and explicit composition/Animatable/converted-color hosts.')
