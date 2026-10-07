/**
 * AndroidX BottomAppBar (80dp) and Expressive FlexibleBottomAppBar (64dp).
 * Source defaults/Surface/Row: test/fixtures/androidx/app-bars/AppBar.kt.
 * Actions and optional FAB are caller content, as in the public composables.
 */
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import { observeThemeContext } from '../theme/theme-context.js';
import { resolveSurfaceColors } from '../theme/surface-color.js';
import { normalizeToolbarPadding, resolveToolbarPadding, serializeToolbarPadding } from './toolbar-padding.js';
import { bottomAppBarLayout, bottomAppBarScrollLayout } from './bottom-app-bar-layout.js';
import { minimumInteractiveLayout } from './row-column-layout.js';
import { BottomAppBarSettling } from './bottom-app-bar-scroll.js';
import { HorizontalTouchSlop, pointerSlop } from '../motion/touch-slop.js';
import { PointerVelocityTracker } from '../motion/velocity-tracker.js';

const defaultStyle = `
  :host { display: block; position: relative; width: 100%; min-width: 0; height: var(--_bottom-app-bar-height, 80px); touch-action:var(--_bottom-app-bar-touch-action,auto); -webkit-tap-highlight-color: transparent; }
  :host([hidden]) { display: none !important; }
  .bar {
    position: relative; box-sizing: border-box; width: 100%; border: 0; border-radius: 0;
    background: var(--md-sys-color-surface-container); color: var(--md-sys-color-on-surface);
    box-shadow: none; overflow: clip;
    padding: 0;
  }
  .content {
    position: absolute; box-sizing: border-box; display: block;
    width: 100%; height: 80px; padding: 4px 4px 0; gap: 0;
  }
  .actions { position: absolute; display: block; min-width: 0; }
  .fab { position: absolute; box-sizing: border-box; display: block; padding-top: 8px; padding-inline-end: 12px; }
  .fab[hidden] { display: none; }
  slot { display: contents; }
  ::slotted(*) { flex-shrink: 0; }
  ::slotted([hidden]) { display: none !important; }
  .content.flexible .actions, .content.flexible .fab:not([hidden]) { display: contents; }
  .color-probe { position: absolute; visibility: hidden; pointer-events: none; }
  .inset-probe { position: absolute; visibility: hidden; pointer-events: none; padding: 0 env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px); }
  .minimum-probe { position: absolute; visibility: hidden; pointer-events: none; height: 0; }
`;
const sheet = createComponentSheet(defaultStyle);
const INF=2147483647;
const find=(node,id)=>node.id===id?node:node.children.map(p=>find(p.node,id)).find(Boolean);
const write=(node,key,value)=>{if(node.style[key]!==value)node.style[key]=value;};
const rect=(node,p)=>{for(const[key,value]of Object.entries({left:p.x,top:p.y,width:p.width,height:p.height}))write(node,key,value+'px');};

export class MdBottomAppBar extends HTMLElement {
  static get observedAttributes() {
    return ['variant', 'container-color', 'content-color', 'horizontal-arrangement', 'expanded-height', 'tonal-elevation', 'content-padding', 'aria-label','touch-exploration'];
  }
  constructor() {
    super(); this.attachShadow({mode: 'open'}); adoptSheet(this.shadowRoot, sheet);
    this._rendered = false; this._abortController = null; this._queued=false;this._scrollBehavior=null;this._scrollTarget=null;
  }
  get variant() { return this.getAttribute('variant') === 'flexible' ? 'flexible' : 'standard'; }
  set variant(v) { this._set('variant', v); }
  get containerColor() { return this.getAttribute('container-color') || ''; }
  set containerColor(v) { this._set('container-color', v); }
  get contentColor() { return this.getAttribute('content-color') || ''; }
  set contentColor(v) { this._set('content-color', v); }
  get horizontalArrangement() { return this.getAttribute('horizontal-arrangement') || (this.variant === 'flexible' ? 'space-between' : 'start'); }
  set horizontalArrangement(v) { this._set('horizontal-arrangement', v); }
  get expandedHeight() {
    if (this.variant !== 'flexible') return 80;
    const n = Math.fround(Number(this.getAttribute('expanded-height')));
    return Number.isFinite(n) && n > 0 ? n : 64;
  }
  set expandedHeight(v) { this._set('expanded-height', v); }
  get tonalElevation() {
    if (this.variant === 'flexible') return 0;
    const n = Math.fround(Number(this.getAttribute('tonal-elevation')));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  set tonalElevation(v) { this._set('tonal-elevation', v); }
  get contentPadding() {
    const fallback = this.variant === 'flexible' ? {start: 16, top: 0, end: 16, bottom: 0} : {start: 4, top: 4, end: 4, bottom: 0};
    const value = this.getAttribute('content-padding');
    if (value == null) return fallback;
    try { return normalizeToolbarPadding(value); } catch { return fallback; }
  }
  set contentPadding(v) { this._set('content-padding', v == null ? null : serializeToolbarPadding(normalizeToolbarPadding(v))); }
  get touchExplorationEnabled(){return this.hasAttribute('touch-exploration');}set touchExplorationEnabled(value){this.toggleAttribute('touch-exploration',!!value);}
  get _activeScrollBehavior(){return this.touchExplorationEnabled?null:this._scrollBehavior;}
  get scrollBehavior(){return this._scrollBehavior;}
  set scrollBehavior(value){
    if(value!=null&&(!value.state||typeof value.state.subscribe!=='function'||typeof value.state.updateHeightOffsetLimit!=='function'||typeof value.nestedScrollConnection?.onPostScroll!=='function'||typeof value.nestedScrollConnection?.onPostFling!=='function'))throw new TypeError('Expected a BottomAppBarScrollBehavior');
    this._cancelScrollSettle();this._stopState?.();this._scrollBehavior=value??null;value?.setElement?.(this);this._bindScrollState();if(this.isConnected){this._sync();this._configureScroll();}
  }
  get scrollTarget(){return this._scrollTarget;}set scrollTarget(value){if(value!=null&&value!==window&&!(value instanceof HTMLElement))throw new TypeError('Expected an HTMLElement or window scroll target');this._cancelScrollSettle();this._scrollTarget=value??null;if(this.isConnected)this._configureScroll();}
  get scrollState(){return this._scrollBehavior?.state??null;}
  get heightOffset(){return this.scrollState?.heightOffset??0;}set heightOffset(value){if(this.scrollState)this.scrollState.heightOffset=value??0;}
  get heightOffsetLimit(){return this.scrollState?.heightOffsetLimit??0;}
  get collapsedFraction(){return this.scrollState?.collapsedFraction??0;}
  preScroll(available={x:0,y:0}){this._cancelScrollSettle();const c=this._activeScrollBehavior?.nestedScrollConnection,result=c?.onPreScroll?.(available)||{x:0,y:0};this._sync();return result;}
  postScroll(consumed={x:0,y:0},available={x:0,y:0}){this._cancelScrollSettle();const result=this._activeScrollBehavior?.nestedScrollConnection.onPostScroll(consumed,available)||{x:0,y:0};this._sync();return result;}
  postFling(consumed={x:0,y:0},available={x:0,y:0}){return this._runScrollSettle(available.y??0,true,consumed);}
  _set(name, value) { if (value == null) this.removeAttribute(name); else this.setAttribute(name, String(value)); }
  connectedCallback() {
    if (!this._rendered) this.render();
    this.setupInteractions();this._bindScrollState();this._sync();this._configureScroll();
  }
  disconnectedCallback() { this._abortController?.abort(); this._abortController = null; this._resize?.disconnect(); this._mutation?.disconnect();this._stopState?.();this._stopState=null;this._scrollAbort?.abort();this._cancelScrollSettle(); }
  attributeChangedCallback(name, oldValue, value) { if (this._rendered && this.isConnected && oldValue !== value){if(name==='touch-exploration'){this._cancelScrollSettle();this._configureScroll();}this._sync();} }
  render() {
    const adopted = !!this.shadowRoot.adoptedStyleSheets?.length;
    this.shadowRoot.innerHTML = `${adopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="bar" part="bar" role="group">
        <div class="content" part="content">
          <div class="actions" part="actions"><slot></slot></div>
          <div class="fab" part="fab"><slot name="fab"></slot></div>
        </div>
      </div><span class="color-probe" aria-hidden="true"></span><span class="inset-probe" aria-hidden="true"></span><span class="minimum-probe" aria-hidden="true"></span>`;
    this._sizes=document.createElement('style');this._sizes.textContent=':host{}';this.shadowRoot.append(this._sizes);
    this._rendered = true;
  }
  _queue(){if(this._queued||!this.isConnected)return;this._queued=true;queueMicrotask(()=>{this._queued=false;if(this.isConnected)this._sync();});}
  _sync() {
    const bar = this.shadowRoot.querySelector('.bar'), row = this.shadowRoot.querySelector('.content');
    const flexible = this.variant === 'flexible', rtl = getComputedStyle(this).direction === 'rtl';
    const padding = resolveToolbarPadding(this.contentPadding, rtl);
    row.classList.toggle('flexible', flexible);
    for (const edge of ['left', 'top', 'right', 'bottom']) row.style['padding' + edge[0].toUpperCase() + edge.slice(1)] = `${padding[edge]}px`;
    this.shadowRoot.querySelector('.fab').hidden = this.shadowRoot.querySelector('slot[name="fab"]').assignedElements().length === 0;
    this._layout();
    const valid = (value, fallback) => value && CSS.supports('color', value) ? value : fallback;
    const colors = resolveSurfaceColors(this, this.shadowRoot.querySelector('.color-probe'), {
      container: valid(this.containerColor, 'var(--md-sys-color-surface-container)'),
      content: valid(this.contentColor, ''), elevation: this.tonalElevation
    });
    bar.style.backgroundColor = colors.container; bar.style.color = colors.content;
    bar.style.setProperty('--md-icon-button-content-color', colors.content);
    bar.style.setProperty('--md-icon-button-outline-color', colors.content);
    // iconButtonColors inherits LocalContentColor and replaces its alpha on disable.
    bar.style.setProperty('--md-icon-button-disabled-content-color', `rgb(from ${colors.content} r g b / .38)`);
    bar.style.setProperty('--md-absolute-tonal-elevation', String(colors.total));
    bar.setAttribute('aria-label', this.getAttribute('aria-label') || 'Bottom app bar');
  }
  _leaf(node,id){
    const css=getComputedStyle(node),r=node.getBoundingClientRect();
    const button=['md-icon-button','md-fab'].includes(node.localName)?node.shadowRoot?.querySelector('button'):null,b=button?getComputedStyle(button):null;
    const probe=this.shadowRoot.querySelector('.minimum-probe');probe.style.fontSize=css.fontSize;probe.style.width=css.getPropertyValue('--md-minimum-interactive-component-size').trim()||'48px';
    const minimum=parseFloat(getComputedStyle(probe).width),weight=Number(node.getAttribute('data-app-bar-weight')),line=Number(node.getAttribute('data-app-bar-alignment-line'));
    return{id,width:Math.round(r.width),height:Math.round(r.height),weight:weight>0?Math.fround(Math.min(weight,3.4028234663852886e38)):0,fill:node.getAttribute('data-app-bar-fill')!=='false',align:node.getAttribute('data-app-bar-align')||'center',line:node.hasAttribute('data-app-bar-alignment-line')&&Number.isFinite(line)?Math.round(line):null,ink:b?{width:Math.round(parseFloat(b.width)||0),height:Math.round(parseFloat(b.height)||0),minimum:Number.isFinite(minimum)?minimum:48}:null};
  }
  _layout(){
    while(this._sizes.sheet.cssRules.length>1)this._sizes.sheet.deleteRule(1);
    const sizing=this._sizes.sheet.cssRules[0].style;
    const dimension=()=>{const css=getComputedStyle(this);return Math.max(0,Math.round((parseFloat(css.height)||0)-(css.boxSizing==='border-box'?(parseFloat(css.paddingTop)||0)+(parseFloat(css.paddingBottom)||0)+(parseFloat(css.borderTopWidth)||0)+(parseFloat(css.borderBottomWidth)||0):0)));};
    sizing.setProperty('--_bottom-app-bar-height','0px');const minHeight=dimension();sizing.setProperty('--_bottom-app-bar-height','1000000px');const cap=dimension(),maxHeight=cap>=1000000?INF:Math.max(minHeight,cap);sizing.removeProperty('--_bottom-app-bar-height');
    const bar=this.shadowRoot.querySelector('.bar'),content=this.shadowRoot.querySelector('.content'),actions=this.shadowRoot.querySelector('.actions'),fab=this.shadowRoot.querySelector('.fab'),rtl=getComputedStyle(this).direction==='rtl',width=Math.max(0,Math.round(bar.getBoundingClientRect().width));
    const css=getComputedStyle(this.shadowRoot.querySelector('.inset-probe')),insets=Object.fromEntries(['left','top','right','bottom'].map(edge=>[edge,parseFloat(css['padding'+edge[0].toUpperCase()+edge.slice(1)])||0]));
    const entries=[],collect=(name,prefix)=>this.shadowRoot.querySelector(name).assignedElements().filter(n=>getComputedStyle(n).display!=='none').map((n,i)=>{const input=this._leaf(n,prefix+i);entries.push({n,input});return input;});
    const input={minWidth:width,maxWidth:width,minHeight,maxHeight,rtl,variant:this.variant,height:this.expandedHeight,contentPadding:this.contentPadding,arrangement:this.horizontalArrangement,insets,actions:collect('slot:not([name])','action'),fabs:collect('slot[name="fab"]','fab')};
    const state=this._activeScrollBehavior?.state,layout=state?bottomAppBarScrollLayout(input,state):bottomAppBarLayout(input);
    const positions=layout.placements,origin=positions['content-height'],surface=positions.bar;rect(content,{...origin,x:origin.x-surface.x,y:origin.y-surface.y});write(bar,'height',surface.height+'px');write(bar,'top',surface.y+'px');write(bar,'left',surface.x+'px');
    const flexible=this.variant==='flexible';if(!flexible){const p=positions['actions-row'];rect(actions,{x:p.x-origin.x,y:p.y-origin.y,width:p.width,height:p.height});const q=positions['fab-fill'];if(q)rect(fab,{x:q.x-origin.x,y:q.y-origin.y,width:q.width,height:q.height});}
    for(const{n,input}of entries){const leaf=find(layout.node,input.id),p=positions[input.id],parent=flexible?origin:n.slot==='fab'?positions['fab-fill']:positions['actions-row'];
      const body=input.ink?minimumInteractiveLayout({...input.ink,...leaf.constraints}).body:null;
      const native=body?`--md-toolbar-control-position:absolute;--md-toolbar-control-x:${body.x}px;--md-toolbar-control-y:${body.y}px;--md-toolbar-control-layout-width:${leaf.size.width}px;--md-toolbar-control-layout-height:${leaf.size.height}px;`:'';
      const index=[...this.children].indexOf(n)+1;
      this._sizes.sheet.insertRule(`::slotted(:nth-child(${index})){position:absolute!important;left:${p.x-parent.x-leaf.offset.x}px!important;top:${p.y-parent.y-leaf.offset.y}px!important;width:${leaf.size.width}px!important;height:${leaf.size.height}px!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;margin:0!important;--md-toolbar-control-min-width:${leaf.constraints.minWidth}px;--md-toolbar-control-min-height:${leaf.constraints.minHeight}px;--md-toolbar-control-max-width:${leaf.constraints.maxWidth}px;--md-toolbar-control-max-height:${leaf.constraints.maxHeight}px;${native}}`,this._sizes.sheet.cssRules.length);
    }
    const observed=new Set(entries.flatMap(({n})=>[n,n.shadowRoot?.querySelector('button')].filter(Boolean)));
    for(const n of this._observedChildren||[])if(!observed.has(n))this._resize?.unobserve(n);
    for(const n of observed)if(!this._observedChildren?.has(n))this._resize?.observe(n);this._observedChildren=observed;
    this._layoutResult=layout;sizing.setProperty('--_bottom-app-bar-height',layout.size.height+'px');
  }
  _bindScrollState(){this._stopState?.();this._stopState=this.isConnected&&this._scrollBehavior?this._scrollBehavior.state.subscribe(()=>this._queue()):null;}
  _configureScroll(){
    this._scrollAbort?.abort();if(!this.isConnected||!this._rendered)return;this._scrollAbort=new AbortController();const{signal}=this._scrollAbort,target=this._scrollTarget;
    const scrolling=()=>target===window?document.scrollingElement:target;let last=scrolling()?.scrollTop||0;
    // Bottom ExitAlways observes consumed movement only. Browser scroll events
    // provide that movement directly; no synthetic pre-consumption is needed.
    target?.addEventListener('scroll',()=>{const current=scrolling()?.scrollTop||0,delta=Math.fround(last-current);last=current;if(delta)this.postScroll({x:0,y:delta});},{signal,passive:true});
    target?.addEventListener('scrollend',()=>this.postFling(),{signal,passive:true});
    this.addEventListener('pointerdown',event=>this._barDragStart(event),{signal});this.addEventListener('pointermove',event=>this._barDragMove(event),{signal});
    const stop=event=>this._barDragStop(event);for(const type of ['pointerup','pointercancel','lostpointercapture'])this.addEventListener(type,stop,{signal});
    this.addEventListener('click',event=>{if(this._suppressDragClick&&event.detail!==0){this._suppressDragClick=false;event.preventDefault();event.stopImmediatePropagation();}},{signal,capture:true});
    this._reduced=matchMedia('(prefers-reduced-motion: reduce)');this._reduced.addEventListener('change',()=>{if(this._reduced.matches){this._scrollSettle?.finish();this._scrollTick(performance.now());}},{signal});
    this._sizes.sheet.cssRules[0].style.setProperty('--_bottom-app-bar-touch-action',this._activeScrollBehavior&&!this._activeScrollBehavior.isPinned?'pan-x':'auto');
  }
  _cancelScrollSettle(){
    if(this._scrollRaf)cancelAnimationFrame(this._scrollRaf);this._scrollRaf=0;this._scrollSettle=null;this._scrollResolve?.({x:0,y:0});this._scrollResolve=null;
    const drag=this._drag;this._drag=null;if(drag&&this.hasPointerCapture(drag.id))this.releasePointerCapture(drag.id);
  }
  _runScrollSettle(velocity,fromContent=false,consumed={x:0,y:0}){
    this._cancelScrollSettle();const b=this._activeScrollBehavior;if(!this.isConnected||!b)return Promise.resolve({x:0,y:0});
    const motion=this._scrollSettle=fromContent?b.nestedScrollConnection.onPostFling(consumed,{x:0,y:velocity}):new BottomAppBarSettling(b.state,velocity,{snapAnimationSpec:b.snapAnimationSpec,flingAnimationSpec:b.flingAnimationSpec});
    const promise=new Promise(resolve=>this._scrollResolve=resolve);if(this._reduced?.matches)motion.finish();
    if(motion.done)this._scrollTick(performance.now());else this._scrollRaf=requestAnimationFrame(time=>this._scrollTick(time));return promise;
  }
  _scrollTick(now){
    this._scrollRaf=0;const motion=this._scrollSettle;if(!motion)return;motion.sampleFrame(now,()=>this._sync());this._sync();
    if(motion.done){this._scrollSettle=null;this._scrollResolve?.({x:0,y:motion.returnedVelocity});this._scrollResolve=null;}else this._scrollRaf=requestAnimationFrame(time=>this._scrollTick(time));
  }
  _barDragStart(event){
    const b=this._activeScrollBehavior;if(!b||b.isPinned||event.defaultPrevented||event.button!==0||event.isPrimary===false)return;
    this._cancelScrollSettle();const tracker=new PointerVelocityTracker();tracker.down(event.timeStamp,event.clientY);this._drag={id:event.pointerId,last:event.clientY,active:false,slop:new HorizontalTouchSlop(pointerSlop(event.pointerType)),tracker};this._suppressDragClick=false;
  }
  _barDragMove(event){
    const drag=this._drag;if(!drag||drag.id!==event.pointerId)return;if(event.defaultPrevented){if(drag.active)this._runScrollSettle(0);else this._cancelScrollSettle();return;}
    const delta=event.clientY-drag.last;drag.last=event.clientY;
    for(const sample of event.getCoalescedEvents?.()||[]){if(sample.timeStamp===event.timeStamp&&sample.clientY===event.clientY)continue;drag.tracker.move(sample.timeStamp,sample.clientY);}drag.tracker.move(event.timeStamp,event.clientY);
    let amount=delta;if(!drag.active){amount=drag.slop.add(delta);if(amount===null)return;drag.active=true;try{this.setPointerCapture(event.pointerId);}catch{}}
    event.preventDefault();this.scrollState.heightOffset=Math.fround(this.heightOffset-amount);this._suppressDragClick=true;this._sync();
  }
  _barDragStop(event){
    if(event.type==='lostpointercapture'&&event.target!==this)return;const drag=this._drag;if(!drag||drag.id!==event.pointerId)return;this._drag=null;
    if(this.hasPointerCapture(event.pointerId))this.releasePointerCapture(event.pointerId);if(drag.active)this._runScrollSettle(event.type==='pointerup'?drag.tracker.up(event.timeStamp):0);
  }
  setupInteractions() {
    this._abortController?.abort();this._resize?.disconnect();this._mutation?.disconnect();this._abortController = new AbortController();
    const {signal} = this._abortController;
    for (const slot of this.shadowRoot.querySelectorAll('slot')) slot.addEventListener('slotchange', () => this._queue(), {signal});
    this._observedChildren=new Set();this._resize=new ResizeObserver(()=>this._queue());this._resize.observe(this);
    this._mutation=new MutationObserver(()=>this._queue());this._mutation.observe(this,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['slot','size','variant','style','class','disabled','hidden','label','icon','data-app-bar-weight','data-app-bar-fill','data-app-bar-align','data-app-bar-alignment-line']});
    document.fonts?.addEventListener('loadingdone',()=>this._queue(),{signal});document.fonts?.ready.then(()=>{if(!signal.aborted)this._queue();});
    this.shadowRoot.querySelector('.bar').addEventListener('click', event => {
      if (event.defaultPrevented) return;
      const path = event.composedPath();
      const node = path.find(n => n?.assignedSlot?.getRootNode() === this.shadowRoot);
      if (!node || node.disabled || node.hasAttribute('disabled')) return;
      if (!path.some(n => n?.matches?.('button, a[href], md-icon-button, md-fab, [role="button"]'))) return;
      if (node.slot === 'fab') this.dispatchEvent(new CustomEvent('fab-click', {bubbles: true, composed: true}));
      else this.dispatchEvent(new CustomEvent('action', {
        detail: {action: node.getAttribute('data-action') || node.getAttribute('aria-label') || node.textContent.trim()}, bubbles: true, composed: true
      }));
    }, {signal});
    const stopTheme = observeThemeContext(this, () => this._queue());
    signal.addEventListener('abort', stopTheme, {once: true});
  }
}
if (!customElements.get('md-bottom-app-bar')) customElements.define('md-bottom-app-bar', MdBottomAppBar);
