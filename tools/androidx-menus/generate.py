"""Execute pinned MenuPosition/MenuArrangement/color methods in Kotlin, unchanged.
Host stubs supply Compose types; equations and candidate ordering are upstream.
"""
from pathlib import Path
import re,json,hashlib,subprocess,os
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
FIXTURES=ROOT/'test/fixtures/androidx/menus';CACHE=ROOT/'research/menu-generator';CACHE.mkdir(exist_ok=True)
RUNTIME=ROOT/'research/kotlin-runtime'
manifest=json.loads((FIXTURES/'sources.json').read_text(encoding='utf-8'))
for source in manifest['sources']:
    if hashlib.sha256((FIXTURES/source['file']).read_bytes()).hexdigest()!=source['sha256']:raise RuntimeError(source['file']+' source changed')
read=lambda name:(FIXTURES/name).read_text(encoding='utf-8')
def extract(s,prefix):
    start=s.index(prefix);i=s.index('{',start);depth=1;i+=1
    while depth:
        if s[i]=='{':depth+=1
        elif s[i]=='}':depth-=1
        i+=1
    return s[start:i]
menu=read('Menu.kt');defaults=read('MenuDefaults.kt')
positions=read('MenuPosition.kt');positions=positions[positions.index('@Stable\ninternal object MenuPosition'):]
positions=positions.replace('override var transformOrigin by mutableStateOf(TransformOrigin.Center)','override var transformOrigin = TransformOrigin.Center')
imports='\n'.join(line.replace('androidx.compose.material3.internal.MenuPosition.','androidx.compose.material3.MenuPosition.') for line in menu.splitlines() if line.startswith('import androidx.compose.material3.internal.MenuPosition.'))
parts=[extract(menu,prefix) for prefix in ['public interface MenuPositionScope','public class MenuAnchorPosition','public interface DropdownMenuPopupPositionProvider','internal fun calculateTransformOrigin','internal class MenuArrangement']]
scope_start=menu.index('internal class MenuPositionScopeImpl')
parts.append(menu[scope_start:menu.index('\n\n',scope_start)])
(CACHE/'Policy.kt').write_text('package androidx.compose.material3\nimport kotlin.math.max\nimport kotlin.math.min\n'+imports+'\n'+positions+'\n'+'\n'.join(parts),encoding='utf-8')

names=['textColor','leadingIconColor','trailingIconColor','containerColor'];select=['textColor','leadingIconColor','trailingContentColor','containerColor']
ordinary=menu[menu.index('public class MenuItemColors'):menu.index('public class SelectableMenuItemColors')]
selected=menu[menu.index('public class SelectableMenuItemColors'):]
fields=['textColor','leadingIconColor','trailingIconColor','disabledTextColor','disabledLeadingIconColor','disabledTrailingIconColor','containerColor','disabledContainerColor']
select_fields=[prefix+name[0].upper()+name[1:] if prefix else name for prefix in ['', 'disabled','selected'] for name in select]
classes='class MenuItemColors('+','.join('val '+name+':Color' for name in fields)+'){\n'+'\n'.join(extract(ordinary,'internal fun '+name+'(') for name in names)+'\n}\nclass SelectableMenuItemColors('+','.join('val '+name+':Color' for name in select_fields)+'){\n'+'\n'.join(extract(selected,'internal fun '+name+'(') for name in select)+'\n}\n'
cache_names=['defaultMenuItemColors','defaultMenuItemVibrantColors','defaultMenuSelectableItemColors','defaultMenuSelectableItemVibrantColors']
constructors='\n'.join(extract(defaults,'internal val ColorScheme.'+name+':') for name in cache_names)
scheme='class ColorScheme {'+';'.join('var '+name+'Cached:'+('SelectableMenuItemColors' if 'Selectable' in name else 'MenuItemColors')+'?=null' for name in cache_names)+'}\n'
tokens='\n'.join('internal object '+read(name).split('internal object ',1)[1] for name in ['ListTokens.kt','MenuTokens.kt','StandardMenuTokens.kt','VibrantMenuTokens.kt','SegmentedMenuTokens.kt']).replace('androidx.compose.ui.unit.Dp','Dp')
adapters=[]
for object_name,kind in [('ColorSchemeKeyTokens','Color'),('ShapeKeyTokens','String'),('TypographyKeyTokens','String')]:
    keys=sorted(set(re.findall(object_name+r'\.(\w+)',tokens)))
    adapters.append('object '+object_name+' {'+';'.join('val '+name+' = '+('Color("'+re.sub(r'(?<!^)(?=[A-Z])','-',name).lower()+'")' if kind=='Color' else '"'+name+'"') for name in keys)+'}')
color='package androidx.compose.material3\ntypealias ColorToken=Color\ntypealias ShapeToken=String\ntypealias TypographyToken=String\ndata class Color(val role:String,val alpha:Float=1f){companion object {val Transparent=Color("transparent",0f)}}\nfun ColorScheme.fromToken(token:ColorToken)=token\n'+scheme+classes+constructors+'\n'+tokens+'\n'+'\n'.join(adapters)+'\nobject ElevationTokens {val Level0=0.dp;val Level2=3.dp;val Level4=8.dp}\n'
(CACHE/'Colors.kt').write_text(color,encoding='utf-8')
# Original rounded-corner constructors and state branches, with host-only Shape
# and MaterialTheme holders. Compose drawing is outside this projection.
shape_names=['defaultMenu'+kind+family+'Shapes' for family in ['Item','Group'] for kind in ['Standalone','Leading','Middle','Trailing']]
holders='class Shapes {'+';'.join('var '+name+'Cached:'+('MenuItemShapes' if 'Item' in name else 'MenuGroupShapes')+'?=null' for name in shape_names)+'}\nobject MaterialTheme {val shapes=Shapes()}\n'
constructors='\n'.join(extract(defaults,'internal val Shapes.'+name+':') for name in shape_names)
shape_tokens=read('ShapeTokens.kt').split('internal object ',1)[1]
shape_functions='\n'.join(extract(defaults,'public fun '+name+'(') for name in ['groupShape','itemShape'])
branches=[]
for family,parameters in [('Item','selected:Boolean'),('Group','hasBeenHovered:Boolean,hovered:Boolean')]:
    fn=menu[menu.index('private fun shapeByInteraction(\n    shapes: Menu'+family+'Shapes,'):]
    expression=fn[fn.index('val shape =')+len('val shape ='):fn.index('\n    if (shapes.hasRoundedCornerShapes)')].strip()
    branches.append('fun shape'+family+'(shapes:Menu'+family+'Shapes,'+parameters+'):Shape = '+expression)
shapes='package androidx.compose.material3\ntypealias Shape=RoundedCornerShape\ndata class RoundedCornerShape(val topStart:Dp,val topEnd:Dp,val bottomEnd:Dp,val bottomStart:Dp){constructor(all:Dp):this(all,all,all,all)}\nfun CornerSize(value:Dp)=value\nval CircleShape=RoundedCornerShape(1000.dp)\nval RectangleShape=RoundedCornerShape(0.dp)\ninternal object '+shape_tokens+'\n'+holders+'\n'+extract(menu,'public class MenuItemShapes(')+'\n'+extract(menu,'public class MenuGroupShapes(')+'\nobject MenuDefaults {\n'+constructors+'\n'+shape_functions+'\n}\n'+ '\n'.join(branches)+'\nfun Shapes.fromToken(token:ShapeToken):Shape = when(token){'+ ';'.join('"'+name+'" -> ShapeTokens.'+name for name in ['CornerExtraSmall','CornerSmall','CornerMedium','CornerLarge'])+';else -> error(token)}\n'
(CACHE/'Shapes.kt').write_text(shapes,encoding='utf-8')
classpath=str(RUNTIME/'stdlib.jar')
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',classpath,'-jvm-target','1.8','-d',str(CACHE/'oracle.jar'),str(CACHE/'Policy.kt'),str(CACHE/'Colors.kt'),str(CACHE/'Shapes.kt'),str(HERE/'Harness.kt')],check=True)
for mode,file in [('position','position-oracle.json'),('arrange','arrangement-oracle.json'),('colors','color-role-oracle.json'),('shapes','shape-state-oracle.json')]:
    result=subprocess.run(['java','-cp',str(CACHE/'oracle.jar')+os.pathsep+classpath,'androidx.compose.material3.HarnessKt',mode],text=True,capture_output=True,check=True)
    cases=json.loads(result.stdout);(FIXTURES/file).write_text(json.dumps(cases,separators=(',',':'))+'\n',encoding='utf-8');print('Generated',len(cases),'unchanged Kotlin menu',mode,'cases.')
