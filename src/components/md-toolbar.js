/** Compose FloatingToolbar and MDC DockedToolbar browser adapter. */
import { delegateHostAria } from '../utils/host-aria.js';
import { SpringPhysics } from '../motion/spring-physics.js';
import { SelectionMotion } from '../motion/selection-motion.js';
import { retargetIntSize, toolbarGroupComposed } from '../motion/size-motion.js';
import { toolbarFabConstraints, toolbarFabContentLayout, toolbarRowLayout, toolbarBalancedPadding, toolbarColors } from './toolbar-layout.js';
import {rowColumnLayout, rowColumnIntrinsic, minimumInteractiveLayout} from './row-column-layout.js';
import {normalizeToolbarPadding,serializeToolbarPadding,resolveToolbarPadding} from './toolbar-padding.js';
import { PointerVelocityTracker } from '../motion/velocity-tracker.js';
import { HorizontalTouchSlop, pointerSlop } from '../motion/touch-slop.js';
import { observeThemeContext } from '../theme/theme-context.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import { circleCornerShape, rectangleCornerShape, normalizeCornerShape, cornerShapeOutline } from '../shapes/corner-shape.js';
import { OutlineShadow } from '../shapes/outline-shadow.js';

const defaultStyle=`
 :host{display:inline-block;vertical-align:middle;outline:none;-webkit-tap-highlight-color:transparent}
 :host([variant="docked"]),:host(:not([variant])){display:block}
 :host([data-toolbar-fab]),:host([data-toolbar-row]){width:var(--_toolbar-width,auto);height:var(--_toolbar-height,auto);min-width:0;min-height:0;max-width:100%;max-height:100%}
 .frame{position:relative;display:inline-block;vertical-align:middle}
 .shape-shadow{position:absolute;overflow:visible;pointer-events:none}
 .surface{box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:0;padding:var(--_toolbar-content-padding,8px);min-height:64px;border-radius:9999px;background:var(--bar-container);color:var(--bar-content);overflow:hidden}
 .frame[data-orientation="vertical"] .surface{flex-direction:column;min-height:0;min-width:64px}
 .frame[data-variant="docked"]{display:block}
 .frame[data-variant="docked"] .surface{min-height:64px;border-radius:0;padding:0 16px;justify-content:var(--bar-arrangement,flex-start)}
 .frame[data-variant="docked"][data-orientation="vertical"] .surface{padding:16px 0}
 .group{display:flex;align-items:center;flex:none;width:max-content;gap:0}
 .frame[data-variant="floating"][data-fab="false"] .group{align-items:flex-start}
 .frame[data-variant="floating"][data-fab="false"] ::slotted([data-toolbar-align="center"]){align-self:center}
 .frame[data-variant="floating"][data-fab="false"] ::slotted([data-toolbar-align="start"]){align-self:flex-start}
 .frame[data-variant="floating"][data-fab="false"] ::slotted([data-toolbar-align="end"]){align-self:flex-end}
 .frame[data-orientation="vertical"] .group{flex-direction:column;height:max-content;width:auto}
 .clip,.main-content{position:relative;flex:none;box-sizing:content-box}
 .scroll-viewport{display:contents}
 .scroll-extent{display:none}
 .clip{overflow:hidden}
 .clip>.group{position:relative}
 slot{display:contents}
 .fab-slot{position:absolute;display:flex;align-items:flex-start;justify-content:flex-start}
 .frame[data-fab="true"] .surface{position:absolute;min-height:0;min-width:0;padding:0;justify-content:flex-start;overflow:hidden}
 .frame[data-fab="true"] .main-content{position:absolute;left:0;top:0;box-sizing:border-box;width:100%;height:100%;display:flex;align-items:center;min-width:0;min-height:0}
 .frame[data-fab="true"] .scroll-viewport{position:absolute;left:8px;top:8px;display:flex;align-items:center;flex:none;min-width:0;min-height:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}
 .frame[data-fab="true"][data-orientation="vertical"] .scroll-viewport{flex-direction:column;max-height:100%}
 .frame[data-fab="true"][data-orientation="vertical"] .scroll-viewport{overflow-x:hidden;overflow-y:auto}
 .frame[data-fab="true"] .clip{display:none}
 .surface[hidden],.fab-slot[hidden]{display:none}
 ::slotted(*){flex:none}
 .frame[data-variant="floating"] ::slotted(md-icon-button){min-width:48px;min-height:48px;display:inline-flex;align-items:center;justify-content:center}
 .frame[data-row="true"] .surface{position:absolute;left:0;top:0;min-width:0;min-height:0;padding:0}
 .frame[data-row="true"] .clip,.frame[data-row="true"] .main-content,.frame[data-row="true"] .group{position:absolute;box-sizing:border-box;min-width:0;min-height:0}
 :host([data-toolbar-content]) .scroll-viewport{align-items:flex-start}
 :host([data-toolbar-content]) .scroll-extent{display:block;position:absolute;pointer-events:none}
 :host([data-toolbar-content]) .group{position:relative;box-sizing:border-box;min-width:0;min-height:0;overflow-x:clip;overflow-y:visible}
 :host([data-toolbar-content]) .frame[data-orientation="vertical"] .group{overflow-x:visible;overflow-y:clip}
 :host([data-toolbar-measuring]) .group{position:relative!important;left:0!important;top:0!important;width:max-content!important;height:auto!important}
 :host([data-toolbar-measuring]) .frame[data-orientation="vertical"] .group{width:auto!important;height:max-content!important}
`;
const toolbarSheet=createComponentSheet(defaultStyle);
const token=role=>`var(--md-sys-color-${role})`;
const number=(value,fallback)=>Number.isFinite(Number(value))&&value!==null?Number(value):fallback;
const write=(node,key,value)=>{if(node.style[key]!==value)node.style[key]=value;};
const rect=(node,p)=>{write(node,'left',p.x+'px');write(node,'top',p.y+'px');write(node,'width',p.width+'px');write(node,'height',p.height+'px');};
const parseShadows=text=>[...text.matchAll(/(rgba?\([^)]*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px\s+(-?[\d.]+)px/g)].map(m=>{
 const color=m[1].match(/[\d.]+/g).map(Number);return[...m.slice(2).map(Number),...color.slice(0,3),color[3]??1];
});

export class MdToolbar extends HTMLElement {
 static get observedAttributes(){return ['variant','color','orientation','expanded','fab-position','animation-spec','expanded-height','collapsed-height','container-color','content-color','fab-container-color','fab-content-color','content-padding','toolbar-content-padding','horizontal-arrangement','expanded-shadow-elevation','collapsed-shadow-elevation','aria-label','touch-exploration-enabled','shape'];}
 constructor(){
  super();this.attachShadow({mode:'open'});adoptSheet(this.shadowRoot,toolbarSheet);
  this._rendered=false;this._abortController=null;this._queued=false;this._hasFab=false;this._metrics={main:{width:0,height:0},leading:{width:0,height:0},trailing:{width:0,height:0}};
  this._scrollTarget=null;this._scrollBehavior=null;this._scrollExpansion=null;this._scrollRaf=null;this._focusIndices=new Map();this._forceCollapse=false;
 }
 get variant(){return this.getAttribute('variant')==='floating'?'floating':'docked';}
 set variant(v){this._attr('variant',v);}
 get color(){return this.getAttribute('color')==='vibrant'?'vibrant':'standard';}
 set color(v){this._attr('color',v);}
 get orientation(){return this.getAttribute('orientation')==='vertical'?'vertical':'horizontal';}
 set orientation(v){this._attr('orientation',v);}
 get expanded(){return this.hasAttribute('expanded')&&this.getAttribute('expanded')!=='false';}
 set expanded(v){v?this.setAttribute('expanded',''):this.removeAttribute('expanded');}
 get fabPosition(){const value=this.getAttribute('fab-position');return this.orientation==='vertical'?(value==='top'?'top':'bottom'):(value==='start'?'start':'end');}
 set fabPosition(v){this._attr('fab-position',v);}
 get containerColor(){return this.getAttribute('container-color')||'';}
 set containerColor(v){this._attr('container-color',v);}
 get contentColor(){return this.getAttribute('content-color')||'';}
 set contentColor(v){this._attr('content-color',v);}
 get shape(){
  const text=this.getAttribute('shape'),variant=this.variant;
  if(this._shapeCache?.text===text&&this._shapeCache.variant===variant)return this._shapeCache.value;
  const fallback=variant==='floating'?circleCornerShape:rectangleCornerShape;
  let value=fallback;
  if(text!==null)try{value=normalizeCornerShape(text);}catch{/* Invalid HTML restores the variant's default. */}
  this._shapeCache={text,variant,value};return value;
 }
 set shape(value){
  if(value==null){this.removeAttribute('shape');return;}
  this.setAttribute('shape',JSON.stringify(normalizeCornerShape(value)));
 }
 get contentPadding(){return normalizeToolbarPadding(this.getAttribute('content-padding')??8);}
 set contentPadding(v){this._attr('content-padding',v==null?null:serializeToolbarPadding(v));}
 get toolbarContentPadding(){return this.hasAttribute('toolbar-content-padding')?normalizeToolbarPadding(this.getAttribute('toolbar-content-padding')):this.contentPadding;}
 set toolbarContentPadding(v){this._attr('toolbar-content-padding',v==null?null:serializeToolbarPadding(v));}
 get fabContainerColor(){return this.getAttribute('fab-container-color')||'';}
 set fabContainerColor(v){this._attr('fab-container-color',v);}
 get fabContentColor(){return this.getAttribute('fab-content-color')||'';}
 set fabContentColor(v){this._attr('fab-content-color',v);}
 get expandedShadowElevation(){return number(this.getAttribute('expanded-shadow-elevation'),this._hasFab?1:0);}
 set expandedShadowElevation(v){this._attr('expanded-shadow-elevation',v);}
 get collapsedShadowElevation(){return number(this.getAttribute('collapsed-shadow-elevation'),0);}
 set collapsedShadowElevation(v){this._attr('collapsed-shadow-elevation',v);}
 get animationSpec(){return this._animationSpec||this.getAttribute('animation-spec')||'';}
 set animationSpec(v){if(v&&typeof v==='object'){this._animationSpec=Number.isFinite(v.stiffness)&&v.stiffness>0&&Number.isFinite(v.dampingRatio)&&v.dampingRatio>0?{...v}:null;}else{this._animationSpec=null;this._attr('animation-spec',v);}}
 // Deprecated metadata: FloatingToolbar has no expanded/collapsed-height API.
 get expandedHeight(){return number(this.getAttribute('expanded-height'),64);}
 set expandedHeight(v){this._attr('expanded-height',v);}
 get collapsedHeight(){return number(this.getAttribute('collapsed-height'),64);}
 set collapsedHeight(v){this._attr('collapsed-height',v);}
 get horizontalArrangement(){return this.getAttribute('horizontal-arrangement')||'start';}
 set horizontalArrangement(v){this._attr('horizontal-arrangement',v);}
 _attr(name,value){value===null||value===undefined?this.removeAttribute(name):this.setAttribute(name,String(value));}
 expand(){this.expanded=true;}
 collapse(){this.expanded=false;}
 toggle(){this.expanded=!this.expanded;}
 get touchExplorationEnabled(){return this.hasAttribute('touch-exploration-enabled')&&this.getAttribute('touch-exploration-enabled')!=='false';}
 set touchExplorationEnabled(value){value?this.setAttribute('touch-exploration-enabled',''):this.removeAttribute('touch-exploration-enabled');}
 get effectiveExpanded(){return this.variant==='docked'||(!this._forceCollapse&&(this.touchExplorationEnabled||this.expanded));}
 get scrollBehavior(){return this._scrollBehavior;}
 set scrollBehavior(value){this._cancelScrollSettle();this._scrollBehavior=value&&['onPostScroll','onPostFling','settle'].every(key=>typeof value[key]==='function')&&typeof value.state?.placement==='function'&&typeof value.state?.updateLimit==='function'?value:null;this._configureScroll();}
 get scrollExpansion(){return this._scrollExpansion;}
 set scrollExpansion(value){this._scrollExpansion=value&&typeof value.update==='function'&&typeof value.postScroll==='function'?value:null;this._configureScroll();}
 get scrollTarget(){return this._scrollTarget;}
 set scrollTarget(value){this._scrollTarget=value?.addEventListener?value:null;this._configureScroll();}
 forceCollapse(value=true){this._forceCollapse=!!value;this._sync(true);}
 // A browser scroll event exposes consumed distance, but no remaining fling
 // velocity. Hosts with a nested scroll pipeline may supply that explicitly.
 postScroll(consumed){
  if(this.variant!=='floating'||this.touchExplorationEnabled)return{x:0,y:0};
  this._cancelScrollSettle();this._scrollExpansion?.update({expanded:this.expanded});this._scrollExpansion?.postScroll(consumed.y);
  const result=this._scrollBehavior?.onPostScroll(consumed)||{x:0,y:0};this._drawScroll();return result;
 }
 postFling(available={x:0,y:0}){return this._runScrollSettle(available.y,true);}
 connectedCallback(){
  if(!this._rendered)this.render();
  this._abortController?.abort();this._abortController=new AbortController();const{signal}=this._abortController;
  this.shadowRoot.addEventListener('slotchange',()=>this._queueLayout(),{signal});
  this.addEventListener('keydown',event=>this._key(event),{signal});
  // A size the toolbar drew itself (its frame while expanding or collapsing,
  // the groups it placed) brings nothing new to measure; any other size
  // change, or one after a measurement made while not rendered, does.
  this._resize=new ResizeObserver(entries=>{if(!this._measuredRendered||!entries.every(entry=>this._drewSize(entry)))this._queueLayout();});this._resize.observe(this);for(const group of Object.values(this._groups))this._resize.observe(group);
  this._children=new MutationObserver(()=>this._queueLayout());this._children.observe(this,{subtree:true,childList:true,attributes:true,attributeFilter:['slot','hidden','disabled','size','width','style','variant','label','icon','data-toolbar-weight','data-toolbar-fill','data-toolbar-align','data-toolbar-alignment-line']});
  this._theme=observeThemeContext(this,()=>{this._colors();this._queueLayout();});
  document.fonts?.addEventListener('loadingdone',()=>this._queueLayout(),{signal});
  this._measure();this._colors();this._createMotion();this._sync(false);
  this._configureScroll();
 }
 disconnectedCallback(){this._abortController?.abort();this._abortController=null;this._resize?.disconnect();this._children?.disconnect();this._theme?.();this._motion?.dispose();this._motion=null;this._scrollAbort?.abort();this._scrollResize?.disconnect();this._cancelScrollSettle();this._restoreScrollFocus();}
 attributeChangedCallback(name,oldValue,newValue){
  if(!this._rendered||oldValue===newValue)return;
  if(name==='expanded'){
   this._scrollExpansion?.update({expanded:this.expanded});
   this._sync(true);this.dispatchEvent(new CustomEvent('expanded-change',{detail:{expanded:this.expanded},bubbles:true,composed:true}));
  }else{this._colors();this._queueLayout();if(name==='variant')this._cancelScrollSettle();if(name==='touch-exploration-enabled'){this._cancelScrollSettle();this._sync(true);this._drawScroll();}}
 }
 render(){
  if(this._rendered)return;
  if(!this.shadowRoot.adoptedStyleSheets?.length){const style=document.createElement('style');style.textContent=defaultStyle;this.shadowRoot.append(style);}
  // CSSOM sizing keeps internal probes out of host/ancestor style observers.
  this._sizeStyle=document.createElement('style');this._sizeStyle.textContent=':host{--_toolbar-width:auto;--_toolbar-height:auto}';this.shadowRoot.append(this._sizeStyle);
  const frame=document.createElement('div');frame.className='frame';
  frame.innerHTML='<div class="surface" part="container" role="toolbar"><div class="clip leading"><div class="group"><slot name="leading"></slot></div></div><div class="main-content"><div class="scroll-viewport" part="scroll-viewport"><div class="group"><slot></slot></div><span class="scroll-extent" aria-hidden="true"></span></div></div><div class="clip trailing"><div class="group"><slot name="trailing"></slot></div></div></div><div class="fab-slot" part="fab"><slot name="fab"></slot></div>';
  this.shadowRoot.append(frame);this._frame=frame;this._surface=frame.querySelector('.surface');this._fab=frame.querySelector('.fab-slot');
  this._shapeShadow=new OutlineShadow(frame);
  this._clips={leading:frame.querySelector('.leading'),trailing:frame.querySelector('.trailing')};this._main=frame.querySelector('.main-content');
  this._viewport=this._main.firstElementChild;this._groups={main:this._viewport.firstElementChild,leading:this._clips.leading.firstElementChild,trailing:this._clips.trailing.firstElementChild};
  this._scrollExtent=this._viewport.querySelector('.scroll-extent');
  this._slots=Object.fromEntries([...frame.querySelectorAll('slot')].map(s=>[s.name||'main',s]));this._rendered=true;
 }
 _createMotion(){
  const expanded=this.effectiveExpanded,vertical=this.orientation==='vertical',axis=vertical?'height':'width',cross=vertical?'width':'height';
  this._alignment={leading:null,trailing:null};
  this._visibilityState={leading:expanded?'Visible':'PreEnter',trailing:expanded?'Visible':'PreEnter'};
  this._motion=null;
  if(this._hasRow)this._drawRow({padding:expanded&&(this._present('leading')||this._present('trailing'))?0:1,leading:expanded?this._metrics.leading[axis]:0,trailing:expanded?this._metrics.trailing[axis]:0,leadingCross:this._metrics.leading[cross],trailingCross:this._metrics.trailing[cross],leadingOffset:0,trailingOffset:0},vertical,getComputedStyle(this).direction==='rtl');
  const full=name=>this._hasRow?(this._rowFullSizes?.[name]??this._metrics[name]):this._metrics[name];
  this._motion=new SelectionMotion(this,{progress:expanded?1:0,padding:expanded&&(this._present('leading')||this._present('trailing'))?0:1,
   leading:expanded?full('leading')[axis]:0,trailing:expanded?full('trailing')[axis]:0,leadingCross:full('leading')[cross],trailingCross:full('trailing')[cross],leadingOffset:0,trailingOffset:0,
   elevation:expanded?this.expandedShadowElevation:this.collapsedShadowElevation},values=>this._draw(values));
 }
 _present(name){return this._slots[name].assignedNodes().some(n=>n.nodeType===1||n.textContent?.trim());}
 _queueLayout(){if(this._queued||!this.isConnected)return;this._queued=true;queueMicrotask(()=>{this._queued=false;if(this.isConnected){this._measure();this._sync(false);}});}
 _drewSize(entry){
  const node=entry.target===this?this._frame:entry.target,width=parseFloat(node.style.width),height=parseFloat(node.style.height);
  return Number.isFinite(width)&&Number.isFinite(height)&&Math.abs(entry.contentRect.width-width)<.5&&Math.abs(entry.contentRect.height-height)<.5;
 }
 _measure(){
  this._rowProbe=null;this._measuredRendered=!this.checkVisibility||this.checkVisibility({contentVisibilityAuto:true});
  this._frame.dataset.variant=this.variant;this._frame.dataset.orientation=this.orientation;
  this._hasFab=this.variant==='floating'&&this._present('fab');this._frame.dataset.fab=String(this._hasFab);this._fab.hidden=!this._hasFab;
  const hadRow=this._hasRow;
  const hadFabContent=this._hasFabContent;
  this._hasRow=this.variant==='floating'&&!this._hasFab&&['leading','main','trailing'].every(name=>this._slots[name].assignedNodes().every(n=>n.nodeType===1||!n.textContent?.trim()));
  this._hasFabContent=this._hasFab&&this._slots.main.assignedNodes().every(n=>n.nodeType===1||!n.textContent?.trim());
  this.toggleAttribute('data-toolbar-content',this._hasFabContent);
  if(hadFabContent&&!this._hasFabContent){write(this._viewport,'direction','');write(this._groups.main,'direction','');for(const key of ['width','height','left','top'])write(this._groups.main,key,'');}
  if(hadRow&&!this._hasRow)for(const node of [this._main,...Object.values(this._clips),...Object.values(this._groups)])for(const key of ['width','height','left','top'])write(node,key,'');
  this.toggleAttribute('data-toolbar-row',this._hasRow);this._frame.dataset.row=String(this._hasRow);
  this.toggleAttribute('data-toolbar-measuring',true);
  for(const[name,group]of Object.entries(this._groups)){
   const r=group.getBoundingClientRect();this._metrics[name]={width:Math.round(r.width),height:Math.round(r.height)};
  }
  if(this._hasRow||this._hasFabContent){
   const vertical=this.orientation==='vertical';this._rowChildren={};this._rowInputs={};
   for(const name of ['leading','main','trailing']){
    const children=this._slots[name].assignedElements().filter(n=>getComputedStyle(n).display!=='none');this._rowChildren[name]=children;
    this._rowInputs[name]=children.map(n=>{const r=n.getBoundingClientRect(),ink=n.localName==='md-icon-button'?n.shadowRoot?.querySelector('button')?.getBoundingClientRect():null,weight=Number(n.dataset.toolbarWeight),line=n.hasAttribute('data-toolbar-alignment-line')?Number(n.dataset.toolbarAlignmentLine):NaN;return{main:Math.round(vertical?r.height:r.width),cross:Math.round(vertical?r.width:r.height),ink:ink?{width:Math.round(ink.width),height:Math.round(ink.height)}:null,weight:Number.isFinite(weight)&&weight>0?Math.fround(Math.min(weight,3.4028234663852886e38)):0,fill:n.dataset.toolbarFill!=='false',align:n.dataset.toolbarAlign||(Number.isFinite(line)?'line':null),line:Number.isFinite(line)?Math.round(line):null};});
    this._metrics[name]=rowColumnLayout({vertical,children:this._rowInputs[name],crossAlignment:this._hasFabContent?'center':'start'}).size;
   }
   this._rowLines=null;
  }
  this.toggleAttribute('data-toolbar-measuring',false);this._measureFabConstraints();
  if(this._hasRow&&this._motion&&this._values)this._drawRow(this._values,this.orientation==='vertical',getComputedStyle(this).direction==='rtl');
 }
 _measureFabConstraints(){
  this.toggleAttribute('data-toolbar-fab',this._hasFab);
  const sizing=this._sizeStyle.sheet.cssRules[0].style;
  if(!this._hasFab){if(!this._hasRow){sizing.removeProperty('--_toolbar-width');sizing.removeProperty('--_toolbar-height');this._clearRowRules();}this._constraints=null;return;}
  this._clearRowRules();
  const vertical=this.orientation==='vertical',axis=vertical?'height':'width',cross=vertical?'width':'height';
  const p=resolveToolbarPadding(this.toolbarContentPadding,getComputedStyle(this).direction==='rtl');
  const intrinsic=this._hasFabContent?rowColumnIntrinsic({vertical,children:this._rowInputs.main},Math.max(0,64-(vertical?p.horizontal:p.vertical)))[vertical?'maxHeight':'maxWidth']:this._metrics.main[axis];
  const preferredAxis=intrinsic+(vertical?p.vertical:p.horizontal)+8+56;
  const variable=key=>'--_toolbar-'+key,set=(key,value)=>{const text=value+'px';if(sizing.getPropertyValue(variable(key))!==text)sizing.setProperty(variable(key),text);};
  // Keep the host's preferred size independent of the measured inner frame.
  // This lets flex/grid allocate space without feeding a shrunken basis back.
  const contentSize=key=>{const style=getComputedStyle(this);let value=parseFloat(style[key])||0;if(style.boxSizing==='border-box')value-=key==='width'?(parseFloat(style.paddingLeft)||0)+(parseFloat(style.paddingRight)||0)+(parseFloat(style.borderLeftWidth)||0)+(parseFloat(style.borderRightWidth)||0):(parseFloat(style.paddingTop)||0)+(parseFloat(style.paddingBottom)||0)+(parseFloat(style.borderTopWidth)||0)+(parseFloat(style.borderBottomWidth)||0);return Math.max(0,Math.round(value));};
  // A zero-size probe resolves authored minimums, including percentages/calc,
  // through the browser rather than treating a CSS percentage as pixels.
  set(axis,preferredAxis);set(cross,0);
  const preferredCross=contentSize(cross)||80;set(cross,preferredCross);
  const maxAxis=contentSize(axis),minCross=contentSize(cross);
  // Probe the cross size needed by the content through the same CSS allocation.
  // A fixed size or a resolved percentage/max-size caps this probe; an auto
  // parent does not turn the default 80px reservation into a content maximum.
  set(cross,Math.max(minCross,64,this._metrics.main[cross]+(vertical?p.horizontal:p.vertical)));
  const maxCross=Math.max(minCross,contentSize(cross));set(cross,preferredCross);
  this._constraints={maxAxis,minCross,maxCross};
 }
 _sync(animate){
  if(!this._rendered)return;
  this._surface.setAttribute('aria-label',this.getAttribute('aria-label')||'Toolbar');this._surface.setAttribute('aria-orientation',this.orientation);
  if(!this._motion)return;
  const now=performance.now(),axis=this.orientation==='vertical'?'height':'width',expanded=this.effectiveExpanded;
  const spec=SpringPhysics.getPreset('expressiveSpatialFast',this);
  const to=(key,value,chosen=spec,threshold=chosen.visibilityThreshold??.01,roundInitial=false)=>this._motion.channels[key].to(value,{...chosen,visibilityThreshold:threshold},{now,roundInitial});
  to('progress',expanded?1:0,this._hasFab&&this._animationSpec?this._animationSpec:spec);
  to('padding',expanded&&(this._present('leading')||this._present('trailing'))?0:1,SpringPhysics.getPreset('expressiveEffectMedium',this));
  to('elevation',expanded?this.expandedShadowElevation:this.collapsedShadowElevation,spec);
  for(const name of ['leading','trailing']){
   const channel=this._motion.channels[name],crossChannel=this._motion.channels[name+'Cross'],fullSize=this._hasRow?(this._rowFullSizes?.[name]??this._metrics[name]):this._metrics[name],full=fullSize[axis],fullCross=fullSize[this.orientation==='vertical'?'width':'height'],target=expanded?full:0;
   const offsetChannel=this._motion.channels[name+'Offset'];
   if(!expanded&&this._visibilityState[name]!=='Visible'&&!channel.animation&&!crossChannel.animation&&!offsetChannel.animation){channel.value=channel.target=0;crossChannel.value=crossChannel.target=fullCross;continue;}
   if(channel.target!==target||crossChannel.target!==fullCross){
    const vertical=this.orientation==='vertical';
    const initial=vertical?(name==='leading'?'end':'start'):(expanded?(name==='leading'?'start':'end'):(name==='leading'?'end':'start'));
    if(expanded&&!channel.animation&&!crossChannel.animation&&!offsetChannel.animation&&this._visibilityState[name]==='PostExit'){
     this._visibilityState[name]='PreEnter';
     // AnimatedVisibility disposes a completed exit; a new entry has no offset history.
     offsetChannel.value=offsetChannel.target=0;
     channel.value=channel.target=0;crossChannel.value=crossChannel.target=fullCross;
    }
    if(!channel.animation&&!crossChannel.animation&&!offsetChannel.animation)this._alignment[name]=initial;
    if(this._visibilityState[name]==='Visible'&&expanded)this._alignment[name]=null;
    const exit=vertical?(name==='leading'?'end':'start'):(name==='leading'?'end':'start');
    const delta=expanded?0:(exit==='end'?-full:0)-(this._alignment[name]==='end'?-full:0);
    to(name+'Offset',delta,{stiffness:400,dampingRatio:1},1,true);
    const from=this._visibilityState[name];
    const ordinary=(from==='PreEnter'&&expanded)||(from==='Visible'&&!expanded);
    retargetIntSize([channel,crossChannel],[target,fullCross],{...(ordinary?spec:{stiffness:400,dampingRatio:1}),visibilityThreshold:ordinary?.01:1},now);
   }
  }
  if(!animate){for(const name of ['leading','trailing'])if(!this._present(name)){this._motion.channels[name].finish();this._motion.channels[name+'Cross'].finish();this._alignment[name]=null;}}
  if(this._motion.media?.matches)this._motion.finish();else this._motion.tick(now);
 }
 _colors(){
  if(!this._rendered)return;const colors=toolbarColors(this.color),docked=this.variant==='docked',vibrant=this.color==='vibrant';
  const safe=(value,fallback)=>CSS.supports('color',value)?value:token(fallback);
  this._frame.style.setProperty('--bar-container',safe(this.containerColor,colors.toolbarContainer));
  this._frame.style.setProperty('--bar-content',safe(this.contentColor,colors.toolbarContent));
  const normal=docked?(vibrant?'on-primary-container':'on-surface-variant'):colors.toolbarContent;
  this._surface.style.setProperty('--md-toolbar-icon-content',safe(docked?'':this.contentColor,normal));
  this._surface.style.setProperty('--md-toolbar-icon-container',docked?token(colors.toolbarContainer):'transparent');
  this._surface.style.setProperty('--md-toolbar-icon-selected-content',docked?token(vibrant?'on-surface':'on-secondary-container'):token('primary'));
  this._surface.style.setProperty('--md-toolbar-icon-selected-container',docked?token(vibrant?'surface-container':'secondary-container'):'transparent');
  this._surface.style.setProperty('--md-toolbar-icon-interacting-content',docked?token(normal):'initial');
  this._surface.style.setProperty('--md-toolbar-icon-state-color',docked?token(normal):'initial');
  this._surface.style.setProperty('--md-toolbar-icon-transition','0s');
  for(const key of ['content','container','selected-content','selected-container','interacting-content','state-color'])this._surface.style.setProperty('--md-toolbar-button-'+key,docked?this._surface.style.getPropertyValue('--md-toolbar-icon-'+key):'initial');
  this._surface.style.setProperty('--md-toolbar-button-disabled-content',docked?`color-mix(in srgb, ${token('on-surface')} 38%, transparent)`:'initial');
  this._surface.style.setProperty('--bar-arrangement',({'start':'flex-start','center':'center','end':'flex-end','space-between':'space-between','space-around':'space-around','space-evenly':'space-evenly'})[this.horizontalArrangement]||'flex-start');
  this._fab.style.setProperty('--md-toolbar-fab-container',safe(this.fabContainerColor,colors.fabContainer));
  this._fab.style.setProperty('--md-toolbar-fab-content',safe(this.fabContentColor,colors.fabContent));
  this._fab.style.setProperty('--md-toolbar-fab-shape','16px');this._fab.style.setProperty('--md-toolbar-fab-icon-size','24px');
  this._fab.style.setProperty('--md-toolbar-fab-rest-shadow','var(--md-sys-elevation-level-2)');this._fab.style.setProperty('--md-toolbar-fab-hover-shadow','var(--md-sys-elevation-level-3)');
  const probe=document.createElement('span');probe.style.display='none';this._frame.append(probe);
  this._shadows=[[],...Array.from({length:5},(_,i)=>{probe.style.boxShadow=`var(--md-sys-elevation-level-${i+1})`;return parseShadows(getComputedStyle(probe).boxShadow);})];probe.remove();
 }
 _draw(values){
  if(!this.isConnected)return;this._values=values;
  const vertical=this.orientation==='vertical',axis=vertical?'height':'width',rtl=getComputedStyle(this).direction==='rtl';
  const frame=this._frame,surface=this._surface,main=this._metrics.main;let elevation;
  const padding=resolveToolbarPadding(this._hasFab?this.toolbarContentPadding:this.contentPadding,rtl),paddingCss=`${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`;
  if(this.style.getPropertyValue('--_toolbar-content-padding')!==paddingCss)this.style.setProperty('--_toolbar-content-padding',paddingCss);
  for(const name of ['leading','trailing']){
   const full=this._metrics[name][axis],size=Math.max(0,Math.round(values[name]));
   const clipped=this._clips[name],group=this._groups[name];
   write(clipped,axis,size+'px');write(clipped,vertical?'width':'height',Math.max(0,Math.round(values[name+'Cross']??this._metrics[name][vertical?'width':'height']))+'px');
   const settled=this._motion&&!this._motion.channels[name].animation&&!this._motion.channels[name+'Cross'].animation&&!this._motion.channels[name+'Offset'].animation;
   if(settled){this._alignment[name]=null;this._visibilityState[name]=this.effectiveExpanded?'Visible':'PostExit';}
   const offset=(this._alignment?.[name]==='end'?size-full:0)+Math.round(values[name+'Offset']);
   write(group,'transform',`translate${vertical?'Y':'X'}(${offset}px)`);
   this._setInert(clipped,size===0&&!this.effectiveExpanded&&!!settled,'main');
  }
  if(this._hasFab){
   const options={vertical,contentAxis:main[axis],contentCross:main[vertical?'width':'height'],contentPadding:this.toolbarContentPadding,...this._constraints,progress:values.progress,position:this.fabPosition,rtl,expandedElevation:this.expandedShadowElevation,collapsedElevation:this.collapsedShadowElevation};
   const layout=this._hasFabContent?toolbarFabContentLayout({...options,main:this._rowInputs.main}):toolbarFabConstraints(options);
   this._layout=layout;write(frame,'width',layout.size.width+'px');write(frame,'height',layout.size.height+'px');rect(surface,layout.placements.toolbar);rect(this._fab,layout.placements.fab);
   write(this._viewport,'width',layout.placements.viewport.width+'px');write(this._viewport,'height',layout.placements.viewport.height+'px');
   write(this._viewport,'left',padding.left+'px');write(this._viewport,'top',padding.top+'px');
   this._fab.style.setProperty('--md-toolbar-fab-size',layout.placements.fab.width+'px');
   elevation=layout.elevation;this._setInert(this._main,layout.placements.toolbar[axis]===0,'fab');write(this._main,'padding',paddingCss);
   if(this._hasFabContent)this._drawFabContent(layout,vertical,rtl);
  }else if(this._hasRow){
   this._drawRow(values,vertical,rtl);elevation=values.elevation;
  }else{
   for(const node of [frame,surface])for(const key of ['width','height','left','top'])write(node,key,'');
   write(this._viewport,'width','');write(this._viewport,'height','');
   write(this._viewport,'left','');write(this._viewport,'top','');
   this._main.inert=false;
   if(this.variant==='docked')write(this._main,'padding','0');
   else{
    const child=this._slots.main.assignedElements()[0],button=child?.localName==='md-icon-button'?child.shadowRoot?.querySelector('button'):null;
    const visual=button?.getBoundingClientRect(),layout=child?.getBoundingClientRect();
    const top=visual&&layout?Math.trunc((layout.height-visual.height)/2):null,left=visual&&layout?Math.trunc((layout.width-visual.width)/2):null;
    const balance=toolbarBalancedPadding({...main,top,left,progress:values.padding,leading:this.effectiveExpanded&&this._present('leading'),trailing:this.effectiveExpanded&&this._present('trailing')});
    const p=balance.placements.content;write(this._main,'padding',`${p.y}px ${p.x}px ${balance.size.height-main.height-p.y}px ${balance.size.width-main.width-p.x}px`);
   }
   elevation=this.variant==='docked'?0:values.elevation;
  }
  this._drawShape(rtl);this._shadow(elevation);
  this._drawScroll();
 }
 _drawFabContent(layout,vertical,rtl){
  const group=this._groups.main,node=layout.node,row=layout.placements.content;
  // Native horizontal RTL scrolling has the source zero-parent-width exception.
  write(this._viewport,'direction',vertical||layout.placements.viewport.width===0?'ltr':'');
  write(group,'direction',rtl?'rtl':'ltr');rect(group,{...node.requested,x:node.offset.x,y:node.offset.y});
  // An empty cross dimension must still retain the source main-axis scroll extent.
  const extent=layout.scroll.content,viewport=layout.placements.viewport;
  rect(this._scrollExtent,{x:!vertical&&rtl&&viewport.width!==0?viewport.width-extent:0,y:0,width:vertical?1:extent,height:vertical?extent:1});
  const rules=[];
  for(let i=0;i<this._rowChildren.main.length;i++){
   const element=this._rowChildren.main[i],leaf=node.children[i].node,p=layout.placements['content-'+i],index=[...this.children].indexOf(element)+1;
   const ink=this._rowInputs.main[i].ink,body=ink?minimumInteractiveLayout({...ink,...leaf.constraints}).body:null;
   const native=body?`--md-toolbar-control-position:absolute;--md-toolbar-control-x:${body.x}px;--md-toolbar-control-y:${body.y}px;--md-toolbar-control-layout-width:${leaf.size.width}px;--md-toolbar-control-layout-height:${leaf.size.height}px;`:'';
   rules.push(`:host([data-toolbar-content]:not([data-toolbar-measuring])) ::slotted(:nth-child(${index})){position:absolute!important;left:${p.x-row.x-leaf.offset.x}px!important;top:${p.y-row.y-leaf.offset.y}px!important;width:${leaf.size.width}px!important;height:${leaf.size.height}px!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;--md-toolbar-control-min-width:${leaf.constraints.minWidth}px;--md-toolbar-control-min-height:${leaf.constraints.minHeight}px;--md-toolbar-control-max-width:${leaf.constraints.maxWidth}px;--md-toolbar-control-max-height:${leaf.constraints.maxHeight}px;${native}}`);
  }
  this._setRowRules(rules);
 }
 _rowOptions(values,vertical,rtl){
  const animating=name=>!!this._motion&&(!!this._motion.channels[name].animation||!!this._motion.channels[name+'Cross'].animation||!!this._motion.channels[name+'Offset'].animation);
  const settled=name=>!animating(name)||(this._visibilityState?.[name]==='Visible'&&this.effectiveExpanded);
  return{vertical,rtl,...this._rowInputs,...this._rowLines,contentPadding:this.contentPadding,padding:values.padding,hasVisibleLeading:this.effectiveExpanded&&this._present('leading'),hasVisibleTrailing:this.effectiveExpanded&&this._present('trailing'),leadingSample:values.leading,trailingSample:values.trailing,
   leadingCurrent:this._alignment?.leading??'none',trailingCurrent:this._alignment?.trailing??'none',leadingDelta:values.leadingOffset,trailingDelta:values.trailingOffset,leadingSettled:settled('leading'),trailingSettled:settled('trailing'),leadingCross:values.leadingCross??this._metrics.leading[vertical?'width':'height'],trailingCross:values.trailingCross??this._metrics.trailing[vertical?'width':'height'],leadingComposed:toolbarGroupComposed(this.effectiveExpanded,this._visibilityState?.leading,animating('leading')),trailingComposed:toolbarGroupComposed(this.effectiveExpanded,this._visibilityState?.trailing,animating('trailing'))};
 }
 _clearRowRules(){const sheet=this._sizeStyle.sheet;while(sheet.cssRules.length>1)sheet.deleteRule(1);this._rowRules=null;}
 _setRowRules(rules){
  // Rewriting identical rules would restyle every placed control each frame.
  const text=rules.join('');if(text===this._rowRules)return;
  this._clearRowRules();for(const rule of rules)this._sizeStyle.sheet.insertRule(rule,this._sizeStyle.sheet.cssRules.length);this._rowRules=text;
 }
 _drawRow(values,vertical,rtl){
  const options=this._rowOptions(values,vertical,rtl),preferred=toolbarRowLayout(options),sizing=this._sizeStyle.sheet.cssRules[0].style;
  const weighted=Object.values(this._rowInputs).some(group=>group.some(child=>child.weight>0));
  for(const key of ['width','height']){const property='--_toolbar-'+key,text=weighted&&key===(vertical?'height':'width')?'100%':preferred.size[key]+'px';if(sizing.getPropertyValue(property)!==text)sizing.setProperty(property,text);}
  const dimension=key=>{const css=getComputedStyle(this);let value=parseFloat(css[key])||0;if(css.boxSizing==='border-box')value-=key==='width'?(parseFloat(css.paddingLeft)||0)+(parseFloat(css.paddingRight)||0)+(parseFloat(css.borderLeftWidth)||0)+(parseFloat(css.borderRightWidth)||0):(parseFloat(css.paddingTop)||0)+(parseFloat(css.paddingBottom)||0)+(parseFloat(css.borderTopWidth)||0)+(parseFloat(css.borderBottomWidth)||0);return Math.max(0,Math.round(value));};
  const base={width:dimension('width'),height:dimension('height')};
  // The incoming minimum/maximum constraints are resolved by the browser from
  // zero and unbounded probes. They depend on the parent and authored CSS, not
  // on the expansion, so they are probed again only when those change.
  const own=getComputedStyle(this),parent=this.parentElement;
  const signature=['minWidth','maxWidth','minHeight','maxHeight','boxSizing','paddingLeft','paddingRight','paddingTop','paddingBottom','borderLeftWidth','borderRightWidth','borderTopWidth','borderBottomWidth'].map(key=>own[key]).concat(parent?[parent.clientWidth,parent.clientHeight,getComputedStyle(parent).display]:[]).join('|');
  if(this._rowProbe?.signature!==signature){
   const saved={width:this._frame.style.width,height:this._frame.style.height};
   const set=(key,value)=>{sizing.setProperty('--_toolbar-'+key,value+'px');write(this._frame,key,value+'px');};
   set('width',0);set('height',0);const minima={width:dimension('width'),height:dimension('height')},maxima={};
   for(const key of ['width','height']){set(key,1000000);const value=dimension(key);maxima[key]=value>=1000000?2147483647:Math.max(minima[key],value);set(key,0);}
   for(const key of ['width','height']){sizing.setProperty('--_toolbar-'+key,weighted&&key===(vertical?'height':'width')?'100%':preferred.size[key]+'px');write(this._frame,key,saved[key]);}
   this._rowProbe={minima,maxima,signature};
  }
  const minima=this._rowProbe.minima,maxima={...this._rowProbe.maxima};
  const axis=vertical?'height':'width',crossAxis=vertical?'width':'height';
  const parentDisplay=this.parentElement?getComputedStyle(this.parentElement).display:'';
  if(/flex|grid/.test(parentDisplay)&&!weighted&&base[axis]<preferred.size[axis])maxima[axis]=Math.min(maxima[axis],base[axis]);
  const layout=toolbarRowLayout({...options,minMain:minima[axis],maxMain:maxima[axis],minCross:minima[crossAxis],maxCross:maxima[crossAxis]});this._rowLayout=layout;
  const previous=this._rowFullSizes;this._rowFullTargets=layout.fullTargets;this._rowFullSizes=layout.fullSizes;
  if(previous&&['leading','trailing'].some(name=>previous[name]?.width!==layout.fullSizes[name]?.width||previous[name]?.height!==layout.fullSizes[name]?.height))this._queueLayout();
  write(this._frame,'width',layout.size.width+'px');write(this._frame,'height',layout.size.height+'px');rect(this._surface,{x:0,y:0,...layout.size});
  const rules=[];
  const findNode=(node,id)=>node.id===id?node:node.children.map(p=>findNode(p.node,id)).find(Boolean);
  for(const name of ['leading','main','trailing']){
   const container=name==='main'?this._main:this._clips[name],box=layout.placements[name==='main'?'balanced':name],rowBox=layout.placements[name+'-row'],group=this._groups[name];
   write(container,'padding','0');if(!box||!rowBox){rect(container,{x:0,y:0,width:0,height:0});rect(group,{x:0,y:0,width:0,height:0});continue;}
   rect(container,box);
   // Preserve the existing motion transform as the source offset channel;
   // the remaining measured row position lives in its physical left/top.
   const shift=(this._alignment?.[name]==='end'?Math.max(0,Math.round(values[name]))-this._metrics[name][vertical?'height':'width']:0)+Math.round(values[name+'Offset']||0);
   const local={...rowBox,x:rowBox.x-box.x-(name!=='main'&&!vertical?shift:0),y:rowBox.y-box.y-(name!=='main'&&vertical?shift:0)};rect(group,local);
   for(let i=0;i<this._rowChildren[name].length;i++){
    const element=this._rowChildren[name][i],id=name+i,leaf=findNode(layout.node,id),p=layout.placements[id];if(!leaf||!p)continue;
    const index=[...this.children].indexOf(element)+1;
    const ink=this._rowInputs[name][i].ink,body=ink?minimumInteractiveLayout({...ink,...leaf.constraints}).body:null;
    const native=body?`--md-toolbar-control-position:absolute;--md-toolbar-control-x:${body.x}px;--md-toolbar-control-y:${body.y}px;--md-toolbar-control-layout-width:${leaf.size.width}px;--md-toolbar-control-layout-height:${leaf.size.height}px;`:'';
    rules.push(`:host([data-toolbar-row]:not([data-toolbar-measuring])) ::slotted(:nth-child(${index})){position:absolute!important;left:${p.x-rowBox.x-leaf.offset.x}px!important;top:${p.y-rowBox.y-leaf.offset.y}px!important;width:${leaf.size.width}px!important;height:${leaf.size.height}px!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;--md-toolbar-control-min-width:${leaf.constraints.minWidth}px;--md-toolbar-control-min-height:${leaf.constraints.minHeight}px;--md-toolbar-control-max-width:${leaf.constraints.maxWidth}px;--md-toolbar-control-max-height:${leaf.constraints.maxHeight}px;${native}}`);
   }
  }
  this._setRowRules(rules);
  write(this._viewport,'width','');write(this._viewport,'height','');write(this._viewport,'left','');write(this._viewport,'top','');this._main.inert=false;
 }
 _configureScroll(){
  this._scrollAbort?.abort();this._scrollResize?.disconnect();if(!this.isConnected||!this._rendered)return;
  this._scrollAbort=new AbortController();const{signal}=this._scrollAbort;
  this._scrollExpansion?.update({expanded:this.expanded});
  const target=this._scrollTarget,position=()=>target===window?(document.scrollingElement?.scrollTop||0):(target?.scrollTop||0);let last=position();
  target?.addEventListener('scroll',()=>{const current=position(),delta=last-current;last=current;if(delta)this.postScroll({x:0,y:delta});},{signal,passive:true});
  target?.addEventListener('scrollend',()=>this.postFling(),{signal,passive:true});
  const parent=this.parentElement;this._scrollResize=new ResizeObserver(()=>{this._queueLayout();this._measureScrollLimit();this._drawScroll();});if(parent)this._scrollResize.observe(parent);
  this.addEventListener('pointerdown',event=>this._toolbarDragStart(event),{signal});
  this.addEventListener('pointermove',event=>this._toolbarDragMove(event),{signal});
  const stop=event=>this._toolbarDragStop(event);this.addEventListener('pointerup',stop,{signal});this.addEventListener('pointercancel',stop,{signal});
  this.addEventListener('lostpointercapture',stop,{signal});
  this.addEventListener('click',event=>{if(this._suppressDragClick&&event.detail!==0){this._suppressDragClick=false;event.preventDefault();event.stopImmediatePropagation();}},{signal,capture:true});
  this._motion?.media?.addEventListener('change',()=>{if(this._motion.media.matches){this._scrollSettle?.finish();this._scrollTick(performance.now());}},{signal});
  this._measureScrollLimit();this._drawScroll();
 }
 _measureScrollLimit(){
  if(!this._scrollBehavior||this.variant!=='floating'||this.touchExplorationEnabled||!this.parentElement)return;
  const parent=this.parentElement,p=parent.getBoundingClientRect(),r=this._frame.getBoundingClientRect();
  this._scrollBehavior.state.updateLimit({direction:this._scrollBehavior.exitDirection,rtl:getComputedStyle(this).direction==='rtl',
   x:r.x-p.x-parent.clientLeft+parent.scrollLeft,y:r.y-p.y-parent.clientTop+parent.scrollTop,width:Math.round(r.width),height:Math.round(r.height),parentWidth:parent.clientWidth,parentHeight:parent.clientHeight});
 }
 _restoreScrollFocus(){for(const[control,index]of this._focusIndices){if(index===null)control.removeAttribute('tabindex');else control.setAttribute('tabindex',index);}this._focusIndices.clear();}
 _scrollControls(){
  const controls=[],selector='button,input,select,textarea,a[href],[tabindex],[contenteditable]:not([contenteditable="false"])';
  const visit=root=>{for(const node of root.querySelectorAll('*')){if(node.matches(selector))controls.push(node);if(node.shadowRoot)visit(node.shadowRoot);}};visit(this);return controls;
 }
 _drawScroll(){
  if(!this._rendered)return;const behavior=this.variant==='floating'&&!this.touchExplorationEnabled?this._scrollBehavior:null;
  const p=behavior?.state.placement(behavior.exitDirection,getComputedStyle(this).direction==='rtl')||{x:0,y:0};write(this._frame,'transform',p.x||p.y?`translate(${p.x}px,${p.y}px)`:'');
  const horizontal=['start','end'].includes(behavior?.exitDirection);write(this._frame,'touchAction',behavior?(horizontal?'pan-y':'pan-x'):'');
  if(behavior&&behavior.state.offset!==0){for(const control of this._scrollControls()){if(!this._focusIndices.has(control))this._focusIndices.set(control,control.getAttribute('tabindex'));control.setAttribute('tabindex','-1');}}
  else this._restoreScrollFocus();
  if(behavior)this._measureScrollLimit();
 }
 _cancelScrollSettle(){if(this._scrollRaf!==null)cancelAnimationFrame(this._scrollRaf);this._scrollRaf=null;this._scrollSettle=null;this._scrollResolve?.({x:0,y:0});this._scrollResolve=null;const drag=this._drag;this._drag=null;if(drag&&this.hasPointerCapture(drag.id))this.releasePointerCapture(drag.id);}
 _runScrollSettle(velocity,fromContent=false){
  this._cancelScrollSettle();if(!this.isConnected||this.variant!=='floating'||this.touchExplorationEnabled||!this._scrollBehavior)return Promise.resolve({x:0,y:0});
  this._scrollSettle=fromContent?this._scrollBehavior.onPostFling({x:0,y:velocity}):this._scrollBehavior.settle(velocity);
  const promise=new Promise(resolve=>this._scrollResolve=resolve);
  if(this._motion?.media?.matches)this._scrollSettle.finish();
  if(this._scrollSettle.done)this._scrollTick(performance.now());else this._scrollRaf=requestAnimationFrame(time=>this._scrollTick(time));return promise;
 }
 _scrollTick(now){
  this._scrollRaf=null;const motion=this._scrollSettle;if(!motion)return;motion.sampleFrame(now);this._drawScroll();
  if(motion.done){this._scrollSettle=null;this._scrollResolve?.({x:0,y:motion.returnedVelocity});this._scrollResolve=null;}
  else this._scrollRaf=requestAnimationFrame(time=>this._scrollTick(time));
 }
 _toolbarDragStart(event){
  if(!this._scrollBehavior||this.variant!=='floating'||this.touchExplorationEnabled||event.button!==0||event.isPrimary===false)return;
  this._cancelScrollSettle();const horizontal=['start','end'].includes(this._scrollBehavior.exitDirection),position=horizontal?event.clientX:event.clientY;
  this._drag={id:event.pointerId,horizontal,last:position,active:false,slop:new HorizontalTouchSlop(pointerSlop(event.pointerType)),tracker:new PointerVelocityTracker()};this._drag.tracker.down(event.timeStamp,position);this._suppressDragClick=false;
 }
 _toolbarDragMove(event){
  const drag=this._drag;if(!drag||drag.id!==event.pointerId)return;
  if(event.defaultPrevented){if(drag.active)this._runScrollSettle(0);else this._cancelScrollSettle();return;}
  const position=drag.horizontal?event.clientX:event.clientY,delta=position-drag.last;drag.last=position;
  for(const sample of event.getCoalescedEvents?.()||[]){if(sample.timeStamp===event.timeStamp&&sample.clientX===event.clientX&&sample.clientY===event.clientY)continue;drag.tracker.move(sample.timeStamp,drag.horizontal?sample.clientX:sample.clientY);}
  drag.tracker.move(event.timeStamp,position);
  let amount=delta;if(!drag.active){amount=drag.slop.add(delta);if(amount===null)return;drag.active=true;try{this.setPointerCapture(event.pointerId);}catch{}}
  event.preventDefault();this._scrollBehavior.state.drag(amount,this._scrollBehavior.exitDirection,getComputedStyle(this).direction==='rtl');this._suppressDragClick=true;this._drawScroll();
 }
 _toolbarDragStop(event){
  if(event.type==='lostpointercapture'&&event.target!==this)return;
  const drag=this._drag;if(!drag||drag.id!==event.pointerId)return;this._drag=null;
  if(drag.active){if(this.hasPointerCapture(event.pointerId))this.releasePointerCapture(event.pointerId);this._runScrollSettle(event.type==='pointerup'?drag.tracker.up(event.timeStamp):0);}
 }
 _drawShape(rtl){
  const surface=this._surface,style=getComputedStyle(surface);
  const width=parseFloat(style.width)||0,height=parseFloat(style.height)||0;
  this._shapeBox={x:surface.offsetLeft,y:surface.offsetTop,width,height};
  const outline=cornerShapeOutline(this.shape,width,height,rtl);this._shapeOutline=outline;
  surface.dataset.shape=outline.type;
  if(outline.type==='rounded'){
   write(surface,'borderRadius',`${outline.radii.map(r=>r[0]+'px').join(' ')} / ${outline.radii.map(r=>r[1]+'px').join(' ')}`);
   write(surface,'clipPath','');this._shapeShadow.hide();
  }else{
   write(surface,'borderRadius','0px');
   write(surface,'clipPath',outline.type==='generic'?`polygon(${outline.points.map(p=>p.map(v=>v+'px').join(' ')).join(',')})`:'');
   if(outline.type!=='generic')this._shapeShadow.hide();
  }
 }
 _shadow(elevation){
  const level=Math.max(0,Math.min(5,elevation)),low=Math.floor(level),high=Math.ceil(level),t=level-low;
  const shadows=(this._shadows?.[high]||[]).map((b,i)=>{const a=this._shadows[low][i]||[0,0,0,0,b[4],b[5],b[6],0];return b.map((n,j)=>a[j]+(n-a[j])*t);});
  const cut=this._shapeOutline?.type==='generic';
  write(this._surface,'boxShadow',cut||!shadows.length?'none':shadows.map(v=>`${v.slice(0,4).map(n=>n+'px').join(' ')} rgba(${v.slice(4).join(',')})`).join(','));
  if(cut)this._shapeShadow.draw(this._shapeOutline,this._shapeBox,shadows);
  this._surface.dataset.elevation=String(elevation);
 }
 _setInert(node,inert,destination){
  if(inert&&!node.inert){const active=document.activeElement;if(active&&node.contains(active.assignedSlot))this._focusGroup(destination);}
  node.inert=inert;
 }
 _focusGroup(name){const n=this._slots[name]?.assignedElements().find(n=>!n.disabled);(n?.shadowRoot?.querySelector('button')||n)?.focus();}
 _key(event){
  if(this._scrollBehavior&&!this.touchExplorationEnabled&&this._scrollBehavior.state.offset!==0)return;
  const horizontal=this.orientation==='horizontal',prev=horizontal?'ArrowLeft':'ArrowUp',next=horizontal?'ArrowRight':'ArrowDown';
  if(![prev,next,'Home','End'].includes(event.key)||event.altKey||event.ctrlKey||event.metaKey)return;
  const controls=[...this.querySelectorAll('md-icon-button,md-button,md-fab,button,a[href]')].filter(n=>!n.disabled&&n.getClientRects().length&&!n.assignedSlot?.parentElement.closest('[inert]'));
  const index=controls.indexOf(event.composedPath().find(n=>controls.includes(n)));if(index<0)return;
  let direction=event.key===next?1:-1;if(horizontal&&getComputedStyle(this).direction==='rtl')direction*=-1;
  const target=event.key==='Home'?0:event.key==='End'?controls.length-1:(index+direction+controls.length)%controls.length;
  event.preventDefault();(controls[target]?.shadowRoot?.querySelector('button')||controls[target])?.focus();
 }
}
if(!customElements.get('md-toolbar'))customElements.define('md-toolbar',delegateHostAria(MdToolbar));
