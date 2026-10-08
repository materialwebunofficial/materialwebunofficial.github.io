"""Original ButtonColors getters and token bodies; role/alpha-only Color hosts."""
from pathlib import Path
import hashlib,json,os,re,subprocess,sys
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
FIX=ROOT/'test/fixtures/androidx/button'
CACHE=ROOT/'research/button-colors-generator'
RUNTIME=ROOT/'research/kotlin-runtime'
CACHE.mkdir(exist_ok=True)
for entry in json.loads((FIX/'sources.json').read_text())['sources']:
    assert hashlib.sha256((FIX/entry['file']).read_bytes()).hexdigest()==entry['sha256'],entry['file']
source=(FIX/'Button.kt').read_text(encoding='utf-8')
def block(marker):
    start=source.index(marker);opening=source.index('{',start);end=opening+1;depth=1
    while depth:depth+=(source[end]=='{')-(source[end]=='}');end+=1
    return source[start:end]
parts=[]
for name in ['defaultButtonColors','defaultElevatedButtonColors','defaultFilledTonalButtonColors','defaultOutlinedButtonColors','defaultTextButtonColors']:
    start=source.index('internal val ColorScheme.'+name+':');opening=source.index('{',start);end=opening+1;depth=1
    while depth:depth+=(source[end]=='{')-(source[end]=='}');end+=1
    parts.append(source[start:end])
(CACHE/'Original.kt').write_text('package androidx.compose.material3\nimport androidx.compose.material3.tokens.*\n'+block('public class ButtonColors')+'\nobject ButtonDefaults{\n'+'\n'.join(parts)+'\n}\n')
files=[]
for name in ['FilledButton','ElevatedButton','FilledTonalButton','OutlinedButton','TextButton','ColorSchemeKey']:
    path=CACHE/(name+'Tokens.kt')
    path.write_text((FIX/path.name).read_text(encoding='utf-8').replace('androidx.compose.ui.unit','androidx.compose.material3'))
    files.append(path)
(CACHE/'ValueHosts.kt').write_text('package androidx.compose.material3\ndata class Dp(val value:Float)\nval Double.dp get()=Dp(toFloat())\n')
(CACHE/'TokenHosts.kt').write_text('package androidx.compose.material3.tokens\nimport androidx.compose.material3.Dp\ntypealias ShapeToken=ShapeKeyTokens\nenum class ShapeKeyTokens{CornerFull}\ntypealias TypographyToken=TypographyKeyTokens\nenum class TypographyKeyTokens{LabelLarge}\nobject ElevationTokens{val Level0=Dp(0f);val Level1=Dp(1f);val Level2=Dp(2f)}\n')
cp=str(RUNTIME/'stdlib.jar')
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-jvm-target','1.8','-d',str(CACHE/'oracle.jar'),*map(str,[*files,CACHE/'Original.kt',CACHE/'ValueHosts.kt',CACHE/'TokenHosts.kt',HERE/'ColorBindings.kt'])],check=True)
result=subprocess.run(['java','-cp',str(CACHE/'oracle.jar')+os.pathsep+cp,'androidx.compose.material3.ColorBindingsKt'],capture_output=True,text=True,check=True)
roles={int(id):name for name,id in re.findall(r'val (\w+) = ColorToken\((\d+)\)',(FIX/'ColorSchemeKeyTokens.kt').read_text())}
document=dict(roles={str(id):name for id,name in roles.items()},variants=json.loads(result.stdout))
if '--check-only' in sys.argv:
    assert document==json.loads((FIX/'color-oracle.json').read_text())
else:
    (FIX/'color-oracle.json').write_text(json.dumps(document,indent=2)+'\n')
print('Verified original full ButtonColors and five default getters: direct enabled selection, native role IDs/Float alpha, copy/Unspecified and cache identity.')
