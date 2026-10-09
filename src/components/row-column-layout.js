/*
 * Copyright 2019-2024 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0.
 * RowColumnMeasurePolicy/Row/Column/Arrangement/Alignment at AndroidX
 * a095da93f8e98dea8748ceed79ea8427aade245f. Leaf measurement is a host input.
 */
const f=Math.fround,INF=2147483647;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const int=v=>clamp(Math.trunc(v),-2147483648,INF)||0;
const round=v=>clamp(Math.round(v),-2147483648,INF)||0;
const bounds=o=>({minMain:o.minMain??0,maxMain:o.maxMain??INF,minCross:o.minCross??0,maxCross:o.maxCross??INF});

export function layoutPlaceable(id,requested,constraints,children=[],data={}){
 const size={width:clamp(requested.width,constraints.minWidth,constraints.maxWidth),height:clamp(requested.height,constraints.minHeight,constraints.maxHeight)};
 return{id,requested,size,constraints,offset:{x:int((size.width-requested.width)/2),y:int((size.height-requested.height)/2)},children,...data};
}
// Original SizeNode(enforceIncoming=true) followed by the minimum-interactive
// modifier. Its rounded internal center and Placeable's truncated coercion
// offset are separate operations, including when the parent offers <48px.
export function minimumInteractiveLayout(o){
 const c={minWidth:o.minWidth??0,maxWidth:o.maxWidth??INF,minHeight:o.minHeight??0,maxHeight:o.maxHeight??INF};
 const width=clamp(o.width,c.minWidth,c.maxWidth),height=clamp(o.height,c.minHeight,c.maxHeight);
 const minimum=Math.max(0,round(o.minimum??48));
 const requested={width:Math.max(minimum,width),height:Math.max(minimum,height)};
 const touch=layoutPlaceable('touch',requested,c);
 const body={x:touch.offset.x+round(f((requested.width-width)/2)),y:touch.offset.y+round(f((requested.height-height)/2)),width,height};
 return{size:touch.size,requested,body,lines:{top:Math.max(0,round(f((minimum-height)/2))),left:Math.max(0,round(f((minimum-width)/2)))}};
}
export function axisConstraints(b,vertical){return vertical?{minWidth:b.minCross,maxWidth:b.maxCross,minHeight:b.minMain,maxHeight:b.maxMain}:{minWidth:b.minMain,maxWidth:b.maxMain,minHeight:b.minCross,maxHeight:b.maxCross};}
export function layoutPlacements(node,x=0,y=0,result={}){
 x+=node.offset.x;y+=node.offset.y;result[node.id]={x,y,width:node.requested.width,height:node.requested.height};
 for(const p of node.children)layoutPlacements(p.node,x+p.x,y+p.y,result);
 return result;
}
export function measureLayoutLeaf(id,input,constraints,vertical){
 if(input.ink){
  const interactive=minimumInteractiveLayout({...input.ink,...constraints});
  const body=interactive.body,offset={x:int((interactive.size.width-interactive.requested.width)/2),y:int((interactive.size.height-interactive.requested.height)/2)};
  const ink=layoutPlaceable(id+'-body',{width:body.width,height:body.height},{minWidth:body.width,maxWidth:body.width,minHeight:body.height,maxHeight:body.height});
  return layoutPlaceable(id,interactive.requested,constraints,[{node:ink,x:body.x-offset.x,y:body.y-offset.y}],{line:input.line??null,interactiveLines:interactive.lines});
 }
 const natural=vertical?{width:input.cross,height:input.main}:{width:input.main,height:input.cross};
 const requested=input.required?natural:{width:clamp(natural.width,constraints.minWidth,constraints.maxWidth),height:clamp(natural.height,constraints.minHeight,constraints.maxHeight)};
 return layoutPlaceable(id,requested,constraints,[],{line:input.line??null});
}
// Coordinator.get adds the apparent-to-real offset. Mapping that modifier
// line through its actual placed position adds that offset again. Keep both
// original operations, then apply the queried row's own coercion offset.
export function rowAlignmentLines(node){
 let top=null,left=null;
 for(const p of node.children){const child=p.node,lines=child.interactiveLines;if(!lines)continue;
  const y=p.y+child.offset.y+lines.top+child.offset.y,x=p.x+child.offset.x+lines.left+child.offset.x;
  top=top===null?y:Math.min(top,y);left=left===null?x:Math.min(left,x);
 }
 return{top:top===null?null:top+node.offset.y,left:left===null?null:left+node.offset.x};
}
function arrange(main,sizes,name,rtl,vertical,spacing){
 const consumed=sizes.reduce((a,b)=>a+b,0),positions=sizes.map(()=>0),reverse=rtl&&!vertical;
 if(name==='spaced'){
  let free=main,last=0;
  if(reverse){for(let i=0;i<sizes.length;i++){positions[i]=Math.max(0,free-sizes[i]);last=Math.min(spacing,positions[i]);free=positions[i]-last;}free+=last;}
  else{let occupied=0;for(let i=0;i<sizes.length;i++){positions[i]=Math.min(occupied,main-sizes[i]);last=Math.min(spacing,main-positions[i]-sizes[i]);occupied=positions[i]+sizes[i]+last;}occupied-=last;free=main-occupied;}
  if(free>0){const group=round(f(free/2)),offset=reverse?group-free:group;for(let i=0;i<sizes.length;i++)positions[i]+=offset;}
  return positions;
 }
 let gap=0,current=0;
 if(name==='center')current=f((main-consumed)/2);
 else if(name==='end')current=main-consumed;
 else if(name==='between'){gap=f((main-consumed)/Math.max(sizes.length-1,1));if(reverse&&sizes.length===1)current=gap;}
 else if(name==='around'){gap=sizes.length?f((main-consumed)/sizes.length):0;current=f(gap/2);}
 else if(name==='evenly'){gap=f((main-consumed)/(sizes.length+1));current=gap;}
 // Arrangement.Start/End reverse their anchor along with their iteration order.
 if(reverse&&name==='start')current=main-consumed;
 if(reverse&&name==='end')current=0;
 const order=reverse?[...sizes.keys()].reverse():[...sizes.keys()];
 for(const i of order){positions[i]=round(current);current=f(current+f(f(sizes[i])+gap));}
 return positions;
}
function crossPosition(input,size,item,vertical,rtl,before,line,defaultAlignment='center'){
 if(input.align==='line'){
  if(line===null)return 0;const delta=before-line;
  return vertical&&rtl?size-item-delta:delta;
 }
 const alignment=input.align??defaultAlignment,bias=alignment==='start'?-1:alignment==='end'?1:0;
 return round(f(f((size-item)/2)*f(1+(vertical&&rtl?-bias:bias))));
}
export function measureRowColumn(o,measure=(input,c,i)=>measureLayoutLeaf('c'+i,input,c,!!o.vertical)){
 const vertical=!!o.vertical,rtl=!!o.rtl,b=bounds(o),inputs=o.children||[],spacing=o.arrange?round(o.spacing??0):o.arrangement==='spaced'?round(o.spacing??7):0;
 const nodes=inputs.map(()=>null),mainSizes=inputs.map(()=>0),crossSizes=inputs.map(()=>0);
 let totalWeight=0,fixed=0,cross=0,weightedCount=0,lastSpacing=0,relative=false;
 const measureChild=(i,minMain,maxMain)=>{
  const input=inputs[i],desired=input.fillCrossFraction!==undefined&&b.maxCross!==INF?round(f(f(input.fillCrossFraction)*f(b.maxCross))):null;
  const c=axisConstraints({minMain,maxMain,minCross:desired??0,maxCross:desired??b.maxCross},vertical);
  const node=measure(input,c,i);nodes[i]=node;
  mainSizes[i]=node.size[vertical?'height':'width'];crossSizes[i]=node.size[vertical?'width':'height'];
  cross=Math.max(cross,crossSizes[i]);return mainSizes[i];
 };
 for(let i=0;i<inputs.length;i++){
  const weight=f(inputs[i].weight||0);relative||=inputs[i].align==='line';
  if(weight>0){totalWeight=f(totalWeight+weight);weightedCount++;}
  else{const remaining=b.maxMain-fixed,size=measureChild(i,0,b.maxMain===INF?INF:Math.max(0,remaining));lastSpacing=Math.min(spacing,Math.max(0,remaining-size));fixed+=size+lastSpacing;}
 }
 let weighted=0;
 if(weightedCount===0)fixed-=lastSpacing;
 else{
  const target=b.maxMain===INF?b.minMain:b.maxMain,totalSpacing=spacing*(weightedCount-1),remaining=Math.max(0,target-fixed-totalSpacing),unit=f(f(remaining)/totalWeight);
  let remainder=remaining;
  for(const input of inputs)remainder-=round(f(unit*f(input.weight||0)));
  for(let i=0;i<inputs.length;i++)if(nodes[i]===null){const correction=Math.sign(remainder);remainder-=correction;const main=Math.max(0,round(f(unit*f(inputs[i].weight||0)))+correction);weighted+=measureChild(i,inputs[i].fill!==false&&main!==INF?main:0,main);}
  weighted=clamp(int(weighted+totalSpacing),0,b.maxMain-fixed);
 }
 let before=0,after=0;
 if(relative)for(let i=0;i<inputs.length;i++)if(inputs[i].align==='line'){const line=nodes[i].line??null;if(line!==null){before=Math.max(before,line);after=Math.max(after,crossSizes[i]-line);}}
 const main=Math.max(Math.max(0,fixed+weighted),b.minMain),breadth=Math.max(cross,b.minCross,before+after);
 const positions=o.arrange?o.arrange(main,mainSizes,rtl):arrange(main,mainSizes,o.arrangement||'start',rtl,vertical,spacing);
 const children=nodes.map((node,i)=>{const c=crossPosition(inputs[i],breadth,crossSizes[i],vertical,rtl,before,node.line??null,o.crossAlignment??'center');return{node,x:vertical?c:positions[i],y:vertical?positions[i]:c};});
 const requested=vertical?{width:breadth,height:main}:{width:main,height:breadth};
 return layoutPlaceable(o.id||'row',requested,axisConstraints(b,vertical),children,{fullTargets:nodes.map(n=>n.size[vertical?'height':'width'])});
}
export function rowColumnLayout(o){const node=measureRowColumn(o);return{size:node.size,requested:node.requested,placements:layoutPlacements(node)};}

// The complete source intrinsic algorithms use the same explicit host leaf
// queries as measurement. Callers can supply text/wrapping-aware queries.
export function rowColumnIntrinsic(o,available,query=(input,axis,space,kind)=>{
 const value=kind==='min'?(input[axis==='main'?'intrinsicMinMain':'intrinsicMinCross']??input[axis]):input[axis];
 return axis==='cross'&&input.wrap?value*Math.max(1,Math.ceil(input.main/Math.max(1,space))):value;
}){
 const children=o.children||[],spacing=o.arrange?(o.spacing??0):o.arrangement==='spaced'?(o.spacing??7):0;
 const main=kind=>{
  if(!children.length)return 0;let unit=0,fixed=0,total=0;
  for(const child of children){const weight=f(child.weight||0),size=query(child,'main',available,kind);if(weight===0)fixed+=size;else if(weight>0){total=f(total+weight);unit=Math.max(unit,round(f(f(size)/weight)));}}
  return round(f(f(unit)*total))+fixed+(children.length-1)*spacing;
 };
 const cross=kind=>{
  if(!children.length)return 0;let fixed=Math.min((children.length-1)*spacing,available),maximum=0,total=0;
  for(const child of children){const weight=f(child.weight||0);if(weight===0){const remaining=available===INF?INF:available-fixed,size=Math.min(query(child,'main',INF,'max'),remaining);fixed+=size;maximum=Math.max(maximum,query(child,'cross',size,kind));}else if(weight>0)total=f(total+weight);}
  const unit=total===0?0:available===INF?INF:round(f(f(Math.max(available-fixed,0))/total));
  for(const child of children){const weight=f(child.weight||0);if(weight>0)maximum=Math.max(maximum,query(child,'cross',unit===INF?INF:round(f(f(unit)*weight)),kind));}
  return maximum;
 };
 return o.vertical?{minWidth:cross('min'),minHeight:main('min'),maxWidth:cross('max'),maxHeight:main('max')}:{minWidth:main('min'),minHeight:cross('min'),maxWidth:main('max'),maxHeight:cross('max')};
}
