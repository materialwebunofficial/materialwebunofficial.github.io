/* Copyright 2021 The Android Open Source Project. Apache-2.0.
 * Normal pointer-node traversal derived from NodeCoordinator, InnerNodeCoordinator
 * and HitTestResult. Explicit expanded stylus bounds/interception are separate.
 */
import {roundedPointerContains,minimumPointerPadding} from './pointer-geometry.js';
const f=Math.fround;
const better=(a,b)=>a.inLayer!==b.inLayer?a.inLayer:a.distance<b.distance;

export function hitPointerTree(tree,point){
  const hits=[];let depth=-1;
  function best(){let value={distance:Infinity,inLayer:false};for(let i=depth+1;i<hits.length;i++){if(better(hits[i],value))value=hits[i];if(value.distance<0&&value.inLayer)return value;}return value;}
  function hasHit(){const value=best();return value.distance<0&&value.inLayer;}
  function isBetter(distance,inLayer){return depth===hits.length-1||better({distance,inLayer},best());}
  function hit(node,distance,inLayer,children){const saved=depth;hits.splice(depth+1);hits.push({id:node.id,distance,inLayer});depth++;children();depth=saved;}
  function minimum(input){
    if(point.type!=='Touch')return Infinity;
    const p=minimumPointerPadding(input),{width,height,x,y}=input;
    if(width>=p.minimum&&height>=p.minimum)return Infinity;
    const dx=Math.max(0,x<0?f(-x):f(x-width)),dy=Math.max(0,y<0?f(-y):f(y-height));
    return (p.x>0||p.y>0)&&dx<=p.x&&dy<=p.y?f(f(dx*dx)+f(dy*dy)):Infinity;
  }
  function walk(node,px,py,inLayer){
    const input=node.input??{...node,x:f(px),y:f(py)},x=f(input.x),y=f(input.y),width=f(input.width),height=f(input.height);
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    const inClip=node.clipping===false||roundedPointerContains(input,x,y),distance=minimum({...input,x,y,width,height});
    function children(childInLayer){
      if(node.wrapped){walk(node.wrapped,f(x-(node.wrapped.x??0)),f(y-(node.wrapped.y??0)),childInLayer);return;}
      if(!node.inner)return;
      if(!inClip){if(point.type!=='Touch'||!Number.isFinite(distance))return;childInLayer=false;}
      const saved=depth;
      for(let i=(node.children?.length??0)-1;i>=0;i--){
        const child=node.children[i];if(child.placed===false)continue;
        walk(child,f(x-(child.x??0)),f(y-(child.y??0)),childInLayer);
        if(hasHit()){if(child.share)depth=hits.length-1;else break;}
      }
      depth=saved;
    }
    if(!inClip){
      if(Number.isFinite(distance)&&isBetter(distance,false)){if(node.pointer!==false)hit(node,distance,false,()=>children(false));else children(false);}
    }else if(node.pointer===false){children(inLayer);}
    else if(x>=0&&x<width&&y>=0&&y<height){hit(node,-1,inLayer,()=>children(inLayer));}
    else if(Number.isFinite(distance)&&isBetter(distance,inLayer)){hit(node,distance,inLayer,()=>children(inLayer));}
    else children(inLayer);
  }
  walk(tree,point.x,point.y,true);
  return {path:hits.map(hit=>hit.id),direct:hasHit()};
}
