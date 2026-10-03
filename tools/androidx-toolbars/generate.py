"""Run pinned Compose toolbar policy bodies with explicit host measurement inputs."""
from pathlib import Path
import json,re,hashlib,subprocess,os,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[2]; HERE=Path(__file__).resolve().parent
FIX=ROOT/'test/fixtures/androidx/toolbars';CACHE=ROOT/'research/toolbar-generator';CACHE.mkdir(exist_ok=True)
RUNTIME=ROOT/'research/kotlin-runtime'
for folder in [FIX,ROOT/'test/fixtures/mdc/toolbars']:
    for entry in json.loads((folder/'sources.json').read_text(encoding='utf-8'))['sources']:
        if hashlib.sha256((folder/entry['file']).read_bytes()).hexdigest()!=entry['sha256']:raise RuntimeError(entry['file']+' changed')
source=(FIX/'FloatingToolbar.kt').read_text(encoding='utf-8')
def block(text,start):
    opening=text.index('{',start);depth=1;i=opening+1
    while depth:
        if text[i]=='{':depth+=1
        elif text[i]=='}':depth-=1
        i+=1
    return text[start:i]
policies=[]
for axis in ['Horizontal','Vertical']:
    section=source[source.index('private fun '+axis+'FloatingToolbarWithFabLayout('):]
    start=section.index('val toolbarMeasurable = measurables[0]');end=section.index('\n    }\n}',start)
    policies.append('fun MeasureScope.'+axis.lower()+'(measurables:List<Measurable>,constraints:Constraints,expandedProgress:State<Float>,fabPosition:String,toolbarToFabGap:Dp=8.dp,collapsedShadowElevation:Dp=0.dp,expandedShadowElevation:Dp=1.dp,toolbarShape:String="capsule"):MeasureResult = run {\n'+section[start:end]+'\n}')
padding=block(source,source.index('private class MinimumInteractiveBalancedPaddingNode(')).replace('private class','class',1)
colors=[]
for style in ['Standard','Vibrant']:
    prefix='internal val ColorScheme.defaultFloatingToolbar'+style+'Colors: FloatingToolbarColors'
    start=source.index(prefix);colors.append(block(source,start).replace('internal val','val',1))
token=(FIX/'FloatingToolbarTokens.kt').read_text(encoding='utf-8').split('internal object ',1)[1].replace('androidx.compose.ui.unit.Dp','Dp')
policy='package androidx.compose.material3\n'+ '\n'.join(policies)+'\n'+padding+'\n'+'\n'.join(colors)+'\ninternal object '+token+'\n'
visibility=(FIX/'EnterExitTransition.kt').read_text(encoding='utf-8')
node=visibility[visibility.index('private class EnterExitTransitionModifierNode('):]
offset=block(node,node.index('fun targetOffsetByState('))
measure=block(node,node.index('override fun MeasureScope.measure('))
policy+='\nclass VisibilityPolicy:LayoutModifierNode {\n'+(HERE/'VisibilityAdapter.kt').read_text(encoding='utf-8')+'\n'+offset+'\n'+measure+'\n}\n'
for file,prefix in [('Dp.kt','public fun lerp(start: Dp, stop: Dp, fraction: Float): Dp'),('MathHelpers.kt','public fun lerp(start: Float, stop: Float, fraction: Float): Float')]:
    text=(FIX/file).read_text(encoding='utf-8');policy+='\n'+block(text,text.index(prefix))+'\n'
policy+='\n'+next(line for line in source.splitlines() if line.startswith('private fun ClosedRange<Dp>.lerp(')).replace('private fun','fun',1)+'\n'
(CACHE/'Policy.kt').write_text(policy,encoding='utf-8')
classpath=str(RUNTIME/'stdlib.jar')
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',classpath,'-jvm-target','1.8','-d',str(CACHE/'oracle.jar'),str(CACHE/'Policy.kt'),str(HERE/'Harness.kt')],check=True)
for mode in ['fab','padding','colors','visibility']:
    result=subprocess.run(['java','-cp',str(CACHE/'oracle.jar')+os.pathsep+classpath,'androidx.compose.material3.HarnessKt',mode],text=True,capture_output=True,check=True)
    cases=json.loads(result.stdout);(FIX/(mode+'-oracle.json')).write_text(json.dumps(cases,separators=(',',':'))+'\n',encoding='utf-8');print('Generated',len(cases),'unchanged Kotlin toolbar',mode,'cases.')
# Android selectors are ordered; the first matching item wins, including hover before checked.
folder=ROOT/'test/fixtures/mdc/toolbars';manifest=json.loads((folder/'sources.json').read_text(encoding='utf-8'))
resources={}
for entry in manifest['sources']:
    if entry['file'].endswith('tokens.xml'):
        for element in ET.fromstring((folder/entry['file']).read_bytes()):
            if 'name' in element.attrib:resources[element.attrib['name']]=element.text
def resolve(value):
    if value and value.startswith(('@macro/','@dimen/')):return resolve(resources[value.split('/',1)[1]])
    return value
ns='{http://schemas.android.com/apk/res/android}';cases=[]
for style in ['standard','vibrant']:
    for kind in ['icon_button_container','icon_button_icon','icon_button_ripple','button_text']:
        tree=ET.fromstring((folder/f'color__res__color__m3_{style}_toolbar_{kind}_color_selector.xml').read_bytes())
        for mask in range(64):
            states=dict(zip(['enabled','checkable','checked','hovered','focused','pressed'],[bool(mask&(1<<i)) for i in range(6)]))
            for item in tree:
                if all(states.get(k[len(ns+'state_'):])==(v=='true') for k,v in item.attrib.items() if k.startswith(ns+'state_')):
                    cases.append(dict(style=style,kind=kind,states=states,color=resolve(item.get(ns+'color')),alpha=resolve(item.get(ns+'alpha')) or '1'));break
(folder/'selector-oracle.json').write_text(json.dumps(cases,separators=(',',':'))+'\n',encoding='utf-8');print('Generated',len(cases),'MDC XML selector cases.')
