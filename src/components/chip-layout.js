/*
 * Copyright 2022 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0.
 * ChipContent/AnimatingChipContent at AndroidX a095da93: native Row, Box,
 * intrinsic width, default minimum size and padding order. Fonts and atomic
 * visibility samples are explicit inputs to this web layout adapter.
 */
import {measureRowColumn,rowColumnIntrinsic,layoutPlaceable,layoutPlacements} from './row-column-layout.js';
import {chipPadding,chipSpacing,chipArrange} from './chip-state.js';
const INF=2147483647,clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const constraints=o=>({minWidth:o.minWidth??0,maxWidth:o.maxWidth??INF,minHeight:o.minHeight??0,maxHeight:o.maxHeight??INF});
const nodeSize=(id,size,c,children=[])=>layoutPlaceable(id,size,c,children);
const rowOptions=(c,children,extra={})=>({minMain:c.minWidth,maxMain:c.maxWidth,minCross:c.minHeight,maxCross:c.maxHeight,children,...extra});
const axes=c=>({minWidth:0,maxWidth:c.maxWidth,minHeight:0,maxHeight:c.maxHeight});
const leaf=(id,input,c)=>{
 const width=clamp(input.main,c.minWidth,c.maxWidth),height=input.cross*(input.wrap?Math.max(1,Math.ceil(input.main/Math.max(1,width))):1);
 return nodeSize(id,{width,height:clamp(height,c.minHeight,c.maxHeight)},c);
};
const labelInput=o=>o.labelInput??{main:o.label??0,cross:o.labelHeight??20,wrap:!!o.wrap,intrinsicMinMain:o.wrap?Math.min(o.label??0,30):o.label??0};
function options(o){
 const leading=o.hasLeading??!!o.leading,trailing=o.hasTrailing??!!o.trailing,avatar=o.avatar??o.leading===24,family=o.family??'assist';
 const animated=o.animated??(family==='filter'||family==='input'),state={family,leading,trailing,avatar,expressive:o.expressive!==false};
 const padding=o.padding??chipPadding(state),spacing=chipSpacing(state),compact=(o.arrangement??'compact')==='compact';
 const arrangement=compact?'start':o.arrangement==='space-between'?'between':o.arrangement;
 return{state,animated,padding,arrangement,spacing:compact?spacing.spacing:0,arrange:compact?(total,sizes,rtl)=>chipArrange({...state,total,sizes,rtl}):undefined};
}
/** Four native content intrinsic queries; the supplied query owns font metrics. */
export function chipContentIntrinsic(o,available,query){
 const config=options(o),lead={main:o.leading??0,cross:o.leadingHeight??(o.leading===24?24:18)},trail={main:o.trailing??0,cross:o.trailingHeight??18};
 const label=labelInput(o),children=[lead,{...label,weight:1,fill:!config.animated},trail];
 const horizontal=config.padding.start+config.padding.end;
 const row={children,arrangement:config.arrangement,spacing:config.spacing,arrange:config.arrange};
 const main=rowColumnIntrinsic(row,available,query),cross=rowColumnIntrinsic(row,available===INF?INF:Math.max(0,available-horizontal),query);
 const minWidth=main.minWidth+horizontal,maxWidth=main.maxWidth+horizontal;
 return{minWidth:config.animated?Math.min(1000,minWidth):maxWidth,maxWidth:config.animated?Math.min(1000,maxWidth):maxWidth,minHeight:Math.max(o.defaultMinHeight??32,cross.minHeight),maxHeight:Math.max(o.defaultMinHeight??32,cross.maxHeight)};
}
/** Complete three-child content tree, with a nested label Row (weight fill differs). */
export function chipContentLayout(o,measureLeaf=leaf){
 const config=options(o),incoming=constraints(o),c={...incoming},rtl=!!o.rtl;
 // IntrinsicWidthNode / SizeNode precedes defaultMinSize and PaddingValuesModifier.
 if(config.animated){c.maxWidth=clamp(1000,c.minWidth,c.maxWidth);}
 else{const width=clamp(chipContentIntrinsic(o,c.maxHeight).maxWidth,c.minWidth,c.maxWidth);c.minWidth=width;c.maxWidth=width;}
 if(c.minHeight===0)c.minHeight=clamp(o.defaultMinHeight??32,0,c.maxHeight);
 const horizontal=config.padding.start+config.padding.end;
 const inner={...c,minWidth:Math.max(0,c.minWidth-horizontal),maxWidth:c.maxWidth===INF?INF:Math.max(0,c.maxWidth-horizontal)};
 const label=labelInput(o),children=[{weight:0},{weight:1,fill:!config.animated},{weight:0}];
 const row=measureRowColumn(rowOptions(inner,children,{id:'row',rtl,arrangement:config.arrangement,spacing:config.spacing,arrange:config.arrange}),(input,b,index)=>{
  if(index===1)return measureRowColumn(rowOptions(b,[label],{id:'label',rtl}),(_,l)=>measureLeaf('labelInk',label,l));
  const present=index===0?!!o.leading:!!o.trailing,id=index===0?'leading':'trailing';
  const fullInput={main:index===0?(o.leading??0):(o.trailing??0),cross:present?(index===0?(o.leadingHeight??(o.leading===24?24:18)):(o.trailingHeight??18)):0};
  if(!present)return nodeSize(id,{width:b.minWidth,height:b.minHeight},b);
  // Box resets the incoming minima before measuring its content leaf.
  const full=measureLeaf(id+'Ink',fullInput,axes(b));
  const width=config.animated?clamp(o[index===0?'leadingWidth':'trailingWidth']??Math.round(full.size.width*(o.sample??1)),b.minWidth,b.maxWidth):Math.max(b.minWidth,full.size.width);
  const height=Math.max(b.minHeight,full.size.height);
  const x=config.animated?0:Math.round((width-full.size.width)/2),y=Math.round((height-full.size.height)/2);
  return nodeSize(id,{width,height},b,[{node:full,x,y}]);
 });
 const paddedSize={width:clamp(row.size.width+horizontal,c.minWidth,c.maxWidth),height:clamp(row.size.height,c.minHeight,c.maxHeight)};
 const padded=nodeSize('padded',paddedSize,c,[{node:row,x:rtl?config.padding.end:config.padding.start,y:0}]);
 const root=nodeSize('content',padded.size,incoming,[{node:padded,x:0,y:0}]),placements=layoutPlacements(root);
 return{size:root.size,groups:['leading','label','trailing'].map(id=>placements[id]),inks:['leadingInk','labelInk','trailingInk'].map(id=>placements[id]??null),placements,tree:root};
}
