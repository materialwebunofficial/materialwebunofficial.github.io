/** DOM font/control leaves for the source PlainTooltip/RichTooltip layout. */
import {tooltipLayout} from './tooltip-layout.js';

const write=(element,name,value)=>{if(element.style[name]!==value)element.style[name]=value;};
// Round the used layout size up, as native text/leaf dimensions are integers.
// offsetWidth rounds to nearest and can rewrap a label after fractional shaping.
const dimension=(element,name)=>Math.ceil(parseFloat(getComputedStyle(element)[name])||(name==='width'?element.offsetWidth:element.offsetHeight));
const properties=['position','left','right','top','bottom','width','height','min-width','max-width','min-height','max-height','box-sizing','margin'];
const rect=(element,placement,parent={x:0,y:0})=>{
  write(element,'left',`${placement.x-parent.x}px`);write(element,'top',`${placement.y-parent.y}px`);
  write(element,'width',`${placement.width}px`);write(element,'height',`${placement.height}px`);
};

/** Keeps the original slotted nodes (including focused shadow controls) in place. */
export class TooltipDOMLayout {
  constructor(host){this.host=host;this.owned=new Map();}
  restore(element){
    const entry=this.owned.get(element);if(!entry)return;
    for(const [name,data]of entry){
      if(element.style.getPropertyValue(name)===data.applied&&element.style.getPropertyPriority(name)===data.appliedPriority){
        data.value?element.style.setProperty(name,data.value,data.priority):element.style.removeProperty(name);
      }else{data.value=element.style.getPropertyValue(name);data.priority=element.style.getPropertyPriority(name);}
      data.applied=null;
    }
  }
  own(element,values){
    let entry=this.owned.get(element);
    if(!entry){entry=new Map(properties.map(name=>[name,{value:element.style.getPropertyValue(name),priority:element.style.getPropertyPriority(name)}]));this.owned.set(element,entry);}
    for(const [name,value]of Object.entries(values)){
      const data=entry.get(name);
      if(data.applied!=null&&(element.style.getPropertyValue(name)!==data.applied||element.style.getPropertyPriority(name)!==data.appliedPriority)){
        data.value=element.style.getPropertyValue(name);data.priority=element.style.getPropertyPriority(name);
      }
      if(element.style.getPropertyValue(name)!==value||element.style.getPropertyPriority(name)!=='')element.style.setProperty(name,value);
      data.applied=value;data.appliedPriority='';
    }
  }
  release(){for(const element of this.owned.keys())this.restore(element);this.owned.clear();}
  text(value,style,constraints){
    const probe=this.host._measureProbe;
    for(const name of ['font','letterSpacing','direction','textAlign','whiteSpace','overflowWrap','wordBreak'])write(probe,name,style[name]);
    probe.querySelector('.measure-text').textContent=value;
    write(probe,'width','max-content');write(probe,'maxWidth',`${constraints.maxWidth}px`);
    write(probe,'minWidth',`${constraints.minWidth}px`);write(probe,'height','auto');
    const result={width:dimension(probe,'width'),height:Math.min(dimension(probe,'height'),constraints.maxHeight),first:probe.querySelector('.first').offsetTop,last:probe.querySelector('.last').offsetTop};
    return result;
  }
  element(element,constraints){
    this.restore(element);
    // Absolute shrink-to-fit must see this measure pass's available space,
    // rather than the previous frame's measured Box width.
    const stage=element.slot==='action'?this.host._actions:this.host._body;
    write(stage,'width',`${constraints.maxWidth}px`);write(stage,'height',`${constraints.maxHeight}px`);
    const naturalStyle=getComputedStyle(element),minWidth=Math.min(constraints.maxWidth,Math.max(constraints.minWidth,parseFloat(naturalStyle.minWidth)||0)),minHeight=Math.min(constraints.maxHeight,Math.max(constraints.minHeight,parseFloat(naturalStyle.minHeight)||0));
    this.own(element,{position:'absolute',left:'0px',right:'auto',top:'0px',bottom:'auto','box-sizing':'border-box',margin:'0px','min-width':`${minWidth}px`,'max-width':`${constraints.maxWidth}px`,'min-height':`${minHeight}px`,'max-height':`${constraints.maxHeight}px`});
    const result={width:dimension(element,'width'),height:dimension(element,'height')};
    const marker=element.querySelector('[data-tooltip-baseline]');
    if(marker){let y=marker.offsetTop,parent=marker.offsetParent;while(parent&&parent!==element){y+=parent.offsetTop;parent=parent.offsetParent;}result.first=result.last=y;}
    // Text buttons keep their 40dp visual container inside a 48dp interactive leaf.
    const button=element.localName==='md-button'?element.shadowRoot?.querySelector('.btn'):null;
    if(button){const label=button.querySelector('.lbl'),font=getComputedStyle(button);const baseline=this.text('Mg',font,{minWidth:0,maxWidth:constraints.maxWidth,minHeight:0,maxHeight:2147483647}).first;result.first=result.last=Math.round((result.height-button.offsetHeight)/2+(label?.offsetTop??0)+baseline);}
    return result;
  }
  measure(windowSize,rtl){
    const h=this.host,rich=h.variant==='rich',bodySlot=h.shadowRoot.querySelector('slot:not([name])'),actionSlot=h.shadowRoot.querySelector('slot[name="action"]');
    write(h._measureProbe,'width','2147483647px');write(h._measureProbe,'minWidth','0px');
    write(h._measureProbe,'maxWidth',CSS.supports('max-width',h.maxWidth)?h.maxWidth:(rich?'320px':'200px'));
    h._resolvedMaxWidth=h._measureProbe.offsetWidth;
    const bodyElements=bodySlot.assignedElements(),actionElements=rich?actionSlot.assignedElements():[];
    const active=new Set([...bodyElements,...actionElements]);
    for(const element of this.owned.keys())if(!active.has(element)){this.restore(element);this.owned.delete(element);h._resize?.unobserve(element);}
    for(const element of active)h._resize?.observe(element);
    const rawText=bodySlot.assignedNodes().filter(n=>n.nodeType===3).map(n=>n.textContent).join('');
    const sources={body:[],title:[],action:[]};
    if(h.hasAttribute('text')||!bodyElements.length&&!rawText.trim())sources.body.push({element:h._textLeaf,value:h.text,style:getComputedStyle(h._body)});
    if(rawText.trim())sources.body.push({element:bodySlot,value:rawText,style:getComputedStyle(h._body)});
    sources.body.push(...bodyElements.map(element=>({element})));
    if(rich&&h.headline!==null)sources.title.push({element:h._titleLeaf,value:h.headline,style:getComputedStyle(h._head)});
    sources.action.push(...actionElements.map(element=>({element})));
    h._textLeaf.hidden=!sources.body.some(s=>s.element===h._textLeaf);
    const input={rich,rtl,constraints:{minWidth:0,maxWidth:windowSize.width,minHeight:0,maxHeight:windowSize.height},maxWidth:Number.isFinite(h._resolvedMaxWidth)?h._resolvedMaxWidth:windowSize.width,title:rich&&h.headline!==null?[]:null,text:[],action:rich&&actionElements.length?[]:null};
    // Each source Box measures every child independently under the same constraints.
    for(const [name,key]of [['body','text'],['title','title'],['action','action']])if(input[key]!==null)input[key]=sources[name].map(()=>({width:0,height:0}));
    const measurements=[];
    const layout=tooltipLayout(input,(id,_,constraints)=>{
      const split=id.lastIndexOf('-'),name=id.slice(0,split),index=Number(id.slice(split+1)),source=sources[name][index];
      const measured=source.value!==undefined?this.text(source.value,source.style,constraints):this.element(source.element,constraints);
      input[name==='body'?'text':name][index]=measured;measurements.push({id,constraints:{...constraints}});return measured;
    });
    const p=layout.placements,surface=p.surface;
    write(h._tip,'minWidth','0px');write(h._tip,'minHeight','0px');write(h._tip,'maxWidth','none');write(h._tip,'maxHeight','none');
    write(h._tip,'width',`${layout.size.width}px`);write(h._tip,'height',`${layout.size.height}px`);
    rect(h._surface,surface);rect(h._bodyBox,p['body-box'],surface);
    rect(h._body,{x:0,y:0,width:p['body-box'].width,height:p['body-box'].height});
    if(input.title!==null)rect(h._head,p['title-box'],surface);
    if(input.action!==null)rect(h._actions,p['action-box'],surface);
    for(const name of ['title','body','action'])for(let i=0;i<sources[name].length;i++){
      const source=sources[name][i],placement=p[`${name}-${i}`],parent=p[`${name}-box`];
      if(source.value!==undefined){if(source.element!==bodySlot)rect(source.element,placement,parent);}
      else this.own(source.element,{position:'absolute',left:`${placement.x-parent.x}px`,right:'auto',top:`${placement.y-parent.y}px`,bottom:'auto',width:`${placement.width}px`,height:`${placement.height}px`});
    }
    h._layoutInput=input;h._layoutMeasurements=measurements;h._contentLayout=layout;
    return layout;
  }
}
