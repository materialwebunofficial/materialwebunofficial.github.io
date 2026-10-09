// Execute unchanged Material3 transformation and native Foundation plain-text
// buffer paths. Recomposition, styled annotations and IME dispatch are separate.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),fixture=path.join(root,'test/fixtures/androidx/picker'),cache=path.join(root,'research/picker-input-generator'),runtime=path.join(root,'research/kotlin-runtime');fs.mkdirSync(cache,{recursive:true});
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),read=name=>fs.readFileSync(path.join(fixture,name),'utf8').replaceAll('\r\n','\n');
const sources=[];for(const manifest of ['sources.json','input-sources.json'])for(const source of JSON.parse(read(manifest)).sources){if(hash(fs.readFileSync(path.join(fixture,source.file)))!==source.sha256)throw Error('Original SHA '+source.file);sources.push({...source,file:'test/fixtures/androidx/picker/'+source.file});}
function block(text,marker){const start=text.indexOf(marker);if(start<0)throw Error(marker);let end=text.indexOf('{',start)+1,depth=1;while(depth&&end<text.length){depth+=(text[end]==='{')-(text[end]==='}');end++;}if(depth)throw Error('Unclosed '+marker);return text.slice(start,end);}
const license=read('TimePicker.kt').slice(0,read('TimePicker.kt').indexOf('*/')+2)+'\n',save=(name,text)=>fs.writeFileSync(path.join(cache,name),text);
const strip=text=>text.replace(/^import androidx\.compose\.runtime\.(Immutable|Stable)\n/gm,'').replace(/^import androidx\.compose\.foundation\.text\.input\.internal\.Interval\n/gm,'').replace(/^@(?:Immutable|Stable)\n/gm,'').replace(/^\s*@OptIn\(ExperimentalFoundationApi::class\)\n/gm,'\n');
save('TextRange.kt',strip(read('TextRange.kt')));
save('GapBuffer.kt',read('GapBuffer.kt'));save('ChangeTracker.kt',read('ChangeTracker.kt'));save('TextFieldCharSequence.kt',read('TextFieldCharSequence.kt'));
const buffer=read('TextFieldBuffer.kt'),header=buffer.slice(0,buffer.indexOf('public class TextFieldBuffer'));
const plain=buffer.slice(buffer.indexOf('public class TextFieldBuffer'),buffer.indexOf('    internal fun toTextFieldCharSequence('));
save('TextFieldBuffer.kt',strip(header+plain+block(buffer,'    private fun requireValidIndex(')+'\n'+block(buffer,'    private fun requireValidRange(')+'\n'+block(buffer,'    private fun requireTextFieldBuffer(')+'\n'+block(buffer,'    public interface ChangeList {')+'\n}\n'+block(buffer,'internal fun adjustTextRange(')+'\n'+block(buffer,'public fun TextFieldBuffer.delete(')+'\n'+block(buffer,'internal inline fun findCommonPrefixAndSuffix(')));
const flag=read('ComposeFoundationFlags.kt').match(/public var isBasicTextFieldStyledTextEnabled: Boolean = (true|false)/)?.[0];if(!flag)throw Error('Missing actual style flag');
save('FoundationHost.kt','package androidx.compose.foundation\nobject ComposeFoundationFlags{'+flag+'}\nannotation class ExperimentalFoundationApi\n');
save('Preconditions.kt','package androidx.compose.foundation.internal\ninline fun requirePrecondition(value:Boolean,message:()->String){require(value,message)}\ninline fun checkPrecondition(value:Boolean,message:()->String){check(value,message)}\n');
save('RangePrecondition.kt','package androidx.compose.ui.text.internal\ninline fun requirePrecondition(value:Boolean,message:()->String){require(value,message)}\n');
save('VectorHost.kt','package androidx.compose.runtime.collection\ntypealias MutableVector<T> = ArrayList<T>\nfun <T> MutableVector(size:Int,init:(Int)->T)=ArrayList<T>(size).also{list->repeat(size){list.add(init(it))}}\nfun <T> mutableVectorOf()=ArrayList<T>()\n');
save('UtilHost.kt','package androidx.compose.ui.util\nfun packInts(first:Int,second:Int):Long=(first.toLong() shl 32) or (second.toLong() and 0xffffffffL)\nfun unpackInt1(value:Long):Int=(value shr 32).toInt()\nfun unpackInt2(value:Long):Int=value.toInt()\nfun Int.fastCoerceIn(minimumValue:Int,maximumValue:Int)=coerceIn(minimumValue,maximumValue)\ninline fun <T> List<T>.fastForEach(action:(T)->Unit)=forEach(action)\n');
save('AnnotationHost.kt','package androidx.compose.ui.text\nclass AnnotatedString{interface Annotation;data class Range<T>(val item:T,val start:Int,val end:Int)}\nclass SpanStyle;class ParagraphStyle\n');
save('UnusedStyleHost.kt','package androidx.compose.foundation.text.input\nimport androidx.compose.foundation.text.input.internal.TextStyleBuffer\nimport androidx.compose.ui.text.AnnotatedString\ninternal class TextFieldTextStylesImpl{val textStyleBuffer:TextStyleBuffer<AnnotatedString.Annotation> get()=error("Unused styled input")}\n');
// TimePicker state is shared unchanged with the clock reference; scalar/Dp and
// Saver are hosts. Only the input policy and original field/selection edits run.
const time=read('TimePicker.kt'),section=(from,to)=>time.slice(time.indexOf(from),time.indexOf(to,time.indexOf(from)));
const tokens=read('TimeInputTokens.kt').slice(read('TimeInputTokens.kt').indexOf('internal object'));
const symbols=name=>[...new Set([...tokens.matchAll(new RegExp(name+'\\.(\\w+)','g'))].map(match=>match[1]))];
save('InputTokens.kt',license+'package androidx.compose.material3\ntypealias ColorToken=String\ntypealias ShapeToken=String\ntypealias TypographyToken=String\nval Double.dp:Float get()=toFloat()\nval Int.dp:Float get()=toFloat()\nobject ElevationTokens{val Level3:Float get()=error("Unused elevation token")}\n'+['ColorSchemeKeyTokens','ShapeKeyTokens','TypographyKeyTokens'].map(name=>'object '+name+'{'+symbols(name).map(value=>'const val '+value+'="'+value+'"').join(';')+'}').join('\n')+'\n'+tokens.replaceAll('androidx.compose.ui.unit.Dp','Float'));
const state=[block(time,'public interface TimePickerState {'),section('public val TimePickerState.isPm:','/**\n * Factory function'),block(time,'@JvmInline\npublic value class TimePickerSelectionMode private constructor'),block(time,'private class TimePickerStateImpl('),block(time,'private class TimeInputTransformation('),block(time,'internal interface TimeInputErrorHandler {')].join('\n');
save('OriginalInput.kt',license+`package androidx.compose.material3
import kotlin.reflect.KProperty
import androidx.compose.foundation.text.input.*
import androidx.compose.ui.text.TextRange
@Target(AnnotationTarget.PROPERTY_GETTER,AnnotationTarget.VALUE_PARAMETER) annotation class IntRange(val from:Long=0,val to:Long=Long.MAX_VALUE)
typealias IntList=List<Int>
fun intListOf(vararg items:Int)=items.toList()
fun MutableIntList(capacity:Int)=ArrayList<Int>(capacity)
class MutableState<T>(var value:T)
fun <T> mutableStateOf(value:T)=MutableState(value)
operator fun <T> MutableState<T>.getValue(o:Any?,p:KProperty<*>):T=value
operator fun <T> MutableState<T>.setValue(o:Any?,p:KProperty<*>,v:T){value=v}
class IntState(var intValue:Int)
fun mutableIntStateOf(value:Int)=IntState(value)
class Saver<T,S>(val save:(T)->S,val restore:(S)->T)
class Ref<T>{var value:T?=null}
interface InputTransformation{fun TextFieldBuffer.transformInput()}
const val MaxHourValue=23
const val MaxMinuteValue=59
${time.match(/private const val MaxValueForTextField = \d+/)?.[0]}
${time.match(/private val SupportLabelTop\s+get\(\) = \d+\.dp/)?.[0]}
${state}
`+fs.readFileSync(path.join(root,'tools/androidx-picker/InputProbe.kt'),'utf8'));
const cp=['stdlib.jar','collection.jar','androidx-annotation.jar'].map(name=>path.join(runtime,name)).join(path.delimiter);
const run=(command,args)=>{const result=spawnSync(command,args,{cwd:root,encoding:'utf8',maxBuffer:40e6});if(result.status!==0)throw Error(result.stderr||result.stdout);return result.stdout;};
run('java',['-cp',path.join(runtime,'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',cp,'-jvm-target','1.8','-d',path.join(cache,'reference.jar'),...fs.readdirSync(cache).filter(name=>name.endsWith('.kt')).map(name=>path.join(cache,name)),path.join(root,'tools/androidx-picker/InputPlatformHost.kt')]);
const records=JSON.parse(run('java',['-cp',path.join(cache,'reference.jar')+path.delimiter+cp,'androidx.compose.material3.OriginalInputKt'])),bytes=Buffer.from(JSON.stringify(records)+'\n');
const hosts=['tools/androidx-picker/generate-input.mjs','tools/androidx-picker/InputPlatformHost.kt','tools/androidx-picker/InputProbe.kt'].map(file=>({file,sha256:hash(fs.readFileSync(path.join(root,file)))}));
const meta={revision:'a095da93f8e98dea8748ceed79ea8427aade245f',count:records.records.length,sha256:hash(bytes),sources,hosts,scope:'Complete unchanged TimeInputTransformation and TimePickerState input setters/validity. Original plain-text TextFieldBuffer constructor, selection, replace/delete/revert/edit range paths, full GapBuffer/PartialGapBuffer, ChangeTracker, TextFieldCharSequence and TextRange bodies execute. Plain scalar state/Saver, JVM Char digit conversion, collection/packing/character-copy/precondition helpers and unused style/mapping leaves are explicit hosts; original style flag value is retained. Styled annotation APIs, native TextFieldState transactions/recomposition, IME/keyboard/focus dispatch, platform error feedback, locale and raster are not executed.'};
for(const[name,value]of[['input.json',bytes],['input.meta.json',Buffer.from(JSON.stringify(meta,null,2)+'\n')]]){const target=path.join(fixture,name);if(process.argv.includes('--check')){if(!fs.readFileSync(target).equals(value))throw Error('Reference drift '+name);}else fs.writeFileSync(target,value);}
console.log('Original picker input: '+records.records.length+' buffer/transform snapshots, '+records.digits.length+' JVM BMP digits, SHA '+hash(bytes));
