/** Material3 common ripple drawing adapted to DOM ink; see NOTICE and pinned fixtures. */
import {rippleFrame,RIPPLE_TIMING} from './ripple-state.js';
const surfaces=new WeakMap(),pressGroups=new WeakMap();

export function collectPressRipples(event,group,callback){
 pressGroups.set(event,group);
 try{return callback();}finally{pressGroups.delete(event);}
}

export function createRipple(event,container){
 if(!event||!container)return;
 let ripples=surfaces.get(container);
 if(!ripples){ripples=new Set();surfaces.set(container,ripples);}
 for(const ripple of ripples)ripple.finish();
 const rect=container.getBoundingClientRect(),width=container.clientWidth,height=container.clientHeight;
 const pointer=event.type?.startsWith('pointer');
 const originX=pointer&&rect.width?(event.clientX-rect.left)*width/rect.width:width/2;
 const originY=pointer&&rect.height?(event.clientY-rect.top)*height/rect.height:height/2;
 const geometry={width,height,originX,originY};
 let ink=container.querySelector(':scope > .md-ink');
 if(!ink){ink=document.createElement('span');ink.className='md-ink';ink.style.cssText='position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none';container.append(ink);}
 const circle=document.createElement('span');circle.className='md-ripple-effect';
 // Inline geometry supersedes old per-component scale keyframes. Relative
 // color strips content alpha, matching source Color.copy(alpha=pressedAlpha).
 circle.style.cssText='position:absolute;border-radius:50%;pointer-events:none;animation:none;transform:none;background:rgb(from var(--md-ripple-color, currentColor) r g b / 1);';ink.append(circle);
 const group=pressGroups.get(event),media=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
 const start=performance.now();let finishAt=null,raf=null,disposed=false;
 const clock=()=>Math.max(0,Math.trunc(performance.now()-start));
 const schedule=()=>{if(!disposed&&raf===null&&!media?.matches)raf=requestAnimationFrame(tick);};
 const dispose=()=>{
  if(disposed)return;disposed=true;if(raf!==null)cancelAnimationFrame(raf);raf=null;
  media?.removeEventListener('change',motionChange);circle.remove();ripples.delete(controller);group?.delete(controller);
  if(!ink.childElementCount)ink.remove();if(!ripples.size)surfaces.delete(container);
 };
 const paint=(time)=>{
  const frame=rippleFrame(geometry,time,finishAt);
  circle.style.width=circle.style.height=`${frame.radius*2}px`;
  circle.style.left=`${frame.x-frame.radius}px`;circle.style.top=`${frame.y-frame.radius}px`;
  circle.style.opacity=`calc(var(--md-sys-state-pressed-opacity, 0.1) * ${frame.alpha})`;
  return frame;
 };
 const tick=()=>{
  raf=null;if(disposed)return;if(!container.isConnected){dispose();return;}
  const frame=paint(clock());if(frame.done)dispose();else if(!frame.settled)schedule();
 };
 const motionChange=()=>{
  if(raf!==null){cancelAnimationFrame(raf);raf=null;}
  if(media?.matches){if(finishAt!==null)dispose();else paint(RIPPLE_TIMING.expand);}else schedule();
 };
 const controller={finish(){
  if(disposed||finishAt!==null)return;finishAt=clock();
  if(media?.matches)dispose();else{paint(clock());schedule();}
 },dispose};
 ripples.add(controller);group?.add(controller);media?.addEventListener('change',motionChange);
 paint(media?.matches?RIPPLE_TIMING.expand:0);schedule();
 // Calls outside bindPress remain a finite, one-shot indication.
 if(!group)controller.finish();
 return controller;
}
