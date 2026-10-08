/** Web adaptation of AndroidX public Expressive ListItem/SegmentedListItem.
 * Reference: a095da93f8e98dea8748ceed79ea8427aade245f. */
import { safeJsonParse } from '../utils/security.js';
import { bindPress, createRipple } from '../motion/interactions.js';
import { SelectionMotion } from '../motion/selection-motion.js';
import { ColorMotion } from '../motion/color-motion.js';
import { observeThemeContext } from '../theme/theme-context.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import { listItemColorRoles, listItemCorners } from './list-item-state.js';
import { measureInteractiveListItem } from './list-item-layout.js';

const listStyle=`
 :host { display:block; width:100%; outline:none; }
 .list { display:flex; flex-direction:column; width:100%; padding:0; margin:0; gap:0; }
 .list.segmented { gap:2px; }
`;
const listSheet=createComponentSheet(listStyle);
export class MdList extends HTMLElement {
 static get observedAttributes(){return['variant','selection-mode','aria-label'];}
 constructor(){super();this.attachShadow({mode:'open'});adoptSheet(this.shadowRoot,listSheet);}
 get variant(){return this.getAttribute('variant')==='segmented'?'segmented':'standard';}
 set variant(value){this.setAttribute('variant',value);}
 get selectionMode(){const mode=this.getAttribute('selection-mode');return mode==='single'||mode==='multiple'?mode:'none';}
 set selectionMode(value){this.setAttribute('selection-mode',value);}
 get _items(){return [...this.querySelectorAll('md-list-item')].filter(item=>item.closest('md-list')===this);}
 connectedCallback(){
   if(!this._list){this.shadowRoot.innerHTML=`${this.shadowRoot.adoptedStyleSheets?.length?'':`<style>${listStyle}</style>`}<div class="list" part="list"><slot></slot></div>`;this._list=this.shadowRoot.querySelector('.list');}
   this._observer=new MutationObserver(()=>this._sync());this._observer.observe(this,{childList:true,subtree:true});this._sync();
 }
 disconnectedCallback(){this._observer?.disconnect();this._observer=null;}
 attributeChangedCallback(){if(this._list)this._sync();}
 _sync(){
   this._list.className=`list ${this.variant}`;this._list.setAttribute('role',this.selectionMode==='single'?'radiogroup':this.selectionMode==='multiple'?'group':'list');
   this._list.setAttribute('aria-label',this.getAttribute('aria-label')||'List');
   const items=this._items;
   const selected=items.find(item=>item.selectionMode==='single'&&item.selected);
   for(const item of items){if(selected&&item!==selected&&item.selectionMode==='single')item.selected=false;item._syncHierarchy?.();}this._syncTabStops();
 }
 _syncTabStops(){
   const items=this._items.filter(item=>item.selectionMode==='single'&&item.enabled);
   const active=items.find(item=>item.selected)||items[0];
   for(const item of items)if(item._item)item._item.tabIndex=item===active?0:-1;
 }
 _select(item){for(const other of this._items)if(other!==item&&other.selectionMode==='single')other.selected=false;this._syncTabStops();}
 _key(event,item){
   if(item.selectionMode!=='single'||!item.enabled)return;
   const items=this._items.filter(other=>other.enabled&&other.selectionMode==='single');let index=items.indexOf(item);
   if(event.key==='ArrowDown'||event.key==='ArrowRight')index=(index+1)%items.length;
   else if(event.key==='ArrowUp'||event.key==='ArrowLeft')index=(index-1+items.length)%items.length;
   else if(event.key==='Home')index=0;else if(event.key==='End')index=items.length-1;else return;
   event.preventDefault();items[index]._item.focus();items[index]._activate();
 }
}

const itemStyle=`
 :host { display:block; width:100%; outline:none; }
 [hidden] { display:none!important; }
 .item { position:relative; box-sizing:border-box; width:100%; min-height:0; padding:10px 16px;
   padding-inline:16px; border:0; background:var(--md-sys-color-surface,#FEF7FF); color:var(--md-sys-color-on-surface,#1D1B20);
   outline:none; border-radius:var(--md-sys-shape-corner-extra-small,4px); overflow:hidden;
   -webkit-tap-highlight-color:transparent; }
 .item.interactive { cursor:pointer; user-select:none; -webkit-user-select:none; touch-action:pan-y; }
 .item.disabled { cursor:default; }
 .item:focus-visible { outline:3px solid var(--md-sys-color-secondary,#625B71); outline-offset:2px; z-index:1; }
 .leading-slot,.trailing,.content { position:absolute; box-sizing:border-box; }
 .leading-slot,.trailing { display:flex; align-items:center; width:max-content; max-width:100%; }
 .leading-slot { padding-inline-end:12px; }
 .trailing { padding-inline-start:12px; gap:0; }
 .leading-slot { font:var(--md-sys-typescale-title-medium,500 16px/24px Roboto,sans-serif);
   letter-spacing:var(--md-sys-typescale-title-medium-tracking,.15px); }
 .trailing { font:var(--md-sys-typescale-label-small,500 11px/16px Roboto,sans-serif);
   letter-spacing:var(--md-sys-typescale-label-small-tracking,.5px); }
 .content { min-width:0; }
 .headline { min-height:24px; font:var(--md-sys-typescale-body-large,400 16px/24px Roboto,sans-serif);
   letter-spacing:var(--md-sys-typescale-body-large-tracking,.5px); }
 .overline { min-height:16px; font:var(--md-sys-typescale-label-small,500 11px/16px Roboto,sans-serif);
   letter-spacing:var(--md-sys-typescale-label-small-tracking,.5px); }
 .supporting-text { min-height:20px; font:var(--md-sys-typescale-body-medium,400 14px/20px Roboto,sans-serif);
   letter-spacing:var(--md-sys-typescale-body-medium-tracking,.25px); }
 .headline,.overline,.supporting-text { white-space:pre-wrap; overflow-wrap:anywhere; }
 .ico { flex:none; display:block; direction:ltr; width:24px; height:24px;
   font:normal 24px/24px 'Material Symbols Rounded','Material Symbols Outlined',sans-serif; -webkit-font-smoothing:antialiased; }
 .avatar { flex:none; display:block; width:40px; height:40px; border-radius:var(--md-sys-shape-corner-full,9999px);
   background:var(--md-sys-color-primary-container); color:var(--md-sys-color-on-primary-container); object-fit:cover; }
 .image-thumb { flex:none; display:block; width:56px; height:56px; border-radius:var(--md-sys-shape-corner-small,8px); object-fit:cover; }
 .ripple { position:absolute; inset:0; border-radius:inherit; pointer-events:none; overflow:hidden; }
 .ripple::before { content:''; position:absolute; inset:0; background:currentColor; opacity:0; }
 .item.interactive:not(.disabled):hover .ripple::before { opacity:.08; }
 .item.interactive:not(.disabled):focus-visible .ripple::before,.item.interactive:not(.disabled).pressed .ripple::before { opacity:.1; }
 .md-ripple-effect { position:absolute; background:currentColor; border-radius:50%; animation:list-ripple 450ms linear; opacity:0; }
 @keyframes list-ripple { from { transform:scale(0);opacity:.1; } to { transform:scale(1);opacity:0; } }
 .color-probe { position:absolute; visibility:hidden; pointer-events:none; width:0; height:0; }
`;
const itemSheet=createComponentSheet(itemStyle);
const fields=['headline','supporting-text','overline','trailing-text','icon','trailing-icon','avatar','image'];
const hasContent=slot=>slot.assignedNodes({flatten:true}).some(node=>node.nodeType===1||node.textContent.trim());
const number=(value,fallback)=>Number.isFinite(parseFloat(value))?parseFloat(value):fallback;
function safeUrl(value,base,image=false){
 if(!value)return'';
 try{const url=new URL(value,base);if(['http:','https:'].includes(url.protocol)||!image&&['mailto:','tel:'].includes(url.protocol)||image&&(url.protocol==='blob:'||url.protocol==='data:'&&/^data:image\/(png|jpeg|gif|webp|avif|svg\+xml)[;,]/i.test(value)))return value;}catch{}
 return'';
}
export class MdListItem extends HTMLElement {
 static get observedAttributes(){return [...fields,'selected','checked','interactive','disabled','enabled','variant','href','shape','shapes','vertical-alignment','selection-mode','dragged','colors','aria-label','dir'];}
 constructor(){super();this.attachShadow({mode:'open'});adoptSheet(this.shadowRoot,itemSheet);this._states={pressed:false,hovered:false,focused:false};this._colorMotions={};}
 get selected(){return this.hasAttribute('selected')||this.hasAttribute('checked');}
 set selected(value){if(value)this.setAttribute('selected','');else{this.removeAttribute('selected');this.removeAttribute('checked');}}
 get checked(){return this.selected;} set checked(value){this.selected=value;}
 get enabled(){return !this.disabled&&this.getAttribute('enabled')!=='false';}
 set enabled(value){this.disabled=!value;this.setAttribute('enabled',String(!!value));}
 get disabled(){return this.hasAttribute('disabled');} set disabled(value){this.toggleAttribute('disabled',!!value);}
 get selectionMode(){const mode=this.getAttribute('selection-mode')??this.closest('md-list')?.selectionMode;return mode==='single'||mode==='multiple'?mode:'none';}
 set selectionMode(value){this._optional('selection-mode',value);}
 get interactive(){return this.hasAttribute('interactive')||this.hasAttribute('href')||this.selectionMode!=='none';}
 set interactive(value){this.toggleAttribute('interactive',!!value);}
 get variant(){const variant=this.getAttribute('variant')??this.closest('md-list')?.variant;return variant==='segmented'?'segmented':'standard';}
 set variant(value){this._optional('variant',value);}
 get verticalAlignment(){return this.getAttribute('vertical-alignment')||'auto';} set verticalAlignment(value){this._optional('vertical-alignment',value);}
 get href(){return this.getAttribute('href')||'';} set href(value){this._optional('href',value);}
 get shape(){return this.getAttribute('shape')||'';} set shape(value){this._optional('shape',value);}
 get colors(){const value=safeJsonParse(this.getAttribute('colors'),{});return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}
 set colors(value){this.setAttribute('colors',JSON.stringify(value||{}));}
 get shapes(){const value=safeJsonParse(this.getAttribute('shapes'),{});return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}
 set shapes(value){this.setAttribute('shapes',JSON.stringify(value||{}));}
 get dragged(){return this.hasAttribute('dragged');} set dragged(value){this.toggleAttribute('dragged',!!value);}
 _optional(name,value){if(value==null)this.removeAttribute(name);else this.setAttribute(name,String(value));}
 connectedCallback(){
   if(!this._item)this.render();this._setup();this._syncContent();this._syncHierarchy();
   this._resizeObserver=new ResizeObserver(()=>this._measure());
   for(const node of [this._item,this._leading,this._trailing,this._content])this._resizeObserver.observe(node);
   this._themeObserver=observeThemeContext(this,()=>{this._syncVisuals();this._measure();});
   this._fontListener=()=>this._measure();this.ownerDocument.fonts?.addEventListener('loadingdone',this._fontListener);
 }
 disconnectedCallback(){
   this._abortController?.abort();this._abortController=null;this._resizeObserver?.disconnect();this._resizeObserver=null;
   this._themeObserver?.();this._themeObserver=null;this.ownerDocument.fonts?.removeEventListener('loadingdone',this._fontListener);
   this._shapeMotion?.dispose();this._shapeMotion=null;this._shadowAnimation?.cancel();this._shadowAnimation=null;for(const motion of Object.values(this._colorMotions))motion.dispose();this._colorMotions={};
   this._states={pressed:false,hovered:false,focused:false};
 }
 attributeChangedCallback(name,oldValue,newValue){
   if(!this._item||oldValue===newValue)return;
   if(['disabled','enabled','interactive','selection-mode'].includes(name)&&this._states.pressed){this._suppressActivation=true;this._setup();}
   if(fields.includes(name))this._syncContent();
   if((name==='selected'||name==='checked')&&this.selected&&this.selectionMode==='single')this.closest('md-list')?._select(this);
   this._syncHierarchy();
 }
 render(){
   this.shadowRoot.innerHTML=`${this.shadowRoot.adoptedStyleSheets?.length?'':`<style>${itemStyle}</style>`}
    <div class="item" part="item"><div class="leading-slot"><img class="avatar" alt=""><img class="image-thumb" alt=""><span class="ico" aria-hidden="true"></span><slot name="start"></slot></div>
    <div class="content"><div class="overline"><span></span><slot name="overline"></slot></div><div class="headline"><span></span><slot></slot></div>
    <div class="supporting-text"><span></span><slot name="supporting"></slot></div></div>
    <div class="trailing"><span class="trailing-text"></span><span class="ico" aria-hidden="true"></span><slot name="end"></slot></div>
    <span class="ripple" aria-hidden="true"></span><span class="color-probe" aria-hidden="true"></span></div>`;
   this._item=this.shadowRoot.querySelector('.item');this._leading=this.shadowRoot.querySelector('.leading-slot');this._trailing=this.shadowRoot.querySelector('.trailing');
   this._content=this.shadowRoot.querySelector('.content');this._overline=this.shadowRoot.querySelector('.overline');this._supporting=this.shadowRoot.querySelector('.supporting-text');
   this._headline=this.shadowRoot.querySelector('.headline');this._probe=this.shadowRoot.querySelector('.color-probe');
 }
 _syncContent(){
   for(const[name,node]of[['headline',this._headline.firstElementChild],['overline',this._overline.firstElementChild],['supporting-text',this._supporting.firstElementChild],['trailing-text',this._trailing.firstElementChild]])node.textContent=this.getAttribute(name)||'';
   const avatar=this._leading.querySelector('.avatar'),image=this._leading.querySelector('.image-thumb'),icon=this._leading.querySelector('.ico');
   for(const[name,node]of[['avatar',avatar],['image',image]]){
     const url=safeUrl(this.getAttribute(name),this.ownerDocument.baseURI,true);node.hidden=!url;
     if(url){if(node.getAttribute('src')!==url)node.setAttribute('src',url);}else node.removeAttribute('src');
   }
   icon.textContent=this.getAttribute('icon')||'';icon.hidden=!this.getAttribute('icon')||!avatar.hidden||!image.hidden;
   this._trailing.querySelector('.ico').textContent=this.getAttribute('trailing-icon')||'';
   this._trailing.querySelector('.ico').hidden=!this.getAttribute('trailing-icon');
   this._trailing.firstElementChild.hidden=!this.hasAttribute('trailing-text');
   this._overline.hidden=!this.hasAttribute('overline')&&!hasContent(this._overline.querySelector('slot'));
   this._supporting.hidden=!this.hasAttribute('supporting-text')&&!hasContent(this._supporting.querySelector('slot'));
   this._leading.hidden=avatar.hidden&&image.hidden&&icon.hidden&&!hasContent(this._leading.querySelector('slot'));
   this._trailing.hidden=!this.hasAttribute('trailing-text')&&!this.getAttribute('trailing-icon')&&!hasContent(this._trailing.querySelector('slot'));
   this._measure();
 }
 _syncHierarchy(){
   if(!this._item)return;const interactive=this.interactive,enabled=this.enabled;
   this._item.className=`item ${this.variant}${interactive?' interactive':''}${!enabled?' disabled':''}${this._states.pressed?' pressed':''}`;
   this._item.tabIndex=interactive&&enabled?0:-1;this._item.setAttribute('aria-disabled',String(!enabled));
   this._item.setAttribute('role',this.selectionMode==='single'?'radio':this.selectionMode==='multiple'?'checkbox':interactive?this.href?'link':'button':'listitem');
   this._item.removeAttribute('aria-selected');
   if(this.selectionMode!=='none')this._item.setAttribute('aria-checked',String(this.selected));else this._item.removeAttribute('aria-checked');
   if(this.hasAttribute('aria-label'))this._item.setAttribute('aria-label',this.getAttribute('aria-label'));else this._item.removeAttribute('aria-label');
   if(!enabled){this._states.pressed=this._states.hovered=this._states.focused=false;this._item.classList.remove('pressed');}
   this.closest('md-list')?._syncTabStops();this._syncVisuals();this._measure();
 }
 _shapeTarget(){
   const style=getComputedStyle(this),radius=name=>number(style.getPropertyValue(`--md-sys-shape-corner-${name}`),{large:16,medium:12,'extra-small':4}[name]);
   const list=this.closest('md-list'),items=list?list._items.filter(item=>item.variant==='segmented'):[this];
   const shapes=this.shapes,custom=number(this.shape,NaN);
   if(shapes.shape===undefined&&Number.isFinite(custom))shapes.shape=Math.max(0,custom);
   return listItemCorners({...this._states,selected:this.selected,dragged:this.dragged,segmented:this.variant==='segmented',index:items.indexOf(this),count:items.length,
     small:radius('extra-small'),medium:radius('medium'),large:radius('large'),shapes});
 }
 _syncVisuals(){
   if(!this.isConnected||!this._item)return;
   const target=[...this._shapeTarget(),this.dragged?8:0],keys=['topStart','topEnd','bottomEnd','bottomStart','elevation'];
   const shadowStyle=getComputedStyle(this),shadowFrames=[0,1,3,6,8,12].map((dp,index)=>({offset:dp/12,boxShadow:shadowStyle.getPropertyValue(`--md-sys-elevation-level-${index}`).trim()||'none'}));
   if(!this._shadowAnimation){this._shadowAnimation=this._probe.animate(shadowFrames,{duration:12,fill:'both'});this._shadowAnimation.pause();}
   else this._shadowAnimation.effect.setKeyframes(shadowFrames);
   if(!this._shapeMotion)this._shapeMotion=new SelectionMotion(this,Object.fromEntries(keys.map((key,i)=>[key,target[i]])),values=>{
     if(!this.isConnected||!this._shadowAnimation)return;
     this._item.style.borderStartStartRadius=`${Math.max(0,values.topStart)}px`;this._item.style.borderStartEndRadius=`${Math.max(0,values.topEnd)}px`;
     this._shadowAnimation.currentTime=Math.max(0,Math.min(12,values.elevation));this._item.style.boxShadow=getComputedStyle(this._probe).boxShadow;this._elevation=values.elevation;
     this._item.style.borderEndEndRadius=`${Math.max(0,values.bottomEnd)}px`;this._item.style.borderEndStartRadius=`${Math.max(0,values.bottomStart)}px`;
   });
   else this._shapeMotion.set(Object.fromEntries(keys.map((key,i)=>[key,{value:target[i],role:'expressiveSpatialFast'}])));
   // Public ListItemColors priority: disabled, dragged, selected, default.
   const style=getComputedStyle(this),role=name=>style.getPropertyValue(`--md-sys-color-${name}`).trim()||({surface:'#FEF7FF','on-surface':'#1D1B20','on-surface-variant':'#49454F','secondary-container':'#E8DEF8','on-secondary-container':'#1D192B','tertiary-container':'#FFD8E4','on-tertiary-container':'#31111D'}[name]);
   const roles=listItemColorRoles({enabled:this.enabled,selected:this.selected,dragged:this.dragged});
   const options=this.colors,prefix=!this.enabled?'disabled':this.dragged?'dragged':this.selected?'selected':'';
   const names={container:'containerColor',content:'contentColor',leading:'leadingContentColor',trailing:'trailingContentColor',overline:'overlineContentColor',supporting:'supportingContentColor'};
   const resolved=Object.fromEntries(Object.entries(roles).map(([key,entry])=>{
     const name=names[key],option=options[prefix?prefix+name[0].toUpperCase()+name.slice(1):name];
     if(typeof option==='string'&&CSS.supports('color',option)){
       this._probe.style.color=option;return[key,getComputedStyle(this._probe).color];
     }
     return[key,entry.alpha===1?role(entry.role):`color-mix(in srgb,${role(entry.role)} ${entry.alpha*100}%,transparent)`];
   }));
   for(const[key,color,node,property]of[['container',resolved.container,this._item,'backgroundColor'],['content',resolved.content,this._item,'color'],['leading',resolved.leading,this._leading,'color'],['trailing',resolved.trailing,this._trailing,'color'],['overline',resolved.overline,this._overline,'color'],['supporting',resolved.supporting,this._supporting,'color']]){
     if(!this._colorMotions[key])this._colorMotions[key]=new ColorMotion(this,this._probe,color,value=>node.style[property]=value);
     else this._colorMotions[key].set(color);
   }
 }
 _measure(){
   if(!this.isConnected||!this._item)return;
   const style=getComputedStyle(this._item),start=number(style.paddingInlineStart,16),end=number(style.paddingInlineEnd,16),top=number(style.paddingTop,10),bottom=number(style.paddingBottom,10);
   const minimum=number(getComputedStyle(this).getPropertyValue('--md-minimum-interactive-component-size'),48);
   this._leading.style.setProperty('--md-minimum-interactive-component-size',`${Math.max(0,minimum-start-12)}px`);
   this._trailing.style.setProperty('--md-minimum-interactive-component-size',`${Math.max(0,minimum-end-12)}px`);
   const width=Math.max(0,Math.round(this._item.getBoundingClientRect().width)-start-end);
   const measure=(node,maxWidth)=>{
     if(node.hidden)return null;node.style.maxWidth=`${Math.max(0,maxWidth)}px`;
     const r=node.getBoundingClientRect();return {width:Math.ceil(r.width),height:Math.ceil(r.height)};
   };
   const leading=measure(this._leading,width),trailing=measure(this._trailing,Math.max(0,width-(leading?.width??0)));
   const contentWidth=Math.max(0,width-(leading?.width??0)-(trailing?.width??0));this._content.style.width=`${contentWidth}px`;
   const overline=measure(this._overline,contentWidth),supporting=measure(this._supporting,contentWidth),content=measure(this._headline,contentWidth);
   const geometry=measureInteractiveListItem({width,leading,trailing,overline,supporting,content,verticalPadding:top+bottom,
     supportingMultiline:!!supporting&&supporting.height>number(getComputedStyle(this._supporting).lineHeight,20)+.5,alignment:this.verticalAlignment});
   const place=(node,g)=>{if(!g)return;node.style.insetInlineStart=`${start+g.x}px`;node.style.top=`${top+g.y}px`;};
   place(this._leading,geometry.placements.leading);place(this._trailing,geometry.placements.trailing);
   const contentGeometry=geometry.placements.overline||geometry.placements.content||geometry.placements.supporting;place(this._content,contentGeometry);
   this._item.style.height=`${geometry.height+top+bottom}px`;this._geometry=geometry;
 }
 _nested(event){return event.composedPath().some(node=>node!==this._item&&node!==this&&node.matches?.('button,input,select,textarea,a[href],[contenteditable="true"],[role="button"],[role="checkbox"],[role="radio"],[role="switch"]'));}
 _activate(event){
   if(this._suppressActivation){this._suppressActivation=false;event?.preventDefault();event?.stopImmediatePropagation();return;}
   if(!this.isConnected||!this.interactive||!this.enabled)return;
   if(this.selectionMode!=='none'){
     const selected=this.selectionMode==='single'||!this.selected;this.selected=selected;
     this.dispatchEvent(new CustomEvent('change',{detail:{selected,checked:selected},bubbles:true,composed:true}));
   }
   const href=safeUrl(this.href,this.ownerDocument.baseURI);
   const actionEvent=new CustomEvent('action',{detail:{href},bubbles:true,composed:true,cancelable:true});
   if(this.dispatchEvent(actionEvent)&&href)this.ownerDocument.defaultView.location.assign(href);
 }
 _setup(){
   this._abortController?.abort();this._abortController=new AbortController();const {signal}=this._abortController;
   bindPress(this._item,{signal,pointerNode:()=>this.interactive,disabled:()=>!this.interactive||!this.enabled,ignoreEvent:event=>this._nested(event),
     onPress:event=>{this._suppressActivation=false;this._states.pressed=true;this._syncVisuals();createRipple(event,this._item.querySelector('.ripple'));},
     onRelease:()=>{this._states.pressed=false;if(this.isConnected)this._syncVisuals();},onActivate:event=>this._activate(event)});
   for(const[event,state,value]of[['pointerenter','hovered',true],['pointerleave','hovered',false],['focusin','focused',true],['focusout','focused',false]])
     this._item.addEventListener(event,e=>{if(!this.enabled||!this.interactive||state==='focused'&&this._nested(e))return;this._states[state]=value;this._syncVisuals();},{signal});
   this._item.addEventListener('keydown',event=>{if(!this._nested(event))this.closest('md-list')?._key(event,this);},{signal});
   for(const slot of this.shadowRoot.querySelectorAll('slot'))slot.addEventListener('slotchange',()=>this._syncContent(),{signal});
 }
}
for(const name of fields){
 const property=name.replace(/-([a-z])/g,(_,char)=>char.toUpperCase());
 Object.defineProperty(MdListItem.prototype,property,{get(){return this.getAttribute(name)||'';},set(value){this._optional(name,value);},configurable:true});
}
if(!customElements.get('md-list'))customElements.define('md-list',MdList);
if(!customElements.get('md-list-item'))customElements.define('md-list-item',MdListItem);
