/* Public AndroidX DropdownMenuPopup/Group/Item web adaptation.
 * Reference a095da93f8e98dea8748ceed79ea8427aade245f. */
import {safeJsonParse} from '../utils/security.js';
import {createComponentSheet,adoptSheet} from '../utils/styles.js';
import {bindPress,createRipple} from '../motion/interactions.js';
import {SelectionMotion} from '../motion/selection-motion.js';
import {ColorMotion} from '../motion/color-motion.js';
import {themeParent,observeThemeContext} from '../theme/theme-context.js';
import {calculateMenuPosition,menuItemCorners,menuGroupCorners,menuItemColorRoles} from './menu-layout.js';
import {MENU_ICONS} from './menu-icons.js';

let menuId=0;
const openMenus=new Set();
function context(node,name){for(let p=themeParent(node);p;p=themeParent(p))if(p.localName===name)return p;return null;}
// Existing HTML upgrades children before the menu definition is registered.
// Context APIs are available only after their custom element has upgraded.
const owningMenu=node=>{const menu=context(node,'md-menu');return menu instanceof MdMenu?menu:null;};
const owningGroup=node=>{const group=context(node,'md-menu-group');return group instanceof MdMenuGroup?group:null;};
function nestedControl(event,button){const path=event.composedPath();return path.slice(0,path.indexOf(button)).some(node=>node instanceof Element&&node.matches('button,input,select,textarea,a[href],[role="button"],[role="checkbox"],[role="radio"],[role="switch"]'));}
function activeElement(document){let node=document.activeElement;while(node?.shadowRoot?.activeElement)node=node.shadowRoot.activeElement;return node;}
function activeMenu(event){const owner=owningMenu(activeElement(event.target.ownerDocument||document));return owner?.open?owner:[...openMenus].findLast(menu=>menu.open);}
const objectAttribute=(el,name)=>{const value=safeJsonParse(el.getAttribute(name),{});return value&&typeof value==='object'&&!Array.isArray(value)?value:{};};
const number=(value,fallback)=>Number.isFinite(parseFloat(value))?parseFloat(value):fallback;
function radius(el,name,fallback){return number(getComputedStyle(el).getPropertyValue('--md-sys-shape-corner-'+name),fallback);}
function shape(value,fallback){const valid=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;return valid(value)?[value,value,value,value]:Array.isArray(value)&&value.length===4&&value.every(valid)?value:fallback;}
function drawCorners(node,values){for(const[key,property]of[['a','borderStartStartRadius'],['b','borderStartEndRadius'],['c','borderEndEndRadius'],['d','borderEndStartRadius']])node.style[property]=Math.max(0,values[key])+'px';}
function setCornerTargets(owner,node,corners,extra={}){
 const values=Object.fromEntries(['a','b','c','d'].map((key,i)=>[key,corners[i]]));
 if(!owner._shapeMotion)owner._shapeMotion=new SelectionMotion(owner,{...values,...Object.fromEntries(Object.entries(extra).map(([key,entry])=>[key,entry.value]))},values=>{if(!owner.isConnected)return;drawCorners(node,values);owner._drawExtra?.(values);});
 else owner._shapeMotion.set({...Object.fromEntries(Object.entries(values).map(([key,value])=>[key,{value,role:'expressiveSpatialFast'}])),...extra});
}
function icon(node,name){
 if(node.dataset.icon===name)return;node.dataset.icon=name||'';node.replaceChildren();
 if(!name)return;
 if(Object.hasOwn(MENU_ICONS,name)){const template=document.createElement('template');template.innerHTML=MENU_ICONS[name];node.append(template.content.cloneNode(true));}
 else{const span=document.createElement('span');span.className='symbol';span.textContent=name;node.append(span);}
}

const popupStyle=`
 :host{display:inline-block;position:relative;outline:none;box-sizing:border-box}
 :host([slot="submenu"]){display:block;position:absolute;width:0;height:0}
 [hidden]{display:none!important}
 .trigger{display:inline-flex;align-items:center;outline:none}
 .default-trigger{border:0;border-radius:20px;min-height:40px;padding:0 24px;background:var(--md-sys-color-secondary-container);color:var(--md-sys-color-on-secondary-container);font:var(--md-sys-typescale-label-large);letter-spacing:var(--md-sys-typescale-label-large-tracking);cursor:pointer;outline:none}
 .default-trigger:focus-visible{outline:3px solid var(--md-sys-color-secondary);outline-offset:2px}
 .menu{position:fixed;inset:auto;margin:0;padding:0;border:0;background:transparent;color:var(--md-sys-color-on-surface);width:max-content;max-width:calc(100vw - 16px);max-height:calc(100dvh - 96px);overflow:visible;display:flex;flex-direction:column;outline:none;box-sizing:border-box;transform:scale(.8);opacity:0;transform-origin:0 0;z-index:1000}
 .menu.scrollable,.menu.dropdown{overflow:auto}
 .menu.dropdown{padding:8px 0;border-radius:var(--md-sys-shape-corner-extra-small,4px);background:var(--md-sys-color-surface-container);box-shadow:var(--md-sys-elevation-level-2);max-width:100vw}
 .menu::backdrop{background:transparent;pointer-events:none}
`;
const popupSheet=createComponentSheet(popupStyle);
export class MdMenu extends HTMLElement {
 static get observedAttributes(){return['open','expanded','enabled','disabled','checked','offset-x','offset-y','container-color','horizontal-arrangement','variant','label','items','anchor-position','selection-mode','close-on-select'];}
 constructor(){super();this.attachShadow({mode:'open'});adoptSheet(this.shadowRoot,popupSheet);this._records=[];this._targetOpen=undefined;this._visible=false;}
 get open(){return this.hasAttribute('open')||this.hasAttribute('expanded');}set open(value){if(value)this.setAttribute('open','');else{this.removeAttribute('open');this.removeAttribute('expanded');}}
 get expanded(){return this.open;}set expanded(value){this.open=value;}
 get enabled(){return!this.hasAttribute('disabled')&&this.getAttribute('enabled')!=='false';}set enabled(value){this.toggleAttribute('disabled',!value);this.setAttribute('enabled',String(!!value));}
 get disabled(){return!this.enabled;}set disabled(value){this.enabled=!value;}
 get checked(){return this.hasAttribute('checked');}set checked(value){this.toggleAttribute('checked',!!value);}
 get offsetX(){return number(this.getAttribute('offset-x'),0);}set offsetX(value){this.setAttribute('offset-x',value);}
 get offsetY(){return number(this.getAttribute('offset-y'),0);}set offsetY(value){this.setAttribute('offset-y',value);}
 get containerColor(){return this.getAttribute('container-color')||'';}set containerColor(value){this._optional('container-color',value);}
 get horizontalArrangement(){return this.getAttribute('horizontal-arrangement')||'menu';}set horizontalArrangement(value){this._optional('horizontal-arrangement',value);}
 get variant(){const value=this.getAttribute('variant');return value==='vibrant'||value==='dropdown'?value:'standard';}set variant(value){this._optional('variant',value);}
 get label(){return this.getAttribute('label')||'Menu';}set label(value){this._optional('label',value);}
 get anchorPosition(){return this.getAttribute('anchor-position')||(this.getAttribute('slot')==='submenu'?'end':'below');}set anchorPosition(value){this._optional('anchor-position',value);}
 get selectionMode(){const value=this.getAttribute('selection-mode');return value==='single'||value==='multiple'?value:'none';}set selectionMode(value){this._optional('selection-mode',value);}
 get items(){const value=safeJsonParse(this.getAttribute('items'),[]);return Array.isArray(value)?value.filter(item=>item&&typeof item==='object'&&!Array.isArray(item)):[];}set items(value){this.setAttribute('items',JSON.stringify(value));}
 get _items(){return[...(this._generated?.querySelectorAll('md-menu-item')||[]),...this.querySelectorAll('md-menu-item')].filter(item=>owningMenu(item)===this);}
 get _groups(){const groups=[...this.querySelectorAll('md-menu-group')].filter(group=>owningMenu(group)===this);return groups.length?groups:this._implicitGroup?[this._implicitGroup]:[];}
 _optional(name,value){if(value==null)this.removeAttribute(name);else this.setAttribute(name,String(value));}
 connectedCallback(){
  if(!this._menu)this.render();this.setupInteractions();this._sync();
  this._observer=new MutationObserver(()=>this._sync());this._observer.observe(this,{childList:true,subtree:true});
  this._resizeObserver=new ResizeObserver(()=>{if(this._visible)this._position();});this._resizeObserver.observe(this._menu);this._resizeObserver.observe(this._trigger);
  this._themeObserver=observeThemeContext(this,()=>this._sync());
 }
 disconnectedCallback(){
  this._abortController?.abort();this._popupAbort?.abort();this._observer?.disconnect();this._resizeObserver?.disconnect();this._themeObserver?.();this._themeObserver=null;
  this._motion?.dispose();this._motion=null;openMenus.delete(this);this._menu?.hidePopover?.();this._visible=false;this._targetOpen=undefined;if(this._menu)this._menu.hidden=true;
 }
 attributeChangedCallback(name,oldValue,newValue){if(this._menu&&oldValue!==newValue)this._sync();}
 render(){
  this.shadowRoot.innerHTML=`${this.shadowRoot.adoptedStyleSheets?.length?'':`<style>${popupStyle}</style>`}<div class="trigger" part="trigger"><slot name="trigger"><button type="button" class="default-trigger"></button></slot></div><div class="menu" part="menu" role="menu" tabindex="-1" popover="manual" hidden><md-menu-group><div class="generated"></div><slot></slot></md-menu-group></div>`;
  this._menu=this.shadowRoot.querySelector('.menu');this._menu.id='md-menu-'+ ++menuId;this._trigger=this.shadowRoot.querySelector('.trigger');this._implicitGroup=this.shadowRoot.querySelector('md-menu-group');this._generated=this.shadowRoot.querySelector('.generated');
 }
 _syncRecords(){
  const raw=this.getAttribute('items');if(raw===this._itemsRaw)return;this._itemsRaw=raw;
  const data=this.items;
  while(this._records.length>data.length)this._records.pop().remove();
  this._generated.hidden=data.length===0;
  data.forEach((entry,index)=>{
   let item=this._records[index];if(!item){item=document.createElement('md-menu-item');this._records.push(item);this._generated.append(item);}
   item._data=entry;
   for(const[name,value]of[['headline',entry.label??entry.headline??''],['leading-icon',entry.icon??entry.leadingIcon],['trailing-text',entry.trailing??entry.trailingText],['supporting-text',entry.supportingText],['selected-icon',entry.selectedIcon??entry.checkedIcon],['value',entry.value],['selection-mode',entry.selectionMode??(Object.hasOwn(entry,'checked')?'multiple':Object.hasOwn(entry,'selected')?'single':null)]])item._optional(name,value);
   for(const[name,value]of[['disabled',entry.disabled],['selected',entry.selected],['checked',entry.checked]])item.toggleAttribute(name,!!value);
  });
 }
 _sync(){
  if(!this.isConnected||!this._menu)return;this._syncRecords();
  const explicit=this._groups.some(group=>group!==this._implicitGroup);this._implicitGroup.toggleAttribute('bare',explicit||this.variant==='dropdown');
  this._implicitGroup.variant=this.variant;this._implicitGroup.containerColor=this.containerColor||null;
  this._menu.className='menu'+(this.variant==='dropdown'?' dropdown':'');this._menu.setAttribute('aria-label',this.label);
  this._menu.style.backgroundColor=this.variant==='dropdown'&&CSS.supports('color',this.containerColor)?this.containerColor:'';
  this._trigger.hidden=this.getAttribute('slot')==='submenu';this.shadowRoot.querySelector('.default-trigger').textContent=this.label;
  for(const group of this._groups)group._sync?.();for(const item of this._items)item._syncContext?.();this._syncTabStops();this._syncTrigger();
  if(this.open&&!this.enabled){this.open=false;return;}
  if(this._targetOpen!==this.open){this._targetOpen=this.open;if(this.open&&this.enabled)this._beginOpen();else this._beginClose();}
  if(this._visible)this._position();
 }
 _syncTrigger(){
  this._trigger.inert=!this.enabled;
  const slot=this._trigger.querySelector('slot'),nodes=slot.assignedElements({flatten:true});
  for(const node of nodes.length?nodes:[this.shadowRoot.querySelector('.default-trigger')]){
   const target=node.shadowRoot?.querySelector('button')||node;target.setAttribute('aria-haspopup','menu');target.setAttribute('aria-expanded',String(this.open));target.setAttribute('aria-controls',this._menu.id);target.setAttribute('aria-disabled',String(!this.enabled||!!target.disabled));
  }
  this.closest('md-menu-item')?._syncAria();
 }
 _makeMotion(){
  if(this._motion)return;
  this._motion=new SelectionMotion(this,{scale:.8,alpha:0},values=>{
   if(!this.isConnected)return;this._menu.style.transform=`scale(${values.scale})`;this._menu.style.opacity=Math.max(0,Math.min(1,values.alpha));this._scale=values.scale;this._alpha=values.alpha;
   if(this._visible&&!this.open&&this._motion&&!Object.values(this._motion.channels).some(channel=>channel.animation))this._finishClose();
  });
 }
 _beginOpen(){
  if(!this._visible){this._returnFocus=activeElement(this.ownerDocument);this._visible=true;this._menu.hidden=false;this._menu.showPopover?.();}
  openMenus.add(this);this._makeMotion();this._position();this._listenPopup();
  this._motion.set({scale:{value:1,role:'expressiveSpatialFast'},alpha:{value:1,role:'expressiveEffectFast'}});
  if(this._focusOnOpen!==false)queueMicrotask(()=>{if(this.open)this._focusFirst();});this._focusOnOpen=undefined;
 }
 _beginClose(){
  for(const child of [...openMenus])if(child!==this&&child.closest('md-menu')===child&&owningMenu(child)===this)child._requestClose(false);
  if(!this._visible)return;this._makeMotion();this._motion.set({scale:{value:.8,role:'expressiveSpatialFast'},alpha:{value:0,role:'expressiveEffectFast'}});
 }
 _finishClose(){
  if(!this._visible||this.open)return;this._visible=false;openMenus.delete(this);this._popupAbort?.abort();this._menu.hidePopover?.();this._menu.hidden=true;
  for(const group of this._groups)group._resetHover?.();
  if(this._restoreFocus!==false&&this._returnFocus?.isConnected)this._returnFocus.focus();this._restoreFocus=undefined;
  this.dispatchEvent(new CustomEvent('close',{bubbles:true,composed:true}));
 }
 _anchor(){return this.getAttribute('slot')==='submenu'?this.closest('md-menu-item')?._button:this._trigger.querySelector('slot').assignedElements({flatten:true})[0]||this._trigger;}
 _position(){
  if(!this._visible)return;const anchor=this._anchor();if(!anchor)return;
  this._menu.classList.toggle('scrollable',this._menu.scrollHeight>Math.max(0,innerHeight-96));
  const rect=anchor.getBoundingClientRect(),bounds={left:Math.round(rect.left),top:Math.round(rect.top),right:Math.round(rect.right),bottom:Math.round(rect.bottom)};
  const input={anchor:bounds,windowSize:{width:innerWidth,height:innerHeight},size:{width:this._menu.offsetWidth,height:this._menu.offsetHeight},position:this.anchorPosition,rtl:getComputedStyle(this).direction==='rtl',offsetX:this.offsetX,offsetY:this.offsetY,horizontalMargin:this.variant==='dropdown'?0:8};
  const result=calculateMenuPosition(input);this._positionInput=input;this._placement=result;this._menu.style.left=result.x+'px';this._menu.style.top=result.y+'px';this._menu.style.transformOrigin=`${result.origin.x*100}% ${result.origin.y*100}%`;
 }
 _listenPopup(){
  this._popupAbort?.abort();this._popupAbort=new AbortController();const {signal}=this._popupAbort;
  this.ownerDocument.addEventListener('pointerdown',event=>{if(!event.composedPath().includes(this))this._requestClose(false);},{capture:true,signal});
  this.ownerDocument.addEventListener('keydown',event=>{if(activeMenu(event)===this)this._key(event);},{signal});
  this.ownerDocument.defaultView.addEventListener('resize',()=>this._position(),{signal});this.ownerDocument.defaultView.addEventListener('scroll',()=>this._position(),{capture:true,signal});
 }
 _key(event){
  if(this._items.some(item=>event.composedPath().includes(item._button)&&nestedControl(event,item._button)))return;
  if(!this.open)return;const items=this._items.filter(item=>item.enabled);if(!items.length&&event.key!=='Escape')return;
  const active=items.find(item=>item._button===activeElement(this.ownerDocument));let index=items.indexOf(active);
  const rtl=getComputedStyle(this).direction==='rtl',openKey=rtl?'ArrowLeft':'ArrowRight',closeKey=rtl?'ArrowRight':'ArrowLeft';
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();this.close();return;}
  if(event.key==='Tab'){event.preventDefault();event.stopImmediatePropagation();this.close();return;}
  if(event.key===openKey&&active?.hasSubmenu){event.preventDefault();event.stopImmediatePropagation();active._openSubmenu(true);return;}
  if(event.key===closeKey&&this.getAttribute('slot')==='submenu'){event.preventDefault();event.stopImmediatePropagation();this.close();return;}
  if(event.key==='ArrowDown')index=(index+1)%items.length;else if(event.key==='ArrowUp')index=(index<=0?items.length:index)-1;
  else if(event.key==='Home')index=0;else if(event.key==='End')index=items.length-1;
  else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
   const char=event.key.toLocaleLowerCase(),ordered=[...items.slice(index+1),...items.slice(0,index+1)],next=ordered.find(item=>item.label.toLocaleLowerCase().startsWith(char));if(!next)return;index=items.indexOf(next);
  }else return;
  event.preventDefault();event.stopImmediatePropagation();items[index]?.focus();this._syncTabStops();
 }
 _focusFirst(){const item=this._items.find(item=>item.enabled&&item.selected)||this._items.find(item=>item.enabled);item?item.focus():this._menu.focus();this._syncTabStops();}
 _syncTabStops(){const items=this._items.filter(item=>item.enabled),focused=items.find(item=>item._button===activeElement(this.ownerDocument))||items.find(item=>item.selected)||items[0];for(const item of this._items)if(item._button)item._button.tabIndex=item===focused&&item.enabled?0:-1;}
 _select(item){for(const other of owningGroup(item)?._items||this._items)if(other!==item&&other.selectionMode==='single')other.selected=false;}
 _onSelection(event){
  const item=event.detail.item;if(owningMenu(item)!==this)return;
  queueMicrotask(()=>{if(event.defaultPrevented)return;const accepted=this.dispatchEvent(new CustomEvent('select',{detail:{index:this._items.indexOf(item),item:item._data||{label:item.label,value:item.value,icon:item.icon},selected:item.selected},bubbles:true,composed:true,cancelable:true}));
   const close=this.hasAttribute('close-on-select')?this.getAttribute('close-on-select')!=='false':item.selectionMode!=='multiple';
   if(accepted&&close){let menu=this;while(menu){menu.close();menu=owningMenu(menu);}}
  });
 }
 setupInteractions(){
  this._abortController?.abort();this._abortController=new AbortController();const {signal}=this._abortController;
  this._trigger.addEventListener('click',event=>{if(this.enabled){event.stopPropagation();this.toggle();}},{signal});
  this._trigger.addEventListener('keydown',event=>{if(this.enabled&&['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();this.show();}},{signal});
  this.addEventListener('menu-item-click',event=>this._onSelection(event),{signal});
  for(const slot of this.shadowRoot.querySelectorAll('slot'))slot.addEventListener('slotchange',()=>this._sync(),{signal});
 }
 show({focus=true}={}){if(!this.enabled||this.open)return;this._focusOnOpen=focus;this.open=true;}
 _requestClose(restore=true){if(!this.open)return;this._restoreFocus=restore;this.open=false;}
 close(){this._requestClose(true);}
 toggle(){this.open?this.close():this.show();}
}

const groupStyle=`
 :host{display:block;outline:none}[hidden]{display:none!important}
 .group{background:var(--md-sys-color-surface-container-low);color:var(--md-sys-color-on-surface);box-shadow:var(--md-sys-elevation-level-2);border:0;border-radius:var(--md-sys-shape-corner-large,16px);overflow:clip;width:auto;min-width:min(120px,calc(100vw - 16px));max-width:288px;box-sizing:border-box}
 .body{display:flex;flex-direction:column;padding:2px 0;gap:0}
 .label{font:var(--md-sys-typescale-label-large);letter-spacing:var(--md-sys-typescale-label-large-tracking);min-height:32px;padding-inline:12px 4px;display:flex;align-items:center;box-sizing:border-box}
 :host([bare]) .group{background:transparent!important;box-shadow:none;border-radius:0!important;overflow:visible;min-width:0;max-width:none}
 :host([bare]) .body{padding:0;gap:2px}
`;
const groupSheet=createComponentSheet(groupStyle);
export class MdMenuGroup extends HTMLElement{
 static get observedAttributes(){return['label','variant','container-color','selection-mode','shapes','bare','aria-label'];}
 constructor(){super();this.attachShadow({mode:'open'});adoptSheet(this.shadowRoot,groupSheet);this._hovered=false;this._hasBeenHovered=false;}
 get label(){return this.getAttribute('label')||'';}set label(value){this._optional('label',value);}
 get variant(){return this.getAttribute('variant')||owningMenu(this)?.variant||'standard';}set variant(value){this._optional('variant',value);}
 get containerColor(){return this.getAttribute('container-color')||'';}set containerColor(value){this._optional('container-color',value);}
 get selectionMode(){return this.getAttribute('selection-mode')||owningMenu(this)?.selectionMode||'none';}set selectionMode(value){this._optional('selection-mode',value);}
 get shapes(){return objectAttribute(this,'shapes');}set shapes(value){this.setAttribute('shapes',JSON.stringify(value||{}));}
 get _items(){const owner=owningMenu(this);return(owner?owner._items:[...this.querySelectorAll('md-menu-item')]).filter(item=>owningGroup(item)===this);}
 _optional(name,value){if(value==null)this.removeAttribute(name);else this.setAttribute(name,String(value));}
 connectedCallback(){
  if(!this._group){this.shadowRoot.innerHTML=`${this.shadowRoot.adoptedStyleSheets?.length?'':`<style>${groupStyle}</style>`}<div class="group" part="group" role="group"><div class="body"><div class="label" part="label" id="label"></div><slot></slot></div></div>`;this._group=this.shadowRoot.querySelector('.group');}
  this._abortController?.abort();this._abortController=new AbortController();const{signal}=this._abortController;
  this.addEventListener('pointerenter',()=>{if(!this.hasAttribute('bare')){this._hovered=true;this._hasBeenHovered=true;this._sync();}},{signal});
  this.addEventListener('pointerleave',()=>{this._hovered=false;this._sync();},{signal});
  this.shadowRoot.querySelector('slot').addEventListener('slotchange',()=>this._sync(),{signal});
  this._observer=new MutationObserver(()=>this._sync());this._observer.observe(this,{childList:true,subtree:true});this._themeObserver=observeThemeContext(this,()=>this._sync());this._sync();
 }
 disconnectedCallback(){this._abortController?.abort();this._observer?.disconnect();this._themeObserver?.();this._themeObserver=null;this._shapeMotion?.dispose();this._shapeMotion=null;}
 attributeChangedCallback(name,oldValue,newValue){if(this._group&&oldValue!==newValue)this._sync();}
 _sync(){
  if(!this.isConnected||!this._group)return;const label=this.shadowRoot.querySelector('.label');label.textContent=this.label;label.hidden=!this.label;
  if(this.label)this._group.setAttribute('aria-labelledby','label');else this._group.removeAttribute('aria-labelledby');
  if(this.hasAttribute('aria-label'))this._group.setAttribute('aria-label',this.getAttribute('aria-label'));else this._group.removeAttribute('aria-label');
  const color=this.containerColor||`var(--md-sys-color-${this.variant==='vibrant'?'tertiary-container':'surface-container-low'})`;
  this._group.style.backgroundColor=CSS.supports('color',color)?color:'';this._group.style.color=`var(--md-sys-color-${this.variant==='vibrant'?'on-tertiary-container':'on-surface'})`;
  const groups=owningMenu(this)?._groups||[this],state={index:groups.indexOf(this),count:groups.length,hasBeenHovered:this._hasBeenHovered,hovered:this._hovered,small:radius(this,'small',8),large:radius(this,'large',16)};
  const corners=shape(this.shapes[this._hasBeenHovered&&!this._hovered?'inactiveShape':'shape'],menuGroupCorners(state));setCornerTargets(this,this._group,corners);
  if(owningMenu(this)&&!owningMenu(this)._visible)this._shapeMotion?.finish();
  for(const item of this._items)item._syncContext?.();
 }
 _resetHover(){this._hovered=false;this._hasBeenHovered=false;this._sync();this._shapeMotion?.finish();}
 _select(item){for(const other of this._items)if(other!==item&&other.selectionMode==='single')other.selected=false;}
}

const itemStyle=`
 :host{display:block;position:relative;outline:none;box-sizing:border-box;max-width:288px}
 [hidden]{display:none!important}
 .row{display:flex;align-items:center;padding:0 4px;min-height:max(44px,var(--md-minimum-interactive-component-size,48px));box-sizing:border-box}
 .row.supporting{padding:2px 4px;min-height:calc(max(44px,var(--md-minimum-interactive-component-size,48px)) + 4px)}
 .item{position:relative;box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;min-width:min(112px,calc(100vw - 24px));max-width:280px;min-height:44px;padding:12px;border:0;background:transparent;color:var(--md-sys-color-on-surface);font:var(--md-sys-typescale-label-large,500 14px/20px Roboto,sans-serif);letter-spacing:var(--md-sys-typescale-label-large-tracking,.1px);text-align:start;cursor:pointer;outline:none;border-radius:4px;-webkit-tap-highlight-color:transparent;isolation:isolate}
 .item::after{content:'';position:absolute;inset-inline:0;top:50%;height:max(48px,100%);transform:translateY(-50%)}
 .item:focus-visible{outline:3px solid var(--md-sys-color-secondary);outline-offset:2px}
 .item:disabled{cursor:default}
 .leading,.trailing{display:flex;align-items:center;flex:none;min-width:20px}
 .leading.selected-only{min-width:0;overflow:hidden;justify-content:flex-end}
 .text{min-width:0;white-space:pre-wrap;overflow-wrap:anywhere}
 .text .label{display:block;min-height:20px}
 .supporting-text,slot[name="supporting"]{display:block;font:var(--md-sys-typescale-body-medium,400 14px/20px Roboto,sans-serif);letter-spacing:var(--md-sys-typescale-body-medium-tracking,.2px)}
 .ico{display:flex;align-items:center;justify-content:center;flex:none;width:20px;height:20px;direction:ltr}
 .ico svg{display:block;width:100%;height:100%;fill:currentColor}
 .symbol{font:normal 20px/20px 'Material Symbols Rounded','Material Symbols Outlined',sans-serif;direction:ltr}
 .trailing{margin-inline-start:auto}
 .trailing-text{font:inherit;letter-spacing:inherit}
 .arrow{width:20px;height:20px;transform:scaleX(var(--arrow-direction,1))}
 .ripple{position:absolute;inset:0;border-radius:inherit;pointer-events:none;overflow:hidden;z-index:-1}
 .ripple::before{content:'';position:absolute;inset:0;background:currentColor;opacity:0}
 .item:hover:not(:disabled) .ripple::before{opacity:.08}
 .item:focus-visible .ripple::before,.item.pressed:not(:disabled) .ripple::before{opacity:.1}
 .md-ripple-effect{position:absolute;background:currentColor;border-radius:50%;animation:menu-ripple 450ms linear;opacity:0}
 @keyframes menu-ripple{from{transform:scale(0);opacity:.1}to{transform:scale(1);opacity:0}}
 .probe{position:absolute;width:0;height:0;visibility:hidden;pointer-events:none}
 .row.dropdown{padding:0;min-height:48px}.row.dropdown .item{min-height:48px;padding:0 12px;gap:12px;border-radius:0}
 .row.dropdown .ico{width:24px;height:24px}.row.dropdown .symbol{font-size:24px;line-height:24px}
`;
const itemSheet=createComponentSheet(itemStyle);
export class MdMenuItem extends HTMLElement{
 static get observedAttributes(){return['headline','label','leading-icon','icon','trailing-text','trailing-icon','supporting-text','selected-icon','checked-icon','disabled','enabled','has-submenu','selected','checked','selection-mode','variant','colors','shapes','value','aria-label','horizontal-arrangement'];}
 constructor(){super();this.attachShadow({mode:'open'});adoptSheet(this.shadowRoot,itemSheet);}
 get headline(){return this.getAttribute('headline')||'';}set headline(value){this._optional('headline',value);}
 get label(){return this.getAttribute('label')??this.getAttribute('headline')??[...this.childNodes].filter(node=>node.nodeType===3||node.nodeType===1&&!node.hasAttribute('slot')).map(node=>node.textContent).join('').trim();}set label(value){this._optional('label',value);}
 get icon(){return this.getAttribute('leading-icon')||this.getAttribute('icon')||'';}set icon(value){this._optional('leading-icon',value);}
 get leadingIcon(){return this.icon;}set leadingIcon(value){this.icon=value;}
 get trailingIcon(){return this.getAttribute('trailing-icon')||'';}set trailingIcon(value){this._optional('trailing-icon',value);}
 get trailingText(){return this.getAttribute('trailing-text')||'';}set trailingText(value){this._optional('trailing-text',value);}
 get supportingText(){return this.getAttribute('supporting-text')||'';}set supportingText(value){this._optional('supporting-text',value);}
 get selectedIcon(){return this.getAttribute('selected-icon')||this.getAttribute('checked-icon')||'';}set selectedIcon(value){this._optional('selected-icon',value);}
 get checkedIcon(){return this.selectedIcon;}set checkedIcon(value){this.selectedIcon=value;}
 get selected(){return this.hasAttribute('selected')||this.hasAttribute('checked');}set selected(value){if(!this.hasAttribute('selection-mode'))this.selectionMode='single';if(value)this.setAttribute('selected','');else{this.removeAttribute('selected');this.removeAttribute('checked');}}
 get checked(){return this.selected;}set checked(value){if(!this.hasAttribute('selection-mode'))this.selectionMode='multiple';this.selected=value;}
 get disabled(){return this.hasAttribute('disabled');}set disabled(value){this.toggleAttribute('disabled',!!value);}
 get enabled(){return!this.disabled&&this.getAttribute('enabled')!=='false'&&(owningMenu(this)?.enabled??true);}set enabled(value){this.disabled=!value;this.setAttribute('enabled',String(!!value));}
 get selectionMode(){return this.getAttribute('selection-mode')||owningGroup(this)?.selectionMode||owningMenu(this)?.selectionMode||'none';}set selectionMode(value){this._optional('selection-mode',value);}
 get variant(){return this.getAttribute('variant')||owningGroup(this)?.variant||owningMenu(this)?.variant||'standard';}set variant(value){this._optional('variant',value);}
 get hasSubmenu(){return this.hasAttribute('has-submenu')||!!this.querySelector('md-menu[slot="submenu"]');}set hasSubmenu(value){this.toggleAttribute('has-submenu',!!value);}
 get value(){return this.getAttribute('value')||this.label;}set value(value){this._optional('value',value);}
 get colors(){return objectAttribute(this,'colors');}set colors(value){this.setAttribute('colors',JSON.stringify(value||{}));}
 get shapes(){return objectAttribute(this,'shapes');}set shapes(value){this.setAttribute('shapes',JSON.stringify(value||{}));}
 _optional(name,value){if(value==null)this.removeAttribute(name);else this.setAttribute(name,String(value));}
 connectedCallback(){
  if(!this._button)this.render();if(!this.hasAttribute('selection-mode')&&(this.hasAttribute('selected')||this.hasAttribute('checked')))this.selectionMode=this.hasAttribute('checked')?'multiple':'single';
  this.setupInteractions();this._themeObserver=observeThemeContext(this,()=>this._syncContext());this._resizeObserver=new ResizeObserver(()=>this._measure());this._resizeObserver.observe(this._button);this._syncContext();
 }
 disconnectedCallback(){this._abortController?.abort();this._themeObserver?.();this._themeObserver=null;this._resizeObserver?.disconnect();this._shapeMotion?.dispose();this._shapeMotion=null;this._containerMotion?.dispose();this._containerMotion=null;}
 attributeChangedCallback(name,oldValue,newValue){if(this._button&&oldValue!==newValue){if((name==='selected'||name==='checked')&&this.selected&&this.selectionMode==='single')(owningMenu(this)||owningGroup(this))?._select(this);this._syncContext();}}
 focus(options){this._button?.focus(options);}
 render(){
  this.shadowRoot.innerHTML=`${this.shadowRoot.adoptedStyleSheets?.length?'':`<style>${itemStyle}</style>`}<div class="row"><button class="item" type="button" part="item"><span class="leading"><span class="ico" aria-hidden="true"></span><slot name="start"></slot></span><span class="text"><span class="label"></span><slot></slot><span class="supporting-text"></span><slot name="supporting"></slot></span><span class="trailing"><span class="trailing-text"></span><span class="ico" aria-hidden="true"></span><slot name="end"></slot><span class="ico arrow" aria-hidden="true"></span></span><span class="ripple" aria-hidden="true"></span><span class="probe" aria-hidden="true"></span></button></div><slot name="submenu"></slot>`;
  this._button=this.shadowRoot.querySelector('.item');this._row=this.shadowRoot.querySelector('.row');this._leading=this.shadowRoot.querySelector('.leading');this._trailing=this.shadowRoot.querySelector('.trailing');this._probe=this.shadowRoot.querySelector('.probe');
 }
 _syncAria(){
  if(!this._button)return;const submenu=this.querySelector('md-menu[slot="submenu"]');
  if(!this.enabled&&this._button.classList.contains('pressed')){this._suppressActivation=true;this.setupInteractions();}
  this._button.disabled=!this.enabled;
  this._button.setAttribute('role',this.selectionMode==='single'?'menuitemradio':this.selectionMode==='multiple'?'menuitemcheckbox':'menuitem');
  if(this.selectionMode!=='none')this._button.setAttribute('aria-checked',String(this.selected));else this._button.removeAttribute('aria-checked');
  this._button.setAttribute('aria-disabled',String(!this.enabled));
  if(this.hasSubmenu){this._button.setAttribute('aria-haspopup','menu');this._button.setAttribute('aria-expanded',String(!!submenu?.open));}else{this._button.removeAttribute('aria-haspopup');this._button.removeAttribute('aria-expanded');}
  if(this.hasAttribute('aria-label'))this._button.setAttribute('aria-label',this.getAttribute('aria-label'));else this._button.removeAttribute('aria-label');owningMenu(this)?._syncTabStops();
 }
 _syncContext(){
  if(!this.isConnected||!this._button)return;this._syncAria();const dropdown=this.variant==='dropdown';
  const assigned=name=>this.shadowRoot.querySelector(`slot[name="${name}"]`).assignedNodes({flatten:true}).some(node=>node.nodeType===1||node.textContent.trim());
  const supporting=this.hasAttribute('supporting-text')||assigned('supporting');this._row.className='row'+(dropdown?' dropdown':'')+(supporting?' supporting':'');
  this.shadowRoot.querySelector('.label').textContent=this.getAttribute('label')||this.headline;
  this.shadowRoot.querySelector('.label').hidden=!this.hasAttribute('headline')&&!this.hasAttribute('label')&&this.shadowRoot.querySelector('slot:not([name])').assignedNodes({flatten:true}).some(node=>node.nodeType===1||node.textContent.trim());
  this.shadowRoot.querySelector('.text').style.maxWidth='';
  this.shadowRoot.querySelector('.supporting-text').textContent=this.supportingText;this.shadowRoot.querySelector('.supporting-text').hidden=!this.hasAttribute('supporting-text');
  this.shadowRoot.querySelector('slot:not([name])').hidden=this.hasAttribute('label')||this.hasAttribute('headline');
  const only=!this.icon&&!!this.selectedIcon&&!assigned('start');this._selectedOnly=only;
  icon(this._leading.querySelector('.ico'),this.selected&&this.selectedIcon?this.selectedIcon:this.icon||this.selectedIcon);this._leading.querySelector('.ico').hidden=!this.icon&&!this.selectedIcon;
  this._leading.hidden=!this.icon&&!this.selectedIcon&&!assigned('start');this._leading.className='leading'+(only?' selected-only':'');
  if(!only){this._leading.style.width='';this._leading.style.opacity='';}
  this._trailing.querySelector('.trailing-text').textContent=this.trailingText;this._trailing.querySelector('.trailing-text').hidden=!this.hasAttribute('trailing-text');
  icon(this._trailing.querySelector('.ico'),this.getAttribute('trailing-icon')||'');this._trailing.querySelector('.ico').hidden=!this.hasAttribute('trailing-icon');icon(this._trailing.querySelector('.arrow'),'arrow_right');this._trailing.querySelector('.arrow').hidden=!this.hasSubmenu;
  this._trailing.hidden=!this.hasAttribute('trailing-text')&&!this.hasAttribute('trailing-icon')&&!this.hasSubmenu&&!assigned('end');this._trailing.style.setProperty('--arrow-direction',getComputedStyle(this).direction==='rtl'?-1:1);
  const arrangement=this.getAttribute('horizontal-arrangement')||owningMenu(this)?.horizontalArrangement||'menu';this._button.style.justifyContent=['start','end','center','space-between','space-around','space-evenly'].includes(arrangement)?({start:'flex-start',end:'flex-end'}[arrangement]||arrangement):'';this._trailing.style.marginInlineStart=arrangement==='menu'?'auto':'0';
  const group=owningGroup(this),items=group?group._items:owningMenu(this)?._items||[this];const corners=menuItemCorners({selected:this.selected,index:items.indexOf(this),count:items.length,dropdown,small:radius(this,'extra-small',4),medium:radius(this,'medium',12)});
  const leadingWidth=only?(this.selected?Math.max(20,this._leading.querySelector('.ico').offsetWidth):0):0;
  this._drawExtra=values=>{if(!this._selectedOnly)return;this._leading.style.width=Math.max(0,Math.round(values.leadingWidth))+'px';this._leading.style.opacity=Math.max(0,Math.min(1,values.leadingAlpha));this._measure();};
  setCornerTargets(this,this._button,shape(this.shapes[this.selected?'selectedShape':'shape'],corners),{leadingWidth:{value:leadingWidth,role:'expressiveSpatialFast',roundInitial:true},leadingAlpha:{value:only&&this.selected?1:0,role:'expressiveEffectFast'}});
  this._syncColors();this._measure();
  if(owningMenu(this)&&!owningMenu(this)._visible){this._shapeMotion?.finish();this._containerMotion?.finish();}
 }
 _syncColors(){
  const roles=menuItemColorRoles({enabled:this.enabled,selected:this.selected,selectable:this.selectionMode!=='none',vibrant:this.variant==='vibrant'}),options=this.colors;
  const prefix=!this.enabled?'disabled':this.selected&&this.selectionMode!=='none'?'selected':'',names={content:'textColor',leading:'leadingIconColor',trailing:'trailingContentColor',container:'containerColor'},style=getComputedStyle(this);
  const resolved=Object.fromEntries(Object.entries(roles).map(([key,entry])=>{
   const base=names[key],name=prefix?prefix+base[0].toUpperCase()+base.slice(1):base,option=options[name]??(key==='trailing'?options[name.replace('Content','Icon')]:null);
   if(typeof option==='string'&&CSS.supports('color',option)){this._probe.style.color=option;return[key,getComputedStyle(this._probe).color];}
   const fallback={'on-surface':'#1d1b20','on-surface-variant':'#49454f','surface-container-low':'#f7f2fa','tertiary-container':'#ffd8e4','on-tertiary-container':'#31111d','tertiary':'#7d5260','on-tertiary':'#fff'};
   const color=entry.role==='transparent'?'transparent':style.getPropertyValue('--md-sys-color-'+entry.role).trim()||fallback[entry.role];return[key,entry.alpha===1||entry.alpha===0?color:`color-mix(in srgb,${color} ${entry.alpha*100}%,transparent)`];
  }));
  this._button.style.color=resolved.content;this._leading.style.color=resolved.leading;this._trailing.style.color=resolved.trailing;
  if(!this._containerMotion)this._containerMotion=new ColorMotion(this,this._probe,resolved.container,value=>this._button.style.backgroundColor=value,{role:'expressiveEffectFast'});
  else this._containerMotion.set(resolved.container);
 }
 _measure(){
  // Layout must use untransformed dimensions. The popup's animated graphics scale
  // otherwise feeds back into text wrapping, intrinsic width and anchor placement.
  if(!this.isConnected||!this._button||this._button.offsetWidth===0)return;const style=getComputedStyle(this._button),width=number(style.width,this._button.clientWidth)-number(style.paddingInlineStart,12)-number(style.paddingInlineEnd,12);
  const leading=this._leading.hidden?0:number(getComputedStyle(this._leading).width,0),trailing=this._trailing.hidden?0:number(getComputedStyle(this._trailing).width,0),gap=number(style.columnGap,8);
  // CSS serializes fractional widths with fewer digits than layout retains.
  // Round up to the layout unit so a fitting final glyph cannot wrap by that loss.
  this.shadowRoot.querySelector('.text').style.maxWidth=(Math.ceil(Math.max(0,width-leading-trailing-(this._leading.hidden?0:gap)-(this._trailing.hidden?0:gap))*64)/64)+'px';
 }
 _openSubmenu(focus){const submenu=this.querySelector('md-menu[slot="submenu"]');if(!submenu)return;
  const owner=owningMenu(this);for(const child of owner?._items||[])if(child!==this)child.querySelector('md-menu[slot="submenu"]')?._requestClose(false);
  submenu.show({focus});if(focus&&submenu.open)submenu._focusFirst();this._syncAria();
 }
 _activate(){
  if(this._suppressActivation){this._suppressActivation=false;return;}if(!this.enabled)return;if(this.hasSubmenu){const submenu=this.querySelector('md-menu[slot="submenu"]');if(submenu?.open)submenu.close();else this._openSubmenu(true);return;}
  if(this.selectionMode==='multiple')this.checked=!this.checked;else if(this.selectionMode==='single')this.selected=true;
  if(this.selectionMode!=='none')this.dispatchEvent(new CustomEvent('change',{detail:{selected:this.selected,checked:this.checked,value:this.value},bubbles:true,composed:true}));
  this.dispatchEvent(new CustomEvent('menu-item-click',{detail:{label:this.label,value:this.value,item:this,selected:this.selected},bubbles:true,composed:true,cancelable:true}));
 }
 setupInteractions(){
  this._abortController?.abort();this._abortController=new AbortController();const{signal}=this._abortController;
  bindPress(this._button,{signal,disabled:()=>!this.enabled,ignoreEvent:event=>nestedControl(event,this._button),onPress:event=>{this._suppressActivation=false;this._button.classList.add('pressed');createRipple(event,this._button.querySelector('.ripple'));},onRelease:()=>this._button.classList.remove('pressed'),onActivate:()=>this._activate()});
  this._button.addEventListener('focus',()=>owningMenu(this)?._syncTabStops(),{signal});
  this.addEventListener('pointerenter',()=>{if(this.enabled&&this.hasSubmenu)this._openSubmenu(false);},{signal});
  this.addEventListener('pointerleave',event=>{const submenu=this.querySelector('md-menu[slot="submenu"]');if(submenu&&!this.contains(event.relatedTarget)&&owningMenu(activeElement(this.ownerDocument))!==submenu)submenu._requestClose(false);},{signal});
  for(const slot of this.shadowRoot.querySelectorAll('slot'))slot.addEventListener('slotchange',()=>this._syncContext(),{signal});
 }
}
for(const[name,component]of[['md-menu-group',MdMenuGroup],['md-menu-item',MdMenuItem],['md-menu',MdMenu]])if(!customElements.get(name))customElements.define(name,component);
