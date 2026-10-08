/*
 * Copyright 2019-2025 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0.
 * ToggleButton Row, icon Box, Spacer, SizeNode and Padding at AndroidX a095da93.
 * DOM/font shaping and parent CSS constraints are separate host inputs.
 */
import {layoutPlaceable,layoutPlacements,measureRowColumn} from './row-column-layout.js';
const INF=2147483647,f=Math.fround;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const relative=(x,node,width,rtl)=>rtl&&width!==0?width-node.size.width-x:x;
export function toggleButtonMetrics(height){
 const i=height<40?0:height<56?1:height<96?2:height<136?3:4;
 return{height,padding:[12,16,24,48,64][i],vertical:[6,10,16,32,48][i],icon:[20,20,24,32,40][i],gap:[4,8,8,12,16][i]};
}
export function toggleButtonLayout({height=40,rtl=false,constraints={},icon=null,content=[]},measureLeaf=(id,input,c)=>input){
 const c={minWidth:0,maxWidth:INF,minHeight:0,maxHeight:INF,...constraints},s=toggleButtonMetrics(height),measured=[];
 const leaf=(id,input,incoming)=>{
  const p=measureLeaf(id,input,incoming);measured.push({id,constraints:{...incoming}});
  const requested=p.required?{width:p.width,height:p.height}:{width:clamp(p.width,incoming.minWidth,incoming.maxWidth),height:clamp(p.height,incoming.minHeight,incoming.maxHeight)};
  return layoutPlaceable(id,requested,incoming);
 };
 const wrap=(id,child,incoming,x=0,y=0,requested=child.size)=>layoutPlaceable(id,requested,incoming,[{node:child,x,y}]);
 const iconNode=incoming=>{
  const w=clamp(s.icon,incoming.minWidth,incoming.maxWidth),h=clamp(s.icon,incoming.minHeight,incoming.maxHeight),fixed={minWidth:w,maxWidth:w,minHeight:h,maxHeight:h};
  const nodes=icon.map((p,i)=>leaf('icon-'+i,p,fixed));
  const box=layoutPlaceable('icon-box',{width:w,height:h},fixed,nodes.map(node=>({node,x:Math.round(f(f(w-node.size.width)/2)),y:Math.round(f(f(h-node.size.height)/2))})));
  return wrap('icon-size-0',box,incoming,relative(0,box,box.size.width,rtl));
 };
 const spacerNode=incoming=>{
  const width=clamp(s.gap,incoming.minWidth,incoming.maxWidth),fixed={...incoming,minWidth:width,maxWidth:width};
  const node=layoutPlaceable('spacer',{width,height:fixed.minHeight===fixed.maxHeight?fixed.maxHeight:0},fixed);
  return wrap('spacer-size-0',node,incoming,relative(0,node,node.size.width,rtl));
 };
 const d={...c,minHeight:c.minHeight===0?clamp(height,0,c.maxHeight):c.minHeight};
 const dx=s.padding*2,dy=s.vertical*2,p={minWidth:Math.max(0,d.minWidth-dx),maxWidth:d.maxWidth===INF?INF:Math.max(0,d.maxWidth-dx),minHeight:Math.max(0,d.minHeight-dy),maxHeight:d.maxHeight===INF?INF:Math.max(0,d.maxHeight-dy)};
 const children=[];
 if(icon!==null)children.push({measure:iconNode},{measure:spacerNode});
 content.forEach((item,i)=>children.push({...item,measure:incoming=>leaf('content-'+i,item,incoming)}));
 const row=measureRowColumn({id:'row',rtl,minMain:p.minWidth,maxMain:p.maxWidth,minCross:p.minHeight,maxCross:p.maxHeight,arrangement:'center',children},(input,incoming)=>input.measure(incoming));
 const requested={width:clamp(row.size.width+dx,d.minWidth,d.maxWidth),height:clamp(row.size.height+dy,d.minHeight,d.maxHeight)};
 const padded=wrap('button-padding-1',row,d,s.padding,s.vertical,requested);
 const root=wrap('button-default-min-0',padded,c,relative(0,padded,padded.size.width,rtl));
 return{size:root.size,requested:root.requested,placements:layoutPlacements(root),measurements:measured,root};
}
