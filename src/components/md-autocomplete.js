/**
 * Editable exposed-dropdown web adapter.
 * The field, icon action and popup share the library's Material primitives.
 */
import {MdTextField} from './md-text-field.js';
import './md-icon-button.js';
import './md-menu.js';
import {safeJsonParse} from '../utils/security.js';

let autocompleteId=0;
export class MdAutocomplete extends MdTextField {
 static get observedAttributes(){return [...super.observedAttributes,'options','open'];}
 constructor(){
  super();this._autocompleteId='md-autocomplete-'+ ++autocompleteId;
  this._autocompleteItems=[];this._filteredItems=[];this._activeOption=-1;
 }
 get label(){return super.label;}set label(value){this.setAttribute('label',value??'');}
 _usesSingleLineEditor(){return true;}
 get placeholder(){return super.placeholder;}set placeholder(value){this.setAttribute('placeholder',value??'');}
 get value(){return super.value;}
 set value(value){super.value=value;this._syncAutocomplete();}
 get open(){return this.hasAttribute('open');}
 set open(value){this.toggleAttribute('open',!!value&&!this.disabled);}
 get options(){const value=safeJsonParse(this.getAttribute('options'),[]);return Array.isArray(value)?value:[];}
 set options(value){this.setAttribute('options',JSON.stringify(value));}
 render(){
  super.render();
  const style=document.createElement('style');
  style.textContent='.autocomplete-menu{display:block;width:0;height:0}.clear-button{flex:none}.clear-button[hidden]{display:none!important}';
  this.shadowRoot.append(style);
  this._clearButton=document.createElement('md-icon-button');
  this._clearButton.className='clear-button';this._clearButton.setAttribute('icon','close');
  this._clearButton.setAttribute('size','s');this._clearButton.setAttribute('variant','standard');
  this._clearButton.setAttribute('aria-label','Clear');
  const box=this.shadowRoot.querySelector('.field-box');box.append(this._clearButton);
  this._autocompleteMenu=document.createElement('md-menu');
  this._autocompleteMenu.className='autocomplete-menu';this._autocompleteMenu.id=this._autocompleteId+'-listbox';
  // MD3E vertical menu (DropdownMenuPopup/Group/Item) for the suggestions.
  this._autocompleteMenu.variant='standard';this._autocompleteMenu.popupRole='listbox';
  this._autocompleteMenu.focusMode='anchor';this._autocompleteMenu.matchAnchorWidth=true;
  this._autocompleteMenu.anchorElement=box;
  this.shadowRoot.append(this._autocompleteMenu);
  const input=this.shadowRoot.querySelector('input');
  input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');
  input.setAttribute('aria-haspopup','listbox');input.setAttribute('aria-controls',this._autocompleteMenu.id);
  input.setAttribute('autocomplete','off');
 }
 _sync(){
  super._sync();this._syncAutocomplete();
 }
 _syncAutocomplete(){
  if(!this.isConnected||!this._autocompleteMenu)return;
  const input=this.shadowRoot.querySelector('input'),menu=this._autocompleteMenu;
  input.required=this.hasAttribute('required');
  this._clearButton.hidden=!this.value;this._clearButton.disabled=this.disabled;
  menu.label=this.label||'Suggestions';menu.enabled=!this.disabled;
  const query=this.value.toLocaleLowerCase().trim(),raw=this.getAttribute('options')||'[]';
  if(raw!==this._autocompleteRaw||query!==this._autocompleteQuery){
   if(raw!==this._autocompleteRaw){
    this._autocompleteRaw=raw;
    const options=this.options.flatMap((entry,index)=>{
     if(typeof entry==='string')return [{label:entry,value:entry,sourceIndex:index,disabled:false}];
     if(!entry||typeof entry!=='object'||Array.isArray(entry))return [];
     return [{label:String(entry.label??entry.value??''),value:String(entry.value??entry.label??''),sourceIndex:index,disabled:!!entry.disabled}];
    });
    while(this._autocompleteItems.length>options.length)this._autocompleteItems.pop().item.remove();
    options.forEach((option,index)=>{
     let record=this._autocompleteItems[index];
     if(!record){const item=document.createElement('md-menu-item');item.id=this._autocompleteId+'-option-'+index;item.selectionMode='none';record={item};this._autocompleteItems.push(record);menu.append(item);}
     record.option=option;record.item.label=option.label;record.item.value=option.value;record.item.disabled=option.disabled;
    });
   }
   this._autocompleteQuery=query;this._activeOption=-1;
   this._filteredItems=this._autocompleteItems.filter(record=>record.option.label.toLocaleLowerCase().includes(query));
   for(const record of this._autocompleteItems)record.item.hidden=!this._filteredItems.includes(record);
  }
  if(this.disabled||!this._filteredItems.length)this.open=false;
  menu.open=this.open;
  input.setAttribute('aria-expanded',String(this.open));
  input.setAttribute('aria-required',String(input.required));
  const missing=!this.disabled&&input.validity.valueMissing;
  this._internals?.setValidity(missing?{valueMissing:true}:{},missing?input.validationMessage:'',input);
  this._syncActiveOption();
  this._layoutField();
 }
 _syncActiveOption(){
  const input=this.shadowRoot.querySelector('input');if(!input)return;
  const active=this.open?this._filteredItems[this._activeOption]:null;
  this._autocompleteMenu.activeItem=active?.item||null;
  if(active){
   input.setAttribute('aria-activedescendant',active.item.id);
  }
  else input.removeAttribute('aria-activedescendant');
 }
 _chooseOption(record){
  if(this.disabled||!record||record.option.disabled)return;
  this.value=record.option.value;this.open=false;
  this.dispatchEvent(new CustomEvent('select',{bubbles:true,composed:true,detail:{value:this.value}}));
 }
 _autocompleteKey(event){
  if(this.disabled||event.isComposing)return;
  if(event.key==='Escape'&&this.open){event.preventDefault();event.stopPropagation();this.open=false;return;}
  if(event.key==='Tab'){this._autocompleteMenu.close({restoreFocus:false});this.open=false;return;}
  const options=this._filteredItems.filter(record=>!record.option.disabled);
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
   if(!options.length)return;
   event.preventDefault();event.stopPropagation();
   const current=this.open?options.indexOf(this._filteredItems[this._activeOption]):-1;
   const next=event.key==='ArrowDown'?Math.min(current+1,options.length-1):current<0?options.length-1:Math.max(0,current-1);
   this.open=true;this._activeOption=this._filteredItems.indexOf(options[next]);this._syncActiveOption();
  }else if(event.key==='Enter'&&this.open&&this._activeOption>=0){
   event.preventDefault();event.stopPropagation();this._chooseOption(this._filteredItems[this._activeOption]);
  }else if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
   this._activeOption=-1;this._syncActiveOption();
  }
 }
 _setup(){
  super._setup();const{signal}=this._abortController,input=this.shadowRoot.querySelector('input'),menu=this._autocompleteMenu;
  input.addEventListener('focus',()=>{this._syncAutocomplete();this.open=true;},{signal});
  input.addEventListener('input',()=>{this._syncAutocomplete();this.open=true;},{signal});
  input.addEventListener('keydown',event=>this._autocompleteKey(event),{signal});
  input.addEventListener('blur',()=>queueMicrotask(()=>{if(!signal.aborted&&this.shadowRoot.activeElement!==input){menu.close({restoreFocus:false});this.open=false;}}),{signal});
  this._clearButton.addEventListener('click',event=>{
   event.stopPropagation();if(this.disabled)return;this.value='';input.focus();this.open=true;
   this.dispatchEvent(new CustomEvent('input',{detail:{value:''},bubbles:true,composed:true}));
  },{signal});
  menu.addEventListener('select',event=>{
   if(event.target!==menu)return;event.stopPropagation();
   this._chooseOption(this._autocompleteItems[event.detail.index]);
  },{signal});
  menu.addEventListener('expanded-change',event=>{
   if(event.target!==menu)return;event.stopPropagation();if(this.open!==menu.open)this.open=menu.open;
  },{signal});
 }
 disconnectedCallback(){super.disconnectedCallback();this._autocompleteMenu?.close({restoreFocus:false});this.open=false;}
 formResetCallback(){super.formResetCallback();this.open=false;this._syncAutocomplete();}
 formStateRestoreCallback(state){super.formStateRestoreCallback(state);this._syncAutocomplete();}
 formDisabledCallback(disabled){this._formDisabled=disabled;this._sync();}
 get disabled(){return this.hasAttribute('disabled')||!!this._formDisabled;}
 set disabled(value){this.toggleAttribute('disabled',!!value);}
}
if(!customElements.get('md-autocomplete'))customElements.define('md-autocomplete',MdAutocomplete);
