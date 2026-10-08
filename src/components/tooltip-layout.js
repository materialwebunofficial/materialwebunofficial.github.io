/*
 * Copyright 2019-2025 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0.
 * AndroidX a095da93 PlainTooltip/RichTooltip and foundation measurement rules.
 * Font/control shaping and measured leaf alignment lines are host inputs.
 */
import {layoutPlaceable, measureRowColumn} from './row-column-layout.js';

const INF=2147483647, NONE=-2147483648;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const bounds=c=>({minWidth:0,maxWidth:INF,minHeight:0,maxHeight:INF,...c});
const relative=(x,node,width,rtl)=>rtl&&width!==0?width-node.size.width-x:x;
const coordinate=(value,offset)=>value===NONE?NONE:(value+offset)|0;
function positions(node,x=0,y=0,out={}){
  x=(x+node.offset.x)|0;y=(y+node.offset.y)|0;out[node.id]={x,y,...node.requested};
  for(const child of node.children)positions(child.node,(x+child.x)|0,(y+child.y)|0,out);
  return out;
}

/** Complete source default plain/rich trees, before Popup positioning/motion. */
export function tooltipLayout({rich=false,rtl=false,constraints,maxWidth=rich?320:200,title=null,text=[],action=null},measureLeaf=(id,input)=>input){
  const c=bounds(constraints), maximum=Math.max(0,Math.round(maxWidth));
  const leaf=(id,input,incoming)=>{
    const measured=measureLeaf(id,input,incoming);
    const requested=measured.required?{width:measured.width,height:measured.height}:{width:clamp(measured.width,incoming.minWidth,incoming.maxWidth),height:clamp(measured.height,incoming.minHeight,incoming.maxHeight)};
    const node=layoutPlaceable(id,requested,incoming,[],{geometryFirst:measured.first??NONE,geometryLast:measured.last??measured.first??NONE});
    node.first=coordinate(node.geometryFirst,node.offset.y);node.last=coordinate(node.geometryLast,node.offset.y);
    return node;
  };
  const inherited=(node)=>{
    node.geometryFirst=NONE;node.geometryLast=NONE;
    for(const child of node.children)for(const [name,merge]of [['geometryFirst',Math.min],['geometryLast',Math.max]]){
      const line=coordinate(child.node[name],child.y+child.node.offset.y);
      if(line!==NONE)node[name]=node[name]===NONE?line:merge(node[name],line);
    }
    node.first=coordinate(node.geometryFirst,node.offset.y);node.last=coordinate(node.geometryLast,node.offset.y);
    return node;
  };
  const wrap=(id,requested,incoming,child,x=0,y=0)=>{
    const node=layoutPlaceable(id,requested,incoming,[{node:child,x,y}]);
    for(const name of ['geometryFirst','geometryLast'])node[name]=coordinate(child[name],y+child.offset.y);
    node.first=coordinate(child.first,y+child.offset.y+node.offset.y);node.last=coordinate(child.last,y+child.offset.y+node.offset.y);
    return node;
  };
  const box=(id,incoming,items,propagate=false)=>{
    const inner=propagate?incoming:{...incoming,minWidth:0,minHeight:0};
    const nodes=items.map(measure=>measure(inner));
    const width=Math.max(incoming.minWidth,...nodes.map(n=>n.size.width)),height=Math.max(incoming.minHeight,...nodes.map(n=>n.size.height));
    return inherited(layoutPlaceable(id,{width,height},incoming,nodes.map(node=>({node,x:relative(0,node,width,rtl),y:0}))));
  };
  const padding=(id,incoming,horizontal,top,bottom,measure)=>{
    const dx=horizontal*2,dy=top+bottom,inner={minWidth:Math.max(0,incoming.minWidth-dx),maxWidth:incoming.maxWidth===INF?INF:Math.max(0,incoming.maxWidth-dx),minHeight:Math.max(0,incoming.minHeight-dy),maxHeight:incoming.maxHeight===INF?INF:Math.max(0,incoming.maxHeight-dy)};
    const child=measure(inner),requested={width:clamp(child.size.width+dx,incoming.minWidth,incoming.maxWidth),height:clamp(child.size.height+dy,incoming.minHeight,incoming.maxHeight)};
    return wrap(id,requested,incoming,child,horizontal,top);
  };
  const sized=(id,incoming,minWidth,maxWidth,minHeight,enforce,measure)=>{
    const target={minWidth:Math.min(minWidth??0,maxWidth??INF),maxWidth:maxWidth??INF,minHeight:minHeight??0,maxHeight:INF};
    const inner=enforce?{minWidth:clamp(target.minWidth,incoming.minWidth,incoming.maxWidth),maxWidth:clamp(target.maxWidth,incoming.minWidth,incoming.maxWidth),minHeight:clamp(target.minHeight,incoming.minHeight,incoming.maxHeight),maxHeight:clamp(target.maxHeight,incoming.minHeight,incoming.maxHeight)}:
      {minWidth:minWidth===null?Math.min(incoming.minWidth,target.maxWidth):target.minWidth,maxWidth:maxWidth===null?Math.max(incoming.maxWidth,target.minWidth):target.maxWidth,minHeight:minHeight===null?incoming.minHeight:target.minHeight,maxHeight:Math.max(incoming.maxHeight,target.minHeight)};
    const child=measure(inner);
    return wrap(id,child.size,incoming,child,relative(0,child,child.size.width,rtl),0);
  };
  const baseline=(id,incoming,top,measure)=>{
    const child=measure({...incoming,minHeight:0}),line=child.first===NONE?0:child.first;
    const before=clamp(top-line,0,incoming.maxHeight-child.size.height);
    const requested={width:child.size.width,height:Math.max(before+child.size.height,incoming.minHeight)};
    return wrap(id,requested,incoming,child,relative(0,child,requested.width,rtl),before);
  };
  const leaves=(id,inputs)=>inputs.map((input,index)=>incoming=>leaf(`${id}-${index}`,input,incoming));
  let root;
  if(!rich){
    root=box('surface',c,[incoming=>sized('body-size-0',incoming,40,maximum,24,true,limited=>padding('body-padding-1',limited,8,4,4,inside=>box('body-box',inside,leaves('body',text))))],true);
  }else{
    root=sized('tooltip',c,40,maximum,24,true,limited=>box('surface',limited,[incoming=>padding('column-padding-0',incoming,16,0,0,inner=>{
      const entries=[];
      if(title!==null)entries.push({id:'title',measure:child=>baseline('title-baseline-0',child,28,inside=>box('title-box',inside,leaves('title',title)))});
      entries.push({id:'body',measure:child=>title===null&&action===null?padding('body-padding-0',child,0,4,4,inside=>box('body-box',inside,leaves('body',text))):baseline('body-baseline-0',child,24,inside=>padding('body-padding-1',inside,0,0,16,within=>box('body-box',within,leaves('body',text))))});
      if(action!==null)entries.push({id:'action',measure:child=>sized('action-required-size-0',child,null,null,36,false,inside=>padding('action-padding-1',inside,0,0,8,within=>box('action-box',within,leaves('action',action))))});
      return inherited(measureRowColumn({id:'column',vertical:true,rtl,minMain:inner.minHeight,maxMain:inner.maxHeight,minCross:inner.minWidth,maxCross:inner.maxWidth,crossAlignment:'start',children:entries},(input,child)=>input.measure(child)));
    })],true));
  }
  return {node:root,size:root.size,requested:root.requested,placements:positions(root)};
}
