/**
 * AndroidX AlertDialogContent on a browser modal window.
 * Reference: test/fixtures/androidx/dialog. Surface has no border/shadow;
 * window motion uses the MDC Material3 Dialog theme, separately from Compose.
 */
import './md-button.js';
import {createComponentSheet,adoptSheet} from '../utils/styles.js';
import {ModalController,MODAL_STYLE} from './modal-controller.js';
import {resolveSurfaceColors} from '../theme/surface-color.js';
import {observeThemeContext} from '../theme/theme-context.js';

const defaultStyle=MODAL_STYLE+`
  :host { display: contents; outline: none; -webkit-tap-highlight-color: transparent; }
  .dialog-container { position:absolute; inset:0; display:flex; align-items:center;
    justify-content:center; padding:24px; box-sizing:border-box; pointer-events:none; }
  .dialog { box-sizing:border-box; position:relative; pointer-events:auto;
    display:flex; flex-direction:column; min-width:min(280px,100%); max-width:560px;
    width:100%; max-height:100%; padding:24px;
    border-radius:var(--md-sys-shape-corner-extra-large,28px);
    border:0; box-shadow:none; overflow:hidden;
    background:var(--_md-dialog-container,var(--md-sys-color-surface-container-high));
    color:var(--md-sys-color-on-surface); transform-origin:center; }
  .icon { align-self:center; flex:none; margin-bottom:16px;
    font-family: var(--md-icon-font-family, 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif);
    font-weight:normal; font-style:normal; font-size:24px; width:24px; height:24px;
    line-height:24px; color:var(--_md-dialog-icon,var(--md-sys-color-secondary)); }
  .headline { flex:none; margin:0 0 16px; align-self:flex-start;
    font:var(--md-sys-typescale-headline-small,400 24px/32px Roboto,sans-serif);
    color:var(--_md-dialog-title,var(--md-sys-color-on-surface)); }
  .dialog.has-icon .headline { align-self:center; text-align:center; }
  .body { min-height:0; overflow:auto; margin-bottom:24px;
    font:var(--md-sys-typescale-body-medium,400 14px/20px Roboto,sans-serif);
    color:var(--_md-dialog-text,var(--md-sys-color-on-surface-variant)); }
  .supporting { margin:0; }
  .content { color:inherit; }
  [hidden] { display:none !important; }
  .actions { flex:none; align-self:flex-end; max-width:100%; }
  .action-flow { display:flex; flex-direction:row-reverse; flex-wrap:wrap;
    justify-content:flex-start; column-gap:8px; row-gap:0; }
  .action-flow > md-button { min-width:0; }
  .color-probe { display:none; }
`;
const dialogSheet=createComponentSheet(defaultStyle);
export class MdDialog extends HTMLElement {
  static get observedAttributes() {
    return ['open','headline','supporting-text','icon','confirm-label','cancel-label',
      'container-color','icon-content-color','title-content-color','text-content-color','tonal-elevation'];
  }
  constructor(){
    super();this.attachShadow({mode:'open'});adoptSheet(this.shadowRoot,dialogSheet);
    this._rendered=false;this._abortController=null;this._stopTheme=null;this._closeReason=null;
    this._modal=new ModalController(this,{surface:'.dialog',onDismiss:reason=>this.close(reason),onClosed:()=>{
      if(this._closeReason!==null){const reason=this._closeReason;this._closeReason=null;
        this.dispatchEvent(new CustomEvent('close',{detail:{reason},bubbles:true,composed:true}));}
    }});
  }
  get open(){return this.hasAttribute('open');}
  set open(value){this.toggleAttribute('open',!!value);}
  get headline(){return this.getAttribute('headline')||'';}
  set headline(value){this.setAttribute('headline',value);}
  get supportingText(){return this.getAttribute('supporting-text')||'';}
  set supportingText(value){this.setAttribute('supporting-text',value);}
  get icon(){return this.getAttribute('icon')||'';}
  set icon(value){this.setAttribute('icon',value);}
  get confirmLabel(){return this.getAttribute('confirm-label')||'OK';}
  set confirmLabel(value){this.setAttribute('confirm-label',value);}
  get cancelLabel(){return this.getAttribute('cancel-label')||'Cancel';}
  set cancelLabel(value){this.setAttribute('cancel-label',value);}
  get containerColor(){return this.getAttribute('container-color')||'';}
  set containerColor(value){this.setAttribute('container-color',value);}
  get iconContentColor(){return this.getAttribute('icon-content-color')||'';}
  set iconContentColor(value){this.setAttribute('icon-content-color',value);}
  get titleContentColor(){return this.getAttribute('title-content-color')||'';}
  set titleContentColor(value){this.setAttribute('title-content-color',value);}
  get textContentColor(){return this.getAttribute('text-content-color')||'';}
  set textContentColor(value){this.setAttribute('text-content-color',value);}
  get tonalElevation(){const value=Number(this.getAttribute('tonal-elevation'));return Number.isFinite(value)?value:0;}
  set tonalElevation(value){if(!Number.isFinite(value))throw new TypeError('Dialog tonalElevation must be finite.');this.setAttribute('tonal-elevation',value);}
  connectedCallback(){
    if(!this._rendered){this.render();this._rendered=true;}
    this.setupInteractions();this._sync();
    this._stopTheme?.();this._stopTheme=observeThemeContext(this,()=>this._syncColors());
    this._modal.sync(this.open);
  }
  disconnectedCallback(){this._abortController?.abort();this._abortController=null;
    this._stopTheme?.();this._stopTheme=null;this._closeReason=null;this._modal.detach();}
  attributeChangedCallback(name,oldValue,newValue){
    if(!this._rendered||oldValue===newValue)return;
    if(name==='open'){if(this.open)this._closeReason=null;this._modal.sync(this.open);}
    else this._sync();
  }
  show(){this._closeReason=null;this.open=true;this._modal.sync(true);}
  close(reason='dismiss'){
    if(!this.open||this._modal.closing)return;this._closeReason=reason;this.open=false;
  }
  render(){
    const hasAdopted=this.shadowRoot.adoptedStyleSheets?.length;
    this.shadowRoot.innerHTML=(hasAdopted?'':'<style>'+defaultStyle+'</style>')+`
      <dialog class="modal-window" aria-modal="true">
        <div class="modal-scrim" part="scrim"></div>
        <div class="dialog-container" part="dialog-container">
          <div class="dialog" part="dialog">
            <span class="icon" aria-hidden="true"></span>
            <h2 class="headline" id="dlg-headline"></h2>
            <div class="body">
              <div class="supporting" id="dlg-supporting"></div>
              <div class="content"><slot></slot></div>
            </div>
            <div class="actions" part="actions"><slot name="actions">
              <div class="action-flow">
                <md-button class="action" variant="text" size="s" data-action="confirm" autofocus></md-button>
                <md-button class="action" variant="text" size="s" data-action="cancel"></md-button>
              </div>
            </slot></div>
            <span class="color-probe" hidden aria-hidden="true"></span>
          </div>
        </div>
      </dialog>`;
  }
  _sync(){
    if(!this.isConnected)return;
    const root=this.shadowRoot,dialog=root.querySelector('.dialog'),window=root.querySelector('.modal-window');
    dialog.classList.toggle('has-icon',!!this.icon);
    for(const[selector,text]of[['.icon',this.icon],['.headline',this.headline],['.supporting',this.supportingText]]){
      const element=root.querySelector(selector);element.textContent=text;element.hidden=!text;
    }
    const assigned=root.querySelector('slot:not([name])').assignedNodes({flatten:true});
    root.querySelector('.body').hidden=!this.supportingText&&!assigned.some(node=>node.nodeType===1||node.textContent.trim());
    if(this.headline)window.setAttribute('aria-labelledby','dlg-headline');else window.removeAttribute('aria-labelledby');
    if(this.supportingText)window.setAttribute('aria-describedby','dlg-supporting');else window.removeAttribute('aria-describedby');
    root.querySelector('[data-action="confirm"]').setAttribute('label',this.confirmLabel);
    root.querySelector('[data-action="cancel"]').setAttribute('label',this.cancelLabel);
    this._syncColors();
  }
  _syncColors(){
    if(!this.isConnected)return;
    const dialog=this.shadowRoot.querySelector('.dialog'),probe=this.shadowRoot.querySelector('.color-probe');
    if(!dialog||!probe)return;
    const color=resolveSurfaceColors(this,probe,{container:this.containerColor||'var(--md-sys-color-surface-container-high)',
      content:'var(--md-sys-color-on-surface)',elevation:this.tonalElevation});
    dialog.style.setProperty('--_md-dialog-container',color.container);
    dialog.style.setProperty('--md-absolute-tonal-elevation',String(color.total));
    for(const[name,value]of[['icon',this.iconContentColor],['title',this.titleContentColor],['text',this.textContentColor]]){
      if(value)dialog.style.setProperty('--_md-dialog-'+name,value);else dialog.style.removeProperty('--_md-dialog-'+name);
    }
  }
  setupInteractions(){
    this._abortController?.abort();this._abortController=new AbortController();const{signal}=this._abortController;
    this.shadowRoot.querySelectorAll('slot').forEach(slot=>slot.addEventListener('slotchange',()=>this._sync(),{signal}));
    this.shadowRoot.querySelectorAll('.action').forEach(element=>element.addEventListener('click',()=>{
      if(!this.open||this._modal.closing)return;const action=element.dataset.action;
      this.dispatchEvent(new CustomEvent(action,{bubbles:true,composed:true}));this.close(action);
    },{signal}));
  }
}
if(!customElements.get('md-dialog'))customElements.define('md-dialog',MdDialog);
