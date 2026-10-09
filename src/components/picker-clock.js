import {pickerTimeForHost,PickerAnalogState,PICKER_CLOCK,pickerAtan,pickerCircularLayout,pickerPostSlop} from './picker-clock-state.js';
import {SelectionMotion} from '../motion/selection-motion.js';
import {PickerClockAnimation} from './picker-clock-animation.js';
import {MotionCancelled} from '../motion/animatable-float.js';
import {createRipple} from '../motion/interactions.js';

const f=Math.fround;
const canonical=state=>state.is24Hour?state.hours:state.hours%12+(state.period==='PM'?12:0);
const validHour=hour=>Number.isInteger(hour)&&hour>=0&&hour<24;
const validMinute=minute=>Number.isInteger(minute)&&minute>=0&&minute<60;

export class PickerClock{
 constructor(host,face,signal){
  this.host=host;this.face=face;this.disposed=false;this.layers=[];this.pointer=null;
  this.abort=new AbortController();signal.addEventListener('abort',()=>this.dispose(),{once:true});
  this.time=pickerTimeForHost(host);
  this.animation=new PickerClockAnimation(this);this.delays=this.animation.delays;
  this.analog=new PickerAnalogState(this.time,this.animation,(millis,job)=>this.animation.delay(millis,job));this.analog.currentDiameter=face.clientWidth;
  this.bind();this.sync();
  // The dial is laid out again whenever its measured diameter changes.
  this.laidOutWidth=face.clientWidth;this.resize=new ResizeObserver(()=>this.relayout());this.resize.observe(face);
 }
 relayout(){
  if(this.disposed)return;const width=this.face.clientWidth;if(width===this.laidOutWidth)return;this.laidOutWidth=width;
  this.analog.currentDiameter=width;
  const rings={false:pickerCircularLayout(width,PICKER_CLOCK.outerRatio),true:pickerCircularLayout(width,PICKER_CLOCK.innerRatio)};
  for(const layer of this.layers)for(const label of layer.labels){const point=rings[label._ring.inner][label._ring.index];label.style.left=point.x+'px';label.style.top=point.y+'px';}
  this.draw();
 }
 run(work){return this.animation.run(work).catch(error=>{if(!(error instanceof MotionCancelled))queueMicrotask(()=>{throw error;});});}
 cancelAction(){
  this.animation.cancel();
  const pointer=this.pointer;this.pointer=null;this.host._isDragging=false;
  if(pointer&&this.face.hasPointerCapture?.(pointer.id))this.face.releasePointerCapture(pointer.id);
 }
 geometry(){const rect=this.face.getBoundingClientRect();return{rect,center:{x:Math.trunc(this.face.clientWidth/2),y:Math.trunc(this.face.clientHeight/2)},maxDist:f(74*this.face.clientWidth/256)};}
 point(event){const {rect}=this.geometry();return{x:f((event.clientX-rect.left)*this.face.clientWidth/rect.width),y:f((event.clientY-rect.top)*this.face.clientHeight/rect.height)};}
 sync(){
  if(this.disposed)return;
  const state=this.host.state,hour=canonical(state),minute=state.minutes,selection=state.activeUnit==='hours'?'Hour':'Minute';
  this.time.is24hour=state.is24Hour;
  if(validHour(hour)&&hour!==this.time.hour){this.cancelAction();this.analog.hourInput=hour;}
  if(validMinute(minute)&&minute!==this.time.minute){this.cancelAction();this.analog.minuteInput=minute;}
  this.time.selection=selection;this.analog.currentDiameter=this.face.clientWidth;
  if(this.renderedSelection!==selection||this.rendered24!==state.is24Hour){this.makeLayer();this.run(job=>this.analog.animateToCurrent(job));}
  this.draw();
 }
 publish(change=false){
  const state=this.host.state;state.hours=this.time.hourForDisplay;state.minutes=this.time.minute;state.period=this.time.isPm?'PM':'AM';state.activeUnit=this.time.selection==='Hour'?'hours':'minutes';
  this.host._updateDisplay();if(change)this.host._emitChange();
 }
 async tap(point,{autoSwitch=true,spec='DefaultSpatial'}={},job){
  const {center,maxDist}=this.geometry();
  // A queued tap can wait for the previous Foundation writer. Publish from its
  // admitted state mutation so the displayed time advances with the selector.
  await this.analog.onTap(point.x,point.y,maxDist,autoSwitch,center,spec,job,()=>this.publish(true));job.check();if(!this.disposed)this.publish();
 }
 bind(){
  const face=this.face,signal=this.abort.signal;
  face.addEventListener('pointerdown',event=>{
   if(event.button!==0||this.pointer)return;
   this.host.shadowRoot.activeElement?.blur();
   const point=this.point(event);this.pointer={id:event.pointerId,start:point,last:point,offset:point,dragging:false,slop:event.pointerType==='mouse'?.125:18};if(event.isTrusted)face.setPointerCapture?.(event.pointerId);
  },{signal});
  face.addEventListener('pointermove',event=>{
   const pointer=this.pointer;if(!pointer||pointer.id!==event.pointerId)return;
   const point=this.point(event),delta={x:f(point.x-pointer.last.x),y:f(point.y-pointer.last.y)};pointer.last=point;
   let amount=delta;
   if(!pointer.dragging){amount=pickerPostSlop(f(point.x-pointer.start.x),f(point.y-pointer.start.y),pointer.slop);if(!amount)return;pointer.dragging=true;this.host._isDragging=true;}
   pointer.offset={x:f(pointer.offset.x+amount.x),y:f(pointer.offset.y+amount.y)};
   const {center,maxDist}=this.geometry();
   const offset={...pointer.offset};
   this.run(async job=>{await this.analog.rotateTo(pickerAtan(f(offset.y-center.y),f(offset.x-center.x)),false,'DefaultSpatial',job);job.check();this.analog.moveSelector(offset.x,offset.y,maxDist,center);this.publish();});event.preventDefault();
  },{signal});
  face.addEventListener('pointerup',event=>{
   const pointer=this.pointer;if(!pointer||pointer.id!==event.pointerId)return;this.pointer=null;this.host._isDragging=false;
   if(!pointer.dragging)this.run(job=>this.tap(this.point(event),{},job));
   else{this.time.selection='Minute';this.run(job=>this.analog.onGestureEnd(job));this.publish(true);}
  },{signal});
  const cancel=event=>{if(this.pointer?.id!==event.pointerId)return;this.pointer=null;this.host._isDragging=false;};
  face.addEventListener('pointercancel',cancel,{signal});face.addEventListener('lostpointercapture',cancel,{signal});
  // DOM programmatic/accessibility clicks correspond to ClockText semantics;
  // trusted pointer clicks are already handled by the dial gesture owner.
  face.addEventListener('click',event=>{if(event.detail!==0)return;const label=event.target.closest('.dial-number');if(label&&this.activeLayer.contains(label))this.run(job=>this.tap(this.labelCenter(label),{spec:'Snap'},job));},{signal});
 }
 labelCenter(label){return{x:parseFloat(label.style.left)+24,y:parseFloat(label.style.top)+24};}
 makeLayer(){
  const unit=this.time.selection,is24=this.time.is24hour,face=this.face;
  this.renderedSelection=unit;this.rendered24=is24;
  for(const old of this.layers){old.active=false;old.element.inert=true;old.motion?.set({opacity:{value:0,role:'expressiveEffectMedium'}});}
  const element=document.createElement('div');element.className='clock-label-layer';element.setAttribute('role','listbox');element.setAttribute('aria-label',unit==='Hour'?'Hours':'Minutes');
  const layer={element,active:true,labels:[],motion:null,abort:new AbortController()};this.layers.push(layer);this.activeLayer=element;
  for(const inner of unit==='Hour'&&is24?[false,true]:[false]){
   const layout=pickerCircularLayout(face.clientWidth,inner?PICKER_CLOCK.innerRatio:PICKER_CLOCK.outerRatio);
   for(let i=0;i<12;i++){
    const value=unit==='Minute'?i*5:inner?i+12:is24?i:i===0?12:i;
    const label=document.createElement('div');label.className='dial-number';label._ring={inner,index:i};label.dataset.val=value;label.style.left=layout[i].x+'px';label.style.top=layout[i].y+'px';label.tabIndex=-1;label.setAttribute('role','option');label.setAttribute('aria-label',value+(unit==='Hour'?' hours':' minutes'));
    const text=document.createElement('span');text.textContent=String(value);const selected=text.cloneNode(true);selected.className='dial-number-selected';selected.setAttribute('aria-hidden','true');label.append(text,selected);element.append(label);layer.labels.push(label);
    label.addEventListener('keydown',event=>{
     if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(event.key)){event.preventDefault();const index=layer.labels.indexOf(label),step=['ArrowLeft','ArrowUp'].includes(event.key)?-1:1;layer.labels[(index+step+layer.labels.length)%layer.labels.length].focus();}
     if(event.key==='Tab'){event.preventDefault();const target=event.shiftKey?(unit==='Hour'?'#hour-card':'#min-card'):unit==='Hour'?'#min-card':is24?'#mode-toggle-btn':this.time.isPm?'#pm-btn':'#am-btn';this.host.shadowRoot.querySelector(target)?.focus();}
     if(['Enter',' ','NumpadEnter'].includes(event.key)){event.preventDefault();if(!event.repeat)label.dataset.keyPressed=event.key;}
    },{signal:layer.abort.signal});
    label.addEventListener('keyup',event=>{if(label.dataset.keyPressed!==event.key)return;delete label.dataset.keyPressed;event.preventDefault();event.stopPropagation();this.run(job=>this.tap(this.labelCenter(label),{autoSwitch:false,spec:'Snap'},job));createRipple(event,label);},{signal:layer.abort.signal});
    label.addEventListener('blur',()=>delete label.dataset.keyPressed,{signal:layer.abort.signal});
   }
  }
  face.append(element);
  const fade=this.layers.length>1;
  layer.motion=new SelectionMotion(this.host,{opacity:fade?0:1},values=>{element.style.opacity=Math.max(0,Math.min(1,values.opacity));if(!layer.active&&layer.motion&&!layer.motion.channels.opacity.animation){layer.motion.dispose();layer.abort.abort();element.remove();this.layers=this.layers.filter(item=>item!==layer);}});
  if(fade)layer.motion.set({opacity:{value:1,role:'expressiveEffectMedium'}});
 }
 focusSelected(){const value=this.time.selection==='Hour'?this.time.hourForDisplay:Math.round(this.time.minute/5)*5%60;this.activeLayer.querySelector('[data-val="'+value+'"]')?.focus();}
 draw(){
  if(this.disposed||!this.analog)return;
  const diameter=this.face.clientWidth,center=diameter/2,angle=this.analog.currentAngle,inner=this.time.is24hour&&this.time.isPm&&this.time.selection==='Hour',radius=diameter*(inner?PICKER_CLOCK.innerRatio:PICKER_CLOCK.outerRatio),handle=24*diameter/256;
  const arm=this.face.querySelector('#clock-arm'),head=this.face.querySelector('.clock-selector-head'),line=this.face.querySelector('.clock-hand-line');
  if(arm)arm.style.transform='rotate('+((angle+Math.PI/2)*180/Math.PI)+'deg)';
  if(head){head.style.top=(center-radius-handle)+'px';head.style.left=(center-handle)+'px';}
  if(line){line.style.top=(center-radius+handle)+'px';line.style.height=Math.max(0,radius-handle)+'px';}
  const position=this.analog.selectorPos;
  for(const layer of this.layers)for(const label of layer.labels){const x=parseFloat(label.style.left),y=parseFloat(label.style.top),selected=position.x>=x&&position.x<x+48&&position.y>=y&&position.y<y+48;label.setAttribute('aria-selected',String(selected));label.querySelector('.dial-number-selected').style.clipPath='circle('+handle+'px at '+(position.x-x)+'px '+(position.y-y)+'px)';}
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.resize?.disconnect();this.cancelAction();this.abort.abort();this.animation.dispose();for(const layer of this.layers){layer.motion?.dispose();layer.abort.abort();layer.element.remove();}this.layers=[];this.pointer=null;}
}
