/*
 * Copyright 2019 The Android Open Source Project. Apache-2.0.
 * Float adaptation of CubicBezierEasing / Bezier root/evaluation/bounds helpers.
 * Pinned originals: test/fixtures/androidx/navigation-drawer, revision a095da93.
 * Independent original execution: tools/androidx-progress/generate-circular-motion.mjs.
 */
import {fastCbrt} from './drawer-motion.js';
const f=Math.fround,epsilon=f(1.05e-6),tau=Math.PI*2;
function validRoot(number){const root=f(number),clamped=Math.max(0,Math.min(1,root));return Math.abs(f(clamped-root))>epsilon?NaN:clamped;}
function firstCubicRoot(p0,p1,p2,p3){
 let a=3*(p0-2*p1+p2),b=3*f(p1-p0),c=p0;
 const divisor=-p0+3*f(p1-p2)+p3;
 if(Math.abs(divisor)<1e-7){
  if(Math.abs(a)<1e-7)return Math.abs(b)<1e-7?NaN:validRoot(-c/b);
  const q=Math.sqrt(b*b-4*a*c),root=validRoot((q-b)/(2*a));
  return Number.isNaN(root)?validRoot((-b-q)/(2*a)):root;
 }
 a/=divisor;b/=divisor;c/=divisor;
 const o3=(3*b-a*a)/9,q2=(2*a*a*a-9*a*b+27*c)/54,discriminant=q2*q2+o3*o3*o3,a3=a/3;
 if(discriminant<0){
  const r=Math.sqrt(-(o3*o3*o3)),phi=Math.acos(Math.max(-1,Math.min(1,-q2/r))),t1=f(2*fastCbrt(f(r)));
  for(const angle of[phi,phi+tau,phi+2*tau]){const root=validRoot(t1*Math.cos(angle/3)-a3);if(!Number.isNaN(root))return root;}
  return NaN;
 }
 if(discriminant===0){
  const u1=-fastCbrt(f(q2)),root=validRoot(f(f(2*u1)-f(a3)));
  return Number.isNaN(root)?validRoot(f(-u1-f(a3))):root;
 }
 const sd=Math.sqrt(discriminant),u1=fastCbrt(f(-q2+sd)),v1=fastCbrt(f(q2+sd));
 return validRoot(f(u1-v1)-a3);
}
function cubic(p1,p2,t){const a=f(f(1/3)+f(p1-p2)),b=f(p2-f(2*p1));return f(f(3*f(f(f(f(a*t)+b)*t)+p1))*t);}
function cubicFour(p0,p1,p2,p3,t){
 const a=f(f(p3+f(3*f(p1-p2)))-p0),b=f(3*f(f(p2-f(2*p1))+p0)),c=f(3*f(p1-p0));
 return f(f(f(f(f(f(a*t)+b)*t)+c)*t)+p0);
}
function verticalBounds(p1,p2){
 const d0=f(3*p1),d1=f(3*f(p2-p1)),d2=f(3*f(1-p2)),roots=[];
 const a=d0,b=d1,c=d2,divisor=a-2*b+c;
 const push=value=>{const root=validRoot(value);if(!Number.isNaN(root))roots.push(root);};
 if(divisor!==0){const v1=-Math.sqrt(b*b-a*c),v2=-a+b;push(-(v1+v2)/divisor);push((v1-v2)/divisor);}
 else if(b!==c)push((2*b-c)/(2*b-2*c));
 const dd0=f(2*f(d1-d0)),dd1=f(2*f(d2-d1));push(f(-dd0/f(dd1-dd0)));
 let min=0,max=1;for(const t of roots){const y=cubicFour(0,p1,p2,1,t);min=Math.min(min,y);max=Math.max(max,y);}
 return{min,max};
}
export class CubicBezierEasing {
 constructor(a,b,c,d){
  this.a=f(a);this.b=f(b);this.c=f(c);this.d=f(d);
  if([this.a,this.b,this.c,this.d].some(Number.isNaN))throw new TypeError('CubicBezierEasing parameters cannot be NaN');
  Object.assign(this,verticalBounds(this.b,this.d));
 }
 transform(value){
  const fraction=f(value);if(!(fraction>0&&fraction<1))return fraction;
  const progress=Math.max(fraction,f(1.1920929e-7)),t=firstCubicRoot(f(-progress),f(this.a-progress),f(this.c-progress),f(1-progress));
  if(Number.isNaN(t))throw new RangeError('CubicBezierEasing has no root at '+fraction);
  return Math.max(this.min,Math.min(this.max,cubic(this.b,this.d,t)));
 }
}

/** Native Float lerp, retaining each multiplication/addition boundary. */
export function floatLerp(from,to,fraction){from=f(from);to=f(to);fraction=f(fraction);return f(f(f(1-fraction)*from)+f(fraction*to));}
/** DOM milliseconds map to the nearest integer nanosecond for the web clock adapter. */
export function animationNanos(milliseconds){return Math.round(Math.max(0,milliseconds)*1e6);}
/** FloatTweenSpec converts the clamped Long nanoseconds and duration to Float. */
export function tweenFraction(milliseconds,duration){if(duration===0)return 1;const nanos=duration*1e6;return f(f(Math.min(animationNanos(milliseconds),nanos))/f(nanos));}
