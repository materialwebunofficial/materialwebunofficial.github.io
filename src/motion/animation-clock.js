/*
 * Copyright 2020 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may obtain a copy at https://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed
 * under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 *
 * Frame-time state adapted from SuspendAnimation.kt at AndroidX a095da93.
 * Frame delivery and DOM milliseconds are platform bindings.
 */
import {animationNanos} from './native-easing.js';

/** SuspendAnimation converts the Long difference to Float before division. */
export function animationPlayTimeNanos(difference,scale=1,duration=0){
  scale=Math.fround(scale);
  if(!(scale>=0))throw new RangeError('Negative animation duration scale');
  return scale===0?duration:Math.trunc(Math.fround(Math.fround(difference)/scale));
}

/** A job establishes time zero on its first delivered frame, then retains state. */
export class AnimationClock {
  constructor(){this.reset();}
  reset(){this.startNanos=null;this.frameNanos=null;this.rawElapsedNanos=0;this.playTimeNanos=0;}
  frame(milliseconds,scale=1,duration=0){
    const nanos=animationNanos(milliseconds);
    if(this.startNanos===null)this.startNanos=nanos;
    this.frameNanos=nanos;this.rawElapsedNanos=nanos-this.startNanos;
    this.playTimeNanos=animationPlayTimeNanos(this.rawElapsedNanos,scale,duration);
    return this.playTimeNanos;
  }
  get milliseconds(){return this.playTimeNanos/1e6;}
}
