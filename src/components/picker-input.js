/* Copyright 2019,2023 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0; obtain a copy at
 * https://www.apache.org/licenses/LICENSE-2.0 . Distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND. See the License for details.
 */
import {pickerTimeForHost} from './picker-clock-state.js';
import {pickerInputTransform,pickerInputNumber,pickerInputDigit} from './picker-input-state.js';
import {ButtonSurface} from './button-surface.js';
import {bindPress,createRipple} from '../motion/interactions.js';
import {bindStateLayer} from '../motion/state-layer.js';
import {observeThemeContext} from '../theme/theme-context.js';
import {TextFieldContainerMotion} from './text-field-container.js';
import {timeInputTextFieldColors,pickerCssColor} from './picker-colors.js';
const canonical=state=>state.is24Hour?state.hours:state.hours%12+(state.period==='PM'?12:0);
const hourValid=value=>Number.isInteger(value)&&value>=0&&value<24;
const minuteValid=value=>Number.isInteger(value)&&value>=0&&value<60;

// DOM beforeinput/input, focus and lifecycle bind the native policy. Screen
// reader/service detection is unavailable on the web and is an explicit host
// setting, rather than an inference from reduced motion or keyboard usage.
export class PickerTimeInput{
 constructor(host,signal){
  this.host=host;this.time=pickerTimeForHost(host);this.disposed=false;this.focusTicket=0;
  this.fields=['Hour','Minute'].map(unit=>({unit,element:host.shadowRoot.querySelector(unit==='Hour'?'#hour-input':'#min-input'),selector:host.shadowRoot.querySelector(unit==='Hour'?'#hour-input-selector':'#min-input-selector'),original:null,userOverride:true,lastCanonical:undefined}));
  signal.addEventListener('abort',()=>{this.disposed=true;this.focusTicket++;this.theme?.();for(const field of this.fields){field.indication.dispose();field.surface.dispose();}},{once:true});
  for(const field of this.fields){
   const element=field.element;
   field.slot=element.parentElement;field.outline=field.slot.querySelector('.time-input-outline');
   this.setColorTargets(field);
   field.container=new TextFieldContainerMotion(host,{scope:field.slot,containerProperty:'--time-input-container',indicatorProperty:'--time-input-indicator',containerToken:'--time-input-target-container',indicatorToken:'--time-input-target-indicator',signal,
    drawThickness:thickness=>{field.thickness=thickness;this.paintOutline(field);}});
   field.surface=new ButtonSurface(host,field.selector);
   field.indication=bindStateLayer(field.selector,{hitTest:event=>field.surface.hitTest(event),signal});
   bindPress(field.selector,{keyboardActivation:true,signal,pointerPolicy:{input:event=>field.surface.pointerInput(event),hitTest:event=>field.surface.hitTest(event),outOfBounds:event=>field.surface.outOfBounds(event)},onPress:event=>createRipple(event,field.selector),onActivate:()=>{this.time.selection=field.unit;this.publish();}});
   element.addEventListener('beforeinput',event=>{
    field.original={before:element.value,start:element.selectionStart,end:element.selectionEnd};
    // HTML text inputs sanitize newlines before input fires. Reject incoming
    // non-digit text at the cancellable platform boundary so native reversion
    // cannot accidentally become the blank-input branch after sanitization.
    if(event.cancelable&&typeof event.data==='string'&&[...event.data].some(char=>char.length!==1||pickerInputDigit(char)===null)){event.preventDefault();field.original=null;}
   },{signal});
   element.addEventListener('input',()=>this.edit(field),{signal});
   element.addEventListener('focus',()=>{if(this.time.selection!==field.unit){this.time.selection=field.unit;this.publish();}this.refreshContainer(field);},{signal});
   element.addEventListener('blur',()=>this.refreshContainer(field),{signal});
   element.addEventListener('keydown',event=>{
    if(field.unit!=='Hour')return;
    if(event.key==='Enter'&&this.time.isHourInputValid){event.preventDefault();this.time.selection='Minute';this.publish();return;}
    const value=pickerInputNumber(element.value),valid=value!==null&&(this.time.is24hour?value>=0&&value<=23:value>=1&&value<=12);
    if(/^[0-9]$/.test(event.key)&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&element.selectionStart===2&&element.value.length===2&&valid&&this.time.isHourInputValid)field.pendingSelection='Minute';
   },{signal});
   element.addEventListener('keyup',()=>{if(field.pendingSelection){this.time.selection=field.pendingSelection;field.pendingSelection=null;this.publish();}},{signal});
   element.addEventListener('select',()=>{field.snapshot={before:element.value,start:element.selectionStart,end:element.selectionEnd};},{signal});
  }
  this.theme=observeThemeContext(host,()=>{if(!this.disposed)for(const field of this.fields){field.surface.refresh();field.indication.refresh();this.refreshContainer(field);this.paintOutline(field);}});
 }
 setColorTargets(field){
  const valid=field.unit==='Hour'?this.time.isHourInputValid:this.time.isMinuteInputValid;
  field.colors=timeInputTextFieldColors({vibrant:this.host.richColors,error:!valid,focused:this.host.shadowRoot.activeElement===field.element});
  for(const name of ['container','indicator'])field.slot.style.setProperty('--time-input-target-'+name,pickerCssColor(field.colors[name]));
 }
 refreshContainer(field){if(this.disposed)return;this.setColorTargets(field);field.container?.refresh({focused:this.host.shadowRoot.activeElement===field.element});}
 paintOutline(field){
  if(this.disposed)return;const rect=field.outline.querySelector('rect'),t=field.thickness,radius=parseFloat(getComputedStyle(field.element).borderTopLeftRadius)||0;
  for(const [name,value]of Object.entries({x:t/2,y:t/2,width:96-t,height:72-t,rx:Math.max(0,radius-t/2),'stroke-width':t}))rect.setAttribute(name,value);
 }
 format(unit){const t=this.time,value=unit==='Hour'?(t.isHourInputValid?t.hourForDisplay:t.hourInput):(t.isMinuteInputValid?t.minute:t.minuteInput);return String(value).padStart(2,'0');}
 publish(change=false){
  const state=this.host.state;state.hours=this.time.hourForDisplay;state.minutes=this.time.minute;state.period=this.time.isPm?'PM':'AM';state.activeUnit=this.time.selection==='Hour'?'hours':'minutes';
  this.host._updateDisplay();if(change)this.host._emitChange();
 }
 edit(field){
  if(this.disposed)return;const element=field.element,before=field.original??field.snapshot??{before:field.lastText,start:0,end:0};field.original=null;
  if(field.pendingSelection){this.time.selection=field.pendingSelection;field.pendingSelection=null;}
  const hour=this.time.hour,minute=this.time.minute;
  const result=pickerInputTransform(this.time,field.unit,{...before,proposed:element.value,proposedStart:element.selectionStart,proposedEnd:element.selectionEnd},this.host.accessibilityServicesEnabled,field.userOverride);
  field.userOverride=result.userOverride;element.value=result.text;element.setSelectionRange(result.start,result.end);field.lastText=result.text;field.snapshot={before:result.text,start:result.start,end:result.end};
  this.publish(hour!==this.time.hour||minute!==this.time.minute);
  if(result.errors)this.host.dispatchEvent(new CustomEvent('input-error',{detail:{unit:field.unit.toLowerCase()},bubbles:true,composed:true}));
 }
 sync(force=false){
  if(this.disposed)return;const state=this.host.state,hour=canonical(state),minute=state.minutes;
  this.time.is24hour=state.is24Hour;this.time.selection=state.activeUnit==='hours'?'Hour':'Minute';
  if(hourValid(hour)&&(force||this.time.hour!==hour))this.time.hour=hour;
  if(minuteValid(minute)&&(force||this.time.minute!==minute))this.time.minute=minute;
  for(const field of this.fields){
   const value=field.unit==='Hour'?this.time.hour:this.time.minute;
   if(field.lastCanonical!==value){
    if(field.userOverride){const text=this.format(field.unit);if(field.element.value!==text){field.element.value=text;field.element.setSelectionRange(0,0);}}
    field.userOverride=true;field.lastCanonical=value;
   }
   field.lastText=field.element.value;
   const valid=field.unit==='Hour'?this.time.isHourInputValid:this.time.isMinuteInputValid;
   const selected=this.time.selection===field.unit;
   field.element.hidden=!selected;field.selector.hidden=selected;
   field.outline.hidden=!selected;field.outline.style.display=selected?'':'none';
   field.selector.setAttribute('aria-checked','false');field.selector.setAttribute('aria-invalid',String(!valid));field.selector.querySelector('.selector-text').textContent=this.format(field.unit);
   field.surface.refresh();field.indication.refresh();
   field.element.setAttribute('aria-invalid',String(!valid));
   this.refreshContainer(field);
   const support=field.element.closest('.input-card-wrap').querySelector('.input-sublabel');
   support.textContent=valid?field.unit:field.unit==='Minute'?'Minute must be 0–59':this.time.is24hour?'Hour must be 0–23':'Hour must be 1–12';
   support.classList.toggle('error',!valid);if(valid)support.removeAttribute('aria-live');else support.setAttribute('aria-live','polite');
  }
  if(this.lastSelection!==this.time.selection){this.lastSelection=this.time.selection;this.focusSelection();}
 }
 focusSelection(){
  const ticket=++this.focusTicket;queueMicrotask(()=>{if(this.disposed||ticket!==this.focusTicket||!this.host.isConnected||!this.host.inline&&!this.host.open)return;const element=this.fields.find(field=>field.unit===this.time.selection)?.element;if(this.host.shadowRoot.activeElement!==element)element?.focus({preventScroll:true});});
 }
}
