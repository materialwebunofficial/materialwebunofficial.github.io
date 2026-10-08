/* AndroidX selection modifier chains / foundation measurement, Apache-2.0.
 * Native original records: tools/androidx-selection/layout-snapshot.mjs.
 * Density1, rectangular constraints and input-node attachment are adapters.
 */
const f=Math.fround,round=value=>Math.floor(f(value)+.5),clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const infinity=2147483647;
const offset=(value,amount)=>value===infinity?value:Math.max(0,value+amount);
const constrained=(size,c)=>({width:clamp(size.width,c.minWidth,c.maxWidth),height:clamp(size.height,c.minHeight,c.maxHeight)});
const centered=(parent,child)=>({x:round(f(f(parent.width-child.width)/2)),y:round(f(f(parent.height-child.height)/2))});

export function measureSelectionLayout({kind,minimum=48,clickable=true,rtl=false,constraints={minWidth:0,maxWidth:infinity,minHeight:0,maxHeight:infinity}}){
  const dimensions={checkbox:{width:18,height:18},radio:{width:20,height:20},switch:{width:52,height:32}};
  const body=dimensions[kind];if(!body)throw new TypeError(`Unknown selection kind: ${kind}`);
  const c={...constraints};
  for(const axis of ['Width','Height'])if(!Number.isInteger(c['min'+axis])||!Number.isInteger(c['max'+axis])||c['min'+axis]<0||c['max'+axis]<c['min'+axis])throw new RangeError('Invalid native selection constraints');
  const measured={},placements={};
  function placeable(name,size,bounds,child=null,position={x:0,y:0}){
    const reported=constrained(size,bounds);
    const apparent={x:Math.trunc((reported.width-size.width)/2),y:Math.trunc((reported.height-size.height)/2)};
    measured[name]={...size};
    return{name,size,reported,apparent,child,position};
  }
  function build(index,bounds){
    if(index===nodes.length)return placeable('content',body,{minWidth:body.width,maxWidth:body.width,minHeight:body.height,maxHeight:body.height});
    const {type,name}=nodes[index];
    if(type==='required'){
      const child=build(index+1,{minWidth:body.width,maxWidth:body.width,minHeight:body.height,maxHeight:body.height});
      return placeable(name,child.reported,bounds,child);
    }
    if(type==='padding'){
      const inner={minWidth:offset(bounds.minWidth,-4),maxWidth:offset(bounds.maxWidth,-4),minHeight:offset(bounds.minHeight,-4),maxHeight:offset(bounds.maxHeight,-4)};
      const child=build(index+1,inner),size=constrained({width:child.reported.width+4,height:child.reported.height+4},bounds);
      const x=rtl&&size.width!==0?size.width-child.reported.width-2:2;
      return placeable(name,size,bounds,child,{x,y:2});
    }
    if(type==='wrap'){
      const child=build(index+1,{...bounds,minWidth:0,minHeight:0});
      const size=constrained(child.reported,bounds);
      return placeable(name,size,bounds,child,centered(size,child.reported));
    }
    const child=build(index+1,bounds),min=f(minimum===null?NaN:minimum),active=Number.isFinite(min)&&min>0;
    const pixel=active?round(min):0;
    const size=active?{width:Math.max(child.reported.width,pixel),height:Math.max(child.reported.height,pixel)}:child.reported;
    return placeable(name,size,bounds,child,centered(size,child.reported));
  }
  const base=clickable?2:0,nodes=[];
  if(clickable)nodes.push({type:'minimum',name:'minimum-0'});
  nodes.push({type:'wrap',name:clickable?'input':'wrap-0'});
  if(kind==='radio')nodes.push({type:'padding',name:`padding-${base+1}`});
  nodes.push({type:'required',name:`required-${base+(kind==='radio'?2:1)}`});
  const root=build(0,c);
  function place(node,x,y){
    placements[node.name]={x:x+node.apparent.x,y:y+node.apparent.y,...node.size};
    if(node.child)place(node.child,x+node.apparent.x+node.position.x,y+node.apparent.y+node.position.y);
  }
  place(root,0,0);
  return{size:root.reported,requested:root.size,placements,measured};
}
