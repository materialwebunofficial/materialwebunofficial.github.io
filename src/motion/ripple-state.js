/*
 * Copyright 2026 The Android Open Source Project. Apache-2.0.
 * Material3 CommonRippleNode/RippleAnimation, AndroidX a095da93f8e98dea8748ceed79ea8427aade245f.
 * Browser clock adapter; platform RippleDrawable rendering remains separate.
 */
import { drawerEasing as fastOutSlowIn } from './drawer-motion.js';
const f=Math.fround,lerp=(a,b,t)=>f(f(f(1-t)*a)+f(t*b));
export const RIPPLE_TIMING=Object.freeze({fadeIn:75,expand:225,fadeOut:150});

export function rippleRadii(width,height,bounded=true){
 width=f(width);height=f(height);
 const start=f(Math.max(width,height)*f(.3));
 const end=f(f(Math.sqrt(f(f(width*width)+f(height*height))))/2);
 return{start,end:bounded?f(end+10):end};
}

export function rippleFrame({width,height,originX=width/2,originY=height/2,bounded=true,radius},elapsed,finishAt=null){
 const time=Math.max(0,Math.trunc(elapsed)),radii=rippleRadii(width,height,bounded);
 const fraction=f(Math.min(time,RIPPLE_TIMING.expand)/RIPPLE_TIMING.expand);
 const fadingOut=finishAt!==null&&time>=Math.max(RIPPLE_TIMING.expand,finishAt);
 const fadeStart=finishAt===null?Infinity:Math.max(RIPPLE_TIMING.expand,finishAt);
 const alpha=fadingOut?f(Math.max(0,1-f((time-fadeStart)/RIPPLE_TIMING.fadeOut)))
  :finishAt!==null&&time>=finishAt&&time<RIPPLE_TIMING.expand?1:f(Math.min(time/RIPPLE_TIMING.fadeIn,1));
 const x=f(width/2),y=f(height/2);
 return{radius:lerp(radii.start,radius===undefined?radii.end:f(radius),fastOutSlowIn(fraction)),
  x:lerp(bounded?f(originX):x,x,fraction),y:lerp(bounded?f(originY):y,y,fraction),alpha,
  done:finishAt!==null&&time>=fadeStart+RIPPLE_TIMING.fadeOut,settled:time>=RIPPLE_TIMING.expand&&!fadingOut};
}
