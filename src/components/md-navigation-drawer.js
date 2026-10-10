/** Web adaptation of AndroidX NavigationDrawer/DrawerSheet/NavigationDrawerItem.
 * Reference: a095da93f8e98dea8748ceed79ea8427aade245f. */
import { delegateHostAria } from '../utils/host-aria.js';
import { SelectionMotion } from '../motion/selection-motion.js';
import { DrawerOffset, drawerTarget } from '../motion/drawer-motion.js';
import { PointerVelocityTracker } from '../motion/velocity-tracker.js';
import { HorizontalTouchSlop, pointerSlop } from '../motion/touch-slop.js';
import { bindPress, createRipple } from '../motion/interactions.js';
import { escapeHtml, safeJsonParse } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle=`
 :host { display:block; width:var(--md-navigation-drawer-width,var(--drawer-default-width,360px));
   max-width:100%; height:100%; outline:none; user-select:none; -webkit-user-select:none; }
 :host([data-variant="modal"]) { display:contents; }
 :host([data-variant="dismissible"]) { width:var(--drawer-revealed-width,0px); overflow:hidden; flex:none; }
 .layer { margin:0; padding:0; border:0; background:transparent; color:inherit; touch-action:pan-y; }
 div.layer { height:100%; }
 dialog.layer { position:fixed; inset:0; width:100vw; max-width:none; height:100dvh; max-height:none; overflow:hidden; }
 dialog.layer:not([open]) { display:block; visibility:hidden; pointer-events:none; }
 dialog.layer::backdrop { background:transparent; }
 .scrim { position:fixed; inset:0; border:0; padding:0; background:var(--drawer-scrim,
   color-mix(in srgb,var(--md-sys-color-scrim,#000) 32%,transparent)); }
 .drawer { position:relative; box-sizing:border-box; width:100%; height:100%; border:0;
   border-radius:0; box-shadow:none; background:var(--drawer-container,var(--md-sys-color-surface,#FEF7FF));
   color:var(--drawer-content,var(--md-sys-color-on-surface,#1D1B20)); overflow:hidden; }
 :host([data-variant="modal"]) .drawer { position:fixed; inset-block:0; inset-inline-start:0;
   width:var(--md-navigation-drawer-width,var(--drawer-default-width,360px)); max-width:100vw; height:100%;
   border-start-end-radius:var(--md-sys-shape-corner-large,16px);
   border-end-end-radius:var(--md-sys-shape-corner-large,16px);
   background:var(--drawer-container,var(--md-sys-color-surface-container-low,#F7F2FA)); }
 :host([data-variant="dismissible"]) .drawer { width:var(--drawer-measured-width,360px); max-width:none; }
 .drawer-content { box-sizing:border-box; height:100%; overflow:auto;
   padding-block:env(safe-area-inset-top,0px) env(safe-area-inset-bottom,0px);
   padding-inline-start:env(safe-area-inset-left,0px); }
 :host(:dir(rtl)) .drawer-content { padding-inline-start:env(safe-area-inset-right,0px); }
 .headline { margin:0; padding:16px 28px; font:var(--md-sys-typescale-title-small,500 14px/20px Roboto,sans-serif);
   letter-spacing:var(--md-sys-typescale-title-small-tracking,.1px); color:var(--md-sys-color-on-surface-variant,#49454F); }
 .headline:empty { display:none; }
 .items { padding-inline:12px; }
 .section { margin:0; padding:16px; font:var(--md-sys-typescale-title-small,500 14px/20px Roboto,sans-serif);
   letter-spacing:var(--md-sys-typescale-title-small-tracking,.1px); color:var(--md-sys-color-on-surface-variant,#49454F);
   white-space:pre-wrap; overflow-wrap:anywhere; }
 .divider { height:1px; margin:8px 16px; background:var(--md-sys-color-outline-variant,#CAC4D0); }
 .item { position:relative; display:flex; box-sizing:border-box; align-items:center; gap:12px;
   width:100%; min-height:56px; padding:0 24px 0 16px; padding-inline:16px 24px;
   border:0; border-radius:var(--md-sys-shape-corner-full,9999px); background:transparent;
   color:var(--md-sys-color-on-surface-variant,#49454F); text-align:start; cursor:pointer;
   font:var(--md-sys-typescale-body-large,400 16px/24px Roboto,sans-serif);
   letter-spacing:var(--md-sys-typescale-body-large-tracking,.5px); outline:none; -webkit-tap-highlight-color:transparent; }
 .item[aria-selected="true"] { background:var(--md-sys-color-secondary-container,#E8DEF8);
   color:var(--md-sys-color-on-secondary-container,#1D192B); }
 .item::before { content:''; position:absolute; inset:0; border-radius:inherit; background:currentColor; opacity:0; pointer-events:none; }
 .item:not(:disabled):hover::before { opacity:.08; }
 .item:not(:disabled).pressed::before, .item:not(:disabled):focus-visible::before { opacity:.1; }
 .item:focus-visible { outline:3px solid var(--md-sys-color-secondary,#625B71); outline-offset:2px; }
 .item:disabled { cursor:default; }
 .item:disabled .icon, .item:disabled .label, .item:disabled .badge {
   color:color-mix(in srgb,var(--md-sys-color-on-surface-variant,#49454F) 38%,transparent); }
 .icon { flex:none; display:block; font:normal 24px/24px var(--md-icon-font-family, 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif);
   width:24px; height:24px; white-space:nowrap; direction:ltr; -webkit-font-smoothing:antialiased; }
 .label { flex:1; min-width:0; white-space:pre-wrap; overflow-wrap:anywhere; }
 .badge { flex:none; white-space:pre-wrap; }
 .ripple { position:absolute; inset:0; border-radius:inherit; overflow:hidden; pointer-events:none; }
 .md-ripple-effect { position:absolute; border-radius:50%; background:currentColor; opacity:0; animation:drawer-ripple 450ms linear; }
 @keyframes drawer-ripple { from { transform:scale(0); opacity:.1; } to { transform:scale(1); opacity:0; } }
`;
const navigationDrawerSheet=createComponentSheet(defaultStyle);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
// Drawer sheets compose section headlines and dividers between destinations.
const isDivider=item=>item.divider===true;
const isSection=item=>!isDivider(item)&&typeof item.section==='string';
const gestureOwners=new WeakMap();

export class MdNavigationDrawer extends HTMLElement {
 static get observedAttributes(){return['items','selected','open','modal','variant','headline','disabled','enabled',
   'gestures-enabled','scrim-color','drawer-container-color','drawer-content-color','aria-label','dir'];}
 constructor(){super();this.attachShadow({mode:'open'});adoptSheet(this.shadowRoot,navigationDrawerSheet);
   this._rendered=false;this._records=[];this._motion=null;this._width=360;this._offset=0;this._abortController=null;this._drag=null;}
 get items(){const value=safeJsonParse(this.getAttribute('items'),[]);return Array.isArray(value)?value.filter(item=>item&&typeof item==='object'&&!Array.isArray(item)):[];}
 set items(value){this.setAttribute('items',JSON.stringify(Array.isArray(value)?value:[]));}
 get selected(){const value=Number(this.getAttribute('selected')??0);return Number.isInteger(value)?value:0;}
 set selected(value){this.setAttribute('selected',String(value));}
 get open(){return this.hasAttribute('open');} set open(value){this.toggleAttribute('open',!!value);}
 get variant(){if(this.hasAttribute('modal')||this.getAttribute('variant')==='modal')return'modal';return this.getAttribute('variant')==='dismissible'?'dismissible':'standard';}
 set variant(value){this.removeAttribute('modal');this.setAttribute('variant',value);}
 get modal(){return this.variant==='modal';} set modal(value){this.toggleAttribute('modal',!!value);if(!value&&this.getAttribute('variant')==='modal')this.removeAttribute('variant');}
 get headline(){return this.getAttribute('headline')||'';} set headline(value){this._optional('headline',value);}
 get disabled(){return this.hasAttribute('disabled');} set disabled(value){this.toggleAttribute('disabled',!!value);}
 get enabled(){return!this.disabled&&this.getAttribute('enabled')!=='false';} set enabled(value){this.disabled=!value;this.setAttribute('enabled',String(!!value));}
 get gesturesEnabled(){return this.getAttribute('gestures-enabled')!=='false';} set gesturesEnabled(value){this.setAttribute('gestures-enabled',String(!!value));}
 get scrimColor(){return this.getAttribute('scrim-color')||'';} set scrimColor(value){this._optional('scrim-color',value);}
 get drawerContainerColor(){return this.getAttribute('drawer-container-color')||'';} set drawerContainerColor(value){this._optional('drawer-container-color',value);}
 get drawerContentColor(){return this.getAttribute('drawer-content-color')||'';} set drawerContentColor(value){this._optional('drawer-content-color',value);}
 _optional(name,value){if(value==null)this.removeAttribute(name);else this.setAttribute(name,String(value));}
 connectedCallback(){if(!this._rendered)this.render();this.setupInteractions();this._applySelection();this._syncSurface();this._syncOpen(false);
   this._resizeObserver=new ResizeObserver(()=>this._syncOpen(false));this._resizeObserver.observe(this._drawer);}
 disconnectedCallback(){this._abortController?.abort();this._abortController=null;this._resizeObserver?.disconnect();this._resizeObserver=null;
   this._motion?.dispose();this._motion=null;this._drag=null;this._releaseGestureOwner();if(this._layer?.localName==='dialog'&&this._layer.open)this._layer.close();}
 attributeChangedCallback(name,oldValue,newValue){if(!this._rendered||oldValue===newValue)return;
   if(name==='items'||name==='modal'||name==='variant'){this.render();if(this.isConnected){this.setupInteractions();this._resizeObserver?.disconnect();this._resizeObserver?.observe(this._drawer);}
     this._applySelection();this._syncOpen(false);}
   else if(name==='open')this._syncOpen(!this._snapping);
   else if(name==='selected'||name==='disabled'||name==='enabled')this._applySelection();
   else if(name==='headline')this.shadowRoot.querySelector('.headline').textContent=this.headline;
   else if(name==='dir')this._drawOffset(this._offset);
   else if(name==='gestures-enabled'){if(!this.gesturesEnabled)this._cancelDrag();}
   else this._syncSurface();}
 show(){this.open=true;}
 /** DrawerState.snapTo: moves to open or closed at once, without the sheet motion. */
 snapTo(value){this._snapping=true;try{this.open=value===true||value==='open';}finally{this._snapping=false;}}
 close(){if(!this.open)return;this.open=false;this.dispatchEvent(new CustomEvent('close',{bubbles:true,composed:true}));}
 render(){this._abortController?.abort();this._drag=null;this._releaseGestureOwner();if(this._layer?.localName==='dialog'&&this._layer.open)this._layer.close();
   this.dataset.variant=this.variant;const items=this.items,tag=this.modal?'dialog':'div';
   this.style.setProperty('--drawer-default-width',items.length?'360px':'240px');
   this.shadowRoot.innerHTML=`${this.shadowRoot.adoptedStyleSheets?.length?'':`<style>${defaultStyle}</style>`}
    <${tag} class="layer" ${this.modal?'aria-modal="true"':''}>
     ${this.modal?'<div class="scrim" part="scrim" aria-hidden="true"></div>':''}
     <nav class="drawer" part="drawer" tabindex="-1"><div class="drawer-content">
     <slot name="header"></slot><div class="headline">${escapeHtml(this.headline)}</div>
     <div class="items" part="items" role="tablist" aria-orientation="vertical">
      ${items.map((item,index)=>isDivider(item)?'<div class="divider" part="divider" role="none"></div>'
       :isSection(item)?`<div class="section" part="section" role="none">${escapeHtml(item.section)}</div>`
       :`<button class="item" type="button" role="tab" data-index="${index}"
       aria-label="${escapeHtml(item.ariaLabel??item.label??item.icon??'')}">
       ${item.icon==null?'':`<span class="icon" aria-hidden="true">${escapeHtml(item.icon)}</span>`}
       <span class="label">${escapeHtml(item.label??'')}</span>
       ${item.badge==null?'':`<span class="badge">${escapeHtml(item.badge)}</span>`}<span class="ripple" aria-hidden="true"></span></button>`).join('')}
     </div><slot></slot></div></nav></${tag}>`;
   this._layer=this.shadowRoot.querySelector('.layer');this._drawer=this.shadowRoot.querySelector('.drawer');
   this._content=this.shadowRoot.querySelector('.drawer-content');this._scrim=this.shadowRoot.querySelector('.scrim');
   this._records=[...this.shadowRoot.querySelectorAll('.item')].map(button=>({button,index:Number(button.dataset.index),item:items[Number(button.dataset.index)]}));
   this._rendered=true;this._syncSurface();}
 _syncSurface(){const label=this.getAttribute('aria-label')||'Navigation drawer';
   for(const node of[this._layer,this._drawer,this.shadowRoot.querySelector('.items')])node.setAttribute('aria-label',label);
   for(const[name,value,node]of[['--drawer-container',this.drawerContainerColor,this._drawer],['--drawer-content',this.drawerContentColor,this._drawer],['--drawer-scrim',this.scrimColor,this._scrim]]){
     if(!node)continue;if(value&&CSS.supports('color',value))node.style.setProperty(name,value);else node.style.removeProperty(name);}}
 _applySelection(){if(!this.enabled)this._cancelDrag();const enabled=r=>this.enabled&&!r.item.disabled&&r.item.enabled!==false;
   const current=this._records.find(r=>r.index===this.selected),entry=current&&enabled(current)?current:this._records.find(enabled);
   this._records.forEach(r=>{const selected=r.index===this.selected;r.button.disabled=!enabled(r);r.button.tabIndex=r===entry?0:-1;
     r.button.setAttribute('aria-selected',String(selected));if(selected)r.button.setAttribute('aria-current','page');else r.button.removeAttribute('aria-current');
     const icon=r.button.querySelector('.icon');if(icon)icon.textContent=String(selected?r.item.selectedIcon??r.item.icon:r.item.icon);});
   // Scrolling reads layout, so it waits for the frame that lays the sheet out.
   if(this._revealFrame==null)this._revealFrame=requestAnimationFrame(()=>{this._revealFrame=null;this._revealSelected();});}
 /** Keeps the selected destination inside the sheet's own scroll viewport. */
 _revealSelected(){const button=this._records.find(r=>r.index===this.selected)?.button,content=this._content;
   if(!button||!content||!this.isConnected||content.scrollHeight<=content.clientHeight)return;
   const top=button.offsetTop,bottom=top+button.offsetHeight,margin=button.offsetHeight;
   let target=content.scrollTop;
   if(top-margin<content.scrollTop)target=Math.max(0,top-margin);
   else if(bottom+margin>content.scrollTop+content.clientHeight)target=bottom+margin-content.clientHeight;
   if(Math.abs(target-content.scrollTop)>=1)content.scrollTo({top:target,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
 _select(index){const r=this._records.find(record=>record.index===index);if(!r||r.button.disabled||this.selected===index)return;
   this.selected=index;this.dispatchEvent(new CustomEvent('change',{detail:{index,value:r.item.value??null,item:r.item},bubbles:true,composed:true}));}
 _syncOpen(animate){if(!this.isConnected||!this._drawer)return;
   if(this.variant==='dismissible'){
     const style=getComputedStyle(this),requested=parseFloat(style.getPropertyValue('--md-navigation-drawer-width'))||(this.items.length?360:240);
     this._width=Math.min(requested,360,this.parentElement?.clientWidth||innerWidth);this.style.setProperty('--drawer-measured-width',`${this._width}px`);
   }else this._width=this._drawer.offsetWidth;
   if(!this._motion){this._motion=new SelectionMotion(this,{offset:this.open?0:-this._width},values=>this._drawOffset(values.offset));
     this._motion.channels.offset=new DrawerOffset(this.open?0:-this._width);}
   if(this.modal&&this.open&&!this._layer.open){this._drawOffset(this._offset);this._layer.showModal();this._focusable()[0]?.focus();}
   const release=this._release;this._release=null;
   if(release?.gesture&&animate){this._motion.channels.offset.settle(this.open?0:-this._width,release.velocity);
     if(this._motion.media?.matches)this._motion.finish();else this._motion.tick(performance.now());}
   else this._motion.set({offset:{value:this.open?0:-this._width,snap:!animate,
     role:release?.role??(this.open?'expressiveSpatialMedium':'expressiveEffectFast'),...(release?{velocity:release.velocity}:{})}});
   this._drawOffset(this._motion.channels.offset.sample(performance.now()).position);}
 _drawOffset(offset){if(!this._drawer)return;this._offset=offset;
   const movable=this.variant!=='standard',rtl=getComputedStyle(this).direction==='rtl';
   const scale=movable&&offset>0?Math.fround(1+Math.fround(offset/360)):1;
   this._drawer.style.translate=`${movable?Math.round(offset)*(rtl?-1:1):0}px 0`;
   this._drawer.style.scale=`${scale} 1`;this._drawer.style.transformOrigin=rtl?'left center':'right center';
   this._content.style.scale=`${Math.fround(1/scale)} 1`;this._content.style.transformOrigin=rtl?'left top':'right top';
   const fraction=this._width?clamp(Math.fround(Math.fround(offset+this._width)/this._width),0,1):0;
   const visible=!movable||fraction>0||this.open||!!this._drag?.started;
   this._drawer.inert=!visible;this._drawer.style.visibility=visible?'visible':'hidden';
   if(this._scrim)this._scrim.style.opacity=String(fraction);
   if(this.variant==='dismissible')this.style.setProperty('--drawer-revealed-width',`${Math.max(0,this._width+Math.round(offset))}px`);
   if(this.modal&&!this.open&&!this._drag?.started&&fraction===0&&!this._motion?.channels.offset.animation&&this._layer.open)this._layer.close();}
 _focusable(){const result=[];
   const walk=node=>{for(const child of node.children??[]){
     if(child.hidden||child.inert||child.matches(':disabled')||getComputedStyle(child).visibility==='hidden'||getComputedStyle(child).display==='none')continue;
     if(child.localName==='slot'){const assigned=child.assignedElements({flatten:true});if(assigned.length){for(const el of assigned)walk({children:[el]});}else walk(child);continue;}
     if(child.tabIndex>=0&&child.getClientRects().length)result.push(child);
     if(child.shadowRoot)walk(child.shadowRoot);else walk(child);
   }};walk(this._drawer);return result;}
 _key(event){if(event.key==='Escape'&&this.variant!=='standard'&&this.open){event.preventDefault();this.close();return;}
   if(event.key!=='Tab'||!this.modal||!this._layer.open)return;
   const elements=this._focusable();if(!elements.length){event.preventDefault();this._drawer.focus();return;}
   let active=this.ownerDocument.activeElement;while(active?.shadowRoot?.activeElement)active=active.shadowRoot.activeElement;
   const first=elements[0],last=elements.at(-1);
   if(event.shiftKey&&(active===first||!elements.includes(active))){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&(active===last||!elements.includes(active))){event.preventDefault();first.focus();}}
 setupInteractions(){this._abortController?.abort();this._abortController=new AbortController();const{signal}=this._abortController;
   this._layer.addEventListener('keydown',event=>this._key(event),{signal});
   this._layer.addEventListener('cancel',event=>{event.preventDefault();this.close();},{signal});
   this._scrim?.addEventListener('click',()=>{if(this.gesturesEnabled)this.close();},{signal});
   for(const r of this._records){
     bindPress(r.button,{signal,disabled:()=>r.button.disabled,onPress:event=>createRipple(event,r.button.querySelector('.ripple')),onActivate:()=>this._select(r.index)});
     r.button.addEventListener('keydown',event=>{const enabled=this._records.filter(item=>!item.button.disabled),current=enabled.indexOf(r);let next;
       if(event.key==='ArrowDown')next=(current+1)%enabled.length;else if(event.key==='ArrowUp')next=(current-1+enabled.length)%enabled.length;
       else if(event.key==='Home')next=0;else if(event.key==='End')next=enabled.length-1;else return;
       if(!enabled.length||r.button.disabled)return;event.preventDefault();for(const item of this._records)item.button.tabIndex=item===enabled[next]?0:-1;enabled[next].button.focus();},{signal});
   }
   this.ownerDocument.addEventListener('pointerdown',event=>this._startDrag(event),{signal,capture:true});
   this.ownerDocument.addEventListener('pointermove',event=>this._moveDrag(event),{signal,passive:false});
   this.ownerDocument.addEventListener('pointerup',event=>this._endDrag(event),{signal});
   this.ownerDocument.addEventListener('pointercancel',event=>{if(event.pointerId===this._drag?.id)this._cancelDrag();},{signal});
   this.ownerDocument.addEventListener('click',event=>{if(event.detail>0&&performance.now()<(this._dragClickUntil??0)){
     event.preventDefault();event.stopImmediatePropagation();this._dragClickUntil=0;}},{signal,capture:true});}
 _startDrag(event){this._dragClickUntil=0;
   if(this.variant==='standard'||!this.gesturesEnabled||!this.enabled||event.defaultPrevented||event.button!==0||event.isPrimary===false)return;
   const path=event.composedPath();if(!path.includes(this.parentElement)&&!path.includes(this))return;
   if(path.some(node=>node.localName==='md-navigation-drawer'&&node!==this)||gestureOwners.has(this.ownerDocument))return;
   this._motion.channels.offset.sample(performance.now());const immediate=!!this._motion.channels.offset.animation;
   if(!immediate&&path.some(node=>node.matches?.('input,select,textarea,[contenteditable="true"],md-slider')))return;
   gestureOwners.set(this.ownerDocument,this);
   const tracker=new PointerVelocityTracker();tracker.down(event.timeStamp,event.clientX);
   const style=getComputedStyle(this),touchSlop=Number.parseFloat(style.getPropertyValue('--md-navigation-drawer-touch-slop')),
     maximum=Number.parseFloat(style.getPropertyValue('--md-navigation-drawer-maximum-fling-velocity'));
   this._drag={id:event.pointerId,x:event.clientX,y:event.clientY,started:false,tracker,
     slop:new HorizontalTouchSlop(pointerSlop(event.pointerType,Number.isFinite(touchSlop)&&touchSlop>=0?touchSlop:8)),
     maximum:Number.isFinite(maximum)&&maximum>0?maximum:8000};
   if(immediate){this._beginDrag(event);event.preventDefault();event.stopPropagation();}}
 _beginDrag(event){this._drag.started=true;
   const channel=this._motion.channels.offset,current=channel.sample(performance.now()).position;
   channel.value=channel.target=clamp(current,-this._width,0);channel.animation=null;this._motion.tick(performance.now());
   if(this.modal&&!this._layer.open)this._layer.showModal();try{this._layer.setPointerCapture(event.pointerId);}catch{}}
 _moveDrag(event){const drag=this._drag;if(!drag||drag.id!==event.pointerId)return;
   if(event.defaultPrevented){this._cancelDrag();return;}
   for(const sample of event.getCoalescedEvents?.()??[]){
     if(sample.timeStamp===event.timeStamp&&sample.clientX===event.clientX&&sample.clientY===event.clientY)continue;
     drag.tracker.move(sample.timeStamp,sample.clientX);}
   drag.tracker.move(event.timeStamp,event.clientX);
   const direction=getComputedStyle(this).direction==='rtl'?-1:1;
   let delta=Math.fround(event.clientX-drag.x);drag.x=event.clientX;drag.y=event.clientY;
   if(!drag.started){delta=drag.slop.add(delta);if(delta===null)return;this._beginDrag(event);}
   event.preventDefault();const channel=this._motion.channels.offset;
   channel.value=channel.target=clamp(Math.fround(channel.value+Math.fround(delta*direction)),-this._width,0);channel.animation=null;this._motion.tick(performance.now());
   }
 _endDrag(event){const drag=this._drag;if(!drag||drag.id!==event.pointerId)return;this._drag=null;this._releaseGestureOwner();if(!drag.started)return;
   const direction=getComputedStyle(this).direction==='rtl'?-1:1,velocity=Math.fround(drag.tracker.up(event.timeStamp,drag.maximum)*direction);
   this._settleDrag(velocity,event.pointerId);}
 _settleDrag(velocity,pointerId){
   const wantOpen=drawerTarget(this._offset,this._width,velocity)===0;
   this._release={gesture:true,velocity};const old=this.open;
   if(wantOpen)this.show();else if(old)this.close();else this.open=false;
   if(old===wantOpen)this._syncOpen(true);this._dragClickUntil=performance.now()+500;
   try{this._layer.releasePointerCapture(pointerId);}catch{}}
 _releaseGestureOwner(){if(gestureOwners.get(this.ownerDocument)===this)gestureOwners.delete(this.ownerDocument);}
 _cancelDrag(){const drag=this._drag;this._drag=null;this._releaseGestureOwner();if(!drag?.started)return;
   this._settleDrag(0,drag.id);}
}
if(!customElements.get('md-navigation-drawer'))customElements.define('md-navigation-drawer',delegateHostAria(MdNavigationDrawer));
