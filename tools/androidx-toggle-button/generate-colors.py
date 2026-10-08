"""Original ToggleButtonColors and four native default role/alpha factories."""
from pathlib import Path
import hashlib,json,os,re,subprocess
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
FIX=ROOT/'test/fixtures/androidx/toggle-button'
BUTTON=ROOT/'test/fixtures/androidx/button'
CACHE=ROOT/'research/toggle-button-colors-generator'
RUNTIME=ROOT/'research/kotlin-runtime'
CACHE.mkdir(exist_ok=True)
for directory in [FIX,BUTTON]:
    for entry in json.loads((directory/'sources.json').read_text())['sources']:
        assert hashlib.sha256((directory/entry['file']).read_bytes()).hexdigest()==entry['sha256'],entry['file']
source=(FIX/'ToggleButton.kt').read_text(encoding='utf-8')
def block(marker):
    start=source.index(marker);opening=source.index('{',start);end=opening+1;depth=1
    while depth:depth+=(source[end]=='{')-(source[end]=='}');end+=1
    return source[start:end]
parts=[block('public class ToggleButtonColors')]
for name in ['ToggleButton','ElevatedToggleButton','FilledTonalToggleButton','OutlinedToggleButton']:
    getter='default'+name+'Colors'
    extra='\n'+block('public fun border(enabled: Boolean, checked: Boolean)') if name=='OutlinedToggleButton' else ''
    parts.append('object '+name+'Defaults{\n'+block('internal val ColorScheme.'+getter+':')+extra+'\n}')
button=(BUTTON/'Button.kt').read_text(encoding='utf-8')
start=button.index('public fun outlinedButtonBorder(enabled: Boolean = true)')
parts.append('object ButtonDefaults{\n'+button[start:button.index('\n\n',start)]+'\n}')
(CACHE/'Original.kt').write_text('package androidx.compose.material3\nimport androidx.compose.material3.tokens.*\n'+'\n'.join(parts))
files=[]
for directory,name in [(BUTTON,'FilledButton'),(BUTTON,'ElevatedButton'),(FIX,'TonalButton'),(BUTTON,'OutlinedButton'),(BUTTON,'ColorSchemeKey'),(BUTTON,'ButtonSmall')]:
    path=CACHE/(name+'Tokens.kt');path.write_text((directory/path.name).read_text(encoding='utf-8').replace('androidx.compose.ui.unit','androidx.compose.material3'));files.append(path)
(CACHE/'ValueHosts.kt').write_text('package androidx.compose.material3\ndata class Dp(val value:Float)\nval Double.dp get()=Dp(toFloat())\n')
(CACHE/'TokenHosts.kt').write_text('package androidx.compose.material3.tokens\nimport androidx.compose.material3.Dp\ntypealias ShapeToken=ShapeKeyTokens\nenum class ShapeKeyTokens{CornerFull,CornerSmall,CornerMedium}\ntypealias TypographyToken=TypographyKeyTokens\nenum class TypographyKeyTokens{LabelLarge}\nobject ElevationTokens{val Level0=Dp(0f);val Level1=Dp(1f);val Level2=Dp(2f)}\n')
cp=str(RUNTIME/'stdlib.jar')
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-jvm-target','1.8','-d',str(CACHE/'oracle.jar'),*map(str,[*files,CACHE/'Original.kt',CACHE/'ValueHosts.kt',CACHE/'TokenHosts.kt',HERE/'ColorBindings.kt'])],check=True)
result=subprocess.run(['java','-cp',str(CACHE/'oracle.jar')+os.pathsep+cp,'androidx.compose.material3.ColorBindingsKt'],capture_output=True,text=True,check=True)
roles={int(id):name for name,id in re.findall(r'val (\w+) = ColorToken\((\d+)\)',(BUTTON/'ColorSchemeKeyTokens.kt').read_text())}
(FIX/'color-oracle.json').write_text(json.dumps(dict(roles={str(id):name for id,name in roles.items()},variants=json.loads(result.stdout)),indent=2)+'\n')
print('Generated original full ToggleButtonColors/four default getters, enabled/checked targets, copy/Unspecified and cache identity with explicit role/alpha hosts.')
