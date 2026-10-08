/** Retained DOM adapter for the original selection modifier measurement tree. */
import {measureSelectionLayout} from '../motion/selection-layout.js';
import {roundedPointerHit,capturedPointerOutOfBounds} from '../motion/pointer-geometry.js';
import {observeThemeContext} from '../theme/theme-context.js';
const INF=2147483647,PROBE=1000000;
const dimensions={checkbox:{width:18,height:18},radio:{width:24,height:24},switch:{width:52,height:32}};
const properties=['position','left','top','width','height'];
export class SelectionDOMLayout{
  constructor(host,{kind,control,canvas,ripple,signal}){
    Object.assign(this,{host,kind,control,canvas,ripple});this.disposed=false;this.raf=null;this.owned=new Map();
    this.style=document.createElement('style');this.style.textContent=':host{--_md-selection-width:0px;--_md-selection-height:0px}';host.shadowRoot.append(this.style);
    this.sizing=this.style.sheet.cssRules[0].style;
    this.probe=document.createElement('span');this.probe.setAttribute('aria-hidden','true');this.probe.style.cssText='position:absolute;visibility:hidden;pointer-events:none;width:max(0px,var(--md-minimum-interactive-component-size,48px));height:0;';host.shadowRoot.append(this.probe);
    this.resize=new ResizeObserver(()=>this.schedule());this.resize.observe(host);if(host.parentElement)this.resize.observe(host.parentElement);
    this.stopTheme=observeThemeContext(host,()=>this.schedule());
    signal?.addEventListener('abort',()=>this.dispose(),{once:true});
    this.measure();
  }
  setSize(width,height){this.sizing.setProperty('--_md-selection-width',width+'px');this.sizing.setProperty('--_md-selection-height',height+'px');}
  contentSize(axis){const css=getComputedStyle(this.host);let value=parseFloat(css[axis])||0;if(css.boxSizing==='border-box')for(const side of axis==='width'?['Left','Right']:['Top','Bottom'])value-=(parseFloat(css['padding'+side])||0)+(parseFloat(css['border'+side+'Width'])||0);return Math.max(0,Math.round(value));}
  own(node,name,value){let records=this.owned.get(node);if(!records){records=new Map(properties.map(property=>[property,{value:node.style.getPropertyValue(property),priority:node.style.getPropertyPriority(property),written:null}]));this.owned.set(node,records);}const record=records.get(name);if(record.written!==null&&(node.style.getPropertyValue(name)!==record.written||node.style.getPropertyPriority(name)!=='')){record.value=node.style.getPropertyValue(name);record.priority=node.style.getPropertyPriority(name);}node.style.setProperty(name,value);record.written=node.style.getPropertyValue(name);}
  rect(node,r){this.own(node,'position','absolute');for(const [name,value]of Object.entries({left:r.x,top:r.y,width:r.width,height:r.height}))this.own(node,name,value+'px');}
  schedule(){if(this.disposed||this.raf!==null)return;this.raf=requestAnimationFrame(()=>{this.raf=null;this.measure();});}
  measure(){
    if(this.disposed||this.measuring||!this.host.isConnected)return;this.measuring=true;
    try{
      const minimum=parseFloat(getComputedStyle(this.probe).width)||0,body=dimensions[this.kind],preferred={width:Math.max(body.width,Math.round(minimum)),height:Math.max(body.height,Math.round(minimum))};
      this.setSize(0,0);const minWidth=this.contentSize('width'),minHeight=this.contentSize('height');
      this.setSize(preferred.width,PROBE);const maxWidth=this.contentSize('width'),maxHeight=this.contentSize('height');
      const constraints={minWidth:Math.min(minWidth,maxWidth),maxWidth,minHeight:Math.min(minHeight,maxHeight),maxHeight:maxHeight>=PROBE?INF:maxHeight};
      const input={kind:this.kind,minimum,rtl:getComputedStyle(this.host).direction==='rtl',constraints};
      const layout=measureSelectionLayout(input),interaction=layout.placements.input,draw=layout.placements.content,css=getComputedStyle(this.host);
      this.setSize(preferred.width,layout.requested.height);
      this.rect(this.control,{...interaction,x:interaction.x+(parseFloat(css.paddingLeft)||0),y:interaction.y+(parseFloat(css.paddingTop)||0)});
      this.rect(this.canvas,{...draw,x:draw.x-interaction.x,y:draw.y-interaction.y});
      if(this.ripple)this.rect(this.ripple,{x:0,y:0,width:interaction.width,height:interaction.height});
      this.input=input;this.layout=layout;this.host._selectionLayoutInput=input;this.host._selectionLayout=layout;
    }finally{this.measuring=false;}
  }
  pointerInput(event){
    const type={mouse:'Mouse',touch:'Touch',pen:'Stylus'}[event.pointerType];if(!type)return null;
    const rect=this.control.getBoundingClientRect(),css=getComputedStyle(this.control),width=parseFloat(css.width)||0,height=parseFloat(css.height)||0;
    const layer=this.control.querySelector('.state-layer'),layerRect=layer?.getBoundingClientRect(),layerCss=layer?getComputedStyle(layer):null;
    const scaleX=width?rect.width/width:(layerRect?.width/(parseFloat(layerCss?.width)||1)||1),scaleY=height?rect.height/height:(layerRect?.height/(parseFloat(layerCss?.height)||1)||1);
    return{width,height,radius:0,type,x:(event.clientX-rect.left)/(scaleX||1),y:(event.clientY-rect.top)/(scaleY||1)};
  }
  hitTest(event){const input=this.pointerInput(event);return input===null||roundedPointerHit(input)!==null;}
  hoverHitTest(event){const input=this.pointerInput(event);return input===null||roundedPointerHit(input)?.direct===true;}
  outOfBounds(event){const input=this.pointerInput(event);return input!==null&&capturedPointerOutOfBounds(input);}
  dispose(){
    if(this.disposed)return;this.disposed=true;if(this.raf!==null)cancelAnimationFrame(this.raf);this.raf=null;this.resize.disconnect();this.stopTheme();
    for(const [node,records]of this.owned)for(const [name,record]of records)if(node.style.getPropertyValue(name)===record.written&&node.style.getPropertyPriority(name)===''){if(record.value)node.style.setProperty(name,record.value,record.priority);else node.style.removeProperty(name);}
    this.owned.clear();this.style.remove();this.probe.remove();
  }
}
