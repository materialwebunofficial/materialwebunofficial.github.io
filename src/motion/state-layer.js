import {bindFocusIndication} from './focus-indication.js';
import {bindPointerHover} from './pointer-routing.js';
/* Copyright 2021 The Android Open Source Project. Apache-2.0.
 * Material3 CommonRippleNode opacity indication; original scalar/event hosts
 * and specs: test/fixtures/androidx/ripple/interaction-oracle.json.
 */
import {InteractionOrder,stateLayerSpec,interactionTween} from './interaction-tween.js';

export class StateLayerMotion {
  constructor(value=0,kind=null) {
    this.value=this.from=this.target=Math.fround(value);this.kind=kind;
    this.start=0;this.spec={duration:0,easing:'linear'};
  }
  sample(time) { return this.value=interactionTween(this.from,this.target,time-this.start,this.spec); }
  update(kind,value,time) {
    // The original collector launches only when the most recent interaction
    // object changes. A theme update alone does not restart the current tween.
    if(kind===this.kind)return false;
    this.sample(time);this.from=this.value;this.target=Math.fround(value);
    this.spec=stateLayerSpec(this.kind,kind);this.kind=kind;this.start=time;return true;
  }
  finish() { this.value=this.from=this.target;this.spec={duration:0,easing:'linear'}; }
  running(time) { return this.spec.duration>0&&time-this.start<this.spec.duration; }
}

export function bindStateLayer(button,{disabled=()=>false,hitTest=()=>true,property='--md-button-state-alpha',onChange=()=>{},signal}={}) {
  const order=new InteractionOrder(),motion=new StateLayerMotion();
  const original=button.style.getPropertyValue(property),priority=button.style.getPropertyPriority(property);
  const media=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');let raf=null,disposed=false,written;
  function paint(time) { button.style.setProperty(property,String(motion.sample(time)));written=button.style.getPropertyValue(property); }
  function tick(time=performance.now()) {
    if(disposed)return;
    if(raf!==null)cancelAnimationFrame(raf);raf=null;
    paint(time);if(motion.running(time))raf=requestAnimationFrame(tick);
  }
  function target(kind) {
    if(kind===null)return 0;
    const value=parseFloat(getComputedStyle(button).getPropertyValue(`--md-sys-state-${kind==='drag'?'dragged':kind}-opacity`));
    return Number.isFinite(value)?value:kind==='hover'?.08:kind==='drag'?.16:.1;
  }
  function refresh() {
    if(disposed)return;
    if(disabled())order.clear();
    const kind=order.latest(false),time=performance.now();motion.update(kind,target(kind),time);
    if(media?.matches)motion.finish();tick(time);onChange(kind);
  }
  function set(kind,active,identity=kind) {
    if(disposed||active&&disabled())return;
    if(order.set(kind,active,identity))refresh();
  }
  const hoverBinding=bindPointerHover(button,{hitTest,onHover:active=>set('hover',active),signal});
  const focusBinding=bindFocusIndication(button,{onFocus:active=>set('focus',active),signal});
  const preference=()=>{if(media.matches){motion.finish();tick();}};
  media?.addEventListener('change',preference);
  function dispose() {
    focusBinding.dispose();
    hoverBinding.dispose();
    if(disposed)return;disposed=true;if(raf!==null)cancelAnimationFrame(raf);raf=null;
    media?.removeEventListener('change',preference);order.clear();
    if(button.style.getPropertyValue(property)===written){if(original)button.style.setProperty(property,original,priority);else button.style.removeProperty(property);}
  }
  signal?.addEventListener('abort',dispose,{once:true});paint(performance.now());
  return{motion,refresh,dispose,drag(active,identity='drag'){set('drag',active,identity);},get order(){return [...order.active];},get raf(){return raf;},get disposed(){return disposed;}};
}
