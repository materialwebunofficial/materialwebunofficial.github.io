/*
 * Copyright 2024 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0.
 * Port of FloatingToolbar.kt at a095da93f8e98dea8748ceed79ea8427aade245f.
 * Browser child metrics are explicit inputs; source integer/Float operations
 * and relative placement are retained. See tools/androidx-toolbars.
 */
import {measureRowColumn,measureLayoutLeaf,axisConstraints,layoutPlaceable,layoutPlacements,rowAlignmentLines,rowColumnIntrinsic} from './row-column-layout.js';
import {resolveToolbarPadding} from './toolbar-padding.js';
const f=Math.fround, round=Math.round, int=value=>Math.trunc(value)||0;
const lerp=(a,b,t)=>f(f(a*f(1-t))+f(b*t));
export function toolbarFabLayout({vertical=false,intrinsic,intrinsicCross=64,progress,position=vertical?'bottom':'end',rtl=false,max=2147483647,cross=80,gap=8,expandedElevation=1,collapsedElevation=0}) {
  progress=f(progress);
  const fabSize=round(lerp(56,80,f(1-progress)));
  const axis=Math.max(0,Math.min(intrinsic,max,int(f(intrinsic*progress))));
  const main=intrinsic+round(gap)+56;
  const atEnd=position===(vertical?'bottom':'end');
  const barCross=Math.max(Math.min(64,cross),intrinsicCross);
  const bar=vertical?{x:int((cross-barCross)/2),y:atEnd?intrinsic-axis:main-intrinsic,width:barCross,height:axis}:
    {x:atEnd?intrinsic-axis:main-intrinsic,y:int((cross-barCross)/2),width:axis,height:barCross};
  const fab=vertical?{x:int((cross-fabSize)/2),y:atEnd?main-fabSize:0,width:fabSize,height:fabSize}:
    {x:atEnd?main-fabSize:0,y:int((cross-fabSize)/2),width:fabSize,height:fabSize};
  const size=vertical?{width:cross,height:main}:{width:main,height:cross};
  if(rtl){bar.x=size.width-bar.width-bar.x;fab.x=size.width-fab.width-fab.x;}
  return{size,placements:{toolbar:bar,fab},elevation:lerp(collapsedElevation,expandedElevation,Math.min(1,progress))};
}
// defaultMinSize -> policy -> PaddingValuesModifier -> ScrollNode -> content.
// Placeable coerces the policy's reserved size and centers its real layout.
// The content measurement is a host input, rather than a Compose Row/Column runtime.
export function toolbarFabConstraints({vertical=false,contentAxis,contentIntrinsicAxis=contentAxis,contentCross=48,contentPadding=8,minAxis=0,maxAxis=2147483647,minCross=0,maxCross=2147483647,progress,position=vertical?'bottom':'end',rtl=false,scroll=0,expandedElevation=1,collapsedElevation=0}) {
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const p=resolveToolbarPadding(contentPadding,rtl),mainPadding=vertical?p.vertical:p.horizontal,crossPadding=vertical?p.horizontal:p.vertical;
  if(minAxis<0||minCross<0||maxAxis<minAxis||maxCross<minCross)throw new RangeError('Invalid toolbar constraints');
  progress=f(progress);
  const cross=minCross===0?clamp(80,0,maxCross):minCross;
  const intrinsic=contentIntrinsicAxis+mainPadding,main=intrinsic+8+56;
  const target=clamp(int(f(intrinsic*progress)),0,maxAxis);
  // The pinned policy retains the incoming main minimum in Constraints.copy.
  if(target<minAxis)throw new RangeError('Invalid toolbar constraints');
  const barMinCross=Math.min(64,cross);
  const contentMain=Math.max(contentAxis,Math.max(0,minAxis-mainPadding));
  const contentBreadth=clamp(contentCross,Math.max(0,barMinCross-crossPadding),Math.max(0,maxCross-crossPadding));
  const viewportMain=Math.min(contentMain,Math.max(0,target-mainPadding));
  const barMain=clamp(viewportMain+mainPadding,minAxis,target);
  const barCross=clamp(contentBreadth+crossPadding,barMinCross,maxCross);
  const apparentMain=clamp(main,minAxis,maxAxis),offset=int((apparentMain-main)/2);
  const mirrored=rtl&&(!vertical||cross!==0);
  const layout=toolbarFabLayout({vertical,intrinsic,intrinsicCross:barCross,progress,position,rtl:mirrored,max:barMain,cross,expandedElevation,collapsedElevation});
  const requested=layout.size;
  const translate=p=>({...p,x:p.x+(vertical?0:offset),y:p.y+(vertical?offset:0)});
  const bar=translate(layout.placements.toolbar),fab=translate(layout.placements.fab);
  // toolbarFabLayout's legacy host input assumes cross constraints are loose.
  // Replace that cross measurement with the complete padding/scroll result.
  if(vertical){bar.width=barCross;bar.x=int((cross-barCross)/2);if(mirrored)bar.x=cross-barCross-bar.x;}
  else{bar.height=barCross;bar.y=int((cross-barCross)/2);}
  const viewport={x:bar.x+p.left,y:bar.y+p.top,width:vertical?contentBreadth:viewportMain,height:vertical?viewportMain:contentBreadth};
  const side=contentMain-viewportMain,consumed=clamp(scroll,0,side);
  const content={x:viewport.x,y:viewport.y,width:vertical?contentBreadth:contentMain,height:vertical?contentMain:contentBreadth};
  if(vertical)content.y-=consumed;
  else content.x+=rtl&&viewportMain!==0?viewportMain-contentMain+consumed:-consumed;
  return{size:vertical?{width:cross,height:apparentMain}:{width:apparentMain,height:cross},requested,placements:{toolbar:bar,viewport,content,fab},scroll:{max:side,viewport:viewportMain,content:contentMain},elevation:layout.elevation};
}

// The scrolling Row/Column has an unbounded main axis. Its weighted intrinsic
// reservation is separate from the actual measured child sizes.
export function toolbarFabContentLayout(o){
  const vertical=!!o.vertical,rtl=!!o.rtl,p=resolveToolbarPadding(o.contentPadding??8,rtl);
  const mainPadding=vertical?p.vertical:p.horizontal,crossPadding=vertical?p.horizontal:p.vertical;
  const minCross=o.minCross??0,maxCross=o.maxCross??2147483647;
  const cross=minCross===0?Math.min(80,maxCross):minCross;
  const children=o.main??[],intrinsics=rowColumnIntrinsic({vertical,children},Math.max(0,64-crossPadding));
  const contentIntrinsicAxis=intrinsics[vertical?'maxHeight':'maxWidth'];
  const node=measureRowColumn({id:'content',vertical,rtl,children,arrangement:'start',crossAlignment:'center',
    minMain:Math.max(0,(o.minAxis??0)-mainPadding),maxMain:2147483647,
    minCross:Math.max(0,Math.min(64,cross)-crossPadding),maxCross:Math.max(0,maxCross-crossPadding)},
    (input,c,i)=>measureLayoutLeaf('content-'+i,input,c,vertical));
  const layout=toolbarFabConstraints({...o,contentIntrinsicAxis,contentAxis:node.size[vertical?'height':'width'],contentCross:node.size[vertical?'width':'height']});
  const origin=layout.placements.content;
  return{...layout,intrinsic:contentIntrinsicAxis+mainPadding,node,placements:{...layout.placements,...layoutPlacements(node,origin.x,origin.y)}};
}
export function toolbarBalancedPadding({width,height,top=null,left=null,progress=1,leading=false,trailing=false}) {
  const active=!leading||!trailing;
  const v=active&&top!==null?f(top*f(progress)):0;
  const h=active&&left!==null?f(left*f(progress)):0;
  const dx=round(Math.max(0,f(f(v-h)*2))),dy=round(Math.max(0,f(f(h-v)*2)));
  return{size:{width:width+dx,height:height+dy},placements:{content:{x:int(dx/2),y:int(dy/2),width,height}}};
}
// No-FAB Compose tree: sizeIn(min64) -> padding -> centered outer Row/Column
// -> visibility Rows/Columns and main Row/Column + balanced padding.
export function toolbarRowLayout(o){
  const vertical=!!o.vertical,rtl=!!o.rtl,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const p=resolveToolbarPadding(o.contentPadding,rtl),mainPadding=vertical?p.vertical:p.horizontal,crossPadding=vertical?p.horizontal:p.vertical;
  const outer={minMain:o.minMain??0,maxMain:o.maxMain??2147483647,minCross:o.minCross??0,maxCross:o.maxCross??2147483647};
  const wrap={...outer,minCross:clamp(64,outer.minCross,outer.maxCross)};
  const padded={minMain:Math.max(0,wrap.minMain-mainPadding),maxMain:wrap.maxMain===2147483647?wrap.maxMain:Math.max(0,wrap.maxMain-mainPadding),minCross:Math.max(0,wrap.minCross-crossPadding),maxCross:wrap.maxCross===2147483647?wrap.maxCross:Math.max(0,wrap.maxCross-crossPadding)};
  const toAxis=c=>vertical?{minMain:c.minHeight,maxMain:c.maxHeight,minCross:c.minWidth,maxCross:c.maxWidth}:{minMain:c.minWidth,maxMain:c.maxWidth,minCross:c.minHeight,maxCross:c.maxHeight};
  const fixed=(count)=>Array.from({length:count},()=>({main:48,cross:48}));
  const groups={leading:o.leading??fixed(1),main:o.main??fixed(3),trailing:o.trailing??fixed(1)},fullTargets={},fullSizes={};let lines={top:null,left:null};
  const row=(name,c)=>measureRowColumn({id:name+'-row',vertical,rtl,...toAxis(c),children:groups[name],arrangement:'start',crossAlignment:'start'},(input,b,i)=>measureLayoutLeaf(name+i,input,b,vertical));
  const measureGroup=(name,c)=>{
    const child=row(name,c);fullSizes[name]=child.size;fullTargets[name]=child.size[vertical?'height':'width'];
    if(name==='main'){
      lines=rowAlignmentLines(child);
      const balance=toolbarBalancedPadding({...child.size,top:o.top!==undefined?o.top:lines.top,left:o.left!==undefined?o.left:lines.left,progress:o.padding??1,leading:o.hasVisibleLeading??false,trailing:o.hasVisibleTrailing??true});
      const p=balance.placements.content;
      return layoutPlaceable('balanced',balance.size,c,[{node:child,x:p.x,y:p.y}]);
    }
    const sample=o[name+'Sample']??o.sample??child.size[vertical?'height':'width'];
    const sampleCross=Math.max(0,round(o[name+'Cross']??child.size[vertical?'width':'height']));
    const requested=vertical?{width:sampleCross,height:Math.max(0,round(sample))}:{width:Math.max(0,round(sample)),height:sampleCross};
    const current={width:clamp(requested.width,c.minWidth,c.maxWidth),height:clamp(requested.height,c.minHeight,c.maxHeight)};
    const alignment=o[name+'Current']??o.current??'none';
    const anchor=alignment==='none'?(vertical?(name==='leading'?'end':'start'):(name==='leading'?'start':'end')):alignment;
    let x=0,y=0;
    if(!o[name+'Settled']){
      if(vertical){x=round(f((current.width-child.size.width)/2));y=anchor==='end'?current.height-child.size.height:0;}
      else{x=anchor==='end'?current.width-child.size.width:0;y=round(f((current.height-child.size.height)/2));}
    }
    const delta=round(o[name+'Delta']??(name==='leading'?(o.delta??0):-(o.delta??0)));
    if(vertical)y+=delta;else x+=delta;
    return layoutPlaceable(name,current,c,[{node:child,x,y}]);
  };
  const groupNames=['leading','main','trailing'].filter(name=>name==='main'||(groups[name].length&&o[name+'Composed']!==false));
  const content=measureRowColumn({id:'content',vertical,rtl,...padded,children:groupNames.map(()=>({})),arrangement:'center'},(_,c,i)=>measureGroup(groupNames[i],c));
  const requested={width:clamp(content.size.width+p.horizontal,vertical?wrap.minCross:wrap.minMain,vertical?wrap.maxCross:wrap.maxMain),height:clamp(content.size.height+p.vertical,vertical?wrap.minMain:wrap.minCross,vertical?wrap.maxMain:wrap.maxCross)};
  const paddingNode=layoutPlaceable('padded',requested,axisConstraints(wrap,vertical),[{node:content,x:p.left,y:p.top}]);
  const root=layoutPlaceable('root',paddingNode.size,axisConstraints(outer,vertical),[{node:paddingNode,x:0,y:0}]);
  if(['leading','trailing'].some(name=>groups[name].length&&o[name+'Composed']===false)){
    const probe=toolbarRowLayout({...o,leadingComposed:true,trailingComposed:true});
    for(const name of ['leading','trailing'])if(!fullSizes[name]){fullSizes[name]=probe.fullSizes[name];fullTargets[name]=probe.fullTargets[name];}
  }
  return{size:root.size,placements:layoutPlacements(root),fullTargets,fullSizes,lines,node:root};
}
export function toolbarColors(style='standard') {
  return style==='vibrant'?{toolbarContainer:'primary-container',toolbarContent:'on-primary-container',fabContainer:'tertiary-container',fabContent:'on-tertiary-container'}:
    {toolbarContainer:'surface-container',toolbarContent:'on-surface',fabContainer:'primary-container',fabContent:'on-primary-container'};
}
export function toolbarVisibilityLayout({vertical=false,current='none',alignment='start',animatedSize,delta=0,targetState='Visible',currentState='Visible',full=48}) {
  const size=Math.max(0,Math.round(animatedSize));
  let targetDelta=0;
  if(current!=='none'&&current!==alignment&&targetState==='PostExit')targetDelta=(alignment==='end'?-full:0)-(current==='end'?-full:0);
  const activeAlignment=currentState===targetState?'none':current==='none'?alignment:current;
  const offset=(activeAlignment==='end'?size-full:0)+Math.round(delta);
  return{size:vertical?{width:full,height:size}:{width:size,height:full},placements:{content:vertical?{x:0,y:offset,width:full,height:full}:{x:offset,y:0,width:full,height:full}},targetOffset:vertical?{x:0,y:targetDelta}:{x:targetDelta,y:0}};
}
// First-match XML selector order from MDC 60ff09436d5d477a4b9d02940f31eb01e1250620.
export function dockedToolbarColor(style,kind,states) {
  const vibrant=style==='vibrant',selected=states.checkable&&states.checked;
  const normal=vibrant?'on-primary-container':'on-surface-variant',chosen=vibrant?'on-surface':'on-secondary-container';
  const container=vibrant?'primary-container':'surface-container',chosenContainer=vibrant?'surface-container':'secondary-container';
  if(kind==='icon_button_container')return{role:states.enabled&&selected?chosenContainer:container,alpha:1};
  if(kind==='icon_button_ripple')return{role:normal,alpha:(states.pressed||states.focused)? .1:states.hovered? .08:.1};
  if(!states.enabled)return{role:'on-surface',alpha:.38};
  return{role:states.hovered||states.focused||states.pressed?normal:selected?chosen:normal,alpha:1};
}
