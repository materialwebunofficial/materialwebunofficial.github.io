/** AndroidX Tooltip / BasicTooltip a095da93, with DOM input and popup adapters. */
import {createComponentSheet, adoptSheet} from '../utils/styles.js';
import {SelectionMotion} from '../motion/selection-motion.js';
import {observeThemeContext} from '../theme/theme-context.js';
import {resolveSurfaceColors} from '../theme/surface-color.js';
import {normalizeCornerShape, cornerShapeOutline} from '../shapes/corner-shape.js';
import {OutlineShadow, parseBoxShadow} from '../shapes/outline-shadow.js';
import {TooltipState} from './tooltip-state.js';
import {tooltipPosition, tooltipCaretX} from './tooltip-position.js';
import {tooltipOutlinePath, tooltipCaretPath} from './tooltip-shape.js';
import {materialString} from './material-strings.js';
import {TooltipFocusScope, composedContains, deepActiveElement, consumeTooltipOutsidePointer} from './tooltip-focus.js';
import {TooltipDOMLayout} from './tooltip-dom-layout.js';

const css = `
  :host {display:contents; outline:none; -webkit-tap-highlight-color:transparent;}
  .tip {position:fixed; inset:auto; box-sizing:border-box; margin:0; padding:0; border:0; outline:none; width:max-content; min-width:40px; max-width:200px; min-height:24px; overflow:visible; background:transparent; color:var(--_tooltip-content); transform-origin:center; z-index:10000;}
  .tip[hidden] {display:none;}
  .tip.rich {max-width:320px;}
  .tip::backdrop {background:transparent; pointer-events:none;}
  .tip[data-focusable]::backdrop {pointer-events:auto; touch-action:none;}
  .surface {position:absolute; box-sizing:border-box; padding:0; overflow:hidden; background:var(--_tooltip-container); color:inherit; border-radius:var(--md-sys-shape-corner-extra-small); box-shadow:none;}
  .rich .surface {border-radius:var(--md-sys-shape-corner-medium); box-shadow:var(--md-sys-elevation-level-2);}
  .body-box, .body {position:absolute; display:block; padding:0; margin:0; white-space:pre-wrap; overflow-wrap:anywhere; font:var(--md-sys-typescale-body-small); letter-spacing:var(--md-sys-typescale-body-small-tracking);}
  .rich .body {font:var(--md-sys-typescale-body-medium); letter-spacing:var(--md-sys-typescale-body-medium-tracking);}
  .headline {position:absolute; font:var(--md-sys-typescale-title-small); letter-spacing:var(--md-sys-typescale-title-small-tracking); color:var(--_tooltip-title); white-space:pre-wrap; overflow-wrap:anywhere;}
  .actions {position:absolute; box-sizing:border-box; padding:0; font:var(--md-sys-typescale-label-large); letter-spacing:var(--md-sys-typescale-label-large-tracking); color:var(--_tooltip-action);}
  .text-leaf, .title-leaf {position:absolute; display:block; box-sizing:border-box; overflow:hidden; white-space:pre-wrap; overflow-wrap:anywhere;}
  slot {display:contents;}
  .headline[hidden], .actions[hidden], .text-leaf[hidden] {display:none;}
  .actions ::slotted(md-button) {display:inline-flex; align-items:center; justify-content:center; min-height:48px;}
  .baseline {display:inline-block; width:0; height:0; padding:0; border:0; vertical-align:baseline;}
  .shape-shadow, .background {position:absolute; inset:0; overflow:visible; pointer-events:none;}
  .color-probe {position:absolute; width:0; height:0; visibility:hidden; pointer-events:none;}
  .measure-probe {position:fixed; inset:0 auto auto 0; visibility:hidden; pointer-events:none; contain:layout; padding:0; margin:0; border:0; white-space:pre-wrap; overflow-wrap:anywhere;}
`;
const sheet = createComponentSheet(css);
let nextId = 0;
const colorNames = ['container-color','content-color','title-content-color','action-content-color'];
const reflect = (element, name, value) => value == null ? element.removeAttribute(name) : element.setAttribute(name, value);

export class MdTooltip extends HTMLElement {
  static get observedAttributes() { return ['variant','text','headline','open','for','placement','caret','focusable','force-focusable-for-a11y','enable-user-input','has-action','max-width','is-persistent','shape','pane-title',...colorNames]; }
  constructor() {
    super(); this.attachShadow({mode:'open'}); adoptSheet(this.shadowRoot, sheet);
    this._ownedState = new TooltipState(); this._state = this._ownedState;
    this._reposition = () => { if (this._state.isVisible) this._layout(); };
    this._contentChanged = () => { this._layoutDirty=true; this._reposition(); };
  }
  get variant() { return this.getAttribute('variant') === 'rich' ? 'rich' : 'plain'; } set variant(v) { reflect(this,'variant',v); }
  get text() { return this.getAttribute('text') ?? ''; } set text(v) { reflect(this,'text',v); }
  get headline() { return this.getAttribute('headline'); } set headline(v) { reflect(this,'headline',v); }
  get placement() { return this.getAttribute('placement') ?? 'top'; } set placement(v) { reflect(this,'placement',v); }
  get position() { return this.placement; } set position(v) { this.placement = v; }
  get open() { return this.hasAttribute('open'); } set open(v) { this.toggleAttribute('open',!!v); }
  get caret() { return this.hasAttribute('caret'); } set caret(v) { this.toggleAttribute('caret',!!v); }
  get focusable() { return this.hasAttribute('focusable'); } set focusable(v) { this.toggleAttribute('focusable',!!v); }
  get forceFocusableForA11y() { return this.hasAttribute('force-focusable-for-a11y'); } set forceFocusableForA11y(v) { this.toggleAttribute('force-focusable-for-a11y',!!v); }
  get enableUserInput() { return this.getAttribute('enable-user-input') !== 'false'; } set enableUserInput(v) { this.setAttribute('enable-user-input',String(!!v)); }
  get hasAction() { return this.hasAttribute('has-action'); } set hasAction(v) { this.toggleAttribute('has-action',!!v); }
  get isPersistent() { return this.hasAttribute('is-persistent'); } set isPersistent(v) { this.toggleAttribute('is-persistent',!!v); }
  get maxWidth() { return this.getAttribute('max-width') ?? (this.variant === 'rich' ? '320px' : '200px'); } set maxWidth(v) { reflect(this,'max-width',typeof v === 'number' ? `${v}px` : v); }
  get containerColor() { return this.getAttribute('container-color') ?? ''; } set containerColor(v) { reflect(this,'container-color',v); }
  get contentColor() { return this.getAttribute('content-color') ?? ''; } set contentColor(v) { reflect(this,'content-color',v); }
  get titleContentColor() { return this.getAttribute('title-content-color') ?? ''; } set titleContentColor(v) { reflect(this,'title-content-color',v); }
  get actionContentColor() { return this.getAttribute('action-content-color') ?? ''; } set actionContentColor(v) { reflect(this,'action-content-color',v); }
  get shape() {
    const text = this.getAttribute('shape'); if (text === null) return null;
    if (this._shapeCache?.text === text) return this._shapeCache.value;
    let value = null; try { value = normalizeCornerShape(text); } catch { /* Invalid HTML uses the default token. */ }
    this._shapeCache = {text,value}; return value;
  }
  set shape(v) { reflect(this,'shape',v == null ? null : JSON.stringify(normalizeCornerShape(v))); }
  get target() { return this._target ?? null; }
  set target(v) { this._explicitTarget = v; if (this.isConnected) this._bindTarget(); }
  get state() { return this._state; }
  set state(v) {
    const state = v ?? this._ownedState;
    if (!state || typeof state.show !== 'function' || typeof state.subscribe !== 'function') throw new TypeError('state must be a TooltipState');
    if (state === this._state) return;
    this._unsubscribe?.(); this._focusScope?.deactivate(); this._forceFocusable = false; this._state.onDispose(); this._state.completeTransition(); this._cancelFinishFrame(); this._motion?.dispose(); this._motion = null; this._state = state; this._lastTarget = undefined;
    if (this.isConnected) this._bindState();
  }
  connectedCallback() {
    const initiallyOpen = this.open;
    this._render(); this._bindTarget(); this._sync(); this._bindState();
    this._lifetime?.abort(); this._lifetime = new AbortController(); const signal = this._lifetime.signal;
    this.ownerDocument.addEventListener('scroll',this._reposition,{capture:true,passive:true,signal});
    this.ownerDocument.defaultView.addEventListener('resize',this._reposition,{signal});
    this.ownerDocument.fonts?.addEventListener('loadingdone',this._contentChanged,{signal});
    this._stopTheme?.(); this._stopTheme = observeThemeContext(this,() => { this._sync(); this._reposition(); });
    this._resize?.disconnect(); this._resize = new ResizeObserver(entries=>{if(entries.some(e=>e.target!==this._tip&&e.target!==this._target))this._layoutDirty=true;this._reposition();}); this._resize.observe(this._tip);
    if (this._target) this._resize.observe(this._target);
    for(const element of this._domLayout.owned.keys())this._resize.observe(element);
    this._contentObserver?.disconnect(); this._contentObserver = new MutationObserver(() => { this._sync(); this._reposition(); this._focusScope.ensureFocus(); });
    this._contentObserver.observe(this,{subtree:true,childList:true,characterData:true,attributes:true});
    if (initiallyOpen && !this._state.transition.targetState) this._request('default');
  }
  disconnectedCallback() {
    this._unsubscribe?.(); this._unsubscribe = null; this._focusScope?.deactivate(); this._forceFocusable = false; this._stopPositionTracking(); this._unbindTarget(); this._lifetime?.abort(); this._stopTheme?.(); this._resize?.disconnect(); this._contentObserver?.disconnect();
    this._state.onDispose(); this._cancelFinishFrame(); this._motion?.dispose(); this._motion = null; this._lastTarget = undefined;
    this._state.completeTransition(); // Source Transition.onDisposed calls onTransitionEnd.
    this._reflecting = true; this.toggleAttribute('open',this._state.transition.targetState); this._reflecting = false;
    this._tip?.hidePopover?.(); if (this._tip) this._tip.hidden = true;
    this._domLayout?.release(); this._layoutDirty=true;
  }
  attributeChangedCallback(name, oldValue, value) {
    if (oldValue === value || !this._tip || this._reflecting) return;
    if (name === 'open') { this.open ? this._request('default') : this.dismiss(); return; }
    if (name === 'is-persistent') {
      const previous = this._ownedState;
      this._ownedState = new TooltipState({initialIsVisible:previous.transition.targetState,isPersistent:this.isPersistent});
      if (this._state === previous) this.state = this._ownedState;
    }
    if (name === 'for' || name === 'enable-user-input') this._bindTarget();
    this._sync(); this._reposition();
  }
  show(priority = 'default', options) { return this._state.show(priority,options); }
  dismiss() { this._state.dismiss(); }
  _dismissRequest() {
    if (typeof this.onDismissRequest === 'function') this.onDismissRequest();
    else { this.dismiss(); this._forceFocusable = false; this._syncPopupFocus(); }
  }
  _request(priority, options) { this.show(priority,options).catch(() => {}); }
  _bindState() {
    this._unsubscribe?.(); this._lastTarget = undefined;
    this._unsubscribe = this._state.subscribe(() => this._syncState());
  }
  _syncState() {
    if (!this.isConnected || !this._tip) return;
    const target = this._state.transition.targetState;
    this._reflecting = true; this.toggleAttribute('open',target); this._reflecting = false;
    this._syncAvailability();
    if (target === this._lastTarget) return;
    this._cancelFinishFrame();
    const previousTarget = this._lastTarget; this._lastTarget = target;
    // Source Transition.updateTarget starts the new segment from its previous target,
    // including a reversal before entry has completed. isVisible stays true during exit.
    if (previousTarget !== undefined) this._state.completeTransition(previousTarget);
    if (target) { this._tip.hidden = false; this._tip.showPopover?.(); this._layout(); }
    this._syncAvailability();
    if (!this._motion || this._motion.disposed) {
      const initial = this._state.transition.currentState;
      this._motion = new SelectionMotion(this,{scale:initial ? 1 : Math.fround(.8),alpha:initial ? 1 : 0},v => {
        this._tip.style.transform = `scale(${v.scale})`; this._tip.style.opacity = Math.max(0,Math.min(1,v.alpha));
        if (this._motion && Object.values(this._motion.channels).every(c => !c.animation)) {
          // Transition resets children even when their scalar values already equal the
          // new targets. Commit that zero-duration segment on its first frame.
          if (this._settingMotion && !this._motion.media?.matches && this._state.transition.currentState !== this._state.transition.targetState) {
            this._finishFrame = requestAnimationFrame(time => { this._finishFrame = null; this._motion?.tick(time); }); return;
          }
          this._cancelFinishFrame();
          this._state.completeTransition();
          if (!this._state.transition.targetState) { this._tip.hidePopover?.(); this._tip.hidden = true; this._domLayout.release(); this._layoutDirty=true; this._contentObserver?.takeRecords(); }
        }
      });
    }
    this._settingMotion = true;
    try { this._motion.set({scale:{value:target ? 1 : Math.fround(.8),role:'expressiveSpatialFast'},alpha:{value:target ? 1 : 0,role:'expressiveEffectFast'}}); }
    finally { this._settingMotion = false; }
  }
  _cancelFinishFrame() { if (this._finishFrame != null) cancelAnimationFrame(this._finishFrame); this._finishFrame = null; }
  _syncAvailability() {
    const visible = this._state.isVisible;
    if (!visible) { this._forceFocusable = false; this._syncPopupFocus(); }
    this._tip.inert = !visible; this._tip.setAttribute('aria-hidden',String(!visible));
    this._tip.style.pointerEvents = visible ? 'auto' : 'none';
    if (visible) this._syncPopupFocus();
    if (visible && !this._tip.hidden && this._target) this._startPositionTracking();
    else this._stopPositionTracking();
  }
  _syncPopupFocus() {
    if (!this._tip) return;
    const focusable = this._state.isVisible && !this._tip.hidden && (this.focusable || this.hasAction && (this._forceFocusable || this.forceFocusableForA11y));
    this._tip.toggleAttribute('data-focusable',!!focusable);
    if (focusable) this._focusScope.activate(); else this._focusScope.deactivate();
  }
  _startPositionTracking() {
    if (this._positionFrame != null) return;
    this._positionFrame = requestAnimationFrame(() => {
      this._positionFrame = null;
      if (!this.isConnected || !this._state.isVisible || this._tip.hidden || !this._target) return;
      const rect = this._target.getBoundingClientRect(), view = this.ownerDocument.defaultView;
      const bounds = [rect.left,rect.top,rect.right,rect.bottom,view.innerWidth,view.innerHeight];
      if (bounds.some((value,index) => value !== this._lastAnchorBounds?.[index])) this._layout();
      this._startPositionTracking();
    });
  }
  _stopPositionTracking() { if (this._positionFrame != null) cancelAnimationFrame(this._positionFrame); this._positionFrame = null; }
  _keyDown(e) {
    if (e.defaultPrevented || !this._state.isVisible) return;
    if (this._focusScope.isTop) {
      if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); this._focusScope.tab(e.shiftKey); }
      // Android Popup tracks down/repeat and invokes dismissal on uncanceled up.
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (!e.repeat) this._popupEscape = true; }
      return;
    }
    if (!this.enableUserInput || !composedContains(this._target,deepActiveElement(this.ownerDocument))) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this._receivedFocus = false; this.dismiss(); }
    else if (this.hasAction && e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); this._forceFocusable = true; this._syncPopupFocus(); }
  }
  _keyUp(e) {
    if (e.key !== 'Escape' || !this._popupEscape) return;
    this._popupEscape = false; e.preventDefault(); e.stopPropagation();
    if (this._state.isVisible && this._focusScope.isTop) this._dismissRequest();
  }
  _unbindTarget() {
    this._inputs?.abort(); this._cancelPress();
    this._focusScope?.deactivate(); this._forceFocusable = false; this._popupEscape = false;
    this._stopPositionTracking();
    if (this._target) {
      // Changing anchor/input modifiers does not dispose BasicTooltip's state.
      // Input-bound hover/focus jobs are canceled above.
      this._receivedFocus = false;
      const tokens = (this._target.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(t => t && t !== this.id);
      tokens.length ? this._target.setAttribute('aria-describedby',tokens.join(' ')) : this._target.removeAttribute('aria-describedby');
      this._resize?.unobserve(this._target);
    }
    this._target = null;
  }
  _bindTarget() {
    this._unbindTarget(); const root = this.getRootNode(), id = this.getAttribute('for');
    this._target = this._explicitTarget ?? (id ? root.getElementById?.(id) : this.previousElementSibling);
    if (!this._target) return;
    if (!this.id) this.id = `md-tooltip-${++nextId}`;
    const descriptions = new Set((this._target.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)); descriptions.add(this.id);
    this._target.setAttribute('aria-describedby',[...descriptions].join(' '));
    this._resize?.observe(this._target);
    this._inputs = new AbortController(); const signal = this._inputs.signal, target = this._target;
    if (this.enableUserInput) {
      target.addEventListener('pointerenter',e => { if (e.pointerType === 'mouse') this._request('user-input',{signal}); },{signal});
      target.addEventListener('pointerleave',e => { if (e.pointerType === 'mouse' && !this._state.isPersistent) this.dismiss(); },{signal});
      target.addEventListener('focusin',() => { if (this._restoringFocus) return; this._receivedFocus = true; this._request('prevent-user-input',{signal}); },{signal});
      target.addEventListener('focusout',e => {
        const next = e.relatedTarget;
        if (composedContains(this._tip,next) || this._focusScope.active || this._restoringFocus) return;
        if (this._receivedFocus) { this._receivedFocus = false; this.dismiss(); }
      },{signal});
      target.addEventListener('pointerdown',e => this._press(e),{capture:true,signal});
      for (const type of ['pointerup','pointercancel']) this.ownerDocument.addEventListener(type,e => this._release(e),{capture:true,signal});
      target.addEventListener('click',e => {
        if (this._suppressClick && e.detail !== 0) { e.preventDefault(); e.stopImmediatePropagation(); this._suppressClick = false; }
      },{capture:true,signal});
    }
    this.ownerDocument.addEventListener('keydown',e => this._keyDown(e),{capture:true,signal});
    this.ownerDocument.addEventListener('keyup',e => this._keyUp(e),{capture:true,signal});
    this.ownerDocument.addEventListener('focusin',() => this._focusScope.ensureFocus(),{signal});
    this.ownerDocument.addEventListener('pointerdown',e => {
      if (!this._state.isVisible) return;
      const path = e.composedPath();
      const rect = this._tip.getBoundingClientRect(), onBackdrop = path[0] === this._tip && (e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom);
      if (!path.includes(this._tip) || onBackdrop) {
        if (this._focusScope.isTop) consumeTooltipOutsidePointer(e);
        this._dismissRequest();
      }
    },{capture:true,signal});
    this._reposition(); this._syncAvailability();
  }
  _press(e) {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    if (this._pressInfo) return;
    this._suppressClick = false; const press = {id:e.pointerId,held:true,shown:false,elapsed:false}; this._pressInfo = press;
    press.timer = setTimeout(() => {
      if (this._pressInfo !== press) return;
      press.shown = true; this._suppressClick = true;
      this.show('prevent-user-input').catch(() => {}).finally(() => {
        press.elapsed = true; if (this.isConnected && !press.held && this._state.isVisible) this.dismiss();
      });
    },this.longPressTimeoutMillis ?? 500); // HTML platform view-configuration adapter.
  }
  _release(e) {
    const press = this._pressInfo; if (!press || press.id !== e.pointerId) return;
    press.held = false; clearTimeout(press.timer);
    if (press.shown) { e.preventDefault(); if (press.elapsed) this.dismiss(); }
    this._pressInfo = null;
  }
  _cancelPress() { if (this._pressInfo) { clearTimeout(this._pressInfo.timer); this._pressInfo.held = false; this._pressInfo = null; } this._suppressClick = false; }
  _render() {
    if (this._tip) return;
    const adopted = !!this.shadowRoot.adoptedStyleSheets?.length;
    this.shadowRoot.innerHTML = `${adopted ? '' : `<style>${css}</style>`}<span class="color-probe" aria-hidden="true"></span><div class="measure-probe" aria-hidden="true"><span class="baseline first"></span><span class="measure-text"></span><span class="baseline last"></span></div><div class="tip" part="tooltip" popover="manual" role="tooltip" aria-live="assertive" tabindex="-1" hidden><svg class="background" aria-hidden="true" focusable="false"><path></path></svg><div class="surface" part="container"><div class="headline" part="headline"><span class="title-leaf"><span class="baseline first" aria-hidden="true"></span><span class="title-text"></span><span class="baseline last" aria-hidden="true"></span></span></div><div class="body-box"><div class="body" part="text"><span class="text-leaf"><span class="baseline first" aria-hidden="true"></span><span class="text"></span><span class="baseline last" aria-hidden="true"></span></span><slot></slot></div></div><div class="actions" part="action"><slot name="action"></slot></div></div></div>`;
    const q = selector => this.shadowRoot.querySelector(selector);
    this._tip=q('.tip'); this._surface=q('.surface'); this._body=q('.body'); this._bodyBox=q('.body-box'); this._head=q('.headline'); this._actions=q('.actions'); this._probe=q('.color-probe'); this._background=q('.background'); this._path=q('.background path');
    this._measureProbe=q('.measure-probe');this._textLeaf=q('.text-leaf');this._titleLeaf=q('.title-leaf');this._domLayout=new TooltipDOMLayout(this);this._layoutDirty=true;
    this._shadow = new OutlineShadow(this._tip);
    this._focusScope = new TooltipFocusScope(this._tip,restore => { this._restoringFocus = true; try { restore(); } finally { this._restoringFocus = false; } });
    for (const slot of this.shadowRoot.querySelectorAll('slot')) slot.addEventListener('slotchange',() => { this._sync(); this._reposition(); });
    if (this.isPersistent) this._ownedState.isPersistent = true;
  }
  _sync() {
    if (!this._tip) return;
    this._layoutDirty=true;
    const rich = this.variant === 'rich'; this._tip.classList.toggle('rich',rich);
    this.shadowRoot.querySelector('.text').textContent=this.text; this.shadowRoot.querySelector('.title-text').textContent=this.headline ?? '';
    this._head.hidden=!rich || this.headline === null;
    this._actions.hidden=!rich || !this.shadowRoot.querySelector('slot[name="action"]').assignedElements().length;
    this._tip.setAttribute('aria-label',this.getAttribute('pane-title') ?? materialString(this,'tooltip'));
    const valid = (v,fallback) => v && CSS.supports('color',v) ? v : fallback;
    const colors=resolveSurfaceColors(this,this._probe,{container:valid(this.containerColor,rich ? 'var(--md-sys-color-surface-container)' : 'var(--md-sys-color-inverse-surface)'),content:valid(this.contentColor,rich ? 'var(--md-sys-color-on-surface-variant)' : 'var(--md-sys-color-inverse-on-surface)'),elevation:0});
    this._tip.style.setProperty('--_tooltip-container',colors.container); this._tip.style.setProperty('--_tooltip-content',colors.content); this._tip.style.setProperty('--md-absolute-tonal-elevation',String(colors.total));
    this._tip.style.setProperty('--_tooltip-title',valid(this.titleContentColor,'var(--md-sys-color-on-surface-variant)'));
    this._tip.style.setProperty('--_tooltip-action',valid(this.actionContentColor,'var(--md-sys-color-primary)'));
    this._container=colors.container;
    this._syncPopupFocus();
  }
  _layout({measureContent=true}={}) {
    if (!this._target || this._tip.hidden || this._measuring) return;
    this._measuring=true;
    try {
      const win=this.ownerDocument.defaultView,windowSize={width:win.innerWidth,height:win.innerHeight},rtl=getComputedStyle(this).direction === 'rtl';
      const signature=[windowSize.width,windowSize.height,rtl];
      if(measureContent&&(this._layoutDirty||signature.some((v,i)=>v!==this._layoutSignature?.[i]))){
        // Popup's AT_MOST window bounds feed the original tooltip measurement tree.
        this._domLayout.measure(windowSize,rtl);this._layoutDirty=false;this._layoutSignature=signature;
        this._contentObserver?.takeRecords();
      }
      const rect=this._target.getBoundingClientRect(), anchor={left:Math.round(rect.left),top:Math.round(rect.top),right:Math.round(rect.right),bottom:Math.round(rect.bottom)};
      const popup={width:this._tip.offsetWidth,height:this._tip.offsetHeight};
      this._lastAnchorBounds=[rect.left,rect.top,rect.right,rect.bottom,win.innerWidth,win.innerHeight];
      const position=tooltipPosition({anchor,popup,window:windowSize,placement:this.placement,rtl}); this._positionInput={anchor,popup,window:windowSize,placement:this.placement,rtl}; this._positionResult=position;
      this._tip.style.left=`${position.x}px`; this._tip.style.top=`${position.y}px`;
      this._drawOutline(popup,rect,position,windowSize,rtl);
    } finally { this._measuring=false; }
  }
  _drawOutline(popup,anchor,position,windowSize,rtl) {
    const surface=this._surface; surface.style.borderRadius=''; surface.style.boxShadow='';
    let outline;
    if (this.shape) outline=cornerShapeOutline(this.shape,popup.width,popup.height,rtl);
    else {
      const s=getComputedStyle(surface), pair=name => { const v=s[name].split(' ').map(parseFloat); return [v[0],v[1] ?? v[0]]; };
      const radii=['borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'].map(pair);
      outline=cornerShapeOutline(normalizeCornerShape({type:'rounded',absolute:true,corners:radii.map(r => r[0])}),popup.width,popup.height);
    }
    let path=tooltipOutlinePath(outline,popup.width,popup.height);
    if (this.caret) {
      let physical=this.placement; if (physical === 'start') physical=rtl ? 'right' : 'left'; if (physical === 'end') physical=rtl ? 'left' : 'right';
      if (physical === 'left' || physical === 'right') {
        const right=position.x > anchor.left; path+=tooltipCaretPath(right ? 0 : popup.width,popup.height/2,right ? 'left' : 'right');
      } else {
        const below=position.y > anchor.top; path+=tooltipCaretPath(tooltipCaretX(popup.width,windowSize.width,anchor),below ? 0 : popup.height,below ? 'top' : 'bottom');
      }
    }
    this._background.setAttribute('width',popup.width); this._background.setAttribute('height',popup.height); this._background.setAttribute('viewBox',`0 0 ${popup.width} ${popup.height}`);
    this._path.setAttribute('d',path); this._path.setAttribute('fill',this._container);
    const shadows=parseBoxShadow(getComputedStyle(surface).boxShadow); surface.style.boxShadow='none'; surface.style.background='transparent';
    this._shadow.draw({path,extension:this.caret ? 8 : 0},{x:0,y:0,...popup},shadows);
    surface.style.borderRadius=outline.type === 'rounded' ? `${outline.radii.map(r => r[0]+'px').join(' ')} / ${outline.radii.map(r => r[1]+'px').join(' ')}` : '0px';
    surface.style.clipPath=outline.type === 'generic' ? `polygon(${outline.points.map(p => p.map(v => v+'px').join(' ')).join(',')})` : '';
    surface.style.overflow='hidden';
  }
}

if (!customElements.get('md-tooltip')) customElements.define('md-tooltip',MdTooltip);
