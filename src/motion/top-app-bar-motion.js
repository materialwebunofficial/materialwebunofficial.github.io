/* Copyright 2024 The Android Open Source Project. Apache-2.0.
 * CubicBezierEasing/findFirstCubicRoot/evaluateCubic at AndroidX a095da93.
 * Source curves: TopTitleAlphaEasing and FastOutLinearInEasing.
 */
import {fastCbrt} from './drawer-motion.js';
const f=Math.fround;
const valid=r=>{const s=Math.max(0,Math.min(1,r));return Math.abs(f(s-r))>f(1.05e-6)?NaN:s;};
function transform(fraction,x1,y1,x2,y2){
 fraction=f(fraction);if(!(fraction>0&&fraction<1))return fraction;
 const progress=Math.max(fraction,f(1.1920929e-7)),p0=f(-progress),p1=f(f(x1)-progress),p2=f(f(x2)-progress),p3=f(1-progress);
 let a=3*(p0-2*p1+p2),b=3*f(p1-p0),c=p0;
 const divisor=-p0+3*f(p1-p2)+p3;let t;
 if(Math.abs(divisor)<1e-7){
  if(Math.abs(a)<1e-7)t=Math.abs(b)<1e-7?NaN:valid(f(-c/b));
  else{const root=Math.sqrt(b*b-4*a*c);t=valid(f((root-b)/(2*a)));if(Number.isNaN(t))t=valid(f((-b-root)/(2*a)));}
 }else{
  a/=divisor;b/=divisor;c/=divisor;
  const o3=(3*b-a*a)/9,q2=(2*a*a*a-9*a*b+27*c)/54,discriminant=q2*q2+o3*o3*o3,a3=a/3;
  if(discriminant<0){
   const r=Math.sqrt(-(o3*o3*o3)),phi=Math.acos(Math.max(-1,Math.min(1,-q2/r))),t1=f(2*fastCbrt(f(r)));
   for(const angle of [phi,phi+2*Math.PI,phi+4*Math.PI]){t=valid(f(t1*Math.cos(angle/3)-a3));if(!Number.isNaN(t))break;}
  }else if(discriminant===0){const u=-fastCbrt(f(q2));t=valid(f(f(2*u)-f(a3)));if(Number.isNaN(t))t=valid(f(-u-f(a3)));}
  else{const sd=Math.sqrt(discriminant);t=valid(f(f(fastCbrt(f(-q2+sd))-fastCbrt(f(q2+sd)))-a3));}
 }
 if(Number.isNaN(t))throw new RangeError('Top app bar easing has no solution');
 const aY=f(f(1/3)+f(f(y1)-f(y2))),bY=f(f(y2)-f(2*f(y1)));
 return Math.max(0,Math.min(1,f(f(3*f(f(f(aY*t)+bY)*t+f(y1)))*t)));
}
export const topAppBarTitleAlpha=fraction=>transform(fraction,.8,0,.8,.15);
export const topAppBarColorFraction=fraction=>transform(fraction,.4,0,1,1);
