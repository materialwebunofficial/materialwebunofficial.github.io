import {setThemeLayer,removeThemeLayer} from '../theme/theme-context.js';

// Android Dialog delegates window animation to the host theme. The web default
// uses MDC Material3.Dialog's unchanged m3_motion_fade_enter/exit resources:
// 0.8 -> 1 scale + alpha, Medium4; alpha-only exit, Short3. This is a window
// theme adapter, not an invented Expressive spatial spring or an OS guarantee.
export const MODAL_STYLE = `
  .modal-window {
    position: fixed; inset: 0; margin: 0; padding: 0; border: 0;
    width: 100%; height: 100%; max-width: none; max-height: none;
    background: transparent; color: inherit; overflow: hidden; outline: none;
    box-sizing: border-box;
  }
  .modal-window:not([open]) { display: none !important; }
  .modal-window[open] { display: block; }
  .modal-window::backdrop { background: transparent; }
  .modal-scrim {
    position: absolute; inset: 0;
    background: var(--md-sys-color-scrim);
    opacity: var(--md-dialog-scrim-opacity, 0.32);
    touch-action: none;
  }
`;

export function renderModalContent(host,html,{inline=false,label='Dialog'}={}) {
  let window=host.shadowRoot.querySelector('.modal-window');
  if(inline){host._modal?.detach();window?.remove();host.shadowRoot.querySelector('.inline-content')?.remove();
    const content=document.createElement('div');content.className='inline-content';content.innerHTML=html;host.shadowRoot.append(content);return;
  }
  host.shadowRoot.querySelector('.inline-content')?.remove();
  if(!window){window=document.createElement('dialog');window.className='modal-window';window.setAttribute('aria-label',label);host.shadowRoot.append(window);}
  window.innerHTML=`<div class="modal-scrim" part="scrim"></div><div class="modal-content">${html}</div>`;
}

export class ModalController {
  constructor(host,{surface,onDismiss,onClosed=()=>{}}) {
    this.host=host;this.surfaceSelector=surface;this.onDismiss=onDismiss;this.onClosed=onClosed;
    this.window=null;this.surface=null;this.jobs=[];this.target=false;this.closing=false;this.generation=0;this.abort=null;
  }
  get visible(){return !!this.window?.open;}
  _attach(){
    const window=this.host.shadowRoot.querySelector('.modal-window');
    if(window!==this.window){this.detach();this.window=window;if(!window)return;
      this.abort=new AbortController();const {signal}=this.abort;
      window.addEventListener('cancel',event=>{event.preventDefault();if(!this.closing)this.onDismiss('escape');},{signal});
      window.addEventListener('close',()=>{
        if(window.open)return;
        if(this.target)this.onDismiss('dismiss');
        if(this.target||this.closing)this.sync(false);
      },{signal});
      window.addEventListener('pointerdown',event=>{this.outside=this._outside(event.target);},{signal,capture:true});
      window.addEventListener('click',event=>{if(this.outside&&this._outside(event.target)&&!this.closing){event.preventDefault();event.stopPropagation();this.onDismiss('scrim');}this.outside=false;},{signal});
    }
    const surface=window?.querySelector(this.surfaceSelector);
    if(surface!==this.surface){this._cancel();this.surface=surface;this.closing=false;}
  }
  _outside(target){return target===this.window||target?.classList?.contains('modal-scrim')||target?.classList?.contains('dialog-container')||target?.classList?.contains('scrim')||target?.classList?.contains('modal-content');}
  _cancel(){this.generation++;for(const job of this.jobs)job.cancel();this.jobs=[];}
  sync(open){
    if(!this.host.isConnected){this.detach();return;}
    this._attach();if(!this.window)return;
    if(open){
      if(this.target&&this.window.open&&!this.closing)return;
      const reopening=this.window.open;
      const current=reopening&&this.surface?getComputedStyle(this.surface):null;
      const scrim=this.window.querySelector('.modal-scrim');
      this.scrimFrom=reopening&&scrim?getComputedStyle(scrim).opacity:'0';
      const from=current?{opacity:current.opacity,transform:current.transform}:{opacity:'0',transform:'scale(0.8)'};
      this._cancel();this.target=true;this.closing=false;this.window.inert=false;
      setThemeLayer(document.body,this,{styles:{overflow:'hidden'},attributes:{}});
      if(!this.window.open)this.window.showModal();
      this._animate(true,from);return;
    }
    if(!this.window.open){const active=this.target||this.closing;this._cancel();this.target=false;this.closing=false;
      this.window.inert=false;removeThemeLayer(document.body,this);if(active)this.onClosed();return;}
    if(this.closing){this.target=false;return;}
    const current=this.surface?getComputedStyle(this.surface):null;
    const scrim=this.window.querySelector('.modal-scrim');
    this.scrimFrom=scrim?getComputedStyle(scrim).opacity:'0.32';
    const from=current?{opacity:current.opacity,transform:current.transform}:{opacity:'1',transform:'none'};
    this._cancel();this.target=false;this.closing=true;this.window.inert=true;
    this._animate(false,from);
  }
  _animate(enter,from){
    const generation=this.generation,style=getComputedStyle(this.host);
    const durationRole=enter?'medium4':'short3';
    const override=style.getPropertyValue(enter?'--md-dialog-enter-duration':'--md-dialog-exit-duration').trim();
    const raw=override||style.getPropertyValue('--md-sys-motion-duration-'+durationRole).trim();
    const parsed=raw?parseFloat(raw)*(raw.endsWith('ms')?1:1000):enter?400:150;
    const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:Number.isFinite(parsed)&&parsed>=0?parsed:enter?400:150;
    const easing=style.getPropertyValue(enter?'--md-dialog-enter-easing':'--md-dialog-exit-easing').trim()||(enter?'cubic-bezier(0.1, 0.7, 0.1, 1)':'cubic-bezier(0.3, 0, 0.8, 0.2)');
    const complete=()=>{if(generation!==this.generation)return;this._cancel();if(!enter){this.closing=false;this.window.inert=false;this.window.close();removeThemeLayer(document.body,this);this.onClosed();}};
    if(!duration||!this.surface){complete();return;}
    const to=enter?{opacity:'1',transform:'none'}:{opacity:'0',transform:from.transform};
    const job=this.surface.animate([from,to],{duration,easing,fill:'both'});this.jobs.push(job);
    const scrim=this.window.querySelector('.modal-scrim');
    if(scrim){const alpha=getComputedStyle(scrim).getPropertyValue('--md-dialog-scrim-opacity').trim()||'0.32';
      this.jobs.push(scrim.animate([{opacity:this.scrimFrom},{opacity:enter?alpha:'0'}],{duration,easing:'linear',fill:'both'}));}
    job.finished.then(complete,()=>{});
  }
  detach(){
    this._cancel();this.abort?.abort();this.abort=null;this.target=false;this.closing=false;
    if(this.window?.open){this.window.inert=false;this.window.close();}
    removeThemeLayer(document.body,this);this.window=null;this.surface=null;
  }
}
