"""Original Button default functions/Row modifier tree; explicit measured leaves."""
from pathlib import Path
import hashlib,json,os,re,subprocess,sys
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
FIX=ROOT/'test/fixtures/androidx/button'
CACHE=ROOT/'research/button-generator'
RUNTIME=ROOT/'research/kotlin-runtime'
BASE=ROOT/'research/toolbar-alignment-generator/oracle.jar'
TOOLTIP=ROOT/'research/tooltip-layout-generator/layout.jar'
CACHE.mkdir(exist_ok=True)
for name in ['button','tooltip','toolbar-row','toolbar-alignment','snackbar']:
    directory=ROOT/'test/fixtures/androidx'/name
    for entry in json.loads((directory/'sources.json').read_text())['sources']:
        assert hashlib.sha256((directory/entry['file']).read_bytes()).hexdigest()==entry['sha256'],entry['file']
assert BASE.exists() and TOOLTIP.exists(),'Prepare toolbar-alignment and tooltip layout runtimes first'
def block(source,marker):
    start=source.index(marker);opening=source.index('{',start);end=opening+1;depth=1
    while depth:
        depth+=(source[end]=='{')-(source[end]=='}');end+=1
    return source[start:end]
def statement(source,marker):
    start=source.index(marker);return source[start:source.index('\n\n',start)]
def call(source,marker):
    start=source.index(marker);opening=source.index('(',start);end=opening+1;depth=1
    while depth:
        depth+=(source[end]=='(')-(source[end]==')');end+=1
    return source[start:end]
source=(FIX/'Button.kt').read_text(encoding='utf-8')
parts=[source[source.index(marker):].splitlines()[0] for marker in ['private val SmallStartPadding','private val SmallEndPadding']]
for marker in ['private fun getSmallContentPadding','public val ExtraSmallContentPadding','private fun getMediumContentPadding','private fun getLargeContentPadding','public val ExtraLargeContentPadding']:
    parts.append(statement(source,marker))
for marker in ['public fun contentPaddingFor(','public fun iconSizeFor(','public fun iconSpacingFor(']:
    parts.append(block(source,marker))
parts.append(source[source.index('public val MinWidth:'):source.index('public val squareShape')].rsplit('/**',1)[0])
parts.append(source[source.index('private val smallVerticalPadding'):source.index('\n}',source.index('private val smallVerticalPadding'))])
header='package androidx.compose.material3\nimport androidx.compose.material3.tokens.*\nobject ButtonDefaults{\n'
(CACHE/'Defaults.kt').write_text(header+'\n'.join(parts)+'\n}\n')
row=call(source,'Row(\n                Modifier.defaultMinSize(').replace('Modifier.defaultMinSize','TooltipModifier.defaultMinSize')
# Both public Button overloads use the same original Row geometry.
assert source.count(call(source,'Row(\n                Modifier.defaultMinSize('))==2
(CACHE/'Content.kt').write_text('package androidx.compose.material3\nfun nativeButtonContent(contentPadding:PaddingValues,content:()->Unit){\n'+row+'\n}\n')
size=(ROOT/'test/fixtures/androidx/toolbar-row/Size.kt').read_text(encoding='utf-8')
(CACHE/'DefaultMin.kt').write_text('package androidx.compose.material3\n'+block(size,'private class UnspecifiedConstraintsNode(').replace('private class','internal class',1))
tokens=[]
for file in [FIX/(name+'Tokens.kt') for name in ['ButtonXSmall','ButtonSmall','ButtonMedium','ButtonLarge','ButtonXLarge']]:
    # Package/type relocation only; original token bodies remain unchanged.
    text=file.read_text(encoding='utf-8').replace('androidx.compose.ui.unit','androidx.compose.material3')
    path=CACHE/file.name;path.write_text(text);tokens.append(path)
(CACHE/'ShapeHosts.kt').write_text('package androidx.compose.material3.tokens\ntypealias ShapeToken=ShapeKeyTokens\nenum class ShapeKeyTokens{CornerFull,CornerMedium,CornerSmall,CornerLarge,CornerExtraLarge}\n')
cp=os.pathsep.join([str(TOOLTIP),str(BASE),str(RUNTIME/'stdlib.jar')])
files=[CACHE/'Defaults.kt',CACHE/'Content.kt',CACHE/'DefaultMin.kt',CACHE/'ShapeHosts.kt',*tokens,HERE/'ButtonLayout.kt']
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-Xfriend-paths='+str(BASE)+','+str(TOOLTIP),'-jvm-target','1.8','-d',str(CACHE/'layout.jar'),*map(str,files)],check=True)
command=['java','-cp',str(CACHE/'layout.jar')+os.pathsep+cp,'androidx.compose.material3.ButtonLayoutKt']
result=subprocess.run(command,capture_output=True,text=True,check=True)
(FIX/'layout-oracle.json').write_text(json.dumps(json.loads(result.stdout),separators=(',',':'))+'\n')
print('Generated original Button default functions and 160 Row/defaultMinSize/padding trees.')
if '--browser' in sys.argv:
    inputs=json.loads((ROOT/'research/button-browser-layout-inputs.json').read_text());rows=[]
    for case in inputs:
        v=case['input'];text=v['text']
        rows.append(','.join(map(str,[v['height'],int(v['rtl']),int(v['leading']),int(v['trailing']),0,text['width'],text['height'],text['first'],text['last']])))
    (CACHE/'browser.csv').write_text('\n'.join(rows)+'\n')
    native=json.loads(subprocess.run(command+[str(CACHE/'browser.csv')],capture_output=True,text=True,check=True).stdout)['cases']
    for actual,expected in zip(inputs,native):actual.pop('rendered',None);actual['expected']=expected
    (FIX/'browser-layout-oracle.json').write_text(json.dumps(inputs,indent=2)+'\n')
    print('Generated',len(inputs),'original Button Row browser references with explicit text/icon leaves.')
