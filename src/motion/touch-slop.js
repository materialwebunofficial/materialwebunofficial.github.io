/*
 * Copyright 2020 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Horizontal TouchSlopDetector / ViewConfiguration.pointerSlop adaptation.
 * Source: AndroidX a095da93f8e98dea8748ceed79ea8427aade245f.
 */
const f=Math.fround;
export function pointerSlop(pointerType,touchSlop=8){
  return pointerType==='mouse'?f(f(touchSlop)*f(.125/18)):f(touchSlop);
}
export class HorizontalTouchSlop {
  constructor(slop){this.slop=f(slop);this.total=0;}
  add(delta){
    this.total=f(this.total+f(delta));
    const distance=Math.abs(this.total);
    if(distance===0||distance<this.slop)return null;
    return f(this.total-f(Math.sign(this.total)*this.slop));
  }
}
