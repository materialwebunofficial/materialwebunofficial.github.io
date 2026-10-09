/*
 * Copyright 2024 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may obtain a copy at https://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed
 * under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 *
 * Offset ownership adapted from Linear/CircularWavyProgressModifiers.kt,
 * AndroidX a095da93. DOM attachment, cache triggers and RAF are platform bindings.
 */
import {AnimationClock} from '../motion/animation-clock.js';
import {progressWaveOffset} from './progress-indicator-layout.js';

const f=Math.fround,dp=value=>f(value)+0;
const roundInt=value=>Number.isNaN(value)?0:Math.max(-2147483648,Math.min(2147483647,Math.round(value)));

/** Native Dp/Float arithmetic and JVM Float rounding, including saturation. */
export function progressWaveDuration(wavelength,speed,vertices=1){
  return Math.max(50,roundInt(f(f(f(dp(wavelength)/dp(speed))*1000)*f(vertices))));
}

/** Wave phase jobs retain state independently of drawing and amplitude jobs. */
export class ProgressWaveMotion {
  constructor({circular=false,wavelength,speed,amplitude=1}){
    this.circular=circular;this.wavelength=dp(wavelength);this.speed=dp(speed);
    this.amplitude=f(Math.max(0,Math.min(1,amplitude)));this.vertices=-1;
    this.attached=false;this.value=0;this.run=null;
  }
  get active(){return this.attached&&this.run!==null;}
  attach(){this.attached=true;if(!this.circular)this.restart();}
  detach(){this.attached=false;this.stop();if(this.circular)this.vertices=-1;}
  stop(){this.run=null;}
  restart(){
    this.stop();
    // The circular drawing guard precedes the invalid-parameter snap.
    if(!this.attached||this.circular&&this.amplitude<=0)return;
    if(this.speed>0&&this.wavelength>0&&(!this.circular||this.vertices>0)){
      this.run={from:this.value,duration:progressWaveDuration(this.wavelength,this.speed,this.circular?this.vertices:1),clock:new AnimationClock()};
    }else this.value=0;
  }
  setWavelength(value){value=dp(value);if(this.wavelength!==value){this.wavelength=value;this.restart();}}
  setSpeed(value){value=dp(value);if(this.speed!==value){this.speed=value;this.restart();}}
  setAmplitude(value){
    value=f(Math.max(0,Math.min(1,value)));const previous=this.amplitude;
    if(previous===value)return;
    this.amplitude=value;
    if(this.circular){if(value>0&&previous===0)this.restart();else if(value===0)this.stop();}
  }
  setVertices(vertices){if(this.circular)this.vertices=Math.max(5,vertices);}
  cache(vertices){
    if(!this.circular)return;
    this.setVertices(vertices);
    // A changing vertex cache does not replace an active native phase job.
    if(this.amplitude>0&&!this.run)this.restart();
  }
  frame(now){
    if(!this.active)return this.value;
    const run=this.run;run.clock.frame(now);
    return this.value=progressWaveOffset(run.from,run.clock.milliseconds,run.duration);
  }
  /** Static phase for the declared web reduced-motion adapter. */
  settle(){this.stop();this.value=0;}
}
