/*
 * Copyright 2020 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Web port of AndroidFlingSpline, FlingCalculator and
 * SplineBasedFloatDecayAnimationSpec, AndroidX a095da93f8e98dea8748ceed79ea8427aade245f.
 */
const f=Math.fround,inflection=f(.35),p1=f(f(.5)*inflection),p2=f(1-f(1-inflection));
const positions=new Float32Array(101),times=new Float32Array(101);
let xMin=0,yMin=0;
for(let i=0;i<100;i++){
 const alpha=f(i/100);let xMax=1,yMax=1,x,y,coef;
 for(;;){x=f(xMin+f(f(xMax-xMin)/2));coef=f(f(3*x)*f(1-x));const tx=f(f(coef*f(f(f(1-x)*p1)+f(x*p2)))+f(f(x*x)*x));
  if(Math.abs(f(tx-alpha))<1e-5)break;if(tx>alpha)xMax=x;else xMin=x;}
 positions[i]=f(f(coef*f(f(f(1-x)*f(.5))+x))+f(f(x*x)*x));
 for(;;){y=f(yMin+f(f(yMax-yMin)/2));coef=f(f(3*y)*f(1-y));const dy=f(f(coef*f(f(f(1-y)*f(.5))+y))+f(f(y*y)*y));
  if(Math.abs(f(dy-alpha))<1e-5)break;if(dy>alpha)yMax=y;else yMin=y;}
 times[i]=f(f(coef*f(f(f(1-y)*p1)+f(y*p2)))+f(f(y*y)*y));
}
times[100]=positions[100]=1;
const rate=f(Math.log(.78)/Math.log(.9));
export function androidFlingPosition(time){
 const clamped=Math.max(0,Math.min(1,f(time))),index=Math.trunc(f(100*clamped));let distanceCoefficient=1,velocityCoefficient=0;
 if(index<100){const lower=f(index/100),upper=f((index+1)/100),lo=positions[index],hi=positions[index+1];
  velocityCoefficient=f(f(hi-lo)/f(upper-lower));distanceCoefficient=f(lo+f(f(clamped-lower)*velocityCoefficient));}
 return{distanceCoefficient,velocityCoefficient};
}
// Density defaults to one CSS pixel per dp. devicePixelRatio is a raster scale,
// and must not silently alter an animation whose offsets are in CSS pixels.
export class AndroidFlingDecay {
 constructor({density=1,friction=.015}={}){
  if(!Number.isFinite(density)||density<=0||!Number.isFinite(friction)||friction<=0)throw new RangeError('Positive density and friction required');
  this.density=f(density);this.friction=f(friction);this.physical=f(f(f(f(f(9.80665)*f(39.37))*this.density)*160)*f(.84));
 }
 info(velocity){
  velocity=f(velocity);const l=Math.log(f(inflection*Math.abs(velocity))/f(this.friction*this.physical)),minusOne=rate-1;
  return{velocity,distance:f(f(this.friction*this.physical)*Math.exp(rate/minusOne*l)),duration:Math.trunc(1000*Math.exp(l/minusOne))};
 }
 target(from,velocity){const info=this.info(velocity);return f(f(from)+f(info.distance*Math.sign(info.velocity)));}
 sample(time,from,velocity){
  const info=this.info(velocity),ms=Math.trunc(time),fraction=info.duration>0?f(ms/f(info.duration)):1;
  const spline=androidFlingPosition(fraction),sign=Math.sign(info.velocity);
  const position=f(f(from)+f(f(info.distance*sign)*spline.distanceCoefficient));
  const speed=f(f(f(f(spline.velocityCoefficient*sign)*info.distance)/f(info.duration))*1000);
  return{position,velocity:speed};
 }
}
