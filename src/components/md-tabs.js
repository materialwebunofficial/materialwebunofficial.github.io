/**
 * Web adaptation of AndroidX Material3 Tab, LeadingIconTab and TabRow.
 * Source revision: a095da93f8e98dea8748ceed79ea8427aade245f.
 * Layout policies are ported in tab-layout.js; native fonts and input remain web adapters.
 */
import { safeJsonParse } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import { bindPress, createRipple } from '../motion/interactions.js';
import { SelectionMotion } from '../motion/selection-motion.js';
import { ColorMotion } from '../motion/color-motion.js';
import { observeThemeContext } from '../theme/theme-context.js';
import { tabBaselineLayout, fixedTabRow, scrollableTabRow, tabIndicatorGeometry, tabScrollOffset, applyTabScrollDelta, tabContentOffset } from './tab-layout.js';

const style = `
 :host{display:block;width:100%;min-width:0;box-sizing:border-box;user-select:none;-webkit-user-select:none}
 .surface{position:relative;background:var(--md-sys-color-surface,#FFFBFE)}
 .viewport{position:relative;width:100%;overflow:visible}
 :host([scrollable]) .viewport{overflow-x:auto;overflow-y:hidden;scrollbar-width:none;overscroll-behavior-x:contain}
 .viewport::-webkit-scrollbar{display:none}
 .tablist{position:relative;width:100%}
 :host([scrollable]) .tablist{margin-inline-end:auto}
 .tab{position:absolute;box-sizing:border-box;appearance:none;padding:0;border:0;border-radius:0;background:transparent;color:inherit;cursor:pointer;outline:none;-webkit-tap-highlight-color:transparent;overflow:visible}
 .tab:disabled{cursor:default}
 .tab::before{content:'';position:absolute;inset:0;min-width:48px;left:50%;transform:translateX(-50%);min-height:48px}
 .state{position:absolute;inset:0;background:var(--tab-selected-color,currentColor);opacity:0;pointer-events:none}
 .tab:hover:enabled .state{opacity:var(--md-sys-state-hover-state-layer-opacity,.08)}
 .tab:focus-visible:enabled .state{opacity:var(--md-sys-state-focus-state-layer-opacity,.1)}
 .tab.pressed:enabled .state{opacity:var(--md-sys-state-pressed-state-layer-opacity,.1)}
 .tab:focus-visible{outline:3px solid var(--md-sys-color-secondary,#625B71);outline-offset:-3px;z-index:1}
 .tab-content{position:absolute;pointer-events:none}
 .label,.measure{font:var(--md-sys-typescale-title-small,500 14px/20px Roboto,sans-serif);letter-spacing:var(--md-sys-typescale-title-small-tracking,.1px);font-weight:var(--md-sys-typescale-title-small-weight,500)}
 .label{position:absolute;margin:0;white-space:pre-wrap;overflow-wrap:normal;color:inherit;text-align:center}
 .baseline{display:inline-block;width:0;height:0;vertical-align:baseline}
 .measure{position:absolute;visibility:hidden;white-space:pre;width:max-content;pointer-events:none}
 .icon{position:absolute;width:24px;height:24px;font-family: var(--md-icon-font-family, 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif);font-weight:400;font-style:normal;font-size:24px;line-height:24px;letter-spacing:normal;text-transform:none;white-space:nowrap;word-wrap:normal;direction:ltr;font-feature-settings:'liga';-webkit-font-smoothing:antialiased}
 .color-probe{position:absolute;visibility:hidden;pointer-events:none}
 .indicator{position:absolute;bottom:0;left:0;height:3px;border-radius:3px;background:var(--md-sys-color-primary,#6750A4);pointer-events:none}
 :host([variant=secondary]) .indicator{border-radius:0}
 .divider{position:absolute;left:0;right:0;bottom:0;height:1px;background:var(--md-sys-color-outline-variant,#CAC4D0);pointer-events:none}
 .md-ripple-effect{position:absolute;border-radius:50%;background:var(--tab-selected-color,currentColor);opacity:.1;transform:scale(0);animation:tab-ripple 450ms linear;pointer-events:none}
 @keyframes tab-ripple{to{transform:scale(1);opacity:0}}
 md-tab{display:none}
`;
const sheet = createComponentSheet(style);
let nextId = 0;
const finite = (value, fallback, minimum=0) => Number.isFinite(Number(value)) && Number(value)>=minimum ? Number(value) : fallback;
const make = (tag, name, parent) => { const el=document.createElement(tag); if(name)el.className=name; parent?.append(el); return el; };
const px = (el, rect) => {el.style.left=`${rect.x}px`;el.style.top=`${rect.y}px`;el.style.width=`${rect.width}px`;el.style.height=`${rect.height}px`;};

export class MdTabs extends HTMLElement {
 static get observedAttributes(){return ['tabs','selected','selected-tab-index','selected-index','variant','scrollable','icon-position','container-color','content-color','min-tab-width','edge-padding','disabled','enabled','selected-content-color','unselected-content-color','aria-label'];}
 constructor(){
  super();this.attachShadow({mode:'open'});adoptSheet(this.shadowRoot,sheet);
  this._id=`md-tabs-${++nextId}`;this._records=[];this._positions=[];this._panels=new Map();this._scrollSelection=null;
  this._surface=make('div','surface',this.shadowRoot);this._divider=make('div','divider',this._surface);
  this._viewport=make('div','viewport',this._surface);this._row=make('div','tablist',this._viewport);this._row.setAttribute('role','tablist');
  this._indicator=make('div','indicator',this._row);this._indicator.hidden=true;make('slot','',this.shadowRoot);
 }
 get tabs(){
  if(this.hasAttribute('tabs')){const arr=safeJsonParse(this.getAttribute('tabs'),[]);return Array.isArray(arr)?arr.filter(t=>t&&typeof t==='object'&&!Array.isArray(t)):[];}
  const children=[...this.children].filter(el=>el.localName==='md-tab');
  return children.length?children.map(el=>({label:el.label,icon:el.icon,disabled:el.disabled,panel:el.getAttribute('panel'),iconPosition:el.getAttribute('icon-position')})):[{label:'Tab 1'},{label:'Tab 2'}];
 }
 set tabs(value){this.setAttribute('tabs',JSON.stringify(value));}
 get selected(){const raw=this.getAttribute('selected')??this.getAttribute('selected-tab-index')??this.getAttribute('selected-index');return Math.min(Math.max(0,Math.trunc(finite(raw,0))),Math.max(0,this.tabs.length-1));}
 set selected(value){this.setAttribute('selected',String(value));}
 get selectedTabIndex(){return this.selected;} set selectedTabIndex(value){this.selected=value;}
 get selectedIndex(){return this.selected;} set selectedIndex(value){this.selected=value;}
 get activeTab(){return this.selected;} set activeTab(value){this.selected=value;}
 get variant(){return this.getAttribute('variant')==='secondary'?'secondary':'primary';} set variant(value){this.setAttribute('variant',value);}
 // Kept as inert compatibility metadata: AndroidX tabs have no pill indicator.
 get pill(){return this.hasAttribute('pill');} set pill(value){this.toggleAttribute('pill',Boolean(value));}
 get scrollable(){return this.hasAttribute('scrollable');} set scrollable(value){this.toggleAttribute('scrollable',Boolean(value));}
 get iconPosition(){return this.getAttribute('icon-position')==='start'?'start':'top';} set iconPosition(value){this.setAttribute('icon-position',value);}
 get containerColor(){return this.getAttribute('container-color')||'';} set containerColor(value){this._colorAttribute('container-color',value);}
 get contentColor(){return this.getAttribute('content-color')||'';} set contentColor(value){this._colorAttribute('content-color',value);}
 get selectedContentColor(){return this.getAttribute('selected-content-color')||'';} set selectedContentColor(value){this._colorAttribute('selected-content-color',value);}
 get unselectedContentColor(){return this.getAttribute('unselected-content-color')||'';} set unselectedContentColor(value){this._colorAttribute('unselected-content-color',value);}
 _colorAttribute(name,value){if(value==null)this.removeAttribute(name);else this.setAttribute(name,String(value));}
 get minTabWidth(){return finite(this.getAttribute('min-tab-width')??90,90);} set minTabWidth(value){if(value==null)this.removeAttribute('min-tab-width');else this.setAttribute('min-tab-width',String(value));}
 get edgePadding(){return finite(this.getAttribute('edge-padding')??52,52);} set edgePadding(value){if(value==null)this.removeAttribute('edge-padding');else this.setAttribute('edge-padding',String(value));}
 get enabled(){return !this.hasAttribute('disabled')&&this.getAttribute('enabled')!=='false';} set enabled(value){this.toggleAttribute('disabled',!value);this.setAttribute('enabled',String(Boolean(value)));}
 get disabled(){return !this.enabled;} set disabled(value){this.enabled=!value;}
 connectedCallback(){
  this._abort?.abort();this._abort=new AbortController();const {signal}=this._abort;
  this._sync();
  this._resize=new ResizeObserver(()=>this._queueLayout());this._resize.observe(this);
  this._theme=observeThemeContext(this,()=>{this._syncColors();this._queueLayout();});
  this._children=new MutationObserver(changes=>{if(changes.some(c=>c.target.localName==='md-tab'||c.type==='childList'&&[...c.addedNodes,...c.removedNodes].some(n=>n.localName==='md-tab')))this._sync();});
  this._children.observe(this,{subtree:true,childList:true,attributes:true,attributeFilter:['label','icon','disabled','panel','icon-position']});
  const readyOwner=this._abort;
  document.fonts?.ready.then(()=>{if(!readyOwner.signal.aborted)this._queueLayout();});
  document.fonts?.addEventListener('loadingdone',()=>this._queueLayout(),{signal});
  this._row.addEventListener('keydown',e=>this._key(e),{signal});
  this._row.addEventListener('focusin',()=>this._roving(),{signal});
  this._row.addEventListener('focusout',()=>queueMicrotask(()=>{if(!signal.aborted)this._roving();}),{signal});
  const cancelScroll=()=>{this._scrollMotion?.dispose();this._scrollMotion=null;this._scrollAccumulator=0;};
  this._viewport.addEventListener('wheel',cancelScroll,{signal,passive:true});this._viewport.addEventListener('pointerdown',cancelScroll,{signal,passive:true});
  this._viewport.addEventListener('scroll',()=>{if(this._scrollMotion&&Math.abs(this._viewport.scrollLeft-this._expectedScroll)>.5)cancelScroll();},{signal,passive:true});
  // Parsing may place referenced panels after this custom element.
  queueMicrotask(()=>{if(!signal.aborted)this._syncPanels();});
 }
 disconnectedCallback(){
  this._abort?.abort();this._abort=null;this._resize?.disconnect();this._theme?.();this._children?.disconnect();
  if(this._layoutFrame!=null)cancelAnimationFrame(this._layoutFrame);this._layoutFrame=null;
  this._indicatorMotion?.dispose();this._indicatorMotion=null;this._scrollMotion?.dispose();this._scrollMotion=null;this._scrollSelection=null;
  for(const r of this._records){r.abort?.abort();r.abort=null;r.colorMotion?.dispose();r.colorMotion=null;}
  for(const panel of [...this._panels.keys()])this._releasePanel(panel);
 }
 attributeChangedCallback(name,oldValue,value){if(oldValue===value||!this.isConnected)return;if(name==='tabs'||name==='disabled'||name==='enabled')this._sync();else{this._syncColors();this._roving();this._syncPanels();this._queueLayout();}}
 _newRecord(){
  const button=make('button','tab');button.type='button';button.setAttribute('role','tab');button.id=`${this._id}-tab-${++nextId}`;
  make('span','state',button);const content=make('span','tab-content',button),label=make('span','label',content);
  const first=make('span','baseline',label),text=document.createTextNode('');label.append(text);const last=make('span','baseline',label);
  const icon=make('span','icon',content);icon.setAttribute('aria-hidden','true');first.setAttribute('aria-hidden','true');last.setAttribute('aria-hidden','true');
  const measure=make('span','measure',button),probe=make('span','color-probe',button);measure.setAttribute('aria-hidden','true');probe.setAttribute('aria-hidden','true');
  this._row.insertBefore(button,this._indicator);return{button,content,label,first,last,text,icon,measure,probe,selected:null};
 }
 _bind(r){
  r.abort?.abort();r.abort=new AbortController();
  bindPress(r.button,{disabled:()=>r.button.disabled,signal:r.abort.signal,
   onPress:e=>{r.suppressActivation=false;createRipple(e,r.button);},
   onActivate:()=>{if(r.suppressActivation){r.suppressActivation=false;return;}this._select(this._records.indexOf(r));}});
 }
 _sync(){
  const data=this.tabs;
  while(this._records.length>data.length){const r=this._records.pop();r.abort?.abort();r.colorMotion?.dispose();r.button.remove();}
  while(this._records.length<data.length)this._records.push(this._newRecord());
  data.forEach((item,i)=>{
   const r=this._records[i];r.data=item;r.text.data=item.label==null?'':String(item.label);r.measure.textContent=r.text.data;
   r.label.hidden=!r.text.data;r.icon.textContent=item.icon==null?'':String(item.icon);r.icon.hidden=!r.icon.textContent;
   r.button.setAttribute('aria-label',item.accessibleLabel==null?(r.text.data||r.icon.textContent):String(item.accessibleLabel));
   const disabled=!this.enabled||item.disabled===true||item.enabled===false;
   if(disabled&&!r.button.disabled&&r.button.classList.contains('pressed'))r.suppressActivation=true;
   const rebind=!r.abort||r.abort.signal.aborted||disabled!==r.button.disabled;r.button.disabled=disabled;
   r.button.setAttribute('aria-disabled',String(disabled));r.button.dataset.index=String(i);if(rebind)this._bind(r);
  });
  this._syncColors();this._roving();this._syncPanels();this._layout();
 }
 _syncColors(){
  this._surface.style.backgroundColor=this.containerColor||'var(--md-sys-color-surface,#FFFBFE)';
  this._row.setAttribute('aria-label',this.getAttribute('aria-label')||'Tabs');
  const base=this.contentColor||(this.variant==='secondary'?'var(--md-sys-color-on-surface,#1D1B20)':'var(--md-sys-color-primary,#6750A4)');
  this._records.forEach((r,i)=>{
   const selected=i===this.selected,active=r.data.selectedContentColor||this.selectedContentColor||base;
   const inactive=r.data.unselectedContentColor||this.unselectedContentColor||active;
   r.probe.style.color=base;r.probe.style.color=active;r.button.style.setProperty('--tab-selected-color',getComputedStyle(r.probe).color);
   r.probe.style.color=selected?active:inactive;const color=getComputedStyle(r.probe).color;
   r.button.setAttribute('aria-selected',String(selected));
   if(!r.colorMotion)r.colorMotion=new ColorMotion(this,r.probe,color,value=>r.button.style.color=value);
   else{r.colorMotion.role=r.selected===false&&selected?'expressiveEffectMedium':'expressiveEffectFast';r.colorMotion.set(color);}
   r.selected=selected;
  });
 }
 _queueLayout(){if(!this.isConnected||this._layoutFrame!=null)return;this._layoutFrame=requestAnimationFrame(()=>{this._layoutFrame=null;if(this.isConnected)this._layout();});}
 _measure(r,width,rtl){
  const natural=Math.ceil(r.measure.getBoundingClientRect().width),leading=(r.data.iconPosition||this.iconPosition)==='start';
  const hasText=!r.label.hidden,hasIcon=!r.icon.hidden;
  const textWidth=hasText?Math.max(0,Math.min(natural,width-(leading&&hasIcon?64:32))):0;
  r.label.style.width=`${textWidth}px`;const rect=r.label.getBoundingClientRect();
  const text=hasText?{width:textWidth,height:Math.ceil(rect.height),firstBaseline:Math.round(r.first.getBoundingClientRect().top-rect.top),lastBaseline:Math.round(r.last.getBoundingClientRect().top-rect.top)}:null;
  const icon=hasIcon?{width:Math.min(24,width),height:24}:null;
  const fontScale=parseFloat(getComputedStyle(r.label).fontSize)/14;
  if(leading){
   const gap=hasText&&hasIcon?8:0,w=textWidth+(icon?.width||0)+gap,height=48,placements={};
   if(icon)placements.icon={x:rtl?w-icon.width:0,y:Math.trunc((height-24)/2),width:icon.width,height:24};
   if(text)placements.text={x:rtl?0:(icon?.width||0)+gap,y:Math.trunc((height-text.height)/2),width:textWidth,height:text.height};
   return{naturalWidth:natural+(hasIcon?24+gap:0)+32,size:{width:w,height},placements,text,icon,fontScale,leading};
  }
  return{naturalWidth:Math.max(hasText?natural+32:0,hasIcon?24:0),...tabBaselineLayout({width,text,icon,fontScale,rtl}),text,icon,fontScale,leading};
 }
 _layout(){
  const viewportWidth=this._viewport.clientWidth;if(!viewportWidth)return;
  this._rtl=getComputedStyle(this).direction==='rtl';const data=this._records;
  const allocated=this.scrollable?Number.MAX_SAFE_INTEGER:data.length?Math.trunc(viewportWidth/data.length):0;
  const measures=data.map(r=>this._measure(r,allocated,this._rtl));
  const inputs=measures.map(m=>({width:m.naturalWidth,height:m.size.height}));
  const row=this.scrollable?scrollableTabRow({tabs:inputs,minTabWidth:this.minTabWidth,edgePadding:this.edgePadding}):fixedTabRow({width:viewportWidth,tabs:inputs,rtl:this._rtl});
  this._positions=row.positions;this._rowWidth=row.size.width;this._row.style.width=`${row.size.width}px`;this._row.style.height=`${row.size.height}px`;
  this._divider.hidden=!data.length;
  data.forEach((r,i)=>{
   const p=row.positions[i],m=measures[i];r._measure=m;
   const physicalWidth=this.scrollable?Math.max(Math.round(this.minTabWidth),m.naturalWidth):p.width,left=Math.round(p.left);
   px(r.button,{x:this._rtl?row.size.width-left-physicalWidth:left,y:0,width:physicalWidth,height:row.size.height});
   const offset=tabContentOffset({tabWidth:physicalWidth,rowHeight:row.size.height,contentSize:m.size});
   px(r.content,{...offset,...m.size});
   if(m.placements.text){const t=m.placements.text;px(r.label,{...t,x:t.x+(m.leading?0:16),width:m.text.width});}
   if(m.placements.icon)px(r.icon,m.placements.icon);
  });
  const position=row.positions[this.selected];this._indicator.hidden=!position;
  if(!position){this._indicatorMotion?.dispose();this._indicatorMotion=null;return;}
  const width=this.variant==='secondary'?position.width:position.contentWidth,offset=position.left;
  if(!this._indicatorMotion)this._indicatorMotion=new SelectionMotion(this,{width,offset},value=>this._drawIndicator(value));
  else this._indicatorMotion.set({width:{value:width},offset:{value:offset}});
  if(this.scrollable&&this._scrollSelection!==this.selected){this._scrollSelection=this.selected;this._centerSelected(viewportWidth);}
  if(!this.scrollable){this._scrollSelection=null;this._scrollMotion?.dispose();this._scrollMotion=null;this._viewport.scrollLeft=0;}
 }
 _drawIndicator(value){
  const p=this._positions[this.selected];if(!p||!this.isConnected)return;
  const geom=tabIndicatorGeometry({rowWidth:this._rowWidth,tabWidth:Math.round(p.width),targetContentWidth:Math.round(p.contentWidth),...value,scrollable:this.scrollable,rtl:this._rtl});
  this._indicator.style.left=`${geom.x}px`;this._indicator.style.width=`${geom.width}px`;
 }
 _centerSelected(viewportWidth){
  this._scrollMotion?.dispose();const initial=this._rtl?-this._viewport.scrollLeft:this._viewport.scrollLeft;
  const maxValue=Math.max(0,this._rowWidth-viewportWidth),target=tabScrollOffset({positions:this._positions,selected:this.selected,edgePadding:this.edgePadding,maxValue});
  // animateScrollBy starts a new zero-velocity float animation on every request.
  if(this._scrollValue!==initial)this._scrollAccumulator=0;this._scrollValue=Math.round(initial);let previous=0;
  this._scrollMotion=new SelectionMotion(this,{delta:0},({delta})=>{
   const state=applyTabScrollDelta({value:this._scrollValue,maxValue,accumulator:this._scrollAccumulator||0},Math.fround(delta-previous));
   this._scrollValue=state.value;this._scrollAccumulator=state.accumulator;previous=Math.fround(previous+state.consumed);
   this._expectedScroll=(this._rtl?-1:1)*state.value;this._viewport.scrollLeft=this._expectedScroll;
  });
  this._scrollMotion.set({delta:{value:target-initial}});
 }
 _roving(){
  const focused=this._records.find(r=>r.button===this.shadowRoot.activeElement&&!r.button.disabled);
  const active=focused||this._records[this.selected]?.button.disabled&&this._records.find(r=>!r.button.disabled)||this._records[this.selected]||this._records.find(r=>!r.button.disabled);
  for(const r of this._records)r.button.tabIndex=r===active&&!r.button.disabled?0:-1;
 }
 _key(event){
  const buttons=this._records.filter(r=>!r.button.disabled).map(r=>r.button),at=buttons.indexOf(event.target);if(at<0)return;
  let index;if(event.key==='Home')index=0;else if(event.key==='End')index=buttons.length-1;
  else if(event.key==='ArrowRight')index=(at+(this._rtl?-1:1)+buttons.length)%buttons.length;
  else if(event.key==='ArrowLeft')index=(at+(this._rtl?1:-1)+buttons.length)%buttons.length;else return;
  event.preventDefault();buttons[index].focus({preventScroll:true});
 }
 _select(index){if(index<0||this._records[index]?.button.disabled||index===this.selected)return;this.selected=index;this.dispatchEvent(new CustomEvent('change',{detail:{index},bubbles:true,composed:true}));}
 _syncPanels(){
  const desired=new Set();
  this._records.forEach((r,i)=>{
   const id=typeof r.data.panel==='string'?r.data.panel:'';const panel=id?this.getRootNode().getElementById?.(id):null;
   if(!panel||panel===this||panel.contains(this)){r.button.removeAttribute('aria-controls');if('ariaControlsElements' in r.button)r.button.ariaControlsElements=[];return;}
   desired.add(panel);let state=this._panels.get(panel);
   if(!state){
    const label=make('span','');label.hidden=true;label.id=`${r.button.id}-panel-label`;panel.before(label);
    state={label,before:Object.fromEntries(['hidden','role','tabindex','aria-labelledby'].map(a=>[a,panel.getAttribute(a)])),owned:{}};this._panels.set(panel,state);
   }
   state.label.textContent=r.text.data||r.button.getAttribute('aria-label');
   const values={hidden:i===this.selected?null:'',role:'tabpanel',tabindex:'0','aria-labelledby':state.label.id};
   for(const [name,value] of Object.entries(values)){if(value==null)panel.removeAttribute(name);else panel.setAttribute(name,value);state.owned[name]=value;}
   r.button.setAttribute('aria-controls',id);if('ariaControlsElements' in r.button)r.button.ariaControlsElements=[panel];
  });
  for(const panel of [...this._panels.keys()])if(!desired.has(panel))this._releasePanel(panel);
 }
 _releasePanel(panel){const state=this._panels.get(panel);if(!state)return;for(const [name,value] of Object.entries(state.before)){if(panel.getAttribute(name)!==state.owned[name])continue;if(value==null)panel.removeAttribute(name);else panel.setAttribute(name,value);}state.label.remove();this._panels.delete(panel);}
}
if(!customElements.get('md-tabs'))customElements.define('md-tabs',MdTabs);

/** Declarative Tab data consumed by its parent MdTabs; the native button lives in MdTabs. */
export class MdTab extends HTMLElement {
 get label(){return this.getAttribute('label')||'';} set label(value){this.setAttribute('label',value);}
 get icon(){return this.getAttribute('icon')||'';} set icon(value){this.setAttribute('icon',value);}
 get disabled(){return this.hasAttribute('disabled');} set disabled(value){this.toggleAttribute('disabled',Boolean(value));}
 get selected(){return this.hasAttribute('selected');} set selected(value){this.toggleAttribute('selected',Boolean(value));}
 connectedCallback(){this.hidden=true;}
}
if(!customElements.get('md-tab'))customElements.define('md-tab',MdTab);
