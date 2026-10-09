/**
 * Stepper: a web extension; Material 3 has no native stepper composable.
 * Step headers follow the Material web stepper anatomy (a 24dp step icon,
 * a Title Small label, optional Body Small supporting text and 1dp
 * connectors) with Material 3 color roles, state layers and ripples.
 *
 * Step icon colors:  pending  OnSurfaceVariant / Surface
 *                    current  Primary / OnPrimary
 *                    done     Primary / OnPrimary, with a check
 *                    error    Error, shown as an error icon
 */
import {SelectionMotion} from '../motion/selection-motion.js';
import {bindPress,createRipple} from '../motion/interactions.js';
import {themeParent} from '../theme/theme-context.js';
import {createComponentSheet,adoptSheet} from '../utils/styles.js';

let stepId=0;
const stepStyle=':host{display:block;width:100%;box-sizing:border-box}:host([hidden]){display:none!important}.step-content-root{width:100%;box-sizing:border-box}';
const stepSheet=createComponentSheet(stepStyle);
export class MdStep extends HTMLElement {
 static get observedAttributes(){return ['label','description','completed','active','disabled','error'];}
 constructor(){super();this.attachShadow({mode:'open'});adoptSheet(this.shadowRoot,stepSheet);this._stepId='md-step-'+ ++stepId;}
 get label(){return this.getAttribute('label')||'';}set label(value){this.setAttribute('label',value??'');}
 get description(){return this.getAttribute('description')||'';}set description(value){this.setAttribute('description',value??'');}
 get active(){return this.hasAttribute('active');}set active(value){this.toggleAttribute('active',!!value);}
 get completed(){return this.hasAttribute('completed');}set completed(value){this.toggleAttribute('completed',!!value);}
 get disabled(){return this.hasAttribute('disabled');}set disabled(value){this.toggleAttribute('disabled',!!value);}
 get error(){return this.hasAttribute('error');}set error(value){this.toggleAttribute('error',!!value);}
 connectedCallback(){
  if(!this._body){this.shadowRoot.innerHTML=(this.shadowRoot.adoptedStyleSheets?.length?'':'<style>'+stepStyle+'</style>')+'<div class="step-content-root"><slot></slot></div>';this._body=this.shadowRoot.querySelector('.step-content-root');}
  if(!this.id)this.id=this._stepId;this.setAttribute('role','region');this._sync();this.closest('md-stepper')?._scheduleSteps?.();
 }
 disconnectedCallback(){this._motion?.dispose();this._motion=null;}
 attributeChangedCallback(name,oldValue,newValue){
  if(oldValue===newValue)return;if(this._body)this._sync();
  if(['label','description','disabled','error'].includes(name))this.closest('md-stepper')?._scheduleSteps?.();
 }
 _sync(){
  if(!this.isConnected||!this._body)return;
  this.hidden=!this.active;this.inert=!this.active;this.setAttribute('aria-hidden',String(!this.active));this.setAttribute('aria-label',this.label||'Step');
  const alpha=this.active?1:0;
  if(!this._motion)this._motion=new SelectionMotion(this,{alpha},values=>{if(this.isConnected)this._body.style.opacity=String(Math.max(0,Math.min(1,values.alpha)));});
  else this._motion.set({alpha:{value:alpha,role:'expressiveEffectsFast',snap:!this.active||!!this._initializing}});
 }
}
if(!customElements.get('md-step'))customElements.define('md-step',MdStep);
export class MdStepPanel extends MdStep {}
if(!customElements.get('md-step-panel'))customElements.define('md-step-panel',MdStepPanel);

const stepperStyle=`
 :host{display:block;width:100%;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
 .stepper-root{display:flex;flex-direction:column;width:100%}
 .header-bar{display:flex;align-items:center;margin:0;padding:0;list-style:none}
 .step-item{display:flex;align-items:center;flex:none;min-width:0}
 .step-item:not(:last-child){flex:1 1 auto}
 .connector{flex:1 1 24px;min-width:16px;height:1px;margin-inline:8px;background:var(--md-sys-color-outline-variant,#CAC4D0)}
 .step-item:last-child .connector{display:none}
 .step-header{position:relative;display:flex;align-items:center;gap:12px;box-sizing:border-box;min-height:72px;max-width:100%;
   padding:12px 16px;margin:0;border:0;border-radius:var(--md-sys-shape-corner-full,9999px);background:transparent;
   color:var(--md-sys-color-on-surface-variant,#49454F);text-align:start;font:inherit;cursor:pointer;outline:none;overflow:hidden}
 .step-header::before{content:'';position:absolute;inset:0;border-radius:inherit;background:var(--md-sys-color-on-surface,#1D1B20);opacity:0;pointer-events:none}
 .step-header:not(:disabled):hover::before{opacity:var(--md-sys-state-hover-state-layer-opacity,.08)}
 .step-header:not(:disabled):focus-visible::before,.step-header:not(:disabled).pressed::before{opacity:var(--md-sys-state-focus-state-layer-opacity,.1)}
 .step-header:focus-visible{outline:3px solid var(--md-sys-color-secondary,#625B71);outline-offset:-3px}
 .step-header:disabled{cursor:default}
 .step-icon{position:relative;display:inline-flex;flex:none;align-items:center;justify-content:center;width:24px;height:24px;border-radius:var(--md-sys-shape-corner-full,9999px);
   background:var(--md-sys-color-on-surface-variant,#49454F);color:var(--md-sys-color-surface,#FEF7FF);
   font:var(--md-sys-typescale-label-medium,500 12px/16px Roboto,sans-serif);letter-spacing:var(--md-sys-typescale-label-medium-tracking,.5px)}
 .step-icon .glyph{display:none;font-family:var(--md-icon-font-family,'Material Symbols Rounded','Material Symbols Outlined',sans-serif);font-size:18px;line-height:18px;font-weight:normal;font-feature-settings:'liga';-webkit-font-smoothing:antialiased}
 .step-header[data-state="current"] .step-icon,.step-header[data-state="done"] .step-icon{background:var(--md-sys-color-primary,#6750A4);color:var(--md-sys-color-on-primary,#FFFFFF)}
 .step-header[data-state="done"] .glyph,.step-header[data-state="error"] .glyph{display:block}
 .step-header[data-state="done"] .number,.step-header[data-state="error"] .number{display:none}
 .step-header[data-state="error"] .step-icon{background:transparent;color:var(--md-sys-color-error,#B3261E)}
 .step-header[data-state="error"] .glyph{font-size:24px;line-height:24px}
 .step-text{display:flex;flex-direction:column;min-width:0}
 .step-label{font:var(--md-sys-typescale-title-small,500 14px/20px Roboto,sans-serif);letter-spacing:var(--md-sys-typescale-title-small-tracking,.1px);overflow-wrap:anywhere}
 .step-description{font:var(--md-sys-typescale-body-small,400 12px/16px Roboto,sans-serif);letter-spacing:var(--md-sys-typescale-body-small-tracking,.4px);color:var(--md-sys-color-on-surface-variant,#49454F);overflow-wrap:anywhere}
 .step-description:empty{display:none}
 .step-header[data-state="current"] .step-label,.step-header[data-state="done"] .step-label{color:var(--md-sys-color-on-surface,#1D1B20)}
 .step-header[data-state="error"] .step-label,.step-header[data-state="error"] .step-description{color:var(--md-sys-color-error,#B3261E)}
 .step-header:disabled .step-icon{background:color-mix(in srgb,var(--md-sys-color-on-surface,#1D1B20) 38%,transparent);color:var(--md-sys-color-surface,#FEF7FF)}
 .step-header:disabled .step-label,.step-header:disabled .step-description{color:color-mix(in srgb,var(--md-sys-color-on-surface,#1D1B20) 38%,transparent)}
 .panels-box{width:100%;min-width:0;padding-top:24px;box-sizing:border-box}
 .md-ripple-effect{position:absolute;border-radius:50%;background:currentColor;opacity:0;animation:stepper-ripple 450ms linear;pointer-events:none}
 @keyframes stepper-ripple{from{transform:scale(0);opacity:.1}to{transform:scale(1);opacity:0}}
 /* Compact horizontal headers show the label of the current step only. */
 :host(:not([orientation="vertical"])) .stepper-root.compact .step-header:not([data-state="current"]) .step-text{display:none}
 /* Vertical: each step's content follows its header, beside a 1dp connector. */
 :host([orientation="vertical"]) .header-bar{flex-direction:column;align-items:stretch}
 :host([orientation="vertical"]) .step-item{flex-direction:column;align-items:stretch}
 :host([orientation="vertical"]) .connector{display:none}
 :host([orientation="vertical"]) .step-header{align-self:flex-start}
 :host([orientation="vertical"]) .panels-box{display:none}
 .vertical-panel{display:none}
 :host([orientation="vertical"]) .vertical-panel{display:block;position:relative;margin-inline-start:28px;padding:0 0 16px 36px;min-height:24px}
 :host([orientation="vertical"]) .vertical-panel::before{content:'';position:absolute;inset-block:0;inset-inline-start:0;width:1px;background:var(--md-sys-color-outline-variant,#CAC4D0)}
 :host([orientation="vertical"]) .step-item:last-child .vertical-panel::before{display:none}
`;
const stepperSheet=createComponentSheet(stepperStyle);
export class MdStepper extends HTMLElement {
 static get observedAttributes(){return ['active-step','orientation','linear','disabled','aria-label'];}
 constructor(){super();this.attachShadow({mode:'open'});adoptSheet(this.shadowRoot,stepperSheet);this._records=[];}
 get activeStep(){const number=Number(this.getAttribute('active-step'));return Math.min(Number.isFinite(number)?Math.max(0,Math.floor(number)):0,Math.max(0,this.getSteps().length-1));}
 set activeStep(value){const number=Number(value);this.setAttribute('active-step',String(Number.isFinite(number)?Math.max(0,Math.floor(number)):0));}
 get orientation(){return this.getAttribute('orientation')==='vertical'?'vertical':'horizontal';}set orientation(value){this.setAttribute('orientation',value??'horizontal');}
 get linear(){return this.hasAttribute('linear');}set linear(value){this.toggleAttribute('linear',!!value);}
 get disabled(){return this.hasAttribute('disabled');}set disabled(value){this.toggleAttribute('disabled',!!value);}
 connectedCallback(){
  if(!this._header)this._render();this._abort?.abort();this._abort=new AbortController();const{signal}=this._abort;
  this._header.addEventListener('keydown',event=>this._key(event),{signal});
  this._observer?.disconnect();this._observer=new MutationObserver(()=>this._scheduleSteps());this._observer.observe(this,{childList:true});
  this._resize?.disconnect();this._resize=new ResizeObserver(()=>this._syncCompact());this._resize.observe(this);
  for(const record of this._records)this._bindRecord(record);
  this._sync();
 }
 disconnectedCallback(){this._abort?.abort();this._abort=null;this._observer?.disconnect();this._observer=null;this._resize?.disconnect();this._resize=null;for(const record of this._records)record.binding=null;}
 attributeChangedCallback(name,oldValue,newValue){if(this._header&&oldValue!==newValue)this._sync();}
 getSteps(){return [...this.children].filter(step=>step instanceof MdStep);}
 _scheduleSteps(){
  if(this._stepsQueued)return;this._stepsQueued=true;const signal=this._abort?.signal;
  queueMicrotask(()=>{this._stepsQueued=false;if(this.isConnected&&!signal?.aborted)this._sync();});
 }
 _render(){
  this.shadowRoot.innerHTML=(this.shadowRoot.adoptedStyleSheets?.length?'':'<style>'+stepperStyle+'</style>')+
   '<div class="stepper-root"><ol class="header-bar" part="header-bar"></ol><div class="panels-box" part="panels"></div></div>';
  this._root=this.shadowRoot.querySelector('.stepper-root');this._header=this.shadowRoot.querySelector('.header-bar');this._panels=this.shadowRoot.querySelector('.panels-box');
 }
 _createRecord(step){
  const wrapper=document.createElement('li');wrapper.className='step-item';
  const control=document.createElement('button');control.type='button';control.className='step-header';control.setAttribute('part','step-header');
  control.innerHTML='<span class="step-icon" aria-hidden="true"><span class="number"></span><span class="glyph"></span></span><span class="step-text"><span class="step-label"></span><span class="step-description"></span></span>';
  const connector=document.createElement('span');connector.className='connector';connector.setAttribute('aria-hidden','true');
  const panel=document.createElement('div');panel.className='vertical-panel';const slot=document.createElement('slot');panel.append(slot);
  wrapper.append(control,panel,connector);
  const record={step,wrapper,control,connector,panel,slot,number:control.querySelector('.number'),glyph:control.querySelector('.glyph'),
   label:control.querySelector('.step-label'),description:control.querySelector('.step-description'),binding:null};
  step._initializing=true;return record;
 }
 _bindRecord(record){
  if(!this._abort||record.binding)return;
  record.binding=bindPress(record.control,{signal:this._abort.signal,disabled:()=>record.control.disabled,
   onPress:event=>createRipple(event,record.control),onActivate:()=>{if(!record.control.disabled)this.goTo(this._records.indexOf(record));}});
 }
 _sync(){
  if(!this.isConnected||this._syncing)return;this._syncing=true;
  try{
   const steps=this.getSteps(),previous=new Map(this._records.map(record=>[record.step,record]));
   this._records=steps.map(step=>previous.get(step)??this._createRecord(step));
   for(const record of previous.values())if(!steps.includes(record.step)){record.wrapper.remove();if(record.step.slot===record.slot.name)record.step.removeAttribute('slot');}
   const vertical=this.orientation==='vertical';
   this._records.forEach((record,index)=>{
    if(this._header.children[index]!==record.wrapper)this._header.insertBefore(record.wrapper,this._header.children[index]||null);
    // Each step is assigned to its own slot: below its header (vertical) or in the shared panel area.
    const name='step-'+index;record.slot.name=name;
    if(record.step.slot!==name)record.step.slot=name;
    const target=vertical?record.panel:this._panels;
    if(record.slot.parentElement!==target||target===this._panels&&this._panels.children[index]!==record.slot)target===this._panels?this._panels.insertBefore(record.slot,this._panels.children[index]||null):target.append(record.slot);
    this._bindRecord(record);
   });
   let current=this.activeStep;
   if(steps[current]?.disabled){current=steps.findIndex(step=>!step.disabled);if(current>=0)this.activeStep=current;}
   let focused=this.ownerDocument.activeElement;while(focused?.shadowRoot?.activeElement)focused=focused.shadowRoot.activeElement;
   let leavingFocused=false;
   for(let node=focused;node;node=themeParent(node))if(steps.includes(node)&&steps.indexOf(node)!==current){leavingFocused=true;break;}
   const assign=(node,name,value)=>{if(value==null)node.removeAttribute(name);else if(node.getAttribute(name)!==String(value))node.setAttribute(name,String(value));};
   this._header.setAttribute('aria-label',this.getAttribute('aria-label')||'Steps');
   this._records.forEach(({step,control,number,glyph,label,description},index)=>{
    const active=index===current&&!step.disabled,completed=index<current&&!step.disabled,text=step.label||'Step '+(index+1);
    step.active=active;step.completed=completed;
    control.disabled=this.disabled||step.disabled||(this.linear&&index>current);
    control.dataset.state=step.error?'error':active?'current':completed?'done':'pending';
    number.textContent=String(index+1);glyph.textContent=step.error?'error':'check';
    if(label.textContent!==text)label.textContent=text;if(description.textContent!==step.description)description.textContent=step.description;
    assign(control,'aria-label','Step '+(index+1)+' of '+steps.length+': '+text+(step.description?'. '+step.description:'')+(step.error?'. Error':completed?'. Completed':''));
    control.ariaControlsElements=[step];assign(control,'aria-current',active?'step':null);step._initializing=false;
   });
   this._syncCompact();
   if(leavingFocused&&!this.disabled)this._records[current]?.control.focus();
  }finally{this._syncing=false;}
 }
 /** Horizontal headers keep only the current label when the labels do not fit. */
 _syncCompact(){
  if(!this._root||this.orientation==='vertical'){this._root?.classList.remove('compact');return;}
  this._root.classList.remove('compact');
  if(this._header.scrollWidth>this._header.clientWidth+1)this._root.classList.add('compact');
 }
 goTo(index){
  if(this.disabled||!Number.isInteger(index)||index<0||index>=this.getSteps().length||this.getSteps()[index].disabled||index===this.activeStep)return;
  const previousStep=this.activeStep;this.activeStep=index;
  this.dispatchEvent(new CustomEvent('step-change',{detail:{activeStep:index,previousStep},bubbles:true,composed:true}));
 }
 next(){const steps=this.getSteps();for(let index=this.activeStep+1;index<steps.length;index++)if(!steps[index].disabled){this.goTo(index);return;}}
 prev(){const steps=this.getSteps();for(let index=this.activeStep-1;index>=0;index--)if(!steps[index].disabled){this.goTo(index);return;}}
 previous(){this.prev();}
 reset(){
  if(this.disabled)return;this.activeStep=Math.max(0,this.getSteps().findIndex(step=>!step.disabled));this._sync();
  this.dispatchEvent(new CustomEvent('reset',{bubbles:true,composed:true}));
 }
 _key(event){
  const record=this._records.find(record=>event.composedPath().includes(record.control));if(!record||event.altKey||event.ctrlKey||event.metaKey)return;
  const vertical=this.orientation==='vertical',back=vertical?'ArrowUp':getComputedStyle(this).direction==='rtl'?'ArrowRight':'ArrowLeft',forward=vertical?'ArrowDown':back==='ArrowLeft'?'ArrowRight':'ArrowLeft';
  if(!['Home','End',back,forward].includes(event.key))return;event.preventDefault();
  const enabled=this._records.filter(record=>!record.control.disabled),current=enabled.indexOf(record);
  const index=event.key==='Home'?0:event.key==='End'?enabled.length-1:event.key===forward?Math.min(enabled.length-1,current+1):Math.max(0,current-1);
  enabled[index]?.control.focus();
 }
}
if(!customElements.get('md-stepper'))customElements.define('md-stepper',MdStepper);
