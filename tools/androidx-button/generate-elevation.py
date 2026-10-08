"""Full original Button/Toggle elevation bodies with explicit composition/flow/frame hosts."""
from pathlib import Path
import hashlib,json,os,subprocess
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
FIX=ROOT/'test/fixtures/androidx/button'
TOGGLE=ROOT/'test/fixtures/androidx/toggle-button'
CACHE=ROOT/'research/button-elevation-generator'
NATIVE=ROOT/'research/fab-interaction-generator'
RUNTIME=ROOT/'research/kotlin-runtime'
CACHE.mkdir(exist_ok=True)
for directory,manifest_path in [(FIX,FIX/'sources.json'),(TOGGLE,TOGGLE/'sources.json'),(ROOT/'test/fixtures/androidx/ripple',ROOT/'test/fixtures/androidx/ripple/sources.json'),(ROOT/'test/fixtures/androidx/motion',ROOT/'tools/androidx-motion/sources.json'),(ROOT/'test/fixtures/androidx/navigation-drawer',ROOT/'test/fixtures/androidx/navigation-drawer/sources.json')]:
    manifest=json.loads(manifest_path.read_text())
    entries=manifest.get('sources') or [dict(file=name,**data) for name,data in manifest.get('files',manifest).items()]
    for entry in entries:assert hashlib.sha256((directory/entry['file']).read_bytes()).hexdigest()==entry['sha256'],entry['file']
def block(text,marker):
    start=text.index(marker);opening=text.index('{',start);end=opening+1;depth=1
    while depth:depth+=(text[end]=='{')-(text[end]=='}');end+=1
    return text[start:end]
imports='package androidx.compose.material3\nimport androidx.compose.animation.core.*\nimport androidx.compose.foundation.interaction.*\nimport androidx.compose.material3.internal.animateElevation\nimport androidx.compose.ui.unit.*\n'
button=(FIX/'Button.kt').read_text(encoding='utf-8')
toggle=(TOGGLE/'ToggleButton.kt').read_text(encoding='utf-8')
(CACHE/'Original.kt').write_text(imports+block(button,'public class ButtonElevation\n')+'\n'+block(toggle,'public class ToggleButtonElevation\n'))
factories=[]
for source,object_name,markers in [(button,'ButtonDefaults',['public fun buttonElevation(','public fun elevatedButtonElevation(','public fun filledTonalButtonElevation(']),(toggle,'ToggleButtonDefaults',['public fun elevation(']),(toggle[toggle.index('public object ElevatedToggleButtonDefaults'):],'ElevatedToggleButtonDefaults',['public fun elevation(']),(toggle[toggle.index('public object FilledTonalToggleButtonDefaults'):],'FilledTonalToggleButtonDefaults',['public fun elevation('])]:
    bodies=[]
    for marker in markers:
        start=source.index(marker);end=source.index('\n\n',start)
        bodies.append(source[start:end])
    factories.append('object '+object_name+'{\n'+'\n'.join(bodies)+'\n}')
tokens=[]
for name in ['FilledButtonTokens','ElevatedButtonTokens','FilledTonalButtonTokens']:
    source=(FIX/(name+'.kt')).read_text(encoding='utf-8')
    fields=[]
    for field in ['ContainerElevation','PressedContainerElevation','FocusedContainerElevation','HoveredContainerElevation','DisabledContainerElevation','FocusContainerElevation','HoverContainerElevation']:
        marker='inline val '+field+':'
        if marker in source:
            start=source.index(marker);end=source.index('\n\n',start)
            fields.append(source[start:end].replace('androidx.compose.ui.unit.Dp','Dp'))
    tokens.append('internal object '+name+'{\n'+'\n'.join(fields)+'\n}')
(CACHE/'Defaults.kt').write_text(imports+'import androidx.compose.material3.tokens.ElevationTokens\n'+'\n'.join(tokens+factories))
drawer=ROOT/'test/fixtures/androidx/navigation-drawer'
for name,original,markers in [('Bezier.kt','Bezier.kt',['private fun evaluateCubic(p0:','public fun evaluateCubic(p1:','public fun findFirstCubicRoot(','private fun findQuadraticRoots(','public fun computeCubicVerticalBounds(','private inline fun clampValidRootInUnitRange(','private fun writeValidRootInUnitRange(']),('Math.kt','MathHelpers.kt',['public fun fastCbrt(','public fun lerp(start: Float,'])]:
    text=(NATIVE/name).read_text();source=(drawer/original).read_text()
    for marker in markers:assert block(source,marker) in text,marker
    (CACHE/name).write_text(text)
easing=(drawer/'Easing.kt').read_text().replace('import androidx.compose.runtime.Immutable\n','').replace('import androidx.compose.runtime.Stable\n','').replace('@Stable\n','').replace('@Immutable\n','')
(CACHE/'Easing.kt').write_text(easing)
(CACHE/'Tween.kt').write_text('package androidx.compose.animation.core\nimport androidx.compose.ui.util.*\n'+block((ROOT/'test/fixtures/androidx/motion/FloatAnimationSpec.kt').read_text(),'public class FloatTweenSpec('))
for name in ['Pair.kt','Bridge.kt']:(CACHE/name).write_bytes((NATIVE/name).read_bytes())
for name in ['Elevation.kt','ElevationTokens.kt']:(CACHE/name).write_bytes((ROOT/'test/fixtures/androidx/ripple'/name).read_bytes())
cp=str(RUNTIME/'stdlib.jar')
files=list(CACHE.glob('*.kt'))+[HERE/'Elevation.kt',HERE/'ElevationAnimatable.kt',HERE/'ElevationInteractions.kt',HERE/'ElevationDp.kt']
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-jvm-target','1.8','-d',str(CACHE/'oracle.jar'),*map(str,files)],check=True)
result=subprocess.run(['java','-cp',str(CACHE/'oracle.jar')+os.pathsep+cp,'androidx.compose.material3.ElevationKt'],capture_output=True,text=True,check=True)
data=json.loads(result.stdout)
(FIX/'elevation-oracle.json').write_text(json.dumps(data,separators=(',',':'))+'\n')
print('Generated',len(data),'full original Button/ToggleButtonElevation histories with native FloatTween/Easing and explicit remember/effect/flow/Animatable frame hosts.')
