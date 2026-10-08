/**
 * Material Design 3 Expressive (M3 Expressive) Shared Interaction Helper
 *
 * Implements the AGENT-INTERACTION-CONTRACT:
 *  - Components choose press shape/geometry; shared ink follows Material3 CommonRippleNode.
 *  - Single release: setPointerCapture on pointerdown, release on pointerup / pointercancel.
 *  - One semantic click: trusted pointer activation follows its retained owner;
 *    a mismatched DOM click is retargeted with its original pointer fields.
 *  - AbortSignal support: prevents memory leaks on disconnectedCallback.
 *  - Keyboard parity: Enter / Space trigger spring animations and action.
 */

import { SpringPhysics } from './spring-physics.js';
import {collectPressRipples} from './ripple.js';
import {ClickableKeys,keyboardActivationKey} from './clickable-keys.js';
import {registerPointerBinding} from './pointer-routing.js';
export {createRipple} from './ripple.js';

export function nestedInteractiveEvent(event,element) {
  for(const node of event.composedPath()) {
    if(node===element)return false;
    if(node.matches?.('button,input,select,textarea,a[href],summary,[contenteditable="true"],[role="button"],[role="checkbox"],[role="radio"],[role="switch"]'))return true;
  }
  return false;
}

/** Animate scale down on press. */
export function pressScale(el, scale = 0.95, preset = 'expressiveSpatialFast') {
  if (!el) return;
  SpringPhysics.animateProperty(el, 'scale', 1.0, scale, preset);
}

/** Animate scale back to 1 on release. */
export function releaseScale(el, scale = 0.95, preset = 'expressiveSpatialMedium') {
  if (!el) return;
  SpringPhysics.animateProperty(el, 'scale', scale, 1.0, preset);
}

/** Animate a border-radius (shape morph) between two numeric px values. */
export function morphShape(el, from, to, preset = 'expressiveSpatialMedium') {
  if (!el) return;
  SpringPhysics.animateProperty(el, 'border-radius', from, to, preset);
}

/**
 * Wire press / release / keyboard on an interactive element.
 *
 * @param {HTMLElement} el
 * @param {Object}   opts
 * @param {() => boolean} [opts.disabled] Returns true when component is disabled.
 * @param {() => void}    [opts.onPress]  Fired on press start (scale down / shape morph).
 * @param {() => void}    [opts.onRelease] Fired on release/cancel (scale up / shape morph back).
 * @param {() => void}    [opts.onActivate] Fired once per committed activation.
 * @param {(interaction: {type: string, press: object}) => void} [opts.onInteraction] Each owned press, release or cancel, including overlapping inputs.
 * @param {(event: Event) => boolean} [opts.ignoreEvent] Leaves nested controls' events untouched.
 * @param {Object} [opts.pointerPolicy] Surface hit eligibility and captured-pointer bounds.
 * @param {() => boolean} [opts.pointerNode] Whether the clickable modifier exists, independent of its enabled state.
 * @param {boolean} [opts.keyboardActivation] Native per-key press ownership and key-up activation.
 * @param {AbortSignal}   [opts.signal]   Optional abort signal for event cleanup.
 * @returns {{refresh: () => void}|undefined} Synchronously apply a component's enabled-state update.
 */
export function bindPress(el, {
  disabled = () => false,
  onPress,
  onRelease,
  onActivate,
  onInteraction,
  ignoreEvent = () => false,
  pointerPolicy,
  pointerNode=()=>true,
  keyboardActivation = false,
  signal
} = {}) {
  if (!el) return;
  let isPressed = false;
  let pointerPressed = false;
  let pointerId = null;
  let pointerPress = null;
  let canceledClick = false;
  let disposed = false;
  let nestedKeyDefault=false,nestedKeyTimer=null;
  let routing=null;
  const allRipples = new Set();
  const rippleGroup = () => {
    const group=new Set();
    return {add(ripple){group.add(ripple);allRipples.add(ripple);},delete(ripple){group.delete(ripple);allRipples.delete(ripple);},[Symbol.iterator](){return group.values();}};
  };
  const pressRipples = rippleGroup(),keyRipples=new Map();
  const native = el.matches('button, input, a[href]');
  function beginVisual(event,group) {
    isPressed=true;el.classList.add('pressed');
    collectPressRipples(event,group,()=>onPress?.(event));
  }
  function endVisual() {
    if(pointerPressed||keys?.presses.size||!isPressed)return;
    isPressed=false;el.classList.remove('pressed');onRelease?.();
  }
  function finishKey(press) {
    for(const ripple of keyRipples.get(press)??[])ripple.finish();keyRipples.delete(press);
  }
  const keys=keyboardActivation?new ClickableKeys({enabled:!disabled(),
    onPress(press,event){const group=rippleGroup();keyRipples.set(press,group);onInteraction?.({type:'press',press});beginVisual(event,group);},
    onRelease(press){onInteraction?.({type:'release',press});finishKey(press);endVisual();},
    onCancel(press){onInteraction?.({type:'cancel',press});finishKey(press);},
    onClick(){el.click();}
  }):null;
  function ignoredKey(event) {
    if(!ignoreEvent(event))return false;
    if(keys&&keyboardActivationKey(event)!==null){
      // Slotted editable controls must keep their own default (e.g. inserting
      // Space). HTML can also synthesize an ancestor button click for that key.
      nestedKeyDefault=true;clearTimeout(nestedKeyTimer);
      nestedKeyTimer=setTimeout(()=>{nestedKeyDefault=false;nestedKeyTimer=null;},0);
    }
    return true;
  }

  const start = (e,routed=false) => {
    if ((!routed&&ignoreEvent(e)) || disabled() || (keys?pointerPressed:isPressed)) return;
    if (e && e.pointerType === 'mouse' && e.button !== 0) { if (pointerPolicy) canceledClick = true; return; }
    if (e?.isPrimary === false) return;
    if (pointerPolicy && !pointerPolicy.hitTest(e)) { canceledClick = true; e.preventDefault(); return; }
    pointerPressed = true;
    pointerPress = {};
    canceledClick = false;
    if (typeof e?.pointerId === 'number') pointerId = e.pointerId;
    try {
      if (e && typeof e.pointerId === 'number') {
        el.setPointerCapture(e.pointerId);
      }
    } catch (_) {}
    onInteraction?.({type:'press',press:pointerPress});beginVisual(e,pressRipples);
    return true;
  };

  const end = (type='release') => {
    if (!(keys?pointerPressed:isPressed)) return;
    pointerPressed = false;
    if(type==='cancel')routing?.cancel();
    const press=pointerPress;pointerPress=null;
    onInteraction?.({type,press});
    for (const ripple of pressRipples) ripple.finish();
    if (pointerId !== null) {
      const id=pointerId;
      pointerId = null;
      try { el.releasePointerCapture(id); } catch (_) {}
    }
    endVisual();
  };

  const listenerOptions = signal ? { signal } : {};

  function pointerMove(e) {
    if (!pointerPolicy || !isPressed || pointerId === null || e.pointerId !== pointerId) return;
    if (pointerPolicy.outOfBounds(e)) { canceledClick = true; end('cancel'); }
  }
  function pointerUp(e) {
    if (pointerId !== null && e.pointerId !== pointerId) return;
    if ((pointerPolicy||keys) && !pointerPressed) return;
    const r = el.getBoundingClientRect();
    const root = el.getRootNode();
    // With assigned text, ShadowRoot.elementFromPoint may retarget to its
    // host. elementsFromPoint exposes the actual in-root wrapper/control.
    const hit = root.elementsFromPoint?.(e.clientX, e.clientY)[0]
      ?? root.elementFromPoint?.(e.clientX, e.clientY);
    // Pseudo-elements extend small controls to a 48dp touch target. Hit testing
    // includes that target, unlike the visual border box used as a fallback.
    let renderedHit = hit;
    while (renderedHit && renderedHit !== el) {
      renderedHit = renderedHit.assignedSlot || renderedHit.parentElement || renderedHit.getRootNode?.().host;
    }
    if (pointerPolicy) {
      // Clickable checks bounds during non-up events, then accepts the routed
      // all-up event. Keep the web owner check for an overlapping foreign UI.
      const routedHit=routing?.ownsAt(e);
      canceledClick = !pointerPolicy.outOfBounds(e) && (routedHit===null?!!hit&&renderedHit!==el:!routedHit);
    } else {
      canceledClick = hit ? renderedHit !== el : e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    }
    end();
    return !canceledClick;
  }
  function pointerCancel(e) {
    if (pointerId !== null && e.pointerId !== pointerId) return;
    canceledClick = true; end('cancel');
  }
  function lostCapture(e) {
    if (pointerId !== null && e.pointerId !== pointerId) return;
    if (keys?pointerPressed:isPressed) canceledClick = true;
    end('cancel');
  }
  const pointerHandlers={pointerdown:e=>start(e,true),pointermove:pointerMove,pointerup:pointerUp,pointercancel:pointerCancel,lostpointercapture:lostCapture};
  routing=registerPointerBinding(el,{input:pointerPolicy?.input,precise:typeof pointerPolicy?.input==='function',disabled,pointerNode,ignoreEvent,handlers:pointerHandlers,canActivate:()=>!disposed&&!disabled()&&!canceledClick,signal});
  for(const [type,handler]of Object.entries(pointerHandlers))el.addEventListener(type,e=>{if(!routing.handle(e)){if(type==='pointerdown')start(e);else handler(e);}},listenerOptions);
  el.addEventListener('blur', () => {if(keys){keys.cancel();endVisual();}else end('cancel');}, listenerOptions);
  el.addEventListener('click', e => {
    if(!routing.acceptClick(e))return;
    if (ignoreEvent(e)) return;
    if(keys&&nestedKeyDefault&&e.isTrusted&&e.detail===0){e.preventDefault();e.stopImmediatePropagation();return;}
    if (disabled() || (canceledClick && ((!pointerPolicy&&!keys) || e.detail > 0))) {
      e.preventDefault();
      e.stopImmediatePropagation();
      canceledClick = false;
      return;
    }
    onActivate?.(e);
  }, { ...listenerOptions, capture: true });
  const clearRipples = () => { for (const ripple of [...allRipples]) ripple.dispose(); };
  function refreshDisabled() {
    if(disposed)return;
    routing?.refresh?.();
    // Clickable emits PressInteraction.Cancel when disabled while retaining
    // its indication node. Let the existing ripple finish its normal exit.
    keys?.update(!disabled());
    if (disabled()) { canceledClick = true; end('cancel'); endVisual(); }
  }
  const disabledObserver = globalThis.MutationObserver ? new MutationObserver(refreshDisabled) : null;
  disabledObserver?.observe(el, {attributes:true,attributeFilter:['disabled','aria-disabled']});
  signal?.addEventListener('abort', () => { disposed=true;keys?.cancel();end('cancel');endVisual();clearRipples();keyRipples.clear();clearTimeout(nestedKeyTimer);nestedKeyTimer=null;nestedKeyDefault=false;disabledObserver?.disconnect(); }, { once: true });

  el.addEventListener('keydown', (e) => {
    if (ignoredKey(e)) return;
    if(keys){
      keys.update(!disabled());endVisual();const key=keyboardActivationKey(e);
      if(key===null||disabled()||e.defaultPrevented)return;
      // Suppress HTML's down/repeat default activation. Source recognition
      // and per-key ownership decide the later semantic click on key-up.
      e.preventDefault();keys.handle(key,'KeyDown',e);return;
    }
    if (disabled()) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      if (e.repeat) return;
      if (!native && (e.key === ' ' || e.key === 'Spacebar')) {
        e.preventDefault(); // Prevent page scroll on space
      }
      start(e);
    }
  }, listenerOptions);

  el.addEventListener('keyup', (e) => {
    if (ignoredKey(e)) return;
    if(keys){
      keys.update(!disabled());endVisual();const key=keyboardActivationKey(e);
      if(key===null||disabled()||e.defaultPrevented)return;
      e.preventDefault();keys.handle(key,'KeyUp',e);return;
    }
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      if (!native && (e.key === ' ' || e.key === 'Spacebar')) {
        e.preventDefault();
      }
      const activate = isPressed && !disabled();
      end();
      if (!native && activate) el.click();
    }
  }, listenerOptions);
  return {refresh:refreshDisabled};
}
