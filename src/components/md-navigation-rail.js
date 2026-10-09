/** Web adaptation of AndroidX public WideNavigationRail / WideNavigationRailItem.
 * Reference: a095da93f8e98dea8748ceed79ea8427aade245f. */
import { SelectionMotion } from '../motion/selection-motion.js';
import { AsStateColorMotion as ColorMotion } from '../motion/animate-as-state.js';
import {resolveComposeColor,composeColorCSS,composeColorWithAlpha} from '../motion/compose-color-css.js';
import { bindPress, createRipple } from '../motion/interactions.js';
import { escapeHtml, safeJsonParse } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import { observeThemeContext } from '../theme/theme-context.js';
import { measureAnimatedRailItem, measureIconOnlyRailItem } from './navigation-rail-layout.js';

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
  .ripple::before { content:''; position:absolute; inset:0; border-radius:inherit; background:currentColor; opacity:0; }
  .item:not(:disabled):hover .ripple::before { opacity:.08; }
  .item:not(:disabled):focus-visible .ripple::before, .item:not(:disabled).pressed .ripple::before { opacity:.1; }
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
      'container-color','content-color','enabled','disabled','always-show-label','aria-label','dir'];
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
  get narrow() { return this.hasAttribute('narrow'); }
  set narrow(value) { this.toggleAttribute('narrow',!!value); }
  get itemLayout() { return this.getAttribute('item-layout')==='horizontal'?'horizontal':'vertical'; }
  set itemLayout(value) { this.setAttribute('item-layout',value); }
  get iconPosition() {
    const explicit=this.getAttribute('icon-position');
    if (explicit==='top'||explicit==='start') return explicit;
    if (this.hasAttribute('item-layout')) return this.itemLayout==='horizontal'?'start':'top';
    return this.expanded?'start':'top';
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
    this.setupInteractions();this._applySelection(false);this._syncExpansion(false);
    this._resizeObserver=new ResizeObserver(()=>this._measureLayout());
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
  }
  attributeChangedCallback(name,oldValue,newValue) {
    if(!this._rendered||oldValue===newValue)return;
    if(name==='items'){
      this.render();if(this.isConnected){this.setupInteractions();this._resizeObserver?.disconnect();
        for(const selector of ['.items','.header'])this._resizeObserver?.observe(this.shadowRoot.querySelector(selector));
        this._resizeObserver?.observe(this);}
      this._applySelection(false);this._syncExpansion(false);
    }else if(name==='selected')this._applySelection(true);
    else if(name==='expanded'||name==='narrow'||name==='item-layout'||name==='icon-position')this._syncExpansion(true);
    else if(name==='disabled'||name==='enabled')this._applySelection(false);
    else if(name==='container-color'||name==='content-color'||name==='aria-label')this._syncSurface();
    else this._measureLayout();
  }
  render() {
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
      </button>`).join('')}</div><slot></slot></nav>`;
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
      const selected=index===this.selected;r.button.disabled=!enabled(r);
      r.button.setAttribute('aria-selected',String(selected));r.button.tabIndex=index===entry?0:-1;
      if(selected)r.button.setAttribute('aria-current','page');else r.button.removeAttribute('aria-current');
      r.icon.firstElementChild.textContent=String(selected?r.item.selectedIcon??r.item.icon??'':r.item.icon??'');
      this._syncLabelColor(r);
      this._ensureMotion(r);
      if(r.motion)r.motion.set({selection:{value:selected?1:0,snap:!animate}});else r.selection=selected?1:0;
    });this._measureLayout();
  }
  _syncExpansion(animate) {
    const collapsed=this.narrow?80:96;
    const target={minWidth:this.expanded?220:collapsed,fullWidth:this.expanded?360:collapsed,
      gap:this.expanded?0:4,minHeight:this.expanded?48:64};
    if(this.isConnected&&!this._railMotion){
      this._railMotion=new SelectionMotion(this,target,values=>{this._railValues=values;this._measureLayout();});
    }
    if(this._railMotion)this._railMotion.set(Object.fromEntries(Object.entries(target).map(([key,value])=>[key,{value,snap:!animate}])));
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
    const v=this._railValues,minWidth=Math.max(0,Math.round(v.minWidth));
    const maxWidth=this.expanded?340:minWidth;
    let expandedItemMaxWidth=0;
    const geometries=this._records.map(r=>{
      const top=this._positionFor(r)==='top',position=top?'top':'start';
      if(r.button.dataset.iconPosition!==position){r.button.dataset.iconPosition=position;this._syncLabelColor(r);}
      r.button.dataset.textSize=top&&r.position<.5?'medium':'large';
      let labelWidth=0,labelHeight=0;
      if(r.measure){
        r.measure.style.width='max-content';labelWidth=Math.min(maxWidth,Math.ceil(r.measure.getBoundingClientRect().width));
        r.measure.style.width=`${labelWidth}px`;labelHeight=Math.ceil(r.measure.getBoundingClientRect().height);
      }
      const input={labelWidth,labelHeight,positionProgress:r.position,selectedProgress:r.selection,topTarget:top,maxWidth,minHeight:v.minHeight};
      const g=r.label?measureAnimatedRailItem(input):measureIconOnlyRailItem(input);
      if(this.expanded&&expandedItemMaxWidth<g.width)expandedItemMaxWidth=g.width+20;
      return g;
    });
    let width=minWidth;
    if(this.expanded){
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
  _select(index) {
    const r=this._records[index];if(!r||r.button.disabled||this.selected===index)return;
    this.selected=index;this.dispatchEvent(new CustomEvent('change',{detail:{index},bubbles:true,composed:true}));
  }
  setupInteractions() {
    this._abortController?.abort();this._abortController=new AbortController();const{signal}=this._abortController;
    this.shadowRoot.querySelector('slot[name="header"]').addEventListener('slotchange',()=>this._measureLayout(),{signal});
    for(const[index,r]of this._records.entries()){
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
if(!customElements.get('md-navigation-rail'))customElements.define('md-navigation-rail',MdNavigationRail);
