/*
 * Copyright 2019 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Web adaptation of AndroidX ColorVectorConverter / vectorized spring:
 * a095da93f8e98dea8748ceed79ea8427aade245f. CSS performs the color-space
 * conversion; the timeline uses Compose's [alpha, L, a, b] channel order.
 */
import { SpringPhysics } from './spring-physics.js';
import { springDuration } from './spring-duration.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

// VectorizedSpringSpec uses the longest component duration for every channel.
// A nearly settled channel must keep its velocity until that common endpoint.
export class ColorSpringVector {
  constructor(value) { this.value=this.target=value.map(Math.fround);this.animation=null; }
  sample(now) {
    const animation=this.animation;
    if(!animation)return{value:[...this.value],velocity:[0,0,0,0]};
    const elapsed=Math.max(0,now-animation.start);
    if(elapsed>=animation.duration){this.finish();return this.sample(now);}
    const states=animation.channels.map(channel=>SpringPhysics.solve({...channel,
      from:Math.fround(channel.from-channel.to),to:0,time:Math.floor(elapsed)/1000}));
    return{value:states.map((state,index)=>Math.fround(state.position+animation.channels[index].to)),
      velocity:states.map(state=>Math.fround(state.velocity))};
  }
  to(value,spec,{now=performance.now(),snap=false}={}) {
    const target=value.map(Math.fround);
    if(target.every((component,index)=>component===this.target[index]))return;
    const current=this.sample(now);this.target=target;
    if(snap){this.finish();return;}
    // AnimateAsState retargets from Animatable.value: the original Color vector
    // converter clamps that converted color, while preserving raw velocity.
    // This matters when a caller supplies an underdamped effects spring.
    const converted=current.value.map((value,index)=>clamp(value,index<2?0:-.5,index<2?1:.5));
    const channels=target.map((to,index)=>({from:converted[index],to,velocity:current.velocity[index],
      stiffness:Math.fround(spec.stiffness),dampingRatio:Math.fround(spec.dampingRatio)}));
    this.animation={channels,start:now,duration:Math.max(...channels.map(channel=>springDuration(channel)))};
  }
  finish() {this.value=[...this.target];this.animation=null;}
}

// Resolve already computed CSS colors, including translucent disabled colors.
// Keep conversion in the browser's color implementation instead of interpreting
// CSS color syntax with an incomplete rgb/hex parser. The hidden probe is owned
// by the record and removed with it, and doesn't affect layout or accessibility.
export function colorVector(probe,color) {
  probe.style.color=`oklab(from ${color} l a b / alpha)`;
  const resolved=getComputedStyle(probe).color;
  const match=/^oklab\(\s*([\d.e+-]+)%?\s+([\d.e+-]+)\s+([\d.e+-]+)(?:\s*\/\s*([\d.e+-]+)%?)?\s*\)$/.exec(resolved);
  if(!match)throw new TypeError(`Cannot resolve an Oklab color: ${resolved}`);
  const components=match.slice(1).map(Number);
  return[match[4]===undefined?1:components[3],components[0],components[1],components[2]].map(Math.fround);
}

export function vectorColor([alpha,l,a,b]) {
  return`oklab(${clamp(l,0,1)} ${clamp(a,-.5,.5)} ${clamp(b,-.5,.5)} / ${clamp(alpha,0,1)})`;
}

export class ColorMotion {
  constructor(element,probe,color,draw,{role='expressiveEffectMedium'}={}) {
    this.element=element;this.probe=probe;this.color=color;this.draw=draw;this.role=role;
    this.vector=new ColorSpringVector(colorVector(probe,color));this.raf=null;this.disposed=false;
    this.media=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.onPreference=()=>{if(this.media.matches)this.finish();};
    this.media?.addEventListener('change',this.onPreference);this.render(performance.now());
  }
  set(color,{snap=false}={}) {
    if(this.disposed)return;
    if(color===this.color)return;
    this.color=color;
    this.vector.to(colorVector(this.probe,color),SpringPhysics.getPreset(this.role,this.element),
      {snap:snap||this.media?.matches});
    this.tick(performance.now());
  }
  render(now) {
    if(this.disposed)return;
    const state=this.vector.sample(now);
    this.draw(this.vector.animation?vectorColor(state.value):this.color);
  }
  tick(now) {
    if(this.disposed)return;
    if(this.raf!==null)cancelAnimationFrame(this.raf);this.raf=null;this.render(now);
    if(this.vector.animation)this.raf=requestAnimationFrame(time=>this.tick(time));
  }
  finish() {if(this.disposed)return;this.vector.finish();this.tick(performance.now());}
  dispose() {
    this.disposed=true;
    if(this.raf!==null)cancelAnimationFrame(this.raf);this.raf=null;
    this.media?.removeEventListener('change',this.onPreference);
  }
}
