/**
 * Web disclosure composed from Material Card/ListItem and shared motion.
 * ExpansionPanel itself is a web extension, not a native MD3E composable.
 */
import './md-card.js';
import './md-list.js';
import {SelectionMotion} from '../motion/selection-motion.js';
import {themeParent} from '../theme/theme-context.js';
import {createComponentSheet,adoptSheet} from '../utils/styles.js';

let panelId=0;
const style=String.raw`
 :host{display:block;width:100%;box-sizing:border-box}
 md-card{--md-card-padding:8px;--md-card-gap:0}
 .heading{margin:0}
 .content-animator{overflow:hidden;height:0}
 .content-body{padding:0 16px 16px;font:var(--md-sys-typescale-body-large,400 16px/24px Roboto,sans-serif);
  letter-spacing:var(--md-sys-typescale-body-large-tracking,.5px);color:var(--md-sys-color-on-surface-variant)}
`;
const sheet=createComponentSheet(style);
export class MdExpansionPanel extends HTMLElement {
 static get observedAttributes(){return ['open','headline','supporting-text','disabled','heading-level'];}
 constructor(){super();this.attachShadow({mode:'open'});adoptSheet(this.shadowRoot,sheet);this._panelId='md-expansion-'+ ++panelId;}
 get open(){return this.hasAttribute('open');}set open(value){this.toggleAttribute('open',!!value);}
 get headline(){return this.getAttribute('headline')||'';}set headline(value){this.setAttribute('headline',value??'');}
 get supportingText(){return this.getAttribute('supporting-text')||'';}set supportingText(value){this.setAttribute('supporting-text',value??'');}
 get disabled(){return this.hasAttribute('disabled');}set disabled(value){this.toggleAttribute('disabled',!!value);}
 get headingLevel(){const level=Number(this.getAttribute('heading-level'));return Number.isInteger(level)&&level>=1&&level<=6?level:3;}set headingLevel(value){this.setAttribute('heading-level',String(value));}
 connectedCallback(){
  if(!this._header)this._render();
  this._abort?.abort();this._abort=new AbortController();const{signal}=this._abort;
  this._header.addEventListener('action',event=>{if(event.target!==this._header)return;event.stopPropagation();this.toggle();},{signal});
  this._resize?.disconnect();this._resize=new ResizeObserver(()=>this._syncMotion());this._resize.observe(this._body);
  this._sync();
 }
 disconnectedCallback(){this._abort?.abort();this._abort=null;this._resize?.disconnect();this._resize=null;this._motion?.dispose();this._motion=null;}
 attributeChangedCallback(name,oldValue,newValue){if(this._header&&oldValue!==newValue)this._sync();}
 toggle(){if(this.disabled)return;this.open=!this.open;this.dispatchEvent(new CustomEvent('toggle',{detail:{open:this.open},bubbles:true,composed:true}));}
 _render(){
  this.shadowRoot.innerHTML=(this.shadowRoot.adoptedStyleSheets?.length?'':'<style>'+style+'</style>')+
   '<md-card variant="filled" part="root" exportparts="card:container"><div class="heading" role="heading">'+
    '<md-list-item interactive aria-label="" colors=\'{"containerColor":"transparent","disabledContainerColor":"transparent"}\' id="'+this._panelId+'-header" part="header">'+
     '<slot name="leading-icon" slot="start"></slot><slot name="trailing-icon" slot="end"></slot>'+
    '</md-list-item></div><div class="content-animator" id="'+this._panelId+'-content" role="region" aria-labelledby="'+this._panelId+'-header">'+
     '<div class="content-body" part="content"><slot></slot></div></div></md-card>';
  this._header=this.shadowRoot.querySelector('md-list-item');this._region=this.shadowRoot.querySelector('.content-animator');this._body=this.shadowRoot.querySelector('.content-body');
  this._header.setAttribute('trailing-icon','expand_more');
 }
 _sync(){
  if(!this.isConnected)return;
  this._header.setAttribute('headline',this.headline);
  if(this.supportingText)this._header.setAttribute('supporting-text',this.supportingText);else this._header.removeAttribute('supporting-text');
  this._header.setAttribute('aria-label',this.headline||'Details');this._header.disabled=this.disabled;
  this.shadowRoot.querySelector('.heading').setAttribute('aria-level',String(this.headingLevel));
  const button=this._header._item;
  button.setAttribute('aria-expanded',String(this.open));
  button.ariaControlsElements=[this._region];
  if(!this.open){
   let active=this.ownerDocument.activeElement;while(active?.shadowRoot?.activeElement)active=active.shadowRoot.activeElement;
   for(let node=active;node;node=themeParent(node))if(node===this._region){if(!this.disabled)button.focus();break;}
  }
  this._region.inert=!this.open;this._region.setAttribute('aria-hidden',String(!this.open));
  this._syncMotion();
 }
 _syncMotion(){
  if(!this.isConnected||!this._body)return;
  const target={height:this.open?this._body.offsetHeight:0,rotation:this.open?180:0};
  if(!this._motion)this._motion=new SelectionMotion(this,target,values=>{
   if(!this.isConnected)return;
   this._region.style.height=Math.max(0,Math.round(values.height))+'px';
   const icon=this._header.shadowRoot.querySelector('.trailing > .ico');if(icon)icon.style.transform='rotate('+values.rotation+'deg)';
  });
  else this._motion.set({height:{value:target.height,role:'expressiveSpatialMedium',roundInitial:true},rotation:{value:target.rotation,role:'expressiveSpatialFast'}});
 }
}
if(!customElements.get('md-expansion-panel'))customElements.define('md-expansion-panel',MdExpansionPanel);

export class MdAccordion extends HTMLElement {
 connectedCallback(){
  this._abort?.abort();this._abort=new AbortController();
  this.addEventListener('toggle',event=>{
   const panel=event.target;
   if(!(panel instanceof MdExpansionPanel)||panel.closest('md-accordion')!==this||!panel.open||this.hasAttribute('multi'))return;
   for(const other of this.querySelectorAll('md-expansion-panel')){
    if(other!==panel&&other.closest('md-accordion')===this&&other.open)other.open=false;
   }
  },{signal:this._abort.signal});
 }
 disconnectedCallback(){this._abort?.abort();this._abort=null;}
}
if(!customElements.get('md-accordion'))customElements.define('md-accordion',MdAccordion);

