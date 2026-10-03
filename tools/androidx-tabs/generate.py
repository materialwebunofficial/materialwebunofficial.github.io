"""Execute pinned Tab/TabRow layout with host-only Compose measurement adapters."""
from pathlib import Path
import re,json,hashlib,subprocess,os
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
FIXTURES=ROOT/'test/fixtures/androidx/tabs';CACHE=ROOT/'research/tab-generator';CACHE.mkdir(exist_ok=True)
RUNTIME=ROOT/'research/kotlin-runtime'
manifest=json.loads((FIXTURES/'sources.json').read_text(encoding='utf-8'))
for entry in manifest['sources']:
    if hashlib.sha256((FIXTURES/entry['file']).read_bytes()).hexdigest()!=entry['sha256']:raise RuntimeError(entry['file']+' changed')
read=lambda name:(FIXTURES/name).read_text(encoding='utf-8')
def block(source,start):
    opening=source.index('{',start);depth=1;i=opening+1
    while depth:
        if source[i]=='{':depth+=1
        elif source[i]=='}':depth-=1
        i+=1
    return source[start:i]
def extract(source,prefix):return block(source,source.index(prefix))
tab=read('Tab.kt');row=read('TabRow.kt')
baseline=extract(tab,'private fun TabBaselineLayout(').replace('private fun','fun',1)
placement='\n'.join(extract(tab,prefix) for prefix in ['private fun Placeable.PlacementScope.placeTextOrIcon(','private fun Placeable.PlacementScope.placeTextAndIcon('])
constants=tab[tab.index('// Tab specifications'):]
# Body projection keeps the complete original fixed-row measure/place lambda.
fixed=row[row.index('private fun TabRowImpl('):]
start=fixed.index('val tabRowWidth = constraints.maxWidth');end=fixed.index('\n        }\n    }\n}',start)
fixed_body=fixed[start:end]
fixed_fn='fun MeasureScope.fixedRowPolicy(tabMeasurables:List<Measurable>,constraints:Constraints,scope:RowScope):MeasureResult {val dividerMeasurables=listOf<Measurable>(Child("divider",ChildSize(constraints.maxWidth,1)));val indicatorMeasurables=emptyList<Measurable>();return run {\n'+fixed_body+'\n}}'
scrollable=row[row.index('private fun ScrollableTabRowImpl('):]
start=scrollable.index('val padding = edgePadding.roundToPx()');end=scrollable.index('\n            }\n        }\n    }\n}',start)
scrollable_body=scrollable[start:end].replace('density = this@Layout','density = this@scrollableRowPolicy')
scrollable_fn='fun MeasureScope.scrollableRowPolicy(tabMeasurables:List<Measurable>,constraints:Constraints,scope:RowScope,edgePadding:Dp,minTabWidth:Dp):MeasureResult {val selectedTabIndex=0;val scrollableTabData=ScrollData();val indicatorMeasurables=emptyList<Measurable>();return run {\n'+scrollable_body+'\n}}'
node=extract(row,'internal class TabIndicatorOffsetNode(')
scroll=extract(row,'private fun TabPosition.calculateTabOffset(').replace('private fun','fun',1)
scroll_source=read('Scroll.kt');start=scroll_source.index('val absolute = (value + it + accumulator)');end=scroll_source.index('\n    }',start)
transport='class ScrollTransport(var value:Int,val maxValue:Int,var accumulator:Float){fun consume(it:Float):Float{'+scroll_source[start:end].replace('if (changed) consumed else it','return if (changed) consumed else it')+'}}'
alignment=read('Alignment.kt');horizontal=alignment[alignment.index('public data class Horizontal(val bias: Float)'):]
center=extract(horizontal,'public override fun align(size: Int, space: Int, layoutDirection: LayoutDirection)').replace('public override fun align','fun align',1)
center='class CenterAlignment(val bias:Float=0f){'+center+'}'
center_arrangement=extract(read('Arrangement.kt'),'internal fun placeCenter(')
policy='package androidx.compose.material3\nimport kotlin.math.max\n'+baseline+'\n'+placement+'\n'+constants+'\n'+fixed_fn+'\n'+scrollable_fn+'\n'+node+'\nclass ScrollOwner(val scrollState:ScrollState){'+scroll+'}\n'+transport+'\n'+center+'\n'+center_arrangement+'\n'
(CACHE/'Policy.kt').write_text(policy,encoding='utf-8')
tokens='\n'.join('internal object '+read(name).split('internal object ',1)[1] for name in ['PrimaryNavigationTabTokens.kt','SecondaryNavigationTabTokens.kt','DividerTokens.kt']).replace('androidx.compose.ui.unit.Dp','Dp')
adapters=[]
for obj,kind in [('ColorSchemeKeyTokens','Color'),('ShapeKeyTokens','String'),('TypographyKeyTokens','String')]:
    names=sorted(set(re.findall(obj+r'\.(\w+)',tokens)))
    adapters.append('object '+obj+' {'+';'.join('val '+name+' = '+('Color("'+re.sub(r'(?<!^)(?=[A-Z])','-',name).lower()+'")' if kind=='Color' else '"'+name+'"') for name in names)+'}')
properties=[]
for name in ['primaryContainerColor','secondaryContainerColor','primaryContentColor','secondaryContentColor']:
    start=row.index('public val '+name+': Color');properties.append(row[start:row.index('\n\n',start)])
params=tab[tab.index('selectedContentColor: Color = LocalContentColor.current,'):].split('interactionSource:',1)[0]
transition=tab[tab.index('private fun TabTransition('):tab.index('private fun TabBaselineLayout(')]
color_expression=re.search(r'if \(it\) activeColor else inactiveColor',transition).group(0)
colors='package androidx.compose.material3\ntypealias ColorToken=Color\ntypealias ShapeToken=String\ntypealias TypographyToken=String\ndata class Color(val role:String)\nclass RoundedCornerShape(val size:Dp)\nobject ElevationTokens {val Level0=0.dp}\nval Color.value get()=this\nobject LocalContentColor {var current=Color("primary")}\nobject TabRowDefaults {\n'+'\n'.join(properties)+'\n}\nfun tabColor(selected:Boolean,enabled:Boolean,'+params+') :Color {val activeColor=selectedContentColor;val inactiveColor=unselectedContentColor;val it=selected;return '+color_expression+'}\n'+tokens+'\n'+'\n'.join(adapters)
(CACHE/'Colors.kt').write_text(colors,encoding='utf-8')
classpath=str(RUNTIME/'stdlib.jar')
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',classpath,'-jvm-target','1.8','-d',str(CACHE/'oracle.jar'),str(CACHE/'Policy.kt'),str(CACHE/'Colors.kt'),str(HERE/'Harness.kt')],check=True)
for mode,file in [('baseline','baseline-oracle.json'),('rows','row-oracle.json'),('scrollable-rows','scrollable-row-oracle.json'),('indicator','indicator-oracle.json'),('scroll','scroll-oracle.json'),('transport','scroll-transport-oracle.json'),('center','center-oracle.json'),('colors','color-role-oracle.json')]:
    result=subprocess.run(['java','-cp',str(CACHE/'oracle.jar')+os.pathsep+classpath,'androidx.compose.material3.HarnessKt',mode],text=True,capture_output=True,check=True)
    cases=json.loads(result.stdout);(FIXTURES/file).write_text(json.dumps(cases,separators=(',',':'))+'\n',encoding='utf-8');print('Generated',len(cases),'unchanged Kotlin tab',mode,'cases.')
