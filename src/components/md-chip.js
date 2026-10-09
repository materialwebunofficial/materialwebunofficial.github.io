/** AndroidX Chip.kt a095da93: default factories, three-child content row and
 * Expressive selectable shapes. DOM leaves, events, automatic check/removal,
 * font measurement and CSS drawing are the web adapters. */
import {bindPress, createRipple, nestedInteractiveEvent} from '../motion/interactions.js';
import {bindButtonElevation} from '../motion/button-elevation.js';
import {ChipElevationMotion} from '../motion/chip-elevation.js';
import {bindStateLayer} from '../motion/state-layer.js';
import {SelectionMotion} from '../motion/selection-motion.js';
import {retargetIntSize} from '../motion/size-motion.js';
import {SpringPhysics} from '../motion/spring-physics.js';
import {roundedPointerHit, capturedPointerOutOfBounds} from '../motion/pointer-geometry.js';
import {ButtonShapeComposition, buttonCornerRadius} from './button-shape.js';
import {chipFamily, chipColors, chipBorder, chipElevation,
  chipCssColor} from './chip-state.js';
import {chipContentLayout,chipContentIntrinsic} from './chip-layout.js';
import {ChipRetainedContent} from './chip-retained-content.js';
import {createComponentSheet, adoptSheet} from '../utils/styles.js';

const defaultStyle = `
  :host { display:inline-flex; align-items:center; justify-content:center;
    min-width:48px; min-height:48px; vertical-align:middle; outline:none; }
  .chip { position:relative; flex:0 1 auto; width:var(--md-chip-natural-width); min-width:0;
    height:var(--md-chip-content-height,32px); min-height:0; box-sizing:border-box; border:0; outline:none;
    cursor:pointer; user-select:none; -webkit-tap-highlight-color:transparent;
    font-family:var(--md-sys-typescale-font-family,system-ui,sans-serif);
    font-size:var(--md-sys-typescale-label-large-size,14px);
    font-weight:var(--md-sys-typescale-label-large-weight,500);
    line-height:var(--md-sys-typescale-label-large-line-height,20px);
    letter-spacing:var(--md-sys-typescale-label-large-tracking,0.1px); }
  .chip.disabled { cursor:default; }
  /* Surface border paints inside the shape; it never adds content padding. */
  .chip::after { content:''; position:absolute; inset:0; border-radius:inherit;
    border:var(--md-chip-border-width) solid var(--md-chip-border-color);
    box-sizing:border-box; pointer-events:none; }
  .hit { position:absolute; inset:min(0px,calc((100% - 48px)/2)); }
  .content { position:relative; height:var(--md-chip-content-height,32px);
    border-radius:inherit; overflow:hidden; }
  .content::before { content:''; position:absolute; inset:0; background:currentColor;
    opacity:var(--md-chip-state-alpha,0); pointer-events:none; }
  .leading-ico,.trailing-ico,.lbl { position:absolute; }
  .leading-ico,.trailing-ico { display:inline-flex; overflow:hidden; }
  .leading-content,.trailing-content { position:absolute; top:0; display:inline-flex;
    align-items:center; justify-content:center; width:max-content; white-space:nowrap; }
  .leading-content { inset-inline-start:0; }
  .trailing-content { inset-inline-end:0; }
  .leading-ico { color:var(--md-chip-leading-color); }
  .trailing-ico { color:var(--md-chip-trailing-color); }
  .lbl { overflow:hidden; }
  .label-content { position:absolute; top:0; display:inline-flex; align-items:center;
    width:max-content; white-space:normal; }
  .glyph { font-family: var(--md-icon-font-family, 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif); font-size:18px; line-height:18px;
    width:18px; height:18px; display:inline-flex; align-items:center; justify-content:center;
    font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; pointer-events:none; }
  [hidden] { display:none !important; }
  slot { display:contents; }
  ::slotted([slot=avatar]) { width:24px; height:24px; border-radius:50%; object-fit:cover; }
  .remove-btn { position:relative; display:inline-flex; align-items:center; justify-content:center;
    width:18px; height:18px; padding:0; margin:0; border:0; border-radius:50%;
    background:transparent; color:inherit; cursor:pointer; outline:none; }
  .remove-btn::before { content:''; position:absolute; inset:0; border-radius:inherit;
    background:currentColor; opacity:var(--md-chip-remove-alpha,0); pointer-events:none; }
  /* Keyboard outline is the library's declared web accessibility adapter. */
  .chip:focus-visible,.remove-btn:focus-visible { outline:3px solid var(--md-sys-color-secondary); outline-offset:2px; }
`;
const chipSheet=createComponentSheet(defaultStyle);
const hasContent=slot=>slot.assignedNodes({flatten:true}).some(node=>node.nodeType===1||node.textContent.trim());
const put=(node,name,value)=>{if(node.style.getPropertyValue(name)!==value)node.style.setProperty(name,value);};

export class MdChip extends HTMLElement {
  static get observedAttributes() {
    return ['variant','label','icon','trailing-icon','selected','disabled','elevated','removable',
      'expressive','horizontal-arrangement','container-color','content-color',
      'leading-icon-color','trailing-icon-color','dir'];
  }
  constructor() {
    super(); this.attachShadow({mode:'open'}); adoptSheet(this.shadowRoot,chipSheet);
    this._rendered=false; this._pressed=false;
  }
  connectedCallback() {
    if(!this._rendered){this.render();this._rendered=true;}
    this._setup(); this._sync();
  }
  disconnectedCallback() {
    this._abortController?.abort();this._abortController=null;
    this._contentMotion?.dispose();this._shapeMotion?.dispose();
    this._resize?.disconnect();this._themeObserver?.disconnect();this._pressed=false;
    this._shapeComposition=null;this._shapeState=null;
    this._retainedContent?.forEach(owner=>owner.forget());
  }
  attributeChangedCallback(_name,previous,next) {
    if(this._rendered&&previous!==next&&this.isConnected)this._sync();
  }
  _attribute(name,value) { if(value==null)this.removeAttribute(name);else this.setAttribute(name,String(value)); }
  get variant(){return this.getAttribute('variant')||'assist';}
  set variant(value){this._attribute('variant',value);}
  get label(){return this.getAttribute('label')||'';}
  set label(value){this._attribute('label',value);}
  get icon(){return this.getAttribute('icon')||'';}
  set icon(value){this._attribute('icon',value);}
  get trailingIcon(){return this.getAttribute('trailing-icon')||'';}
  set trailingIcon(value){this._attribute('trailing-icon',value);}
  get horizontalArrangement(){return this.getAttribute('horizontal-arrangement')||'compact';}
  set horizontalArrangement(value){this._attribute('horizontal-arrangement',value);}
  get containerColor(){return this.getAttribute('container-color')||'';}
  set containerColor(value){this._attribute('container-color',value);}
  get contentColor(){return this.getAttribute('content-color')||'';}
  set contentColor(value){this._attribute('content-color',value);}
  get leadingIconColor(){return this.getAttribute('leading-icon-color')||'';}
  set leadingIconColor(value){this._attribute('leading-icon-color',value);}
  get trailingIconColor(){return this.getAttribute('trailing-icon-color')||'';}
  set trailingIconColor(value){this._attribute('trailing-icon-color',value);}
  get expressive(){return this.getAttribute('expressive')!=='false';}
  set expressive(value){this._attribute('expressive',value?'true':'false');}
  get selected(){return this.hasAttribute('selected');}
  set selected(value){this.toggleAttribute('selected',Boolean(value));}
  get disabled(){return this.hasAttribute('disabled');}
  set disabled(value){this.toggleAttribute('disabled',Boolean(value));}
  get elevated(){return this.hasAttribute('elevated');}
  set elevated(value){this.toggleAttribute('elevated',Boolean(value));}
  get removable(){return this.getAttribute('removable')!=='false'&&(this.hasAttribute('removable')||chipFamily(this.variant)==='input');}
  set removable(value){this._attribute('removable',value?'':'false');}

  _sync() {
    if(!this.isConnected)return;
    const chip=this._chip,family=chipFamily(this.variant),selectable=family==='filter'||family==='input';
    const state={family,elevated:this.elevated,expressive:this.expressive,enabled:!this.disabled,selected:this.selected};
    const colors=chipColors(state),border=chipBorder(state);
    for(const name of ['assist','filter','input','suggestion'])chip.classList.toggle(name,name===family);
    chip.classList.toggle('selected',selectable&&this.selected);chip.classList.toggle('disabled',this.disabled);
    chip.classList.toggle('elevated',this.elevated&&family!=='input');
    chip.tabIndex=this.disabled?-1:0;chip.setAttribute('aria-disabled',String(this.disabled));
    chip.setAttribute('role',selectable?'checkbox':'button');
    if(selectable)chip.setAttribute('aria-checked',String(this.selected));else chip.removeAttribute('aria-checked');
    put(chip,'background-color',!this.disabled&&this.containerColor||chipCssColor(colors.container));
    put(chip,'color',!this.disabled&&this.contentColor||chipCssColor(colors.label));
    put(chip,'--md-chip-label-color',!this.disabled&&this.contentColor||chipCssColor(colors.label));
    put(chip,'--md-chip-leading-color',!this.disabled&&this.leadingIconColor||chipCssColor(colors.leading));
    put(chip,'--md-chip-trailing-color',!this.disabled&&this.trailingIconColor||chipCssColor(colors.trailing));
    put(chip,'--md-chip-border-width',(border?.width??0)+'px');
    put(chip,'--md-chip-border-color',border?chipCssColor(border.color):'transparent');
    const label=this.shadowRoot.querySelector('.lbl-text');if(label.textContent!==this.label)label.textContent=this.label;
    const avatar=family==='input'&&hasContent(this._avatarSlot),custom=hasContent(this._leadingSlot);
    const glyph=selectable&&this.selected?'check':this.icon;
    this._presence={family,expressive:this.expressive,avatar,leading:custom||Boolean(glyph),
      trailing:this.removable||hasContent(this._trailingSlot)||Boolean(this.trailingIcon)};
    const trailingCustom=hasContent(this._trailingSlot);
    this._retainedContent??=[new ChipRetainedContent(),new ChipRetainedContent()];
    const leadingKind=avatar?'avatar':custom?'custom':glyph?'glyph':null;
    const trailingKind=this.removable?'remove':trailingCustom?'custom':this.trailingIcon?'glyph':null;
    // A retained icon lambda captures its last non-null color. Avatar content
    // has no icon-color provider and continues inheriting the outer label role.
    this._retainedContent[0].update(leadingKind?{kind:leadingKind,text:glyph,color:avatar?null:getComputedStyle(this._leading).color}:null);
    this._retainedContent[1].update(trailingKind?{kind:trailingKind,text:this.trailingIcon,color:getComputedStyle(this._trailing).color}:null);
    this._applyContentLeaves();
    this._elevationMotion?.refresh();this._stateLayer?.refresh();this._removeLayer?.refresh();
    this._measureContent();this._updateShape();
  }

  _applyContentLeaves(values) {
    const present=[this._presence.avatar||this._presence.leading,this._presence.trailing];
    const selectable=['filter','input'].includes(this._presence.family);
    for(const [index,owner]of this._retainedContent.entries()){
      const prefix=index?'trail':'lead',channels=this._contentMotion?.channels;
      const pending=selectable&&(values?.[prefix+'Width']>0||values?.[prefix+'Alpha']>0||
        channels?.[prefix+'Width'].animation||channels?.[prefix+'Alpha'].animation);
      if(!present[index]&&!pending&&values)owner.forget();
      if(!selectable&&!present[index])owner.forget();
    }
    const leading=this._retainedContent[0].value,trailing=this._retainedContent[1].value;
    this._avatarSlot.hidden=leading?.kind!=='avatar';this._leadingSlot.hidden=leading?.kind!=='custom';
    this._leadingText.hidden=leading?.kind!=='glyph';
    if(leading?.kind==='glyph')this._leadingText.textContent=leading.text;
    put(this._leadingContent,'color',leading?.color??'var(--md-chip-label-color)');
    this._trailingSlot.hidden=trailing?.kind!=='custom';this._trailingText.hidden=trailing?.kind!=='glyph';
    if(trailing?.kind==='glyph')this._trailingText.textContent=trailing.text;
    put(this._trailingContent,'color',trailing?.color??'var(--md-chip-trailing-color)');
    this._removeButton.hidden=trailing?.kind!=='remove';
    this._removeButton.disabled=this.disabled||!this.removable;
    this._removeButton.tabIndex=this.disabled||!this.removable?-1:0;
    this._removeButton.inert=!this.removable;
  }

  _measureContent() {
    if(!this.isConnected||!this._presence)return;
    const present=[this._presence.avatar||this._presence.leading,this._presence.trailing];
    const leaves=[this._leadingContent,this._trailingContent];
    const dimensions=leaves.map((node,index)=>{
      return present[index]?[node.offsetWidth,node.offsetHeight]:this._leafSizes?.[index]??[0,0];
    });
    this._leafSizes=dimensions;
    if(!this._contentMotion||this._contentMotion.disposed){
      this._contentMotion=new SelectionMotion(this,{leadWidth:present[0]?dimensions[0][0]:0,leadHeight:present[0]?dimensions[0][1]:0,
        trailWidth:present[1]?dimensions[1][0]:0,trailHeight:present[1]?dimensions[1][1]:0,leadAlpha:Number(present[0]),trailAlpha:Number(present[1])},values=>this._drawContent(values));
    } else {
      const now=performance.now(),channels=this._contentMotion.channels;
      for(let index=0;index<2;index++){
        const prefix=index?'trail':'lead',alpha=prefix+'Alpha',size=[channels[prefix+'Width'],channels[prefix+'Height']];
        if(this._presence.family!=='filter'&&this._presence.family!=='input'){
          size.forEach((channel,axis)=>{channel.target=present[index]?dimensions[index][axis]:0;channel.finish();});
          channels[alpha].target=Number(present[index]);channels[alpha].finish();
        } else {
          const spatialRole=present[index]||this.expressive?'expressiveSpatialFast':'expressiveEffectMedium';
          retargetIntSize(size,[present[index]?dimensions[index][0]:0,dimensions[index][1]],SpringPhysics.getPreset(spatialRole,this),now);
          channels[alpha].to(Number(present[index]),SpringPhysics.getPreset(this.expressive?'expressiveEffectMedium':present[index]?'expressiveEffectSlow':'expressiveEffectFast',this),{now,transition:true});
        }
      }
      if(this._contentMotion.media?.matches)this._contentMotion.finish();else this._contentMotion.tick(now);
    }
  }

  _drawContent(values) {
    if(!this.isConnected||!this._presence)return;
    this._applyContentLeaves(values);
    // The browser owns font/slot metrics. Native policy owns allocation, modifier
    // order and placement; do not subtract icon widths from the label by hand.
    put(this._labelContent,'width','max-content');
    const labelMetrics=getComputedStyle(this._labelContent);
    // Paragraph dimensions round outward. offsetWidth rounds to the nearest
    // pixel and can make a naturally single-line label wrap by a fraction.
    const labelWidth=Math.ceil(parseFloat(labelMetrics.width)||0),labelHeight=Math.ceil(parseFloat(labelMetrics.height)||0);
    const rtl=getComputedStyle(this).direction==='rtl',selectable=['filter','input'].includes(this._presence.family);
    const widths=[Math.max(0,Math.round(values.leadWidth)),Math.max(0,Math.round(values.trailWidth))];
    const input={...this._presence,animated:selectable,rtl,arrangement:this.horizontalArrangement,
      hasLeading:this._presence.avatar||this._presence.leading,hasTrailing:this._presence.trailing,
      leading:this._retainedContent[0].value?this._leafSizes[0][0]:0,leadingHeight:this._leafSizes[0][1],leadingWidth:widths[0],
      trailing:this._retainedContent[1].value?this._leafSizes[1][0]:0,trailingHeight:this._leafSizes[1][1],trailingWidth:widths[1],
      label:labelWidth,labelHeight};
    // A CSS auto width uses max-content as its finite containing-block offer.
    // CSS explicit width supplies tight constraints. The 48px interaction
    // allocation still centers the smaller painted body.
    const intrinsic=chipContentIntrinsic({...input,leading:widths[0],trailing:widths[1]},2147483647).maxWidth;
    put(this._chip,'--md-chip-natural-width',intrinsic+'px');
    const requestedWidth=this.computedStyleMap?.().get('width')?.toString()??'auto';
    put(this._chip,'flex-grow',requestedWidth==='auto'?'0':'1');
    const offeredWidth=this._chip.offsetWidth,css=getComputedStyle(this);
    const requestedHeight=this.computedStyleMap?.().get('height')?.toString()??'auto';
    const maxHeight=requestedHeight==='auto'?(Number.isFinite(parseFloat(css.maxHeight))?Math.round(parseFloat(css.maxHeight)):2147483647):this.clientHeight;
    const layout=chipContentLayout({...input,minWidth:requestedWidth==='auto'?0:offeredWidth,maxWidth:offeredWidth,
      minHeight:requestedHeight==='auto'?0:maxHeight,maxHeight},(id,leaf,c)=>{
      const width=Math.max(c.minWidth,Math.min(c.maxWidth,leaf.main));
      let height=leaf.cross;
      if(id==='labelInk'){put(this._labelContent,'width',width+'px');height=Math.ceil(parseFloat(getComputedStyle(this._labelContent).height)||0);}
      const size={width,height:Math.max(c.minHeight,Math.min(c.maxHeight,height))};
      return {id,size,requested:size,constraints:c,offset:{x:0,y:0},children:[]};
    });
    this._contentLayout=layout;
    put(this._chip,'--md-chip-content-height',layout.size.height+'px');
    for(const [index,node]of [this._leading,this._label,this._trailing].entries()){
      const group=layout.groups[index];
      put(node,'left',group.x+'px');put(node,'top',group.y+'px');put(node,'width',group.width+'px');put(node,'height',group.height+'px');
      if(index!==1){const prefix=index===0?'lead':'trail';
        put(node,'opacity',String(Math.max(0,Math.min(1,values[prefix+'Alpha']))));}
      else put(this._labelContent,'left',((layout.inks[1]?.x??group.x)-group.x)+'px');
    }
    this._paintShape();
  }

  _updateShape() {
    if(!this.isConnected)return;
    const css=getComputedStyle(this),dimension=(name,fallback)=>{const value=parseFloat(css.getPropertyValue(name));return Number.isFinite(value)?value:fallback;};
    const shapes={CornerSmall:{unit:'px',value:dimension('--md-sys-shape-corner-small',8)},
      CornerMedium:{unit:'px',value:dimension('--md-sys-shape-corner-medium',12)},CornerFull:{unit:'percent',value:50}};
    const family=chipFamily(this.variant),morph=this.expressive&&(family==='filter'||family==='input'),now=performance.now();
    const defaults={shape:shapes[morph?'CornerMedium':'CornerSmall'],pressedShape:shapes.CornerSmall,checkedShape:shapes[morph?'CornerFull':'CornerSmall']};
    this._shapeComposition??=new ButtonShapeComposition();
    const state=this._shapeComposition.update(defaults,this._pressed,SpringPhysics.getPreset('expressiveSpatialFast',this),now,this.selected);
    // Chip's outer key(shapes) and rememberAnimatedShape's inner
    // remember(animationSpec) both participate in state replacement.
    if(state!==this._shapeState){this._shapeMotion?.dispose();this._shapeState=state;}
    if(!this._shapeMotion||this._shapeMotion.disposed){
      this._shapeMotion=new SelectionMotion(this,{progress:1},values=>this._paintShape(values.progress));
      this._shapeMotion.channels.progress=this._shapeState.progress;
    }
    if(this._shapeMotion.media?.matches)this._shapeMotion.finish();else this._shapeMotion.tick(now);
  }
  _paintShape(progress) {
    if(!this._shapeState||!this.isConnected)return;
    const shape=this._shapeState.getMorphedShape(performance.now(),progress);
    const radius=buttonCornerRadius(shape,this._chip.offsetWidth,this._chip.offsetHeight);
    put(this._chip,'border-radius',Math.max(0,radius)+'px');
  }
  _pointerInput(event) {
    const type={mouse:'Mouse',touch:'Touch',pen:'Stylus'}[event.pointerType];if(!type)return null;
    const rect=this._chip.getBoundingClientRect(),css=getComputedStyle(this._chip),width=this._chip.offsetWidth,height=this._chip.offsetHeight;
    return {width,height,radius:Math.min(parseFloat(css.borderTopLeftRadius)||0,width/2,height/2),
      x:(event.clientX-rect.left)/(rect.width/width||1),y:(event.clientY-rect.top)/(rect.height/height||1),type};
  }
  _hitTest(event){const input=this._pointerInput(event);return input===null||roundedPointerHit(input)!==null;}

  _setup() {
    this._abortController?.abort();this._abortController=new AbortController();const {signal}=this._abortController;
    for(const slot of this.shadowRoot.querySelectorAll('slot'))slot.addEventListener('slotchange',()=>this._sync(),{signal});
    const refresh=()=>{this._measureContent();this._updateShape();};
    this._resize?.disconnect();this._resize=new ResizeObserver(refresh);
    for(const node of [this._chip,this._labelContent,this._leadingContent,this._trailingContent])this._resize.observe(node);
    document.fonts?.addEventListener('loadingdone',refresh,{signal});
    this._themeObserver?.disconnect();this._themeObserver=new MutationObserver(records=>{
      if(records.some(record=>record.target===this||record.target.contains(this)))this._sync();
    });
    this._themeObserver.observe(document.documentElement,{subtree:true,attributes:true,
      attributeFilter:['style','class','dir','data-motion-scheme','data-theme-scheme']});
    this._elevationMotion=bindButtonElevation(this._chip,{configuration:()=>{
      const native=chipElevation({family:chipFamily(this.variant),elevated:this.elevated});
      return [native[0],native[1],native[2],native[3],native[5],native[4]];
    },MotionClass:ChipElevationMotion,disabled:()=>this.disabled,hitTest:event=>this._hitTest(event),signal});
    this._stateLayer=bindStateLayer(this._chip,{disabled:()=>this.disabled,hitTest:event=>this._hitTest(event),property:'--md-chip-state-alpha',signal});
    this._pressBinding=bindPress(this._chip,{disabled:()=>this.disabled,keyboardActivation:true,
      ignoreEvent:event=>nestedInteractiveEvent(event,this._chip),
      pointerPolicy:{input:event=>this._pointerInput(event),hitTest:event=>this._hitTest(event),outOfBounds:event=>{
        const input=this._pointerInput(event);return input!==null&&capturedPointerOutOfBounds(input);
      }},onInteraction:({type,press})=>this._elevationMotion.press(type==='press',press),
      onPress:event=>{this._pressed=true;this._updateShape();createRipple(event,this._chip);},
      onRelease:()=>{this._pressed=false;this._updateShape();},onActivate:()=>{
        if(this.disabled)return;
        if(['filter','input'].includes(chipFamily(this.variant))){this.selected=!this.selected;
          this.dispatchEvent(new CustomEvent('change',{detail:{selected:this.selected,label:this.label},bubbles:true,composed:true}));}
      },signal});
    this._removeLayer=bindStateLayer(this._removeButton,{disabled:()=>this.disabled||!this.removable,property:'--md-chip-remove-alpha',signal});
    bindPress(this._removeButton,{disabled:()=>this.disabled||!this.removable,onPress:event=>createRipple(event,this._removeButton),onActivate:()=>{
      if(this.dispatchEvent(new CustomEvent('remove',{detail:{label:this.label},bubbles:true,composed:true,cancelable:true})))this.remove();
    },signal});
    this._removeButton.addEventListener('click',event=>event.stopPropagation(),{signal});
  }
  render() {
    const adopted=this.shadowRoot.adoptedStyleSheets?.length;
    this.shadowRoot.innerHTML=`${adopted?'':`<style>${defaultStyle}</style>`}
      <div class="chip" part="chip"><span class="hit" aria-hidden="true"></span><div class="content">
        <span class="leading-ico" part="leading-icon" aria-hidden="true"><span class="leading-content">
          <span class="glyph leading-icon-text"></span><slot name="leading-icon"></slot><slot name="avatar"></slot>
        </span></span>
        <span class="lbl" part="label"><span class="label-content"><span class="lbl-text"></span><slot></slot></span></span>
        <span class="trailing-ico" part="trailing-icon"><span class="trailing-content">
          <span class="glyph trailing-icon-text" aria-hidden="true"></span><slot name="trailing-icon"></slot>
          <button class="remove-btn" part="remove-button" type="button" aria-label="Remove"><span class="glyph" aria-hidden="true">close</span></button>
        </span></span>
      </div></div>`;
    const query=selector=>this.shadowRoot.querySelector(selector);
    this._chip=query('.chip');this._label=query('.lbl');this._labelContent=query('.label-content');
    this._leading=query('.leading-ico');this._leadingContent=query('.leading-content');this._leadingText=query('.leading-icon-text');
    this._trailing=query('.trailing-ico');this._trailingContent=query('.trailing-content');this._trailingText=query('.trailing-icon-text');
    this._leadingSlot=query('slot[name=leading-icon]');this._avatarSlot=query('slot[name=avatar]');this._trailingSlot=query('slot[name=trailing-icon]');
    this._removeButton=query('.remove-btn');
  }
}
if(!customElements.get('md-chip'))customElements.define('md-chip',MdChip);
