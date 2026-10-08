/** CSS coordinate adapter for the independently verified fitted-round pointer model. */
import {roundedPointerHit,capturedPointerOutOfBounds} from './pointer-geometry.js';

export function domPointerInput(node,event){
  const type={mouse:'Mouse',touch:'Touch',pen:'Stylus'}[event.pointerType];
  if(!type)return null;
  const rect=node.getBoundingClientRect(),css=getComputedStyle(node);
  const width=parseFloat(css.width)||0,height=parseFloat(css.height)||0;
  const scaleX=rect.width/width||1,scaleY=rect.height/height||1;
  return{width,height,radius:Math.min(parseFloat(css.borderTopLeftRadius)||0,width/2,height/2),
    x:(event.clientX-rect.left)/scaleX,y:(event.clientY-rect.top)/scaleY,type};
}
export function domPointerHit(node,event){const input=domPointerInput(node,event);return input===null||roundedPointerHit(input)!==null;}
export function domPointerHoverHit(node,event){const input=domPointerInput(node,event);return input===null||roundedPointerHit(input)?.direct===true;}
export function domPointerOutOfBounds(node,event){const input=domPointerInput(node,event);return input!==null&&capturedPointerOutOfBounds(input);}
