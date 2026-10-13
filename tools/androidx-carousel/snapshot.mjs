// Execute the unchanged AndroidX a095da93 carousel sources through a density-1
// Kotlin host: the keyline lists (Keylines.kt, KeylineList.kt, Arrangement.kt),
// Strategy and its start/end steps, getSnapPositionOffset, Carousel.kt's
// calculateCurrentScrollOffset / calculateMaxScrollOffset and the placement
// body of Modifier.carouselItem, and CarouselParallaxScrollEffect.kt's item
// info. Writes test/fixtures/androidx/carousel/carousel-oracle.json.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),fix=path.join(root,'test/fixtures/androidx/carousel');
const manifest=JSON.parse(fs.readFileSync(path.join(fix,'sources.json'),'utf8'));
for(const entry of manifest.sources)if(crypto.createHash('sha256').update(fs.readFileSync(path.join(fix,entry.file))).digest('hex')!==entry.sha256)throw new Error('Pinned source mismatch: '+entry.file);
const read=file=>fs.readFileSync(path.join(fix,file),'utf8');
// Whole files without their package and import lines.
const strip=text=>text.split('\n').filter(line=>!/^(package|import) /.test(line)).join('\n');
function block(source,marker){const start=source.indexOf(marker),open=source.indexOf('{',start);if(start<0)throw new Error(marker);let depth=0;for(let i=open;i<source.length;i++){depth+=(source[i]==='{')-(source[i]==='}');if(depth===0)return source.slice(start,i+1);}throw new Error(marker);}
function between(source,from,to){const start=source.indexOf(from),end=source.indexOf(to,start);if(start<0||end<0)throw new Error(from);return source.slice(start,end);}
const carousel=read('Carousel.kt'),parallax=read('CarouselParallaxScrollEffect.kt');
// CarouselDefaults' sizes, as declared in the source.
const defaults=['MinSmallItemSize','MaxSmallItemSize','AnchorSize','MediumLargeItemDiffThreshold'].map(name=>{
  const line=carousel.split('\n').find(l=>new RegExp(`\\bval ${name}\\b`).test(l));if(!line)throw new Error(name);
  return line.trim().replace(/^(public|internal) /,'');}).join('\n ');
const host=`@file:OptIn(ExperimentalMaterial3Api::class)
import kotlin.math.*
import androidx.compose.ui.util.lerp
@RequiresOptIn annotation class ExperimentalMaterial3Api
@Target(AnnotationTarget.PROPERTY_GETTER,AnnotationTarget.VALUE_PARAMETER) annotation class FloatRange(val from:Double,val to:Double)
data class Dp(val value:Float)
val Int.dp get()=Dp(toFloat())
class Density{fun Dp.toPx()=value}
object CarouselDefaults{
 ${defaults}
}
inline fun <T> List<T>.fastForEach(action:(T)->Unit){for(i in indices)action(get(i))}
inline fun <T> List<T>.fastForEachIndexed(action:(Int,T)->Unit){for(i in indices)action(i,get(i))}
inline fun <T,R> List<T>.fastMapIndexed(transform:(Int,T)->R):List<R>{val r=ArrayList<R>(size);for(i in indices)r.add(transform(i,get(i)));return r}
inline fun <T> List<T>.fastFirstOrNull(predicate:(T)->Boolean):T?{for(i in indices){val e=get(i);if(predicate(e))return e};return null}
inline fun <T> List<T>.fastFilter(predicate:(T)->Boolean):List<T>{val r=ArrayList<T>(size);for(i in indices){val e=get(i);if(predicate(e))r.add(e)};return r}
typealias FloatList=List<Float>
fun mutableFloatListOf(vararg elements:Float):MutableList<Float> = elements.toMutableList()
class PagerState(val currentPage:Int,val currentPageOffsetFraction:Float,val pageCount:Int)
class CarouselState(val pagerState:PagerState)
class CarouselItemDrawInfoImpl{var sizeState=0f;var minSizeState=0f;var maxSizeState=0f;var maskLeftState=0f;var maskTopState=0f;var maskRightState=0f;var maskBottomState=0f}
`;
const sources=['Arrangement.kt','KeylineList.kt','Keylines.kt','Strategy.kt'].map(file=>strip(read(file))).join('\n')+'\n'+
  block(read('KeylineSnapPosition.kt'),'internal fun getSnapPositionOffset(')+'\n'+
  '@JvmInline\n'+block(carousel,'internal value class CarouselAlignment')+'\n'+
  block(carousel,'internal fun calculateCurrentScrollOffset(')+'\n'+
  block(carousel,'internal fun calculateMaxScrollOffset(')+'\n'+
  block(carousel,'private fun getProgress(')+'\n'+
  block(parallax,'public class CarouselParallaxScrollEffectItemInfo(')+'\n'+
  block(parallax,'private fun calculateItemInfo(')+'\n'+
  between(parallax,'private val EmptyCarouselParallaxScrollEffectItemInfo','private fun getMaskIntensity(')+'\n'+
  block(parallax,'private fun getMaskIntensity(')+'\n';
// Modifier.carouselItem: the z index, and the placement body inside layout { }.
const zIndex=between(carousel,'val distance = abs(index - state.pagerState.currentPage)','val width = placeable.width.toFloat()');
const placement=between(carousel,'val scrollOffset = calculateCurrentScrollOffset(state, strategyResult)','placeable.placeWithLayer(');
const placeHost=`
internal fun place(index:Int,state:CarouselState,strategyResult:Strategy,width:Float,height:Float,isVertical:Boolean):String{
 val carouselItemDrawInfo=CarouselItemDrawInfoImpl()
 ${zIndex}
 ${placement}
 return "[$itemZIndex,$scrollOffset,$maxScrollOffset,\${interpolatedKeyline.size},$maskLeft,$maskRight,$translation,$shouldClip]"
}
internal fun k(list:List<Keyline>)=list.joinToString(prefix="[",postfix="]"){"[\${it.size},\${it.offset},\${it.unadjustedOffset},\${it.isFocal},\${it.isAnchor},\${it.isPivot},\${it.cutoff}]"}
fun main(){
 val density=Density();val cases=mutableListOf<String>()
 for(layout in listOf("multi-browse","uncontained","hero"))
 for(available in listOf(200f,320f,360f,412f,600f,840f,1024f))
 for(preferred in (if(layout=="uncontained")listOf(120f,220f,300f)else if(layout=="hero")listOf(0f,240f)else listOf(120f,186f,220f,275f)))
 for(spacing in listOf(0f,8f))for(padding in listOf(0f,16f))
 for(count in (if(layout=="uncontained")listOf(10)else listOf(1,2,3,10))){
  val keylines=when(layout){
   "uncontained"->uncontainedKeylineList(density,available,preferred,spacing)
   "hero"->heroKeylineList(density,available,if(preferred==0f)null else preferred,spacing,count,isCentered=true)
   else->multiBrowseKeylineList(density,available,preferred,spacing,count)
  }
  val strategy=Strategy(keylines,available,spacing,padding,padding)
  val sb=StringBuilder()
  sb.append("{\\"layout\\":\\"$layout\\",\\"available\\":$available,\\"preferred\\":$preferred,\\"spacing\\":$spacing,\\"padding\\":$padding,\\"count\\":$count,")
  sb.append("\\"keylines\\":\${k(keylines)},\\"valid\\":\${strategy.isValid},\\"itemSize\\":\${if(strategy.isValid)strategy.itemMainAxisSize else 0f},")
  sb.append("\\"minItemSize\\":\${strategy.minItemSize},\\"maxItemSize\\":\${strategy.maxItemSize},")
  sb.append("\\"start\\":[\${strategy.startKeylineSteps.joinToString{k(it)}}],\\"end\\":[\${strategy.endKeylineSteps.joinToString{k(it)}}],")
  sb.append("\\"snap\\":[\${(0 until count).joinToString{getSnapPositionOffset(strategy,it,count).toString()}}],")
  val places=mutableListOf<String>()
  // Placements only for the larger lists and two widths, to keep the fixture small.
  if(strategy.isValid&&count>=3&&(available==360f||available==840f)){
   for(page in listOf(0,1,count/2,count-2,count-1))for(fraction in listOf(0f,.3f,-.45f,.5f)){
    if((page==0&&fraction<0f)||(page==count-1&&fraction>0f))continue
    val state=CarouselState(PagerState(page,fraction,count))
    for(index in 0 until count)places.add("[$page,$fraction,$index,\${place(index,state,strategy,strategy.itemMainAxisSize.roundToInt().toFloat(),200f,false)}]")
   }
  }
  sb.append("\\"placements\\":[\${places.joinToString()}]}")
  cases.add(sb.toString())
 }
 // CarouselParallaxScrollEffect item info.
 val infos=mutableListOf<String>()
 for(cross in listOf(9f,16f,205f,221f,0f))
 for(size in listOf(9f,16f,50f,100f,124f,125f,205f,221f,275f,305f,350f,392f,393f,500f,0f))
 for(viewport in listOf(listOf(0f,360f),listOf(-16f,344f)))
 for(visible in listOf(true,false)){
  val start=viewport[0];val end=viewport[1]
  var offset=start-size-20f
  while(offset<=end+20f){
   val i=calculateItemInfo(visible,size,cross,offset,start,end)
   infos.add("[$cross,$size,\${start},\${end},$visible,$offset,\${i.maskStart},\${i.maskEnd},\${i.parallax},\${i.maskProgress},\${i.size}]")
   offset+=max(7f,floor(size/9f))
  }
 }
 println("{\\"cases\\":[\${cases.joinToString()}],\\"parallax\\":[\${infos.joinToString()}]}")
}
`;
const cache=path.join(root,'research/carousel-generator'),runtime=path.join(root,'research/kotlin-runtime');fs.mkdirSync(cache,{recursive:true});
fs.writeFileSync(path.join(cache,'CarouselOracle.kt'),host+sources+placeHost);
// ui-util MathHelpers.lerp, in its own package as the sources reference it.
fs.writeFileSync(path.join(cache,'MathHelpers.kt'),'package androidx.compose.ui.util\nfun lerp(start:Float,stop:Float,fraction:Float):Float=(1-fraction)*start+fraction*stop\n');
function run(args){const r=spawnSync('java',args,{cwd:root,encoding:'utf8',maxBuffer:256e6});if(r.status!==0)throw new Error(r.stderr);return r.stdout;}
run(['-cp',path.join(runtime,'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-nowarn','-classpath',path.join(runtime,'stdlib.jar'),'-jvm-target','1.8','-d',path.join(cache,'carousel-oracle.jar'),path.join(cache,'CarouselOracle.kt'),path.join(cache,'MathHelpers.kt')]);
const data=JSON.parse(run(['-cp',path.join(cache,'carousel-oracle.jar')+path.delimiter+path.join(runtime,'stdlib.jar'),'CarouselOracleKt']));
fs.writeFileSync(path.join(fix,'carousel-oracle.json'),JSON.stringify({revision:manifest.revision,generator:'tools/androidx-carousel/snapshot.mjs',...data})+'\n');
console.log(`Carousel oracle: ${data.cases.length} keyline/strategy cases, ${data.cases.reduce((n,c)=>n+c.placements.length,0)} placements, ${data.parallax.length} parallax item infos.`);
