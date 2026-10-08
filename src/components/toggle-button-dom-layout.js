/** Retained DOM/font leaves for the original ToggleButton measurement tree. */
import {toggleButtonLayout,toggleButtonMetrics} from './button-layout.js';
import {minimumInteractiveLayout} from './row-column-layout.js';
const INF=2147483647,PROBE=1000000;
const write=(e,n,v)=>{if(e.style[n]!==v)e.style[n]=v;};
const dimension=(e,n)=>Math.ceil(parseFloat(getComputedStyle(e)[n])||0);
const rect=(e,p)=>{write(e,'left',p.x+'px');write(e,'top',p.y+'px');write(e,'width',p.width+'px');write(e,'height',p.height+'px');};
const leased=['position','left','right','top','bottom','width','height','min-width','max-width','min-height','max-height','box-sizing','margin'];
export class ToggleButtonDOMLayout{
 constructor(host){
  this.host=host;this.owned=new Map();this.disposed=false;this.raf=null;
  this.style=document.createElement('style');this.style.textContent=':host([toggle]){--_toggle-width:0px;--_toggle-height:0px}';host.shadowRoot.append(this.style);
  this.sizing=this.style.sheet.cssRules[0].style;
  this.probe=document.createElement('span');this.probe.setAttribute('aria-hidden','true');this.probe.style.cssText='position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;display:block;box-sizing:border-box;min-height:1lh;overflow-wrap:anywhere;';host.shadowRoot.append(this.probe);
  this.resize=new ResizeObserver(()=>this.schedule());this.resize.observe(host);
  this.mutations=new MutationObserver(()=>this.schedule());this.observe();
  this.onFonts=()=>this.schedule();document.fonts?.addEventListener('loadingdone',this.onFonts);
 }
 observe(){this.mutations.observe(this.host,{subtree:true,childList:true,characterData:true,attributes:true});}
 schedule(){if(this.disposed||this.raf!==null)return;this.raf=requestAnimationFrame(()=>{this.raf=null;this.measure();});}
 restore(e){const entry=this.owned.get(e);if(!entry)return;for(const [n,d]of entry){if(e.style.getPropertyValue(n)===d.applied&&e.style.getPropertyPriority(n)===d.appliedPriority){d.value?e.style.setProperty(n,d.value,d.priority):e.style.removeProperty(n);}else{d.value=e.style.getPropertyValue(n);d.priority=e.style.getPropertyPriority(n);}d.applied=null;}}
 own(e,values){let entry=this.owned.get(e);if(!entry){entry=new Map(leased.map(n=>[n,{value:e.style.getPropertyValue(n),priority:e.style.getPropertyPriority(n)}]));this.owned.set(e,entry);}for(const [n,v]of Object.entries(values)){const d=entry.get(n);if(d.applied!=null&&(e.style.getPropertyValue(n)!==d.applied||e.style.getPropertyPriority(n)!==d.appliedPriority)){d.value=e.style.getPropertyValue(n);d.priority=e.style.getPropertyPriority(n);}if(e.style.getPropertyValue(n)!==v||e.style.getPropertyPriority(n)!=='')e.style.setProperty(n,v);d.applied=v;d.appliedPriority='';}}
 contentSize(axis){const css=getComputedStyle(this.host);let n=parseFloat(css[axis])||0;if(css.boxSizing==='border-box'){const sides=axis==='width'?['Left','Right']:['Top','Bottom'];for(const side of sides)n-=(parseFloat(css['padding'+side])||0)+(parseFloat(css['border'+side+'Width'])||0);}return Math.max(0,Math.round(n));}
 setSize(w,h){this.sizing.setProperty('--_toggle-width',w+'px');this.sizing.setProperty('--_toggle-height',h+'px');}
 text(value,style,c){for(const n of ['font','letterSpacing','direction','textAlign','whiteSpace','overflowWrap','wordBreak'])write(this.probe,n,style[n]);this.probe.textContent=value;write(this.probe,'width','max-content');write(this.probe,'maxWidth',c.maxWidth===INF?'none':c.maxWidth+'px');write(this.probe,'minWidth',c.minWidth+'px');write(this.probe,'height','auto');return{width:dimension(this.probe,'width'),height:Math.min(dimension(this.probe,'height'),c.maxHeight)};}
 element(e,c){this.restore(e);this.own(e,{position:'absolute',left:'0px',right:'auto',top:'0px',bottom:'auto','box-sizing':'border-box',margin:'0px','min-width':c.minWidth+'px','max-width':c.maxWidth===INF?'none':c.maxWidth+'px','min-height':c.minHeight+'px','max-height':c.maxHeight===INF?'none':c.maxHeight+'px'});const width=dimension(e,'width'),height=dimension(e,'height');return{width,height,required:width>c.maxWidth||height>c.maxHeight};}
 release(){for(const e of this.owned.keys())this.restore(e);this.owned.clear();}
 measure(){
  if(this.disposed||this.measuring)return;
  if(!this.host.toggle){this.release();return;}
  this.measuring=true;this.mutations.disconnect();
  try{
   const h=this.host,b=h.shadowRoot.querySelector('.btn'),label=b.querySelector('.lbl-wrapper'),lead=b.querySelector('.lead-ico'),trail=b.querySelector('.trail-ico'),slot=b.querySelector('.icon-slot'),iconElements=slot?.assignedElements()??[],s=toggleButtonMetrics({xs:32,s:40,m:56,l:96,xl:136}[h.size]);
   const active=new Set(iconElements);for(const e of this.owned.keys())if(!active.has(e)){this.restore(e);this.owned.delete(e);this.resize.unobserve(e);}for(const e of active)this.resize.observe(e);
   const hasContent=h.hasAttribute('label')||b.querySelector('.label-slot').assignedNodes().some(n=>n.nodeType===1||n.textContent.trim()),hasIcon=iconElements.length>0||!!h.icon,hasTrail=!!h.trailingIcon;
   const glyph=lead.querySelector('.icon-glyph');if(glyph)glyph.hidden=iconElements.length>0;
   lead.style.display=hasIcon?'inline-flex':'none';
   const icon=hasIcon?(iconElements.length?iconElements.map(()=>({width:0,height:0})):[{width:s.icon,height:s.icon}]):null;
   const content=[];let textIndex=null,trailIndex=null;
   if(hasContent){textIndex=content.length;content.push({width:0,height:0});}
   if(hasTrail){if(hasContent)content.push({width:s.gap,height:0});trailIndex=content.length;content.push({width:s.icon,height:s.icon});}
   const input={height:s.height,rtl:getComputedStyle(h).direction==='rtl',icon,content,constraints:{minWidth:0,maxWidth:INF,minHeight:0,maxHeight:INF}};
   const measure=(id,initial,c)=>{
    if(id.startsWith('icon-')){const i=Number(id.slice(5));return iconElements.length?this.element(iconElements[i],c):initial;}
    const i=Number(id.slice(8));if(i!==textIndex)return initial;
    if(h.hasAttribute('label'))return this.text(h.labelText,getComputedStyle(b.querySelector('.lbl')),c);
    for(const [n,v]of Object.entries({left:'0px',top:'0px',width:'max-content',maxWidth:c.maxWidth===INF?'none':c.maxWidth+'px',minWidth:c.minWidth+'px',height:'auto'}))write(label,n,v);
    return{width:dimension(label,'width'),height:Math.min(dimension(label,'height'),c.maxHeight)};
   };
   const natural=toggleButtonLayout(input,measure),preferredWidth=Math.max(48,natural.size.width);
   this.setSize(0,0);const minWidth=this.contentSize('width'),minHeight=this.contentSize('height');
   this.setSize(preferredWidth,PROBE);const maxWidth=this.contentSize('width'),maximumHeight=this.contentSize('height');
   input.constraints={minWidth:Math.min(minWidth,maxWidth),maxWidth,minHeight:Math.min(minHeight,maximumHeight),maxHeight:maximumHeight>=PROBE?INF:maximumHeight};
   const records=[];
   const layout=toggleButtonLayout(input,(id,p,c)=>{const result=measure(id,p,c);records.push({id,constraints:{...c}});if(id.startsWith('icon-'))input.icon[Number(id.slice(5))]=result;else input.content[Number(id.slice(8))]=result;return result;});
   const touch=minimumInteractiveLayout({...input.constraints,width:layout.size.width,height:layout.size.height});this.setSize(preferredWidth,touch.requested.height);
   rect(b,touch.body);const p=layout.placements;
   if(hasIcon){rect(lead,p['icon-box']);if(glyph)write(glyph,'fontSize',Math.min(s.icon,p['icon-box'].width,p['icon-box'].height)+'px');if(iconElements.length){for(const [i,e]of iconElements.entries()){const leaf=p['icon-'+i],box=p['icon-box'];this.own(e,{position:'absolute',left:leaf.x-box.x+'px',top:leaf.y-box.y+'px',right:'auto',bottom:'auto',width:leaf.width+'px',height:leaf.height+'px'});}}}
   rect(label,textIndex===null?{x:0,y:0,width:0,height:0}:p['content-'+textIndex]);
   if(hasTrail){const placement=p['content-'+trailIndex];rect(trail,placement);write(trail,'fontSize',Math.min(s.icon,placement.width,placement.height)+'px');}
   h._toggleLayoutInput=input;h._toggleLayout=layout;h._toggleTouch=touch;h._toggleLayoutMeasurements=records;
   h._surface?.clip();
  }finally{this.measuring=false;if(!this.disposed)this.observe();}
 }
 clearGeometry(){const b=this.host.shadowRoot.querySelector('.btn');if(!b)return;for(const e of [b,...b.querySelectorAll('.lbl-wrapper,.lead-ico,.trail-ico')])for(const n of ['left','top','width','height','min-width','max-width'])e.style.removeProperty(n);b.querySelector('.icon-glyph')?.style.removeProperty('font-size');}
 dispose(){if(this.disposed)return;this.disposed=true;if(this.raf!==null)cancelAnimationFrame(this.raf);this.raf=null;this.resize.disconnect();this.mutations.disconnect();document.fonts?.removeEventListener('loadingdone',this.onFonts);this.release();this.clearGeometry();this.style.remove();this.probe.remove();}
}
