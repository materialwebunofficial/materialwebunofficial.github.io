/* AndroidX TextFieldMeasurePolicy / OutlinedTextFieldMeasurePolicy, Apache-2.0.
 * Density1 leaf/font/constraint adapters bind native integer layout to the DOM.
 */
import {CubicBezierEasing,floatLerp} from '../motion/native-easing.js';
const f=Math.fround,infinity=2147483647,round=value=>Math.floor(value+.5),intLerp=(start,stop,g)=>start+round((stop-start)*f(g));
const heightEasing=new CubicBezierEasing(.3,0,.8,.15);
const centered=(size,space)=>round(f(f(space-size)/2));
const offsetValue=(value,amount)=>value===infinity?value:Math.max(0,value+amount);
const offset=(c,horizontal=0,vertical=0)=>({minWidth:offsetValue(c.minWidth,horizontal),maxWidth:offsetValue(c.maxWidth,horizontal),minHeight:offsetValue(c.minHeight,vertical),maxHeight:offsetValue(c.maxHeight,vertical)});
function checked(c){
 if(c.maxWidth<c.minWidth||c.maxHeight<c.minHeight||c.minWidth<0||c.minHeight<0)throw new RangeError(`maxWidth(${c.maxWidth}) must be >= than minWidth(${c.minWidth}),\nmaxHeight(${c.maxHeight}) must be >= than minHeight(${c.minHeight}),\nminWidth(${c.minWidth}) and minHeight(${c.minHeight}) must be >= 0`);
 return c;
}
const constrain=(value,min,max)=>Math.min(max,Math.max(min,value));
function horizontal(size,space,bias,rtl){const center=f(f(space-size)/2),resolved=rtl?f(-f(bias)):f(bias);return round(f(center*f(1+resolved)));}

/** Full source policy; leaves supply actual web/font measurements or reference inputs. */
export function measureTextField({kind='cutout',above=false,singleLine=false,rtl=false,progress=1,placeholderAlpha=1,affixAlpha=1,padding={start:16,top:16,end:16,bottom:16},constraints={minWidth:280,maxWidth:infinity,minHeight:56,maxHeight:infinity},leaves,minimizedBias=-1,expandedBias=-1,intrinsicQuery=null}){
 const g=f(progress),p=Object.fromEntries(Object.entries(padding).map(([key,value])=>[key,f(value)])),c=checked({...constraints}),filled=kind==='inside';
 const inputs=new Map(leaves.map(leaf=>[leaf.id,leaf])),measurements=[],placements={},measured={};let labelMeasured=null;
 const width=node=>node?.width??0,height=node=>node?.height??0;
 const intrinsic=(id,axis,available,max=false)=>{const input=inputs.get(id);if(!input)return 0;const name=(max?'max':'min')+'Intrinsic'+axis;return input[name]?.(available)??input[axis.toLowerCase()];};
 const measure=(id,bounds)=>{
  const input=inputs.get(id);if(!input)return null;checked(bounds);
  const leaf=input.measure?.({...bounds})??{width:constrain(input.width,bounds.minWidth,bounds.maxWidth),height:constrain(input.height,bounds.minHeight,bounds.maxHeight)};
  const result={id,width:leaf.width,height:leaf.height};measurements.push({id,constraints:{...bounds},width:result.width,height:result.height});measured[id]=result;return result;
 };
 try{
  const loose={...c,minWidth:0,minHeight:0},top=round(p.top),bottom=round(p.bottom);
  let occupiedX=0,occupiedY=0;
  for(const id of ['leading','trailing','prefix','suffix']){const item=measure(id,offset(loose,-occupiedX));occupiedX+=width(item);occupiedY=Math.max(occupiedY,height(item));}
  const leading=measured.leading,trailing=measured.trailing,prefix=measured.prefix,suffix=measured.suffix;
  let label=null,labelIntrinsic=0;
  if(!above){
   const horizontalOffset=filled?occupiedX:intLerp(occupiedX+round(rtl?p.end:p.start)+round(rtl?p.start:p.end),round(rtl?p.end:p.start)+round(rtl?p.start:p.end),g);
   label=measure('label',offset(loose,-horizontalOffset,-bottom));if(!filled)labelMeasured={width:width(label),height:height(label)};
  }else labelIntrinsic=intrinsic('label','Height',c.minWidth);
  const supportIntrinsic=intrinsic('supporting','Height',c.minWidth);
  const textTop=filled?top+height(label)+labelIntrinsic:above?top:Math.max(Math.trunc(height(label)/2),top);
  const textBounds=filled?offset({...c,minHeight:0},-occupiedX,-textTop-bottom-supportIntrinsic):{...offset(c,-occupiedX,-bottom-textTop-labelIntrinsic-supportIntrinsic),minHeight:0};
  const text=measure('text',textBounds),placeholder=measure('placeholder',{...textBounds,minWidth:0});
  if(!text)throw new TypeError('TextField requires a text leaf');
  occupiedY=Math.max(occupiedY,Math.max(height(text),height(placeholder))+textTop+bottom);
  function calculatedWidth(parts,bounds){
   const affix=parts.prefix+parts.suffix,middle=Math.max(parts.text+affix,parts.placeholder+affix,filled?parts.label:intLerp(parts.label,0,g));
   const wrapped=parts.leading+middle+parts.trailing;
   const focused=filled?0:round(f(f(parts.label+f(p.start+p.end))*g));return constrain(Math.max(wrapped,focused),bounds.minWidth,bounds.maxWidth);
  }
  function calculatedHeight(parts,bounds){
   const input=Math.max(parts.text,parts.placeholder,parts.prefix,parts.suffix,above?0:intLerp(parts.label,0,g));
   let middle;
   if(filled){const nonOverlapped=parts.label>0&&!above?Math.max(16,intLerp(0,parts.label,heightEasing.transform(g))):0;middle=round(f(p.top+p.bottom))+nonOverlapped+input;}
   else{const actualTop=above?p.top:floatLerp(p.top,Math.max(p.top,f(parts.label/2)),g);middle=round(f(f(actualTop+input)+p.bottom));}
   return constrain((above?parts.label:0)+Math.max(parts.leading,parts.trailing,middle)+parts.supporting,bounds.minHeight,bounds.maxHeight);
  }
  const parts=axis=>Object.fromEntries(['leading','trailing','prefix','suffix','text','label','placeholder','supporting'].map(id=>[id,measured[id]?.[axis]??0]));
  const resultWidth=calculatedWidth(parts('width'),c);
  if(above){label=measure('label',{...loose,maxHeight:labelIntrinsic,maxWidth:resultWidth});if(!filled)labelMeasured={width:width(label),height:height(label)};}
  const supporting=measure('supporting',{...offset(loose,0,-occupiedY),minHeight:0,maxWidth:resultWidth}),supportHeight=height(supporting);
  const resultHeight=calculatedHeight(parts('height'),c),labelOffset=above?height(label):0,bodyHeight=resultHeight-supportHeight-labelOffset;
  const container=measure('container',checked({minWidth:resultWidth===infinity?0:resultWidth,maxWidth:resultWidth,minHeight:bodyHeight===infinity?0:bodyHeight,maxHeight:bodyHeight}));
  if(!container)throw new TypeError('TextField requires a container leaf');
  const place=(item,x,y,relative=false,alpha=1)=>{if(item)placements[item.id]={x:relative&&rtl?resultWidth-item.width-x:x,y,width:item.width,height:item.height,alpha:f(alpha)};};
  place(container,0,labelOffset);
  place(leading,0,labelOffset+centered(height(leading),bodyHeight),true);
  if(label){
   const startY=above?0:singleLine?centered(label.height,bodyHeight):filled?top+8:top,endY=above?0:filled?top:-Math.trunc(label.height/2),y=intLerp(startY,endY,g);
   let x;
   if(above)x=horizontal(label.width,resultWidth,minimizedBias,rtl);
   else if(filled){const left=rtl?width(trailing):width(leading),space=resultWidth-width(leading)-width(trailing);x=intLerp(horizontal(label.width,space,expandedBias,rtl)+left,horizontal(label.width,space,minimizedBias,rtl)+left,g);}
   else{const leadPad=leading?f(leading.width+Math.max(0,f(p.start-12))):p.start,trailPad=trailing?f(trailing.width+Math.max(0,f(p.end-12))):p.end,leftPad=rtl?p.end:p.start,leftIconPad=rtl?trailPad:leadPad;
    const startX=f(horizontal(label.width,resultWidth-round(f(leadPad+trailPad)),expandedBias,rtl)+leftIconPad),endX=f(horizontal(label.width,resultWidth-round(f(p.start+p.end)),minimizedBias,rtl)+leftPad);x=round(floatLerp(startX,endX,g));}
   place(label,x,y);
  }
  const vertical=item=>{
   if(filled&&label)return labelOffset+top+(above?0:label.height);
   const baseline=labelOffset+(singleLine?centered(item.height,bodyHeight):top);
   return filled||above?baseline:Math.max(baseline,Math.trunc(height(label)/2));
  };
  if(prefix)place(prefix,width(leading),vertical(prefix),true,affixAlpha);
  place(text,width(leading)+width(prefix),vertical(text),true);
  if(placeholder)place(placeholder,width(leading)+width(prefix),vertical(placeholder),true,placeholderAlpha);
  if(suffix)place(suffix,resultWidth-width(trailing)-suffix.width,vertical(suffix),true,affixAlpha);
  place(trailing,resultWidth-width(trailing),labelOffset+centered(height(trailing),bodyHeight),true);
  place(supporting,0,labelOffset+bodyHeight,true);
  const intrinsicWidth=max=>calculatedWidth(Object.fromEntries(['leading','trailing','prefix','suffix','text','label','placeholder','supporting'].map(id=>[id,intrinsic(id,'Width',intrinsicQuery.height,max)])),{minWidth:0,maxWidth:infinity});
  const intrinsicHeight=max=>{
   const parts={};let remaining=intrinsicQuery.width;
   for(const id of ['leading','trailing']){if(inputs.has(id)){remaining=offsetValue(remaining,-intrinsic(id,'Width',infinity,true));parts[id]=intrinsic(id,'Height',intrinsicQuery.width,max);}else parts[id]=0;}
   parts.label=intrinsic('label','Height',remaining,max);
   for(const id of ['prefix','suffix']){parts[id]=intrinsic(id,'Height',remaining,max);if(inputs.has(id))remaining=offsetValue(remaining,-intrinsic(id,'Width',infinity,true));}
   parts.text=intrinsic('text','Height',remaining,max);parts.placeholder=intrinsic('placeholder','Height',remaining,max);parts.supporting=intrinsic('supporting','Height',intrinsicQuery.width,max);
   return calculatedHeight(parts,{minHeight:0,maxHeight:infinity});
  };
  return{result:{width:resultWidth,height:resultHeight},measurements,placements,labelMeasured,intrinsic:intrinsicQuery?[intrinsicWidth(false),intrinsicWidth(true),intrinsicHeight(false),intrinsicHeight(true)]:null};
 }catch(error){error.measurements=measurements;throw error;}
}
