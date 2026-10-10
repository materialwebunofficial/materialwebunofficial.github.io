import {bindFocusIndication} from './focus-indication.js';
import {bindPointerHover} from './pointer-routing.js';
/*
 * Copyright 2021-2024 The Android Open Source Project
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
 * AndroidX ButtonElevation/ToggleButtonElevation a095da93. The browser hosts
 * input events and CSS shadow raster; scalar target/spec/order follow source.
 */
import {InteractionOrder, elevationSpec, interactionTween} from './interaction-tween.js';
import {interpolateShadow} from './shadow-tween.js';

const f = Math.fround;
const fields = ['defaultElevation','pressedElevation','focusedElevation','hoveredElevation','disabledElevation'];
const dp = [0,1,3,6,8,12];
export const buttonElevationDefaults = variant => variant === 'elevated' ? [1,1,1,3,0]
  : variant === 'filled' || variant === 'tonal' ? [0,0,0,1,0] : null;
export function buttonElevationDefinition(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object' || fields.some(key => typeof value[key] !== 'number' || !Number.isFinite(f(value[key])))) {
    throw new TypeError('Button elevation requires five finite numeric elevation fields.');
  }
  return Object.freeze(Object.fromEntries(fields.map(key => [key,f(value[key])])));
}
export const buttonElevationValues = definition => fields.map(key => definition[key]);

/** Source's remembered Animatable, independent of browser event delivery. */
export class ButtonElevationMotion {
  constructor(values, enabled = true) {
    this.value = this.target = this.from = f(values[enabled ? 0 : 4]);
    this.start = 0; this.spec = null; this.initialVelocity = 0;
    this.launches = 0; this.snaps = 0;
  }
  sample(time) {
    if (!this.spec) return this.value;
    if (time-this.start >= this.spec.duration) { this.value=this.target;this.spec=null;return this.value; }
    return this.value=interactionTween(this.from,this.target,time-this.start,this.spec);
  }
  velocity(time) {
    this.sample(time);if (!this.spec) return 0;
    const elapsed = Math.max(0,Math.trunc(time-this.start));
    if (!elapsed) return this.initialVelocity;
    return f(f(interactionTween(this.from,this.target,elapsed,this.spec)-interactionTween(this.from,this.target,elapsed-1,this.spec))*1000);
  }
  update(values, kind, enabled, time) {
    const target = f(values[!enabled ? 4 : kind === 'press' ? 1 : kind === 'focus' ? 2 : kind === 'hover' ? 3 : kind === 'drag' && values.length > 5 ? 5 : 0]);
    // LaunchedEffect is keyed only by target. Equal numeric targets preserve
    // an existing transition even when enabled, kind or configuration changes.
    if (target === this.target) return;
    const current=this.sample(time),velocity=this.velocity(time),previous=this.target;
    this.target=target;
    if (!enabled) { this.from=this.value=target;this.spec=null;this.initialVelocity=0;this.snaps++;return; }
    // Source branch order matters when Press/Focus/Rest share a numeric value.
    const fromKind=previous===values[1]?'press':previous===values[3]?'hover':previous===values[2]?'focus':values.length>5&&previous===values[5]?'drag':null;
    const spec=elevationSpec(fromKind,kind);
    if (!spec.duration) { this.from=this.value=target;this.spec=null;this.initialVelocity=0;this.snaps++;return; }
    this.from=current;this.initialVelocity=velocity;this.start=time;this.spec=spec;this.launches++;
  }
  finish() { this.value=this.target;this.spec=null;this.initialVelocity=0; }
}

/** Resolve the source scalar through live web shadow tokens. */
export function buttonElevationShadow(value, shadows) {
  // Levels are read on demand: at rest a button only needs its own level.
  const at = typeof shadows === 'function' ? shadows : level => shadows[level];
  if (!(value > 0)) return at(0);
  let high=dp.findIndex(level=>level>=value);
  if (high<0) high=dp.length-1;
  if (value===dp[high] || value>=dp.at(-1)) return at(high);
  return interpolateShadow(at(high-1),at(high),(value-dp[high-1])/(dp[high]-dp[high-1]));
}

export function bindButtonElevation(button, {configuration, disabled, hitTest = () => true, MotionClass=ButtonElevationMotion, interactionSource=()=>true, compositionKey=()=>undefined, signal}) {
  const order=new InteractionOrder(),media=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const probes=dp.map((_,level)=>{
    const probe=document.createElement('span');probe.hidden=true;probe.setAttribute('aria-hidden','true');
    probe.style.boxShadow=`var(--md-sys-elevation-level${level}, var(--md-sys-elevation-level-${level}, none))`;
    button.append(probe);return probe;
  });
  let values=configuration(),interactive=interactionSource(),key=compositionKey(),motion=values?new MotionClass(values,!disabled(),interactive):null,raf=null,disposed=false;
  const originalShadow=button.style.boxShadow;let writtenShadow,paintedShadow;
  const shadowAt=level=>getComputedStyle(probes[level]).boxShadow;
  function paint(time) {
    const elevation=motion?.sample(time)??0;
    const shadow=buttonElevationShadow(elevation,shadowAt);
    // Unchanged frames write nothing, so resting buttons do not invalidate style.
    if(shadow!==paintedShadow||button.style.boxShadow!==writtenShadow){button.style.boxShadow=shadow;paintedShadow=shadow;writtenShadow=button.style.boxShadow;}
    const level=String(elevation);if(button.dataset.elevation!==level)button.dataset.elevation=level;
  }
  function tick(time=performance.now()) {
    if(disposed)return;
    if(raf!==null)cancelAnimationFrame(raf);raf=null;
    paint(time);
    if(motion?.spec)raf=requestAnimationFrame(tick);
  }
  function update() {
    if(disposed)return;
    const time=performance.now();motion?.update(values,order.latest(),!disabled(),time);
    if(media?.matches)motion?.finish();tick(time);
  }
  function set(kind,active,identity=kind) {
    if(disposed||!motion||!interactive||(active&&disabled()))return;
    if(order.set(kind,active,identity))update();
  }
  function refresh() {
    if(disposed)return;
    const next=configuration();
    const nextInteractive=interactionSource(),nextKey=compositionKey();
    if(Boolean(next)!==Boolean(values)||nextInteractive!==interactive||nextKey!==key){order.clear();motion=next?new MotionClass(next,!disabled(),nextInteractive):null;}
    interactive=nextInteractive;key=nextKey;
    values=next;update();
  }
  const hoverBinding=bindPointerHover(button,{hitTest,onHover:active=>set('hover',active),signal});
  const focusBinding=bindFocusIndication(button,{onFocus:active=>set('focus',active),signal});
  const preference=()=>{if(media.matches){motion?.finish();tick();}};
  media?.addEventListener('change',preference);
  function dispose() {
    focusBinding.dispose();
    hoverBinding.dispose();
    if(disposed)return;disposed=true;
    if(raf!==null)cancelAnimationFrame(raf);raf=null;
    media?.removeEventListener('change',preference);probes.forEach(probe=>probe.remove());
    if(button.style.boxShadow===writtenShadow)button.style.boxShadow=originalShadow;
    delete button.dataset.elevation;order.clear();
  }
  signal.addEventListener('abort',dispose,{once:true});paint(performance.now());
  return {press(active,identity='press'){set('press',active,identity);},drag(active,identity='drag'){if(values?.length>5)set('drag',active,identity);},refresh,dispose,
    get motion(){return motion;},get order(){return [...order.active];},get raf(){return raf;},get disposed(){return disposed;}};
}
