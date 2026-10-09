/* AndroidX TimePicker.kt: updated period measure policies and ToggleItem shapes.
 * DOM leaves and scheduling adapt the native shared ToggleButton owners.
 */
import {ButtonShapeComposition,buttonCornerRadius} from './button-shape.js';
import {ButtonSurface} from './button-surface.js';
import {SelectionMotion} from '../motion/selection-motion.js';
import {SpringPhysics} from '../motion/spring-physics.js';
import {bindPress,createRipple} from '../motion/interactions.js';
import {bindStateLayer} from '../motion/state-layer.js';
import {observeThemeContext} from '../theme/theme-context.js';

export const pickerPeriodShapes=()=>({shape:{unit:'percent',value:50},pressedShape:{unit:'px',value:12},checkedShape:{unit:'px',value:12}});
export function pickerPeriodLayout({width,height,horizontal=false,vibrant=false,density=1}){
 const dp=horizontal&&vibrant?16:vibrant?8:4;
 const gap=Math.floor(Math.fround(Math.fround(dp)*Math.fround(density))+.5);
 const itemWidth=horizontal?Math.max(0,Math.floor((width-gap)/2)):width;
 const itemHeight=horizontal?height:Math.max(0,Math.floor((height-gap)/2));
 return{width,height,items:[{width:itemWidth,height:itemHeight,x:0,y:0},{width:itemWidth,height:itemHeight,x:horizontal?itemWidth+gap:0,y:horizontal?0:itemHeight+gap}]};
}

export class PickerPeriodButton{
 constructor(host,button,{checked,onActivate,signal}){
  this.host=host;this.button=button;this.checked=checked;this.pressed=false;this.disposed=false;
  this.abort=new AbortController();const buttonSignal=this.abort.signal;
  this.composition=new ButtonShapeComposition();this.surface=new ButtonSurface(host,button);
  this.indication=bindStateLayer(button,{hitTest:event=>this.surface.hitTest(event),signal:buttonSignal});
  this.press=bindPress(button,{keyboardActivation:true,signal:buttonSignal,
   pointerPolicy:{input:event=>this.surface.pointerInput(event),hitTest:event=>this.surface.hitTest(event),outOfBounds:event=>this.surface.outOfBounds(event)},
   onPress:event=>{this.pressed=true;this.refresh();createRipple(event,button);},
   onRelease:()=>{this.pressed=false;this.refresh();},onActivate});
  this.theme=observeThemeContext(host,()=>this.refresh());
  signal?.addEventListener('abort',()=>this.dispose(),{once:true});
  this.refresh();
 }
 refresh(){
  if(this.disposed||!this.host.isConnected)return;
  const checked=this.checked(),button=this.button,now=performance.now();
  button.classList.toggle('active',checked);button.setAttribute('role','checkbox');button.setAttribute('aria-checked',String(checked));
  button.style.zIndex=checked?'0':'1';
  const spec=SpringPhysics.getPreset('expressiveSpatialFast',this.host);
  const state=this.composition.update(pickerPeriodShapes(),this.pressed,spec,now,checked);
  if(state!==this.state||!this.motion||this.motion.disposed){
   this.motion?.dispose();this.state=state;
   this.motion=new SelectionMotion(this.host,{progress:state.progress.sample(now).position},values=>{
    button.style.borderRadius=Math.max(0,buttonCornerRadius(state.getMorphedShape(null,values.progress),button.offsetWidth,button.offsetHeight))+'px';this.surface.clip();
   });
   this.motion.channels.progress=state.progress;
  }
  if(this.motion.media?.matches)this.motion.finish();else this.motion.tick(now);
  this.surface.refresh();this.indication.refresh();
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;
  this.abort.abort();this.indication.dispose();this.motion?.dispose();this.surface.dispose();this.theme();
 }
}

export class PickerPeriodGroup{
 constructor(host,group,{period,onActivate,signal}){
  this.host=host;this.group=group;this.disposed=false;
  this.buttons=[...group.querySelectorAll('.period-btn')].map(button=>new PickerPeriodButton(host,button,{checked:()=>period()===button.dataset.period,onActivate:()=>onActivate(button.dataset.period),signal}));
  this.resize=new ResizeObserver(()=>this.refresh());this.resize.observe(group);
  signal?.addEventListener('abort',()=>this.dispose(),{once:true});this.refresh();
 }
 refresh(){
  if(this.disposed||!this.host.isConnected)return;
  const css=getComputedStyle(this.group),width=Math.round(parseFloat(css.width)),height=Math.round(parseFloat(css.height));
  this.layout=pickerPeriodLayout({width,height,horizontal:this.group.classList.contains('period-toggle-row')});
  this.buttons.forEach((owner,index)=>{const item=this.layout.items[index],style=owner.button.style;style.width=item.width+'px';style.height=item.height+'px';style.left=item.x+'px';style.top=item.y+'px';owner.refresh();});
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.resize.disconnect();this.buttons.forEach(owner=>owner.dispose());}
}
