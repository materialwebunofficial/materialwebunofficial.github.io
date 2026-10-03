"""Compile unchanged pinned list measurement/color policy with host-only adapters.
Uses the private Kotlin runtime already initialized by tools/androidx-motion.
Normal tests read JSON and need no Java, network or compiler installation.
"""
from pathlib import Path
import hashlib, json, os, re, subprocess
ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
FIXTURES = ROOT/'test/fixtures/androidx/lists'
CACHE = ROOT/'research/list-generator'
CACHE.mkdir(exist_ok=True)
RUNTIME = ROOT/'research/kotlin-runtime'
manifest = json.loads((FIXTURES/'sources.json').read_text(encoding='utf-8'))
for entry in manifest['sources']:
    if hashlib.sha256((FIXTURES/entry['file']).read_bytes()).hexdigest() != entry['sha256']:
        raise RuntimeError('Pinned list source changed: '+entry['file'])
source = (FIXTURES/'ListItem.kt').read_text(encoding='utf-8')
defaults = (FIXTURES/'ListItemDefaults.kt').read_text(encoding='utf-8')

def extract(text, prefix):
    start=text.index(prefix); opening=text.index('{',start); depth=1; i=opening+1
    while depth:
        if text[i]=='{': depth+=1
        elif text[i]=='}': depth-=1
        i+=1
    return text[start:i]

policy=extract(source,'private class InteractiveListItemMeasurePolicy').replace('private class','class',1)
policy=policy.replace('@OptIn(ExperimentalMaterial3Api::class)','')
kind='@JvmInline\n'+extract(source,'private value class ListItemType')
heuristic=source[source.index('private fun Density.isSupportingMultilineHeuristic'):].split('\n\n',1)[0]
alignment=extract(defaults,'public fun verticalAlignment()')
breakpoint=source[source.index('internal val InteractiveListVerticalAlignmentBreakpoint'):]
(CACHE/'Policy.kt').write_text('package androidx.compose.material3\nimport kotlin.math.max\n'+policy+'\n'+kind+'\n'+heuristic+'\n'+alignment+'\n'+breakpoint,encoding='utf8')
# This class adapter only holds constructor values; its state-selection methods
# and the default/segmented constructor getter are unchanged upstream source.
members=['containerColor','contentColor','leadingContentColor','trailingContentColor','overlineContentColor','supportingContentColor']
fields=[prefix+name[0].upper()+name[1:] if prefix else name for prefix in ['', 'disabled','selected','dragged'] for name in members]
getters='\n'.join(extract(defaults,'public fun '+name+'(') for name in members)
constructors='\n'.join(extract(defaults,'internal val ColorScheme.'+name+':') for name in ['defaultListItemColors','defaultSegmentedListItemColors'])
token_text=[]
for name in ['ListTokens.kt','ReorderListTokens.kt']:
    token_text.append((FIXTURES/name).read_text(encoding='utf-8').split('internal object ',1)[1])
tokens='\n'.join('internal object '+text for text in token_text).replace('androidx.compose.ui.unit.Dp','Dp')
adapters=[]
for object_name,kind_name in [('ColorSchemeKeyTokens','Color'),('ShapeKeyTokens','String'),('TypographyKeyTokens','String')]:
    names=sorted(set(re.findall(object_name+r'\.(\w+)',tokens)))
    adapters.append('object '+object_name+' {\n'+'\n'.join('val '+name+' = '+('Color("'+re.sub(r'(?<!^)(?=[A-Z])','-',name).lower()+'")' if kind_name=='Color' else '"'+name+'"') for name in names)+'\n}')
adapters.append('object ElevationTokens {val Level0=0.dp;val Level4=8.dp}')
color_source='package androidx.compose.material3\ntypealias ColorToken=Color\ntypealias ShapeToken=String\ntypealias TypographyToken=String\ndata class Color(val role:String,val alpha:Float=1f)\nfun ColorScheme.fromToken(token:ColorToken)=token\nclass ColorScheme {var defaultListItemColorsCached:ListItemColors?=null;var defaultSegmentedListItemColorsCached:ListItemColors?=null}\nclass ListItemColors('+','.join('val '+name+':Color' for name in fields)+') {\n'+getters+'\n}\n'+constructors+'\n'+tokens+'\n'+'\n'.join(adapters)
(CACHE/'Colors.kt').write_text(color_source,encoding='utf8')
# Execute the unchanged state-selection block from shapeForInteraction. Compose
# drawing/remember calls are outside this projection and are not compiled here.
shape_function=extract(defaults,'internal fun ListItemShapes.shapeForInteraction(')
shape_branch=extract(shape_function,'when {')
shape_source='package androidx.compose.material3\nfun shapeIndex(selected:Boolean,pressed:Boolean,focused:Boolean,hovered:Boolean,dragged:Boolean):Int {val shape=1;val selectedShape=2;val pressedShape=3;val focusedShape=4;val hoveredShape=5;val draggedShape=6;return '+shape_branch+'}\n'
(CACHE/'Shapes.kt').write_text(shape_source,encoding='utf8')
classpath=str(RUNTIME/'stdlib.jar')
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',classpath,'-jvm-target','1.8','-d',str(CACHE/'oracle.jar'),str(CACHE/'Policy.kt'),str(CACHE/'Colors.kt'),str(CACHE/'Shapes.kt'),str(HERE/'Harness.kt')],check=True)
for mode,file in [('layout','geometry-oracle.json'),('colors','color-role-oracle.json'),('shapes','shape-state-oracle.json')]:
    result=subprocess.run(['java','-cp',str(CACHE/'oracle.jar')+os.pathsep+classpath,'androidx.compose.material3.HarnessKt',mode],capture_output=True,text=True,check=True)
    cases=json.loads(result.stdout)
    (FIXTURES/file).write_text(json.dumps(cases,separators=(',',':'))+'\n',encoding='utf8')
    print(f'Generated {len(cases)} unchanged Kotlin list {mode} cases.')
