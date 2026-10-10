/**
 * Web pagination composed from shared Material controls.
 * Pagination itself is a web extension, not an official MD3E component.
 */
import './md-button.js';
import './md-icon-button.js';
import './md-menu.js';
import './md-divider.js';
import {safeJsonParse} from '../utils/security.js';
import {createComponentSheet,adoptSheet} from '../utils/styles.js';
import {observeThemeContext} from '../theme/theme-context.js';

const defaultStyle=`
 :host{display:block;width:100%;box-sizing:border-box;color:var(--md-sys-color-on-surface)}
 .paginator-root{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;
   min-height:56px;padding:8px 16px;gap:16px;box-sizing:border-box}
 .page-size-box{display:flex;align-items:center;gap:8px}
 .page-size-label,.range-label{font:var(--md-sys-typescale-body-medium,400 14px/20px Roboto,sans-serif);
   letter-spacing:var(--md-sys-typescale-body-medium-tracking,0.25px);
   color:var(--md-sys-color-on-surface-variant);white-space:nowrap}
 .actions-box{display:flex;align-items:center;gap:0}
 [hidden]{display:none!important}
`;
const paginatorSheet=createComponentSheet(defaultStyle);
const defaultOptions=Object.freeze([5,10,25,50,100]);
export class MdPaginator extends HTMLElement{
 static get observedAttributes(){return['length','page-index','page-size','page-size-options','hide-page-size','show-first-last-buttons','disabled'];}
 #rendered=false;#abortController=null;#stopTheme=null;
 constructor(){super();this.attachShadow({mode:'open'});adoptSheet(this.shadowRoot,paginatorSheet);}
 get length(){const value=parseInt(this.getAttribute('length'),10);return Number.isFinite(value)?Math.max(0,value):0;}
 set length(value){this.setAttribute('length',String(value));}
 get pageIndex(){const value=parseInt(this.getAttribute('page-index'),10);return Math.min(this.totalPages-1,Number.isFinite(value)?Math.max(0,value):0);}
 set pageIndex(value){this.setAttribute('page-index',String(value));}
 get pageSize(){const value=parseInt(this.getAttribute('page-size'),10);return Number.isFinite(value)?Math.max(1,value):10;}
 set pageSize(value){this.setAttribute('page-size',String(value));}
 get pageSizeOptions(){
  const data=safeJsonParse(this.getAttribute('page-size-options')||'',null);
  const values=Array.isArray(data)?[...new Set(data.map(Number).filter(value=>Number.isSafeInteger(value)&&value>0))]:[];
  return values.length?values:[...defaultOptions];
 }
 set pageSizeOptions(value){this.setAttribute('page-size-options',JSON.stringify(value));}
 get hidePageSize(){return this.hasAttribute('hide-page-size');}
 set hidePageSize(value){this.toggleAttribute('hide-page-size',!!value);}
 get showFirstLastButtons(){return this.hasAttribute('show-first-last-buttons');}
 set showFirstLastButtons(value){this.toggleAttribute('show-first-last-buttons',!!value);}
 get disabled(){return this.hasAttribute('disabled');}
 set disabled(value){this.toggleAttribute('disabled',!!value);}
 get totalPages(){return Math.max(1,Math.ceil(this.length/this.pageSize));}
 connectedCallback(){
  if(!this.#rendered){this.#render();this.#rendered=true;}
  this.#setupEvents();this.#sync();this.#stopTheme?.();
  this.#stopTheme=observeThemeContext(this,()=>this.#sync());
 }
 disconnectedCallback(){this.#abortController?.abort();this.#abortController=null;this.#stopTheme?.();this.#stopTheme=null;this.shadowRoot.querySelector('md-menu')?.close();}
 attributeChangedCallback(name,oldValue,newValue){if(this.#rendered&&oldValue!==newValue)this.#sync();}
 nextPage(){if(!this.disabled&&this.pageIndex<this.totalPages-1)this.#setPage(this.pageIndex+1);}
 previousPage(){if(!this.disabled&&this.pageIndex>0)this.#setPage(this.pageIndex-1);}
 firstPage(){if(!this.disabled&&this.pageIndex>0)this.#setPage(0);}
 lastPage(){if(!this.disabled&&this.pageIndex<this.totalPages-1)this.#setPage(this.totalPages-1);}
 #setPage(index){
  const previous=this.pageIndex;this.pageIndex=index;this.#emitPage(previous);
 }
 #setPageSize(size){
  if(this.disabled||size===this.pageSize||!Number.isSafeInteger(size)||size<1)return;
  const previous=this.pageIndex,firstItem=previous*this.pageSize;
  this.pageSize=size;this.pageIndex=Math.floor(firstItem/size);this.#emitPage(previous);
 }
 #emitPage(previousPageIndex){this.dispatchEvent(new CustomEvent('page',{bubbles:true,composed:true,
  detail:{pageIndex:this.pageIndex,previousPageIndex,pageSize:this.pageSize,length:this.length}}));}
 #getRangeLabel(){
  if(!this.length)return '0 of 0';
  return (this.pageIndex*this.pageSize+1)+' – '+Math.min((this.pageIndex+1)*this.pageSize,this.length)+' of '+this.length;
 }
 #render(){
  const hasAdopted=this.shadowRoot.adoptedStyleSheets?.length;
  this.shadowRoot.innerHTML=(hasAdopted?'':'<style>'+defaultStyle+'</style>')+
   '<md-divider part="divider"></md-divider>'+
   '<nav class="paginator-root" aria-label="Pagination" part="container">'+
    '<div class="page-size-box"><span class="page-size-label">Items per page:</span>'+
     '<md-menu id="page-size-menu" variant="standard" selection-mode="single" label="Items per page">'+
      '<md-button id="page-size-toggle" slot="trigger" variant="outlined" size="s" trailing-icon="arrow_drop_down" aria-label="Items per page"></md-button>'+
     '</md-menu></div>'+
    '<div class="range-label" id="range-label" aria-live="polite"></div>'+
    '<div class="actions-box">'+
     '<md-icon-button id="btn-first" variant="standard" size="s" aria-label="First page" title="First page"></md-icon-button>'+
     '<md-icon-button id="btn-prev" variant="standard" size="s" aria-label="Previous page" title="Previous page"></md-icon-button>'+
     '<md-icon-button id="btn-next" variant="standard" size="s" aria-label="Next page" title="Next page"></md-icon-button>'+
     '<md-icon-button id="btn-last" variant="standard" size="s" aria-label="Last page" title="Last page"></md-icon-button>'+
    '</div></nav>';
 }
 #sync(){
  if(!this.isConnected)return;
  const root=this.shadowRoot,menu=root.querySelector('#page-size-menu'),size=root.querySelector('#page-size-toggle');
  root.querySelector('#range-label').textContent=this.#getRangeLabel();
  root.querySelector('.page-size-box').hidden=this.hidePageSize;
  size.setAttribute('label',String(this.pageSize));size.disabled=this.disabled;menu.enabled=!this.disabled;
  if(this.hidePageSize)menu.close();
  const options=this.pageSizeOptions;if(!options.includes(this.pageSize))options.push(this.pageSize);
  menu.items=options.map(value=>({label:String(value),value:String(value),selectionMode:'single',selected:value===this.pageSize}));
  const rtl=getComputedStyle(this).direction==='rtl';
  for(const[name,icon,disabled]of[
   ['first',rtl?'last_page':'first_page',this.pageIndex===0],
   ['prev',rtl?'chevron_right':'chevron_left',this.pageIndex===0],
   ['next',rtl?'chevron_left':'chevron_right',this.pageIndex>=this.totalPages-1],
   ['last',rtl?'first_page':'last_page',this.pageIndex>=this.totalPages-1]
  ]){const control=root.querySelector('#btn-'+name);control.setAttribute('icon',icon);
   control.disabled=this.disabled||disabled;if(name==='first'||name==='last')control.hidden=!this.showFirstLastButtons;
  }
 }
 #setupEvents(){
  this.#abortController?.abort();this.#abortController=new AbortController();const{signal}=this.#abortController;
  for(const[name,action]of[['first',()=>this.firstPage()],['prev',()=>this.previousPage()],['next',()=>this.nextPage()],['last',()=>this.lastPage()]]){
   this.shadowRoot.querySelector('#btn-'+name).addEventListener('click',action,{signal});
  }
  const menu=this.shadowRoot.querySelector('#page-size-menu');
  menu.addEventListener('select',event=>{if(event.target!==menu)return;event.stopPropagation();this.#setPageSize(Number(event.detail.item.value));},{signal});
 }
}
if(!customElements.get('md-paginator'))customElements.define('md-paginator',MdPaginator);
