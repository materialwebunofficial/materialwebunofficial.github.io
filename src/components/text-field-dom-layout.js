/** Browser leaf/font adapter for the unchanged integer Material field policies. */
import {measureTextField} from './text-field-layout.js';
const round=value=>Math.floor(Math.fround(value)+.5),clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
export function layoutTextField(field){
 const root=field.shadowRoot.querySelector('.tf-root'),box=field.shadowRoot.querySelector('.field-box'),editor=field._fieldInput(),mirrors=field.shadowRoot.querySelector('.field-measurements');
 if(!root||!box||!editor||!mirrors)return;
 const allocation=field._fieldSize?.width??box.getBoundingClientRect().width;if(allocation<=0)return;
 const width=round(allocation),frame=field._fieldFrame??{label:1,placeholder:1,affix:1},g=frame.label,position=field._fieldLabelPosition(),above=position==='above',kind=position==='cutout'?'cutout':'inside',rtl=field._fieldRtl;
 const singleLine=field._usesSingleLineEditor(),hasLabel=!!field.label,padding={start:16,top:hasLabel&&position==='inside'?8:16,end:16,bottom:hasLabel&&position==='inside'?8:16};
 const leading=field.shadowRoot.querySelector('.leading'),trailing=field.shadowRoot.querySelector('.trailing'),clear=field.shadowRoot.querySelector('.clear-button');
 const hasLeading=!!field.icon,hasTrailing=!!field.trailingIcon||!!clear&&!clear.hidden,affixVisible=frame.affix>0,prefix=affixVisible?field.prefixText:'',suffix=affixVisible?field.suffixText:'';
 const start=hasLeading?4:16,end=hasTrailing?4:16,wrappers={};
 const helper=field.shadowRoot.querySelector('.helper-row');
 // A single-line editor fills the field on one fixed-height line, so its
 // measurement depends on whether it is empty, not on the text itself.
 const key=JSON.stringify([width,g,frame.affix>0,frame.placeholder>0,singleLine?!!field.value:field.value,field.placeholder,field.label,position,rtl,singleLine,field.minLines,field.maxLines,hasLeading,hasTrailing,prefix,suffix,field.minimizedLabelAlignment,field.expandedLabelAlignment,helper.hidden,field.maxlength,helper.textContent]);
 if(field._fieldLayoutKey===key){
  for(const id of['prefix','suffix','placeholder']){const place=field._fieldLayout?.placements[id];if(place)place.alpha=Math.fround(id==='placeholder'?frame.placeholder:frame.affix);}
  return;
 }
 function glyph(id,text,maxWidth,font,wrap=true){
  const node=mirrors.querySelector('.measure-'+id);node.className='measure-'+id+' '+font;node.textContent=text?(text.endsWith('\n')?text+'\u200b':text):'\u200b';
  node.style.whiteSpace=wrap?'pre-wrap':'pre';node.style.width='max-content';node.style.maxWidth=Math.max(0,maxWidth)+'px';
  const rect=node.getBoundingClientRect();return{width:Math.ceil(rect.width),height:Math.ceil(rect.height)};
 }
 function leaf(id,text,font,{startPad=0,endPad=0,bottomPad=0,minHeight=24,fill=false,multi=false}={}){
  const measure=bounds=>{
   const innerWidth=Math.max(0,bounds.maxWidth-startPad-endPad),raw=glyph(id,text,innerWidth,font,id!=='text'||!singleLine);
   let contentHeight=raw.height;
   if(multi){const line=glyph(id,'\u200b',innerWidth,font).height;contentHeight=clamp(raw.height,field.minLines*line,(field.maxLines??2147483647)*line);}
   const reportedWidth=clamp(fill?bounds.maxWidth:raw.width+startPad+endPad,bounds.minWidth,bounds.maxWidth),reportedHeight=clamp(Math.max(minHeight,contentHeight+bottomPad),bounds.minHeight,bounds.maxHeight);
   wrappers[id]={start:startPad,end:endPad,bottom:bottomPad,contentHeight:Math.min(contentHeight,Math.max(0,reportedHeight-bottomPad))};
   return{width:reportedWidth,height:reportedHeight};
  };
  return{id,measure,minIntrinsicHeight:available=>{const raw=glyph(id,text,Math.max(0,available-startPad-endPad),font,true);return Math.max(minHeight,raw.height+bottomPad);},width:0,height:0};
 }
 const leaves=[leaf('text',singleLine?field._visualFieldValue():field.value,'measure-body',{startPad:prefix?0:start,endPad:suffix?0:end,fill:true,multi:!singleLine})];
 if(hasLeading)leaves.push({id:'leading',width:48,height:48});if(hasTrailing)leaves.push({id:'trailing',width:48,height:48});
 if(prefix)leaves.push(leaf('prefix',prefix,'measure-body',{startPad:start,endPad:2}));if(suffix)leaves.push(leaf('suffix',suffix,'measure-body',{startPad:2,endPad:end}));
 if(hasLabel)leaves.push(leaf('label',field.label,'measure-label',{startPad:above?4:kind==='inside'?start:0,endPad:above?4:kind==='inside'?end:0,bottomPad:above?4:0,minHeight:round(24+(16-24)*g)}));
 const showPlaceholder=!field.value&&frame.placeholder>0&&!!field.placeholder;
 if(showPlaceholder)leaves.push(leaf('placeholder',field.placeholder,'measure-body',{startPad:prefix?0:start,endPad:suffix?0:end}));
 if(!helper.hidden)leaves.push({id:'supporting',width,minIntrinsicHeight:()=>Math.ceil(helper.getBoundingClientRect().height),measure:bounds=>({width:bounds.maxWidth,height:clamp(Math.ceil(helper.getBoundingClientRect().height),bounds.minHeight,bounds.maxHeight)})});
 leaves.push({id:'container',width:0,height:0});
 const bias=value=>value==='center'?0:value==='end'?1:-1;
 const result=measureTextField({kind,above,singleLine,rtl,progress:g,placeholderAlpha:frame.placeholder,affixAlpha:frame.affix,padding,constraints:{minWidth:width,maxWidth:width,minHeight:56,maxHeight:2147483647},leaves,minimizedBias:bias(field.minimizedLabelAlignment),expandedBias:bias(field.expandedLabelAlignment)});
 field._fieldLayout=result;
 const container=result.placements.container,external=hasLabel&&position==='cutout'?8:0;
 root.style.paddingBlockStart=(external+container.y)+'px';box.style.height=container.height+'px';
 const elements={text:editor,label:field.shadowRoot.querySelector('.label'),prefix:field.shadowRoot.querySelector('.prefix'),suffix:field.shadowRoot.querySelector('.suffix'),placeholder:field.shadowRoot.querySelector('.placeholder'),leading,trailing:field.trailingIcon?trailing:clear};
 for(const [id,node]of Object.entries(elements)){
  if(!node)continue;const place=result.placements[id];
  if(!place){if(id==='placeholder')node.hidden=true;continue;}
  const wrap=wrappers[id]??{start:0,end:0,bottom:0,contentHeight:place.height},leftPadding=rtl?wrap.end:wrap.start;
  node.style.left=(place.x+leftPadding)+'px';node.style.top=(place.y-container.y+Math.max(0,(place.height-wrap.bottom-wrap.contentHeight)/2))+'px';
  node.style.width=Math.max(0,place.width-wrap.start-wrap.end)+'px';node.style.height=wrap.contentHeight+'px';
  if(id==='placeholder'){node.hidden=false;node.textContent=field.placeholder;}
 }
 if(!showPlaceholder)elements.placeholder.hidden=true;
 field._fieldSize={width:allocation,height:container.height};field._labelSize=result.labelMeasured??{width:0,height:0};field._fieldLayoutKey=key;field._syncOutline();
}
