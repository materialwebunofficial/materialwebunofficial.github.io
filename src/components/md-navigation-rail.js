import {FrameResizeObserver} from '../utils/resize-observer.js';
/** Web adaptation of AndroidX public WideNavigationRail / WideNavigationRailItem
 * and ModalWideNavigationRail (WideNavigationRail.kt, WideNavigationRailState.kt,
 * NavigationRailExpandedTokens, ScrimTokens, foundation AnchoredDraggable).
 * Reference: a095da93f8e98dea8748ceed79ea8427aade245f.
 *
 * modal: the collapsed rail stays in the layout; expanding animates a position
 * progress on DefaultEffects, and while it is above 0 the rail's content moves
 * into a modal dialog: a Scrim (Scrim color at 32%, alpha on DefaultEffects,
 * shown from progress 0.3) and the modal rail (SurfaceContainer, CornerLarge,
 * at most 360dp) at the window's start edge, which expands from progress 0.3
 * with FastSpatial widths. hide-on-collapse: no rail in the layout; the
 * expanded modal rail slides in from its own width on DefaultSpatial and can
 * be dragged closed (50% positional and 125dp/s velocity thresholds). A scrim
 * tap, Escape or collapse() closes it. Predictive back has no web equivalent;
 * the header is not drawn twice (it moves with the content). */
import { delegateHostAria } from '../utils/host-aria.js';
import { lockPageScroll, unlockPageScroll } from '../utils/scroll-lock.js';
import { SelectionMotion } from '../motion/selection-motion.js';
import { AsStateColorMotion as ColorMotion } from '../motion/animate-as-state.js';
import {resolveComposeColor,composeColorCSS,composeColorWithAlpha} from '../motion/compose-color-css.js';
import { bindPress, createRipple } from '../motion/interactions.js';
import { escapeHtml, safeJsonParse } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import { observeThemeContext } from '../theme/theme-context.js';
import { measureAnimatedRailItem, measureIconOnlyRailItem, modalRailTarget } from './navigation-rail-layout.js';
import { PointerVelocityTracker } from '../motion/velocity-tracker.js';
import { HorizontalTouchSlop, pointerSlop } from '../motion/touch-slop.js';
import { bindStateLayer } from '../motion/state-layer.js';


const MODAL_EXPANDED_THRESHOLD = .3;

const defaultStyle = `
  :host { display:inline-block; height:100%; max-width:100%; vertical-align:top; user-select:none; -webkit-user-select:none; }
  .rail {
    position:relative; box-sizing:border-box; display:flex; flex-direction:column;
    width:96px; height:100%; max-width:100%; border:0; border-radius:0; box-shadow:none;
    padding-block-start:calc(44px + env(safe-area-inset-top, 0px));
    padding-block-end:env(safe-area-inset-bottom, 0px);
    padding-inline-start:env(safe-area-inset-left, 0px);
    background:var(--rail-container, var(--md-sys-color-surface, #FEF7FF));
    color:var(--rail-content, var(--md-sys-color-on-surface, #1D1B20));
  }
  :host(:dir(rtl)) .rail { padding-inline-start:env(safe-area-inset-right, 0px); }
  .header { flex:none; margin:0 0 40px; padding:0; }
  .header[hidden] { display:none; }
  .items { position:relative; flex:1; width:100%; }
  .item { position:absolute; box-sizing:border-box; padding:0; margin:0; border:0; background:transparent;
    color:inherit; cursor:pointer; outline:none; -webkit-tap-highlight-color:transparent; font:inherit; }
  .item[disabled] { cursor:default; }
  .indicator, .ripple, .icon, .label { position:absolute; pointer-events:none; }
  .indicator, .ripple { border-radius:var(--md-sys-shape-corner-full, 9999px); }
  .indicator { background:var(--md-sys-color-secondary-container, #E8DEF8); }
  /* CommonRippleNode state layer (hover/focus); presses draw only the ripple. */
  .ripple::before { content:''; position:absolute; inset:0; border-radius:inherit; background:currentColor; opacity:var(--_state-alpha, 0); }
  .item:focus-visible .ripple { outline:3px solid var(--md-sys-color-secondary, #625B71); outline-offset:2px; }
  .icon { font-family: var(--md-icon-font-family, 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif);
    font-size:24px; font-weight:normal; font-style:normal; line-height:24px; width:24px; height:24px;
    white-space:nowrap; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
    color:var(--md-sys-color-on-surface-variant, #49454F); }
  .glyph { display:block; direction:ltr; }
  .label, .measure, .label-color { font:var(--md-sys-typescale-label-medium, 500 12px/16px Roboto, sans-serif);
    letter-spacing:var(--md-sys-typescale-label-medium-tracking, .5px);
    white-space:pre-wrap; overflow-wrap:anywhere; text-align:start;
    color:var(--md-sys-color-on-surface-variant, #49454F); }
  .item[data-text-size="large"] .label, .item[data-text-size="large"] .measure {
    font:var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    letter-spacing:var(--md-sys-typescale-label-large-tracking, .1px); }
  .item:not(:disabled)[aria-selected="true"] .icon { color:var(--md-sys-color-on-secondary-container, #1D192B); }
  .item:not(:disabled)[aria-selected="true"] .label, .item:not(:disabled)[aria-selected="true"] .label-color { color:var(--md-sys-color-secondary, #625B71); }
  .item:not(:disabled)[aria-selected="true"][data-icon-position="start"] .label,
  .item:not(:disabled)[aria-selected="true"][data-icon-position="start"] .label-color { color:var(--md-sys-color-on-secondary-container, #1D192B); }
  .item[disabled] .icon, .item[disabled] .label, .item[disabled] .label-color { color:color-mix(in srgb, var(--md-sys-color-on-surface-variant, #49454F) 38%, transparent); }
  .item[disabled] .label-color { color:var(--md-sys-color-on-surface-variant, #49454F); }
  .label-color { display:none; }
  .measure { position:absolute; inset:0 auto auto 0; pointer-events:none; visibility:hidden; }
  .md-ripple-effect { position:absolute; border-radius:50%; background:currentColor; opacity:0; animation:rail-ripple 450ms linear; }
  @keyframes rail-ripple { from { transform:scale(0); opacity:.1; } to { transform:scale(1); opacity:0; } }
  .rail[hidden], .placeholder[hidden] { display:none; }
  .placeholder { width:var(--rail-collapsed-width, 96px); height:100%; max-width:100%;
    background:var(--rail-container, var(--md-sys-color-surface, #FEF7FF)); }
  .modal-layer { position:fixed; inset:0; width:100vw; max-width:none; height:100dvh; max-height:none;
    margin:0; padding:0; border:0; background:transparent; overflow:hidden; color:inherit; }
  .modal-layer::backdrop { background:transparent; }
  .scrim { position:absolute; inset:0; opacity:0;
    background:var(--rail-scrim, rgb(from var(--md-sys-color-scrim, #000) r g b / .32)); }
  .modal-surface { position:absolute; inset-block:0; inset-inline-start:0; max-width:360px; touch-action:pan-y; }
  .rail.in-modal { height:100%; border-radius:var(--md-sys-shape-corner-large, 16px);
    background:var(--rail-modal-container, var(--md-sys-color-surface-container, #F3EDF7));
    color:var(--rail-modal-content, var(--md-sys-color-on-surface, #1D1B20)); }
`;
const navigationRailSheet=createComponentSheet(defaultStyle);
const place=(node,g)=>{
  if (!node || !g) return;
  node.style.insetInlineStart=`${g.x}px`;node.style.top=`${g.y}px`;
  node.style.width=`${g.width}px`;node.style.height=`${g.height}px`;
  if (g.opacity!==undefined) node.style.opacity=String(g.opacity);
};

export class MdNavigationRail extends HTMLElement {
  static get observedAttributes() {
    return ['items','selected','expanded','narrow','item-layout','icon-position','arrangement',
      'container-color','content-color','enabled','disabled','always-show-label','aria-label','dir',
      'modal','hide-on-collapse','gestures-enabled'];
  }
  constructor() {
    super();this.attachShadow({mode:'open'});adoptSheet(this.shadowRoot,navigationRailSheet);
    this._records=[];this._rendered=false;this._abortController=null;this._railMotion=null;
    this._railValues=null;this._currentWidth=0;this._expandedWideWidth=0;
  }
  get items() {
    const parsed=safeJsonParse(this.getAttribute('items'),[]);
    return Array.isArray(parsed)?parsed.filter(item=>item&&typeof item==='object'&&!Array.isArray(item)):[];
  }
  set items(value) { this.setAttribute('items',JSON.stringify(Array.isArray(value)?value:[])); }
  get selected() { const value=Number(this.getAttribute('selected')??0);return Number.isInteger(value)?value:0; }
  set selected(value) { this.setAttribute('selected',String(value)); }
  get expanded() { return this.hasAttribute('expanded'); }
  set expanded(value) { this.toggleAttribute('expanded',!!value); }
  /** ModalWideNavigationRail. */
  get modal() { return this.hasAttribute('modal'); }
  set modal(value) { this.toggleAttribute('modal',!!value); }
  get hideOnCollapse() { return this.hasAttribute('hide-on-collapse'); }
  set hideOnCollapse(value) { this.toggleAttribute('hide-on-collapse',!!value); }
  get gesturesEnabled() { return this.getAttribute('gestures-enabled')!=='false'; }
  set gesturesEnabled(value) { this.setAttribute('gestures-enabled',value?'true':'false'); }
  expand() { this._setExpanded(true); }
  collapse() { this._setExpanded(false); }
  toggle() { this._setExpanded(!this.expanded); }
  _setExpanded(value) {
    if(this.expanded===value)return;this.expanded=value;
    this.dispatchEvent(new CustomEvent('expanded-change',{detail:{expanded:value},bubbles:true,composed:true}));
  }
  /** The layout's expanded state: a modal rail lays out expanded only in its dialog. */
  get _railExpanded() { return this.modal?(this.hideOnCollapse||!!this._modalExpanded):this.expanded; }
  get narrow() { return this.hasAttribute('narrow'); }
  set narrow(value) { this.toggleAttribute('narrow',!!value); }
  get itemLayout() { return this.getAttribute('item-layout')==='horizontal'?'horizontal':'vertical'; }
  set itemLayout(value) { this.setAttribute('item-layout',value); }
  get iconPosition() {
    const explicit=this.getAttribute('icon-position');
    if (explicit==='top'||explicit==='start') return explicit;
    if (this.hasAttribute('item-layout')) return this.itemLayout==='horizontal'?'start':'top';
    return this._railExpanded?'start':'top';
  }
  set iconPosition(value) { if(value==null)this.removeAttribute('icon-position');else this.setAttribute('icon-position',value); }
  get arrangement() { const value=this.getAttribute('arrangement');return value==='center'||value==='bottom'?value:'top'; }
  set arrangement(value) { this.setAttribute('arrangement',value); }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(value) { this.toggleAttribute('disabled',!!value); }
  get enabled() { return !this.disabled&&this.getAttribute('enabled')!=='false'; }
  set enabled(value) { this.disabled=!value;this.setAttribute('enabled',value?'true':'false'); }
  get alwaysShowLabel() { return true; }
  set alwaysShowLabel(value) { this.toggleAttribute('always-show-label',!!value); }
  get containerColor() { return this.getAttribute('container-color')||''; }
  set containerColor(value) { this._setOptionalAttribute('container-color',value); }
  get contentColor() { return this.getAttribute('content-color')||''; }
  set contentColor(value) { this._setOptionalAttribute('content-color',value); }
  _setOptionalAttribute(name,value) { if(value==null)this.removeAttribute(name);else this.setAttribute(name,String(value)); }
  _positionFor(record) { return record.item.iconPosition==='top'||record.item.iconPosition==='start'?record.item.iconPosition:this.iconPosition; }
  connectedCallback() {
    if(!this._rendered)this.render();
    this.setupInteractions();this._applySelection(false);this._syncModal(false);this._syncExpansion(false);
    this._resizeObserver=new FrameResizeObserver(()=>this._measureLayout());
    this._resizeObserver.observe(this);this._resizeObserver.observe(this.shadowRoot.querySelector('.items'));
    this._resizeObserver.observe(this.shadowRoot.querySelector('.header'));
    this._themeCleanup=observeThemeContext(this,()=>{this._syncLabelColors();this._measureLayout();});
    this.ownerDocument.fonts?.addEventListener('loadingdone',this._onFonts=()=>this._measureLayout());
  }
  disconnectedCallback() {
    this._abortController?.abort();this._abortController=null;
    this._resizeObserver?.disconnect();this._resizeObserver=null;this._themeCleanup?.();this._themeCleanup=null;
    this.ownerDocument.fonts?.removeEventListener('loadingdone',this._onFonts);
    this._railMotion?.dispose();this._railMotion=null;
    for(const r of this._records){r.motion?.dispose();r.motion=null;r.colorMotion?.dispose();r.colorMotion=null;}
    this._closeLayer();this._positionMotion?.dispose();this._positionMotion=null;this._modalMotion?.dispose();this._modalMotion=null;
    this._modalExpanded=false;this._drag=null;
  }
  attributeChangedCallback(name,oldValue,newValue) {
    if(!this._rendered||oldValue===newValue)return;
    if(name==='items'){
      this.render();if(this.isConnected){this.setupInteractions();this._resizeObserver?.disconnect();
        for(const selector of ['.items','.header'])this._resizeObserver?.observe(this.shadowRoot.querySelector(selector));
        this._resizeObserver?.observe(this);}
      this._applySelection(false);this._syncModal(false);this._syncExpansion(false);
    }else if(name==='selected')this._applySelection(true);
    else if(name==='expanded'&&this.modal)this._syncModal(true);
    else if(name==='modal'||name==='hide-on-collapse'){this._closeLayer();this._positionMotion?.dispose();this._positionMotion=null;this._modalExpanded=false;this._syncModal(false);this._syncExpansion(false);}
    else if(name==='gestures-enabled')return;
    else if(name==='expanded'||name==='narrow'||name==='item-layout'||name==='icon-position')this._syncExpansion(true);
    else if(name==='disabled'||name==='enabled')this._applySelection(false);
    else if(name==='container-color'||name==='content-color'||name==='aria-label')this._syncSurface();
    else this._measureLayout();
  }
  render() {
    this._closeLayer();
    this._abortController?.abort();for(const r of this._records){r.motion?.dispose();r.colorMotion?.dispose();}
    const items=this.items,hasAdopted=!!this.shadowRoot.adoptedStyleSheets?.length;
    this.shadowRoot.innerHTML=`${hasAdopted?'':`<style>${defaultStyle}</style>`}
      <nav class="rail"><div class="header" hidden><slot name="header"></slot></div>
      <div class="items" role="tablist" aria-orientation="vertical">
      ${items.map((item,index)=>`<button class="item" type="button" role="tab" data-index="${index}"
        aria-label="${escapeHtml(item.ariaLabel??item.label??item.icon??'')}">
        <span class="indicator" aria-hidden="true"></span><span class="ripple" aria-hidden="true"></span>
        <span class="icon" aria-hidden="true"><span class="glyph">${escapeHtml(item.icon??'')}</span></span>
        ${item.label==null?'':`<span class="label">${escapeHtml(item.label)}</span><span class="measure" aria-hidden="true">${escapeHtml(item.label)}</span>`}<span class="label-color" aria-hidden="true"></span>
      </button>`).join('')}</div><slot></slot></nav><div class="placeholder" hidden></div>
      <dialog class="modal-layer" part="modal"><div class="scrim" part="scrim" aria-hidden="true"></div><div class="modal-surface"></div></dialog>`;
    this._rail=this.shadowRoot.querySelector('.rail');this._placeholder=this.shadowRoot.querySelector('.placeholder');
    this._layer=this.shadowRoot.querySelector('.modal-layer');this._scrim=this.shadowRoot.querySelector('.scrim');
    this._modalSurface=this.shadowRoot.querySelector('.modal-surface');this._layerOpen=false;
    this._records=[...this.shadowRoot.querySelectorAll('.item')].map((button,index)=>({item:items[index],button,
      indicator:button.querySelector('.indicator'),ripple:button.querySelector('.ripple'),icon:button.querySelector('.icon'),
      label:button.querySelector('.label'),measure:button.querySelector('.measure'),selection:index===this.selected?1:0,
      colorProbe:button.querySelector('.label-color'),colorMotion:null,position:0,motion:null}));
    for(const r of this._records){r.position=this._positionFor(r)==='start'?1:0;r.button.dataset.iconPosition=this._positionFor(r);}
    this._rendered=true;this._syncSurface();
  }
  _syncSurface() {
    const rail=this.shadowRoot.querySelector('.rail');
    for(const [name,value] of [['--rail-container',this.containerColor],['--rail-content',this.contentColor]]){
      if(value&&CSS.supports('color',value))rail.style.setProperty(name,value);else rail.style.removeProperty(name);
    }
    const label=this.getAttribute('aria-label')||'Rail navigation';rail.setAttribute('aria-label',label);
    this.shadowRoot.querySelector('.items').setAttribute('aria-label',label);
  }
  _ensureMotion(record) {
    if(!this.isConnected||record.motion)return;
    record.motion=new SelectionMotion(this,{selection:record.selection,position:record.position},values=>{
      record.selection=values.selection;record.position=values.position;this._measureLayout();
    });
  }
  _syncLabelColors() {for(const r of this._records)this._syncLabelColor(r);}
  _syncLabelColor(record) {
    if(!this.isConnected)return;
    record.colorProbe.style.removeProperty('color');
    const source=getComputedStyle(record.colorProbe).color,color=record.button.disabled?composeColorWithAlpha(record.colorProbe,source,.38):source;
    record.icon.style.removeProperty('color');
    record.icon.style.color=record.button.disabled?color:composeColorCSS(resolveComposeColor(record.colorProbe,getComputedStyle(record.icon).color));
    if(!record.label)return;
    if(!record.colorMotion)record.colorMotion=new ColorMotion(this,record.colorProbe,color,value=>record.label.style.color=value);
    else record.colorMotion.set(color);
  }
  _applySelection(animate) {
    const enabled=r=>this.enabled&&!r.item.disabled&&r.item.enabled!==false;
    const entry=enabled(this._records[this.selected]??{item:{disabled:true}})?this.selected:this._records.findIndex(enabled);
    this._records.forEach((r,index)=>{
      const selected=index===this.selected;r.button.disabled=!enabled(r);r.stateLayer?.refresh();
      r.button.setAttribute('aria-selected',String(selected));r.button.tabIndex=index===entry?0:-1;
      if(selected)r.button.setAttribute('aria-current','page');else r.button.removeAttribute('aria-current');
      r.icon.firstElementChild.textContent=String(selected?r.item.selectedIcon??r.item.icon??'':r.item.icon??'');
      this._syncLabelColor(r);
      this._ensureMotion(r);
      if(r.motion)r.motion.set({selection:{value:selected?1:0,snap:!animate}});else r.selection=selected?1:0;
    });this._measureLayout();
  }
  _syncExpansion(animate) {
    const collapsed=this.narrow?80:96,expanded=this._railExpanded;
    if(this._placeholder)this._placeholder.style.width=`${collapsed}px`;
    const target={minWidth:expanded?220:collapsed,fullWidth:expanded?360:collapsed,
      gap:expanded?0:4,minHeight:expanded?48:64};
    if(this.isConnected&&!this._railMotion){
      this._railMotion=new SelectionMotion(this,target,values=>{this._railValues=values;this._measureLayout();});
    }
    // The modal rail's widths use FastSpatial; spacing and item heights DefaultSpatial.
    const role=key=>this.modal&&(key==='minWidth'||key==='fullWidth')?'expressiveSpatialFast':'expressiveSpatialMedium';
    if(this._railMotion)this._railMotion.set(Object.fromEntries(Object.entries(target).map(([key,value])=>[key,{value,role:role(key),snap:!animate}])));
    else this._railValues=target;
    for(const r of this._records){
      const value=this._positionFor(r)==='start'?1:0;this._ensureMotion(r);
      if(r.motion)r.motion.set({position:{value,snap:!animate}});else r.position=value;
    }
    this._measureLayout();
  }
  _measureLayout() {
    if(!this._rendered||!this.isConnected||!this._railValues)return;
    const rail=this.shadowRoot.querySelector('.rail'),group=this.shadowRoot.querySelector('.items');
    const header=this.shadowRoot.querySelector('.header'),slot=header.querySelector('slot');
    header.hidden=!slot.assignedElements().length;
    const v=this._railValues,minWidth=Math.max(0,Math.round(v.minWidth)),railExpanded=this._railExpanded;
    const maxWidth=railExpanded?340:minWidth;
    let expandedItemMaxWidth=0;
    // All intrinsic-width writes precede reads, then all constrained widths
    // precede height reads. Alternating these per item forces two layouts for
    // every destination on every spring frame.
    const positions=this._records.map(r=>{
      const top=this._positionFor(r)==='top',position=top?'top':'start';
      if(r.button.dataset.iconPosition!==position){r.button.dataset.iconPosition=position;this._syncLabelColor(r);}
      r.button.dataset.textSize=top&&r.position<.5?'medium':'large';
      if(r.measure)r.measure.style.width='max-content';
      return top;
    });
    const labelWidths=this._records.map(r=>r.measure?Math.min(maxWidth,Math.ceil(r.measure.getBoundingClientRect().width)):0);
    this._records.forEach((r,index)=>{if(r.measure)r.measure.style.width=`${labelWidths[index]}px`;});
    const labelHeights=this._records.map(r=>r.measure?Math.ceil(r.measure.getBoundingClientRect().height):0);
    const geometries=this._records.map((r,index)=>{
      const input={labelWidth:labelWidths[index],labelHeight:labelHeights[index],positionProgress:r.position,selectedProgress:r.selection,topTarget:positions[index],maxWidth,minHeight:v.minHeight};
      const g=r.label?measureAnimatedRailItem(input):measureIconOnlyRailItem(input);
      if(railExpanded&&expandedItemMaxWidth<g.width)expandedItemMaxWidth=g.width+20;
      return g;
    });
    let width=minWidth;
    if(railExpanded){
      const headerWidth=header.hidden?0:Math.max(0,...slot.assignedElements().map(el=>Math.ceil(el.getBoundingClientRect().width)));
      const widest=Math.max(expandedItemMaxWidth,headerWidth);
      if(widest>minWidth&&widest>220){width=Math.min(Math.round(v.fullWidth),Math.min(360,Math.max(220,widest)));this._expandedWideWidth=width;}
    }else if(this._expandedWideWidth>0)width=Math.max(minWidth,Math.min(Math.round(v.fullWidth),Math.max(minWidth,this._currentWidth)));
    this._currentWidth=width;rail.style.width=`${width}px`;
    const gap=Math.round(v.gap),contentHeight=geometries.reduce((sum,g)=>sum+g.height,0)+Math.max(0,geometries.length-1)*gap;
    group.style.minHeight=`${Math.max(0,contentHeight)}px`;
    let y=0;
    if(this.arrangement==='bottom')y=group.clientHeight-contentHeight;
    else if(this.arrangement==='center'){
      const origin=group.getBoundingClientRect().top-rail.getBoundingClientRect().top;
      y=Math.round((rail.clientHeight-contentHeight)/2)-origin;
    }
    this._records.forEach((r,index)=>{
      const g=geometries[index];place(r.button,{x:0,y,width:g.width,height:g.height});y+=g.height+gap;
      place(r.indicator,g.indicator);place(r.ripple,g.ripple);place(r.icon,g.icon);place(r.label,g.label);
      r.geometry=g;
    });
  }
  /** ModalWideNavigationRail: positionProgress (DefaultEffects) drives the dialog. */
  _syncModal(animate) {
    if(!this.isConnected||!this._rail)return;
    if(!this.modal){this._closeLayer();this._rail.hidden=false;return;}
    if(!this._layerOpen)this._rail.hidden=this.hideOnCollapse;
    const target=this.expanded?1:0;
    if(!this._positionMotion){
      this._positionMotion=new SelectionMotion(this,{progress:target},values=>this._onPosition(values.progress));
      return;
    }
    this._positionMotion.set({progress:{value:target,role:'expressiveEffectMedium',snap:!animate}});
    // The standalone rail's own state follows the target while the dialog shows.
    if(this.hideOnCollapse&&this._layerOpen){this._pendingDismiss=false;this._slideTo(this.expanded?0:-this._modalWidth(),animate);}
  }
  _onPosition(progress) {
    const animate=!!this._positionMotion,collapsed=progress===0,modalExpanded=progress>=MODAL_EXPANDED_THRESHOLD;
    const changed=modalExpanded!==!!this._modalExpanded;if(changed)this._modalExpanded=modalExpanded;
    if(!collapsed&&!this._layerOpen)this._openLayer();
    if(changed){this._syncExpansion(animate);this._syncScrim();if(!animate)this._modalMotion?.finish();}
    if(collapsed&&this._layerOpen)this._closeLayer();
  }
  _modalWidth() { return this._currentWidth||parseFloat(this._rail?.style.width)||360; }
  _ensureModalMotion() {
    if(this._modalMotion)return;
    this._modalMotion=new SelectionMotion(this,{offset:0,scrim:0},values=>this._drawModal(values));
  }
  _drawModal({offset,scrim}) {
    if(!this._modalSurface)return;
    const width=this._modalWidth(),channel=this._modalMotion?.channels.offset;
    // A fling stops where the anchored offset reaches an anchor bound.
    if(this._fling&&channel&&(offset>0||offset<-width)){
      const bound=offset>0?0:-width;channel.value=channel.target=bound;channel.animation=null;offset=bound;this._fling=false;
    }
    const rtl=getComputedStyle(this).direction==='rtl';
    this._modalSurface.style.transform=this.hideOnCollapse?`translateX(${offset*(rtl?-1:1)}px)`:'';
    this._scrim.style.opacity=String(Math.max(0,Math.min(1,scrim)));
    if(channel&&!channel.animation){
      this._fling=false;
      if(this._pendingDismiss&&offset===-width){this._pendingDismiss=false;this._setExpanded(false);}
    }
  }
  _syncScrim() {
    if(!this._layerOpen)return;this._ensureModalMotion();
    const visible=this.hideOnCollapse?this._slideTarget===0:!!this._modalExpanded;
    this._modalMotion.set({scrim:{value:visible?1:0,role:'expressiveEffectMedium'}});
  }
  _slideTo(target,animate=true,velocity=null) {
    this._ensureModalMotion();this._slideTarget=target;
    this._modalMotion.set({offset:{value:target,role:'expressiveSpatialMedium',snap:!animate,...(velocity===null?{}:{velocity})}});
    this._syncScrim();
  }
  _openLayer() {
    if(this._layerOpen||!this._layer)return;this._layerOpen=true;
    // The first composition starts at its target without animating.
    const animate=!!this._positionMotion;
    this._placeholder.hidden=this.hideOnCollapse;this._rail.hidden=false;
    this._rail.classList.add('in-modal');this._modalSurface.append(this._rail);
    this._ensureModalMotion();
    const scrim=this._modalMotion.channels.scrim;scrim.value=scrim.target=0;scrim.animation=null;
    if(this.hideOnCollapse){
      // Anchors are set from the measured rail: it starts at Collapsed (-width).
      this._measureLayout();const width=this._modalWidth(),offset=this._modalMotion.channels.offset;
      offset.value=offset.target=-width;offset.animation=null;this._slideTarget=-width;
      this._slideTo(this.expanded?0:-width,animate);
    }else this._modalMotion.render(performance.now());
    lockPageScroll(this);
    try{this._layer.showModal();}catch{this._layer.setAttribute('open','');}
    this._syncScrim();if(!animate)this._modalMotion.finish();
  }
  _closeLayer() {
    unlockPageScroll(this);
    if(!this._layerOpen)return;this._layerOpen=false;this._drag=null;this._fling=false;this._pendingDismiss=false;
    this._rail.classList.remove('in-modal');this.shadowRoot.insertBefore(this._rail,this._placeholder);
    this._placeholder.hidden=true;this._rail.hidden=this.modal&&this.hideOnCollapse;
    if(this._layer.open)this._layer.close();
    this._modalMotion?.dispose();this._modalMotion=null;
    this._measureLayout();
  }
  /** Scrim tap: a standalone rail first slides away, then the state collapses. */
  _dismissFromScrim() {
    if(!this.hideOnCollapse){this._setExpanded(false);return;}
    this._pendingDismiss=true;this._slideTo(-this._modalWidth());
  }
  _startModalDrag(event) {
    if(!this.hideOnCollapse||!this._layerOpen||!this.gesturesEnabled||event.button!==0||event.isPrimary===false)return;
    const tracker=new PointerVelocityTracker();tracker.down(event.timeStamp,event.clientX);
    this._drag={id:event.pointerId,x:event.clientX,started:false,tracker,slop:new HorizontalTouchSlop(pointerSlop(event.pointerType))};
  }
  _moveModalDrag(event) {
    const drag=this._drag;if(!drag||drag.id!==event.pointerId)return;
    drag.tracker.move(event.timeStamp,event.clientX);
    const rtl=getComputedStyle(this).direction==='rtl';let delta=Math.fround(event.clientX-drag.x);drag.x=event.clientX;
    if(!drag.started){
      delta=drag.slop.add(delta);if(delta===null)return;drag.started=true;
      try{this._modalSurface.setPointerCapture(event.pointerId);}catch{}
    }
    event.preventDefault();this._ensureModalMotion();
    const channel=this._modalMotion.channels.offset,current=channel.sample(performance.now()).position,width=this._modalWidth();
    channel.value=channel.target=Math.max(-width,Math.min(0,current+delta*(rtl?-1:1)));channel.animation=null;this._fling=false;this._pendingDismiss=false;
    this._modalMotion.tick(performance.now());
  }
  _endModalDrag(event,cancel=false) {
    const drag=this._drag;if(!drag||drag.id!==event.pointerId)return;this._drag=null;if(!drag.started)return;
    try{this._modalSurface.releasePointerCapture(event.pointerId);}catch{}
    this._dragClickUntil=performance.now()+500;
    const rtl=getComputedStyle(this).direction==='rtl',velocity=cancel?0:Math.fround(drag.tracker.up(event.timeStamp)*(rtl?-1:1));
    const width=this._modalWidth(),offset=this._modalMotion.channels.offset.sample(performance.now()).position;
    const target=modalRailTarget(offset,velocity,width);
    // snapFlingBehavior: no decay, the DefaultSpatial snap carries the velocity;
    // afterwards a Collapsed target collapses the rail state.
    this._fling=true;this._pendingDismiss=target===-width;this._slideTo(target,true,velocity);
  }
  _select(index) {
    const r=this._records[index];if(!r||r.button.disabled||this.selected===index)return;
    this.selected=index;this.dispatchEvent(new CustomEvent('change',{detail:{index},bubbles:true,composed:true}));
  }
  setupInteractions() {
    this._abortController?.abort();this._abortController=new AbortController();const{signal}=this._abortController;
    this._scrim.addEventListener('click',()=>this._dismissFromScrim(),{signal});
    this._layer.addEventListener('cancel',event=>{event.preventDefault();this._setExpanded(false);},{signal});
    this._modalSurface.addEventListener('pointerdown',event=>this._startModalDrag(event),{signal});
    this._modalSurface.addEventListener('pointermove',event=>this._moveModalDrag(event),{signal,passive:false});
    this._modalSurface.addEventListener('pointerup',event=>this._endModalDrag(event),{signal});
    this._modalSurface.addEventListener('pointercancel',event=>this._endModalDrag(event,true),{signal});
    this._modalSurface.addEventListener('click',event=>{if(performance.now()<(this._dragClickUntil??0)){event.preventDefault();event.stopPropagation();this._dragClickUntil=0;}},{signal,capture:true});
    this.shadowRoot.querySelector('slot[name="header"]').addEventListener('slotchange',()=>this._measureLayout(),{signal});
    for(const[index,r]of this._records.entries()){
      r.stateLayer=bindStateLayer(r.button,{property:'--_state-alpha',disabled:()=>r.button.disabled,signal});
      bindPress(r.button,{signal,disabled:()=>r.button.disabled,onPress:event=>createRipple(event,r.ripple),onActivate:()=>this._select(index)});
      r.button.addEventListener('keydown',event=>{
        const enabled=this._records.filter(item=>!item.button.disabled);if(!enabled.length||r.button.disabled)return;
        const current=enabled.indexOf(r);let next;
        if(event.key==='Home')next=0;else if(event.key==='End')next=enabled.length-1;
        else if(event.key==='ArrowDown')next=(current+1)%enabled.length;
        else if(event.key==='ArrowUp')next=(current-1+enabled.length)%enabled.length;else return;
        event.preventDefault();for(const item of this._records)item.button.tabIndex=item===enabled[next]?0:-1;enabled[next].button.focus();
      },{signal});
    }
  }
}
if(!customElements.get('md-navigation-rail'))customElements.define('md-navigation-rail',delegateHostAria(MdNavigationRail, '.rail'));
