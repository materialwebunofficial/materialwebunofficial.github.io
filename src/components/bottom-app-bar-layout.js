/*
 * Copyright 2024 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0.
 * BottomAppBar's Row/Box/Fill/Size/Padding modifier tree, AndroidX a095da93.
 * Density-1 DOM dimensions and safe-area values are explicit host inputs.
 */
import {layoutPlaceable,layoutPlacements,measureLayoutLeaf,measureRowColumn} from './row-column-layout.js';
import {resolveToolbarPadding} from './toolbar-padding.js';
const INF=2147483647,f=Math.fround,round=v=>Math.round(f(v))||0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const arrangements={'space-between':'between','space-around':'around','space-evenly':'evenly',fixed:'spaced'};

function padding(id,c,p,measure){
 const dx=p.left+p.right,dy=p.top+p.bottom;
 const inner={minWidth:Math.max(0,c.minWidth-dx),maxWidth:c.maxWidth===INF?INF:Math.max(0,c.maxWidth-dx),minHeight:Math.max(0,c.minHeight-dy),maxHeight:c.maxHeight===INF?INF:Math.max(0,c.maxHeight-dy)};
 const child=measure(inner),requested={width:clamp(child.size.width+dx,c.minWidth,c.maxWidth),height:clamp(child.size.height+dy,c.minHeight,c.maxHeight)};
 return layoutPlaceable(id,requested,c,[{node:child,x:p.left,y:p.top}]);
}
function fill(id,c,axis,measure){
 const max=axis==='width'?'maxWidth':'maxHeight',min=axis==='width'?'minWidth':'minHeight';
 const inner=c[max]===INF?c:{...c,[min]:c[max]};
 const child=measure(inner);return layoutPlaceable(id,child.size,c,[{node:child,x:0,y:0}]);
}
function leaf(input,c){return measureLayoutLeaf(input.id,{main:input.width,cross:input.height,...input},c,false);}
function row(id,c,inputs,rtl,arrangement,measure=leaf){
 return measureRowColumn({id,rtl,minMain:c.minWidth,maxMain:c.maxWidth,minCross:c.minHeight,maxCross:c.maxHeight,crossAlignment:'center',arrangement:arrangements[arrangement]||arrangement,spacing:32,children:inputs.map(n=>({main:n.width,cross:n.height,...n}))},measure);
}
function box(id,c,inputs,rtl){
 const children=inputs.map(input=>leaf(input,{...c,minWidth:0,minHeight:0}));
 const width=Math.max(c.minWidth,...children.map(n=>n.size.width)),height=Math.max(c.minHeight,...children.map(n=>n.size.height));
 return layoutPlaceable(id,{width,height},c,children.map(node=>({node,x:rtl&&width!==0?width-node.size.width:0,y:0})));
}
export function bottomAppBarLayout(o){
 const c={minWidth:o.minWidth??0,maxWidth:o.maxWidth??INF,minHeight:o.minHeight??0,maxHeight:o.maxHeight??INF},rtl=!!o.rtl,flexible=o.variant==='flexible';
 const p=resolveToolbarPadding(o.contentPadding??(flexible?{start:16,top:0,end:16,bottom:0}:{start:4,top:4,end:4,bottom:0}),rtl);
 const insets=Object.fromEntries(['left','top','right','bottom'].map(edge=>[edge,Math.max(0,round(o.insets?.[edge]??0))]));
 const name=arrangements[o.arrangement]||o.arrangement,arrangement=['start','end','center','between','around','evenly','spaced'].includes(name)?name:flexible?'between':'start';
 const node=fill('bar',c,'width',outer=>padding('insets',outer,insets,incoming=>{
  const height=clamp(round(o.height??(flexible?64:80)),incoming.minHeight,incoming.maxHeight),sized={...incoming,minHeight:height,maxHeight:height};
  const child=padding('content-padding',sized,p,inner=>{
   if(flexible)return row('content-row',inner,[...(o.actions||[]),...(o.fabs||[])],rtl,arrangement);
   const children=[{id:'actions',weight:1,fill:true},...(o.fabs?.length?[{id:'fab'}]:[])];
   return row('content-row',inner,children,rtl,'start',(input,b)=>input.id==='actions'?
    row('actions-row',b,o.actions||[],rtl,arrangement):
    fill('fab-fill',b,'height',full=>padding('fab-padding',full,resolveToolbarPadding({start:0,top:8,end:12,bottom:0},rtl),inside=>box('fab-box',inside,o.fabs,rtl))));
  });
  return layoutPlaceable('content-height',child.size,incoming,[{node:child,x:0,y:0}]);
 }));
 return{node,size:node.size,requested:node.requested,placements:layoutPlacements(node)};
}
/** Original outer BottomAppBarLayout modifier: measure full Surface, then shrink
 * only the reported parent height. Surface/content placement remains at (0,0). */
export function bottomAppBarScrollLayout(o,state){
 const surface=bottomAppBarLayout(o);state.updateHeightOffsetLimit(surface.size.height);
 const height=f(surface.size.height+state.heightOffset);if(Number.isNaN(height))throw new RangeError('Bottom app bar height cannot be NaN');
 const node=layoutPlaceable('scroll-root',{width:surface.size.width,height:Math.min(INF,round(Math.max(0,height)))},surface.node.constraints,[{node:surface.node,x:0,y:0}]);
 return{node,size:node.size,requested:node.requested,placements:layoutPlacements(node)};
}
