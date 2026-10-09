/** Read-only exposed dropdown composed from shared Material field/menu primitives. */
import {MdTextField} from './md-text-field.js';
import './md-menu.js';

// Declarative option data. The Select's MenuItems render each choice once.
export class MdOption extends HTMLElement {
 connectedCallback(){this.closest('md-select')?._scheduleOptions?.();}
 get value(){return this.getAttribute('value')||'';}set value(value){this.setAttribute('value',value??'');}
 get selected(){return this.hasAttribute('selected');}set selected(value){this.toggleAttribute('selected',!!value);}
 get disabled(){return this.hasAttribute('disabled');}set disabled(value){this.toggleAttribute('disabled',!!value);}
 get displayText(){return this.getAttribute('headline')||this.getAttribute('label')||this.textContent.trim()||this.value;}
}
if(!customElements.get('md-option'))customElements.define('md-option',MdOption);

let selectId=0;
export class MdSelect extends MdTextField {
 static get observedAttributes(){return [...super.observedAttributes,'open','multiple','hide-required-marker','float-label','aria-label'];}
 constructor(){super();this._selectId='md-select-'+ ++selectId;this._optionRecords=[];this._selectedSources=new Set();this._activeSource=null;}
 get label(){return super.label;}set label(value){this.setAttribute('label',value??'');}
 get name(){return super.name;}set name(value){this.setAttribute('name',value??'');}
 get readOnly(){return true;}
 // ExposedDropdownMenuDefaults.TrailingIcon is part of the field's measured layout.
 get trailingIcon(){return this.getAttribute('trailing-icon')||'arrow_drop_down';}set trailingIcon(value){super.trailingIcon=value;}
 _usesSingleLineEditor(){return true;}
 get disabled(){return super.disabled||!!this._formDisabled;}set disabled(value){this.toggleAttribute('disabled',!!value);}
 get required(){return this.hasAttribute('required');}set required(value){this.toggleAttribute('required',!!value);}
 get hideRequiredMarker(){return this.hasAttribute('hide-required-marker');}set hideRequiredMarker(value){this.toggleAttribute('hide-required-marker',!!value);}
 get floatLabel(){return this.getAttribute('float-label')||'auto';}set floatLabel(value){this.setAttribute('float-label',value??'auto');}
 get multiple(){return this.hasAttribute('multiple');}set multiple(value){this.toggleAttribute('multiple',!!value);}
 get open(){return this.hasAttribute('open');}set open(value){this.toggleAttribute('open',!!value&&!this.disabled);}
 get value(){return super.value;}set value(value){this._selectionKey=null;if(!this._rendered)this._pendingValue=value??'';super.value=value;this._sync();}
 get form(){return super.form||null;}
 get validity(){return this._internals?.validity;}
 get validationMessage(){return this._internals?.validationMessage||'';}
 get willValidate(){return this._internals?.willValidate??false;}
 checkValidity(){return this._internals?.checkValidity()??true;}
 reportValidity(){return this._internals?.reportValidity()??true;}
 setCustomValidity(message){this._customValidity=String(message);this._syncValidity();}
 focus(options){this.shadowRoot.querySelector('input')?.focus(options);}
 attributeChangedCallback(name,oldValue,newValue){if(name==='value'||name==='multiple')this._selectionKey=null;super.attributeChangedCallback(name,oldValue,newValue);}
 connectedCallback(){
  const pending=this._pendingValue;super.connectedCallback();if(pending!==undefined){this._pendingValue=undefined;this.value=pending;}this._optionsObserver?.disconnect();
  this._optionsObserver=new MutationObserver(records=>{
   if(records.some(record=>record.type==='attributes'&&record.attributeName==='value'&&this._selectedSources.has(record.target))){
    this._value=[...this._selectedSources].map(option=>option.value).join(',');this._selectionKey=this._key();
   }
   if(records.some(record=>record.target!==this||record.type==='childList'))this._scheduleOptions();
  });
  this._optionsObserver.observe(this,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['value','headline','label','disabled','supporting-text','leading-icon','trailing-icon']});
 }
 disconnectedCallback(){this._optionsObserver?.disconnect();this._optionsObserver=null;super.disconnectedCallback();this._selectMenu?.close({restoreFocus:false});this.open=false;}
 formResetCallback(){super.formResetCallback();this.open=false;}
 formStateRestoreCallback(state){super.formStateRestoreCallback(state);}
 formDisabledCallback(disabled){this._formDisabled=disabled;this._sync();}
 _scheduleOptions(){
  if(this._optionsSyncQueued)return;this._optionsSyncQueued=true;const signal=this._abortController?.signal;
  queueMicrotask(()=>{this._optionsSyncQueued=false;if(this.isConnected&&!signal?.aborted)this._sync();});
 }
 _key(){return JSON.stringify([this.multiple,this.value]);}
 render(){
  super.render();
  const style=document.createElement('style');style.textContent='.select-menu{display:block;width:0;height:0}.field-box,input{cursor:pointer}input{caret-color:transparent}slot.options-data{display:none}';this.shadowRoot.append(style);
  const slot=document.createElement('slot');slot.className='options-data';slot.hidden=true;this.shadowRoot.append(slot);
  const box=this.shadowRoot.querySelector('.field-box');box.setAttribute('part','box');
  this._selectMenu=document.createElement('md-menu');this._selectMenu.className='select-menu';this._selectMenu.id=this._selectId+'-listbox';
  this._selectMenu.variant='dropdown';this._selectMenu.popupRole='listbox';this._selectMenu.focusMode='anchor';this._selectMenu.matchAnchorWidth=true;this._selectMenu.anchorElement=box;this.shadowRoot.append(this._selectMenu);
  const input=this.shadowRoot.querySelector('input');input.setAttribute('role','combobox');input.setAttribute('aria-haspopup','listbox');input.setAttribute('aria-controls',this._selectMenu.id);input.setAttribute('autocomplete','off');
 }
 _showExpandedLabel(){return this.floatLabel!=='always'&&super._showExpandedLabel();}
 _isFieldFocused(){return this.open||super._isFieldFocused();}
 _sync(){
  super._sync();if(!this.isConnected||!this._selectMenu)return;
  const options=[...this.querySelectorAll('md-option')].filter(option=>option instanceof MdOption&&option.closest('md-select')===this),previous=new Map(this._optionRecords.map(record=>[record.source,record]));
  this._optionRecords=options.map(source=>{
   let record=previous.get(source);
   if(!record){const item=document.createElement('md-menu-item');item.id=this._selectId+'-option-'+ ++selectId;record={source,item};}
   const item=record.item;item.selectionMode=this.multiple?'multiple':'single';item.label=source.displayText;item.value=source.value;item.disabled=source.disabled;
   for(const name of['supporting-text','leading-icon','trailing-icon']){
    const value=source.getAttribute(name);if(value===null)item.removeAttribute(name);else if(item.getAttribute(name)!==value)item.setAttribute(name,value);
   }
   if(!source.hasAttribute('leading-icon'))item.setAttribute('selected-icon','check');else item.removeAttribute('selected-icon');
   return record;
  });
  for(const record of previous.values())if(!options.includes(record.source))record.item.remove();
  this._optionRecords.forEach((record,index)=>{if(this._selectMenu.children[index]!==record.item)this._selectMenu.insertBefore(record.item,this._selectMenu.children[index]||null);});
  const key=this._key(),values=this.multiple?this.value.split(',').map(value=>value.trim()).filter(Boolean):[this.value];
  const counts=new Map();for(const option of this._selectedSources)counts.set(option.value,(counts.get(option.value)||0)+1);
  const unresolved=values.some(value=>{const count=counts.get(value)||0;if(!count)return true;counts.set(value,count-1);return false;});
  if(this._selectionKey!==key||unresolved||[...this._selectedSources].some(source=>!options.includes(source))){
   const candidates=this._selectionKey===key?[...new Set([...this._selectedSources,...options])].filter(option=>options.includes(option)):options;
   this._selectedSources=new Set();
   for(const value of values){const source=candidates.find(option=>option.value===value&&!this._selectedSources.has(option));if(source)this._selectedSources.add(source);}
   this._selectionKey=key;
  }
  for(const record of this._optionRecords){record.source.selected=this._selectedSources.has(record.source);record.item.selected=record.source.selected;}
  const input=this.shadowRoot.querySelector('input');input.value=this._optionRecords.filter(record=>record.source.selected).map(record=>record.source.displayText).join(', ')||this.value;
  input.readOnly=true;input.setAttribute('aria-required',String(this.required));
  const label=this.shadowRoot.querySelector('.label');label.textContent=this.label+(this.required&&!this.hideRequiredMarker?' *':'');
  const icon=this.shadowRoot.querySelector('.ico.trailing');icon.style.transform=this.open?'rotate(180deg)':'';
  const menu=this._selectMenu;menu.label=this.label||this.getAttribute('aria-label')||'Options';menu.enabled=!this.disabled;menu.setAttribute('aria-multiselectable',String(this.multiple));
  if(this.disabled||!this._optionRecords.length)this.open=false;menu.open=this.open;input.setAttribute('aria-expanded',String(this.open));
  this._syncFloating();this._syncValidity();this._syncActive();
 }
 _syncValidity(){
  const input=this.shadowRoot.querySelector('input');if(!input)return;
  const missing=this.required&&!this.value&&!this.disabled,custom=!!this._customValidity;
  this._internals?.setValidity(custom?{customError:true}:missing?{valueMissing:true}:{},custom?this._customValidity:missing?'Please select an option':'',input);
 }
 _syncActive(){
  const active=this.open?this._optionRecords.find(record=>record.source===this._activeSource&&!record.source.disabled):null;
  this._selectMenu.activeItem=active?.item||null;const input=this.shadowRoot.querySelector('input');
  if(active)input.setAttribute('aria-activedescendant',active.item.id);else input.removeAttribute('aria-activedescendant');
 }
 _commit(record){
  if(this.disabled||!record||record.source.disabled)return;
  const before=this.value,previous=[...this._selectedSources];
  if(this.multiple){if(this._selectedSources.has(record.source))this._selectedSources.delete(record.source);else this._selectedSources.add(record.source);}
  else this._selectedSources=new Set([record.source]);
  this._value=this._optionRecords.filter(entry=>this._selectedSources.has(entry.source)).map(entry=>entry.source.value).join(',');this._selectionKey=this._key();
  this._activeSource=record.source;this._sync();if(!this.multiple)this.open=false;
  if(before!==this.value||previous.length!==this._selectedSources.size||previous.some(source=>!this._selectedSources.has(source))){
   this.dispatchEvent(new CustomEvent('input',{detail:{value:this.value},bubbles:true,composed:true}));this.dispatchEvent(new CustomEvent('change',{detail:{value:this.value},bubbles:true,composed:true}));
  }
 }
 _selectKey(event){
  if(this.disabled||event.isComposing)return;
  if(event.altKey&&event.key==='ArrowUp'&&this.open){event.preventDefault();if(!this.multiple)this._commit(this._optionRecords.find(record=>record.source===this._activeSource));this.open=false;return;}
  const options=this._optionRecords.filter(record=>!record.source.disabled);if(!options.length)return;
  if(event.key==='Tab'){
   const active=this.open&&!this.multiple?this._optionRecords.find(record=>record.source===this._activeSource):null;
   this._selectMenu.close({restoreFocus:false});if(active)this._commit(active);this.open=false;return;
  }
  if(event.key==='Escape'&&this.open){event.preventDefault();event.stopPropagation();this.open=false;return;}
  if(['ArrowDown','ArrowUp','Home','End','PageDown','PageUp'].includes(event.key)){
   event.preventDefault();event.stopPropagation();
   if(!this.open&&(event.key==='ArrowDown'||event.key==='ArrowUp')){this._openChoices();return;}
   const current=options.findIndex(record=>record.source===this._activeSource);
   const index=event.key==='Home'?0:event.key==='End'?options.length-1:event.key==='PageDown'?Math.min(Math.max(0,current)+10,options.length-1):event.key==='PageUp'?Math.max(0,current-10):event.key==='ArrowDown'?Math.min(current+1,options.length-1):current<0?options.length-1:Math.max(0,current-1);
   this.open=true;this._activeSource=options[index].source;this._syncActive();
  }else if(event.key==='Enter'||event.key===' '){
   event.preventDefault();event.stopPropagation();if(event.repeat)return;
   if(this.open)this._commit(this._optionRecords.find(record=>record.source===this._activeSource));else this._openChoices();
  }else if(event.key.length===1&&!event.ctrlKey&&!event.altKey&&!event.metaKey){
   event.preventDefault();const character=event.key.toLocaleLowerCase(),now=event.timeStamp;
   this._searchText=now-(this._searchTime??-Infinity)>500?character:(this._searchText||'')+character;this._searchTime=now;
   const repeated=[...this._searchText].every(value=>value===character),query=repeated?character:this._searchText;
   const current=options.findIndex(record=>record.source===this._activeSource),ordered=repeated&&this._searchText.length>1?[...options.slice(current+1),...options.slice(0,current+1)]:options;
   const match=ordered.find(record=>record.source.displayText.toLocaleLowerCase().startsWith(query));
   if(match){this.open=true;this._activeSource=match.source;this._syncActive();}
  }
 }
 _openChoices(){
  if(this.disabled)return;this._sync();this._activeSource=this._optionRecords.find(record=>record.source.selected&&!record.source.disabled)?.source||this._optionRecords.find(record=>!record.source.disabled)?.source||null;this.open=true;this._syncActive();
 }
 _setup(){
  super._setup();const{signal}=this._abortController,input=this.shadowRoot.querySelector('input'),menu=this._selectMenu;
  this.shadowRoot.querySelector('.field-box').addEventListener('click',()=>{if(this.disabled)return;if(this.open)this.open=false;else this._openChoices();},{signal});
  input.addEventListener('keydown',event=>this._selectKey(event),{signal});
  input.addEventListener('blur',()=>queueMicrotask(()=>{if(!signal.aborted&&this.shadowRoot.activeElement!==input){menu.close({restoreFocus:false});this.open=false;}}),{signal});
  menu.addEventListener('change',event=>event.stopPropagation(),{signal});
  menu.addEventListener('select',event=>{if(event.target!==menu)return;event.stopPropagation();this._commit(this._optionRecords[event.detail.index]);},{signal});
  menu.addEventListener('expanded-change',event=>{if(event.target!==menu)return;event.stopPropagation();if(this.open!==menu.open)this.open=menu.open;},{signal});
 }
}
if(!customElements.get('md-select'))customElements.define('md-select',MdSelect);
