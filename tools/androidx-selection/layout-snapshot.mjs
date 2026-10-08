// Original selection modifier chains and unchanged foundation measure policies.
// Composition, input-node attachment and density1 are explicit supplied hosts.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
const root=fileURLToPath(new URL('../../',import.meta.url));
const cache=path.join(root,'research/selection-layout-generator'),runtime=path.join(root,'research/kotlin-runtime');
const base=path.join(root,'research/toolbar-row-generator/oracle.jar'),fix=path.join(root,'test/fixtures/androidx/selection');
const row=path.join(root,'test/fixtures/androidx/toolbar-row');fs.mkdirSync(cache,{recursive:true});
const read=(dir,name)=>fs.readFileSync(path.join(dir,name),'utf8').replaceAll('\r\n','\n');
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
for(const [name,entry]of Object.entries(JSON.parse(read(fix,'sources.json'))))
  if(sha(fs.readFileSync(path.join(fix,name.replace('tokens/',''))))!==entry.sha256)throw Error(name);
for(const entry of JSON.parse(read(row,'sources.json')).sources)
  if(sha(fs.readFileSync(path.join(row,entry.file)))!==entry.sha256)throw Error(entry.file);
if(!fs.existsSync(base))throw Error('Prepare original toolbar-row native runtime first');
function block(text,marker){
  const start=text.indexOf(marker),open=text.indexOf('{',start);if(start<0)throw Error(marker);
  let depth=0;for(let end=open;end<text.length;end++){depth+=(text[end]==='{')-(text[end]==='}');if(!depth)return text.slice(start,end+1);}throw Error(marker);
}
function call(text,marker){
  const start=text.indexOf(marker),open=text.indexOf('(',start);if(start<0)throw Error(marker);
  let depth=0;for(let end=open;end<text.length;end++){depth+=(text[end]==='(')-(text[end]===')');if(!depth)return text.slice(open+1,end);}throw Error(marker);
}
function statement(text,marker){const start=text.indexOf(marker);if(start<0)throw Error(marker);return text.slice(start,text.indexOf('\n\n',start));}
const checkbox=read(fix,'Checkbox.kt'),radio=read(fix,'RadioButton.kt'),sw=read(fix,'Switch.kt');
const relocate=text=>text.replace(/\bModifier\b/g,'SelectionModifier');
const radioSelection=radio.slice(radio.indexOf('val selectableModifier ='),radio.indexOf('    Canvas('));
const radioCanvas=call(radio,'    Canvas(');
const checkboxSelection=statement(checkbox,'val canvasModifier =');
const checkboxIndication=statement(checkbox,'val indication =');
const switchSelection=statement(sw,'val toggleableModifier =');
const switchBox=call(sw,'    Box(');
const dim=(file,name)=>{const text=read(fix,file),match=text.match(new RegExp(`inline val ${name}:.*\\n\\s*get\\(\\) = ([\\d.]+)\\.dp`));if(!match)throw Error(name);return match[1];};
const size=read(row,'Size.kt'),padding=read(row,'Padding.kt'),minimum=read(row,'InteractiveComponentSize.kt');
const policies=[
  block(size,'private class WrapContentNode(').replace('private class WrapContentNode','internal class SelectionWrapNode'),
  block(size,'private class SizeNode(').replace('private class SizeNode','class SelectionSizeNode'),
  block(padding,'private class PaddingNode(').replace('private class PaddingNode','class SelectionPaddingNode'),
  block(minimum,'internal class MinimumInteractiveModifierNode :').replaceAll('MinimumInteractiveModifierNode','SelectionMinimumNode'),
  size.slice(size.indexOf('internal enum class Direction {'))
];
const generated=`package androidx.compose.material3
import kotlin.math.*
${policies.join('\n')}
val Dp.isUnspecified get()=!isSpecified
fun Placeable.place(position:IntOffset)=placeAt(position+apparentToRealOffset,0f,null)
object CheckboxTokens {val ContainerSize=${dim('CheckboxTokens.kt','ContainerSize')}.dp;val StateLayerSize=${dim('CheckboxTokens.kt','StateLayerSize')}.dp}
object RadioButtonTokens {val IconSize=${dim('RadioButtonTokens.kt','IconSize')}.dp;val StateLayerSize=${dim('RadioButtonTokens.kt','StateLayerSize')}.dp}
object SwitchTokens {val TrackWidth=${dim('SwitchTokens.kt','TrackWidth')}.dp;val TrackHeight=${dim('SwitchTokens.kt','TrackHeight')}.dp}
${radio.slice(radio.indexOf('private val RadioButtonPadding'),radio.indexOf('private val RadioButtonDotSize'))}
private val SwitchWidth get()=SwitchTokens.TrackWidth
private val SwitchHeight get()=SwitchTokens.TrackHeight
fun nativeRadio(modifier:SelectionModifier,onClick:(()->Unit)?,enabled:Boolean):SelectionModifier {
 val selected=false;val interactionSource:Any?=null
 ${relocate(radioSelection)}
 return ${relocate(radioCanvas).trim()}
}
fun nativeCheckbox(modifier:SelectionModifier,onClick:(()->Unit)?,enabled:Boolean,padding:Dp=Dp.Unspecified):SelectionModifier {
 val state=ToggleableState.Off;val interactionSource:Any?=null;val rippleColor:Any?=null;val containerSize=CheckboxTokens.ContainerSize
 ${relocate(checkboxIndication)}
 ${relocate(checkboxSelection)}
 return canvasModifier
}
fun nativeSwitch(modifier:SelectionModifier,onClick:(()->Unit)?,enabled:Boolean):SelectionModifier {
 val onCheckedChange:((Boolean)->Unit)?=onClick?.let{{_:Boolean->it()}};val checked=false;val interactionSource:Any?=null
 val focusRingModifier=SelectionModifier;val trackShape:Any?=null;val borderColor:Any?=null;val trackColor:Any?=null;val TrackOutlineWidth=2.dp
 ${relocate(switchSelection)}
 return ${relocate(switchBox).trim()}
}
`;
const sources=path.join(cache,'NativePolicies.kt');fs.writeFileSync(sources,generated);
const cp=[base,path.join(runtime,'stdlib.jar')].join(path.delimiter),jar=path.join(cache,'oracle.jar');
const compile=spawnSync('java',['-cp',path.join(runtime,'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-Xfriend-paths='+base,'-jvm-target','1.8','-d',jar,sources,path.join(root,'tools/androidx-selection/Layout.kt')],{encoding:'utf8'});
if(compile.status!==0)throw Error(compile.stderr||compile.stdout);
const run=spawnSync('java',['-cp',jar+path.delimiter+cp,'androidx.compose.material3.LayoutKt'],{encoding:'utf8',maxBuffer:8*1024*1024});
if(run.status!==0)throw Error(run.stderr||run.stdout);
const records=JSON.parse(run.stdout),output=path.join(cache,'layout-oracle.json');fs.writeFileSync(output,JSON.stringify(records)+'\n');
const provenance={revision:'a095da93f8e98dea8748ceed79ea8427aade245f',base:sha(fs.readFileSync(base)),policies:sha(generated),host:sha(fs.readFileSync(path.join(root,'tools/androidx-selection/Layout.kt'))),output:sha(fs.readFileSync(output)),cases:records.length};
fs.writeFileSync(path.join(cache,'provenance.json'),JSON.stringify(provenance,null,2)+'\n');
if(process.argv.includes('--write-fixture')){fs.writeFileSync(path.join(fix,'layout-oracle.json.gz'),gzipSync(fs.readFileSync(output),{level:9}));fs.writeFileSync(path.join(fix,'layout-provenance.json'),JSON.stringify(provenance,null,2)+'\n');}
console.log(`Selection native layout: ${records.length} original modifier-chain/minimum/wrap/padding/required-size measure/place records prepared in research; ${sha(fs.readFileSync(output))}. Composition/input attachment are supplied hosts, not complete native input routing.`);
