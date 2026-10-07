/*
 * Copyright 2024 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0.
 * TopAppBarMeasurePolicy, AndroidX a095da93. Density-1 DOM slot measurements
 * are explicit inputs. Placeable coercion is shared with the native Row port.
 */
import { layoutPlaceable, layoutPlacements, measureLayoutLeaf, measureRowColumn } from './row-column-layout.js';
import { resolveToolbarPadding } from './toolbar-padding.js';
const INF=2147483647, f=Math.fround;
const round=v=>Math.max(-2147483648,Math.min(INF,Math.round(f(v))))||0;
const half=v=>Math.trunc(v/2)||0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function measureTopAppBar(o,measure=(name,c)=>{
 const input=o[name]||{width:0,height:0};
 const size={width:clamp(input.width,c.minWidth,c.maxWidth),height:clamp(input.height,c.minHeight,c.maxHeight)};
 return layoutPlaceable(name,size,c,[],{line:input.baseline??null});
}){
 const c={minWidth:o.minWidth??0,maxWidth:o.maxWidth??INF,minHeight:o.minHeight??0,maxHeight:o.maxHeight??INF};
 const rtl=!!o.rtl,p=resolveToolbarPadding(o.contentPadding??0,rtl),startPadding=rtl?p.right:p.left,endPadding=rtl?p.left:p.right;
 const childConstraints={...c,minWidth:0};
 const navigation=measure('navigationIcon',childConstraints),actions=measure('actionIcons',childConstraints);
 const start=Math.max(12,navigation.size.width),end=actions.size.width;
 const maxTitleWidth=c.maxWidth===INF?INF:Math.max(0,c.maxWidth-start-end-startPadding-endPadding);
 const title=measure('title',{...childConstraints,maxWidth:maxTitleWidth});
 const offset=Number.isNaN(o.scrolledOffset)?0:round(o.scrolledOffset??0);
 const maximumHeight=Math.max(round(o.height??64),title.size.height)+p.top+p.bottom;
 const height=c.maxHeight===INF?maximumHeight:Math.max(0,maximumHeight+offset);
 const contentHeight=height+p.top-p.bottom;
 let titleX=o.alignment==='center'?round(f(f(c.maxWidth-title.size.width)*.5)):o.alignment==='end'?c.maxWidth-title.size.width:0;
 if(titleX<start)titleX+=startPadding+start-titleX;
 else if(titleX+title.size.width>c.maxWidth-end)titleX+=startPadding+c.maxWidth-end-titleX-title.size.width;
 let titleY=half(contentHeight-title.size.height);
 if(o.vertical==='bottom'){
  const baseline=title.line??0,padding=o.titleBottomPadding??0;
  const bottom=padding-(title.size.height-baseline),adjusted=bottom+title.size.height>maximumHeight?maximumHeight-title.size.height:bottom;
  titleY=contentHeight-title.size.height-(padding===0?0:Math.max(0,adjusted));
 }else if(o.vertical==='top')titleY=0;
 const relative=(node,x,y)=>({node,x:rtl&&c.maxWidth!==0?c.maxWidth-node.size.width-x:x,y});
 return layoutPlaceable(o.id||'row',{width:c.maxWidth,height},c,[
  relative(navigation,startPadding,half(contentHeight-navigation.size.height)),
  relative(title,titleX,titleY),
  relative(actions,c.maxWidth-actions.size.width-endPadding,half(contentHeight-actions.size.height))
 ],{maximumHeight,maxTitleWidth});
}
export function topAppBarLayout(o,measure){const node=measureTopAppBar(o,measure);return{node,size:node.size,requested:node.requested,placements:layoutPlacements(node)};}

// TopAppBarLayout's original modifier tree: padded navigation Box, padded
// title Box/Column, and padded actions Box containing an End/Center Row.
// A DOM/font adapter supplies natural leaf dimensions and optional baselines.
function paddingBox(id,c,start,end,rtl,measure){
 const horizontal=start+end,inner={...c,minWidth:Math.max(0,c.minWidth-horizontal),maxWidth:Math.max(0,c.maxWidth-horizontal)};
 const child=measure(inner),width=clamp(child.size.width+horizontal,c.minWidth,c.maxWidth),height=clamp(child.size.height,c.minHeight,c.maxHeight);
 const x=rtl?end:start;
 return layoutPlaceable(id,{width,height},c,[{node:child,x,y:0}],{line:child.line===null||child.line===undefined?null:child.line+child.offset.y});
}
function box(id,inputs,c,rtl){
 const children=inputs.map((input,i)=>measureLayoutLeaf(input.id||id+'-'+i,{main:input.width,cross:input.height,...input},{...c,minWidth:0,minHeight:0},false));
 const width=Math.max(c.minWidth,...children.map(n=>n.size.width)),height=Math.max(c.minHeight,...children.map(n=>n.size.height));
 const placed=children.map(node=>({node,x:rtl&&width!==0?width-node.size.width:0,y:0}));
 const lines=children.filter(n=>n.line!==null&&n.line!==undefined).map(n=>n.line+n.offset.y*2);
 return layoutPlaceable(id,{width,height},c,placed,{line:lines.length?Math.max(...lines):null});
}
export function topAppBarContentLayout(o){
 const rtl=!!o.rtl;
 return topAppBarLayout(o,(name,c)=>{
  if(name==='navigationIcon')return paddingBox(name,c,4,0,rtl,b=>box('navigation-box',o.navigation||[],b,rtl));
  if(name==='actionIcons')return paddingBox(name,c,0,4,rtl,b=>{
   const row=measureRowColumn({id:'actions-row',rtl,arrangement:'end',crossAlignment:'center',minMain:0,maxMain:b.maxWidth,minCross:0,maxCross:b.maxHeight,children:(o.actions||[]).map(n=>({main:n.width,cross:n.height,...n}))},(input,constraints,i)=>measureLayoutLeaf(input.id||'action-'+i,input,constraints,false));
   const width=Math.max(b.minWidth,row.size.width),height=Math.max(b.minHeight,row.size.height);
   return layoutPlaceable('actions-box',{width,height},b,[{node:row,x:rtl&&width!==0?width-row.size.width:0,y:0}]);
  });
  return paddingBox(name,c,4,4,rtl,b=>{
   if(!o.subtitleProvided)return box('title-box',o.title||[],b,rtl);
   const column=measureRowColumn({id:'title-column',vertical:true,rtl,arrangement:'start',crossAlignment:o.alignment||'start',minMain:b.minHeight,maxMain:b.maxHeight,minCross:b.minWidth,maxCross:b.maxWidth,children:[{id:'headline-box',children:o.title||[]},{id:'subtitle-box',children:o.subtitle||[]}]},(input,constraints)=>box(input.id,input.children,constraints,rtl));
   const lines=column.children.filter(p=>p.node.line!==null&&p.node.line!==undefined).map(p=>p.y+p.node.offset.y*2+p.node.line);
   column.line=lines.length?Math.max(...lines):null;return column;
  });
 });
}
