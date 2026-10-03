/*
 * Copyright 2019-2025 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Web adaptation of VelocityTracker1D (Lsq2), polyFitLeastSquares and
 * Lsq2VelocityTracker at a095da93f8e98dea8748ceed79ea8427aade245f.
 */
const f = Math.fround;
const dot = (a,b) => { let result=0; for(let i=0;i<a.length;i++) result=f(result+f(a[i]*b[i])); return result; };

export function leastSquaresVelocity(samples, maximum=8000) {
  const points=[],times=[],newest=samples.at(-1); if(!newest)return 0;
  let previous=newest;
  for(let i=samples.length-1;i>=0&&points.length<20;i--){
    const sample=samples[i],age=f(newest.time-sample.time),gap=f(Math.abs(sample.time-previous.time));previous=sample;
    if(age>100||gap>40)break;
    points.push(f(sample.position));times.push(-age);
  }
  // The pinned ComposeUiFlags.isVelocityTrackerMinSampleSizeFixEnabled=true.
  if(points.length<2)return 0;
  const count=points.length,n=Math.min(3,count);
  const a=Array.from({length:n},()=>new Float32Array(count));
  const q=Array.from({length:n},()=>new Float32Array(count));
  const r=Array.from({length:n},()=>new Float32Array(n));
  for(let h=0;h<count;h++){
    a[0][h]=1;for(let i=1;i<n;i++)a[i][h]=f(a[i-1][h]*times[h]);
  }
  for(let j=0;j<n;j++){
    const w=q[j];w.set(a[j]);
    for(let i=0;i<j;i++){
      const z=q[i],projection=dot(w,z);for(let h=0;h<count;h++)w[h]=f(w[h]-f(projection*z[h]));
    }
    const inverse=f(1/Math.max(f(Math.sqrt(dot(w,w))),f(1e-6)));
    for(let h=0;h<count;h++)w[h]=f(w[h]*inverse);
    for(let i=0;i<n;i++)r[j][i]=i<j?0:dot(w,a[i]);
  }
  const coefficients=new Float32Array(n);
  for(let i=n-1;i>=0;i--){
    let value=dot(q[i],points);
    for(let j=n-1;j>i;j--)value=f(value-f(r[i][j]*coefficients[j]));
    coefficients[i]=f(value/r[i][i]);
  }
  const velocity=f(coefficients[1]*1000);
  return Number.isNaN(velocity)?0:Math.max(-maximum,Math.min(maximum,velocity));
}

export class PointerVelocityTracker {
  constructor(){this.samples=[];this.lastMove=0;}
  add(time,position){this.samples.push({time:Math.floor(time),position:f(position)});if(this.samples.length>20)this.samples.shift();}
  down(time,position){this.samples=[];this.add(time,position);this.lastMove=Math.floor(time);}
  move(time,position){this.add(time,position);this.lastMove=Math.floor(time);}
  up(time,maximum=8000){
    // Android Lsq2VelocityTracker excludes UP from fitting, and clears tracking
    // after a stationary pause longer than40ms. Historical/coalesced moves count.
    if(Math.floor(time)-this.lastMove>40)this.samples=[];
    return leastSquaresVelocity(this.samples,maximum);
  }
}
