/**
 * AndroidX SingleRowTopAppBar / TwoRowsTopAppBar, a095da93.
 * DOM text/slot measurements, CSS constraints and safe-area insets are platform
 * adapters. Source measurement/placement is in top-app-bar-layout.js.
 */
import {createComponentSheet,adoptSheet} from '../utils/styles.js';
import {observeThemeContext} from '../theme/theme-context.js';
import {AsStateColorMotion as ColorMotion} from '../motion/animate-as-state.js';
import {resolveComposeColor,composeColorCSS,composeColorWithAlpha} from '../motion/compose-color-css.js';
import {ComposeColor} from '../motion/compose-color.js';
import {topAppBarContentLayout} from './top-app-bar-layout.js';
import {topAppBarColorFraction,topAppBarTitleAlpha} from '../motion/top-app-bar-motion.js';
import {minimumInteractiveLayout} from './row-column-layout.js';
import {normalizeToolbarPadding,serializeToolbarPadding} from './toolbar-padding.js';
import {HorizontalTouchSlop,pointerSlop} from '../motion/touch-slop.js';
import {PointerVelocityTracker} from '../motion/velocity-tracker.js';
import {ScrollPosition} from '../motion/scroll-position.js';

const style=`
 :host{display:block;box-sizing:border-box;width:100%;min-width:0;height:var(--_top-app-bar-height,auto);touch-action:var(--_top-app-bar-touch-action,auto);-webkit-tap-highlight-color:transparent}
 :host([hidden]){display:none!important}
 .bar{box-sizing:border-box;width:100%;background:var(--md-sys-color-surface);border:0;border-radius:0;box-shadow:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) 0 env(safe-area-inset-left,0px)}
 .viewport{position:relative;width:100%;overflow:clip}
 .row{position:absolute;box-sizing:border-box;width:100%;overflow:clip}
 .group,.titles,.line{position:absolute;box-sizing:border-box;min-width:0;margin:0;padding:0}
 .line{width:max-content;white-space:nowrap}
 .headline,.subtitle{display:block;white-space:pre;overflow:hidden;text-overflow:ellipsis}
 .headline-line{font:var(--md-sys-typescale-title-large);letter-spacing:var(--md-sys-typescale-title-large-tracking)}
 .subtitle-line{font:var(--md-sys-typescale-label-medium);letter-spacing:var(--md-sys-typescale-label-medium-tracking)}
 .expanded.medium .headline-line{font:var(--md-sys-typescale-headline-small);letter-spacing:var(--md-sys-typescale-headline-small-tracking)}
 .expanded.large .headline-line,.expanded.medium-flexible .headline-line{font:var(--md-sys-typescale-headline-medium);letter-spacing:var(--md-sys-typescale-headline-medium-tracking)}
 .expanded.medium-flexible .subtitle-line{font:var(--md-sys-typescale-label-large);letter-spacing:var(--md-sys-typescale-label-large-tracking)}
 .expanded.large-flexible .headline-line{font:var(--md-sys-typescale-display-small);letter-spacing:var(--md-sys-typescale-display-small-tracking)}
 .expanded.large-flexible .subtitle-line{font:var(--md-sys-typescale-title-medium);letter-spacing:var(--md-sys-typescale-title-medium-tracking)}
 .baseline{display:inline-block;width:0;height:0;vertical-align:baseline}
 slot{display:contents}
 ::slotted(*){flex:none}
 ::slotted([hidden]){display:none!important}
 .color-probe{position:absolute;visibility:hidden;pointer-events:none}
 [hidden]{display:none!important}
`;
const sheet=createComponentSheet(style),INF=2147483647,f=Math.fround;
const variants=['small','center-aligned','medium','large','medium-flexible','large-flexible'];
const make=(tag,name,parent)=>{const n=document.createElement(tag);n.className=name;parent.append(n);return n;};
const write=(n,key,value)=>{if(n.style[key]!==value)n.style[key]=value;};
const rect=(n,p)=>{for(const[key,value]of Object.entries({left:p.x,top:p.y,width:p.width,height:p.height}))write(n,key,value+'px');};
const find=(n,id)=>n.id===id?n:n.children.map(p=>find(p.node,id)).find(Boolean);
const validColor=(value,fallback)=>value&&CSS.supports('color',value)?value:fallback;

export class MdTopAppBar extends HTMLElement{
 static get observedAttributes(){return ['variant','headline','subtitle','scrolled','expanded-height','collapsed-height','height-offset','overlapped-fraction','title-horizontal-alignment','content-padding','container-color','scrolled-container-color','content-color','navigation-icon-content-color','title-content-color','action-icon-content-color','subtitle-content-color','aria-label'];}
 constructor(){super();this.attachShadow({mode:'open'});adoptSheet(this.shadowRoot,sheet);this._rendered=false;this._queued=false;this._scrollBehavior=null;this._scrollTarget=null;}
 _set(name,value){if(value==null)this.removeAttribute(name);else this.setAttribute(name,String(value));}
 get variant(){const v=this.getAttribute('variant');return variants.includes(v)?v:'small';} set variant(v){this._set('variant',v);}
 get headline(){return this.getAttribute('headline')||'';} set headline(v){this._set('headline',v);}
 get subtitle(){return this.getAttribute('subtitle')||'';} set subtitle(v){this._set('subtitle',v);}
 get scrolled(){return this.hasAttribute('scrolled');} set scrolled(v){this.toggleAttribute('scrolled',!!v);}
 get twoRows(){return !['small','center-aligned'].includes(this.variant);}
 get _flexible(){return this.variant.endsWith('-flexible');}
 get _subtitleProvided(){return (!this.twoRows||this._flexible)&&(this.hasAttribute('subtitle')||!!this.querySelector('[slot="subtitle"]'));}
 _height(name,fallback){const raw=this.getAttribute(name),n=f(Number(raw));return raw!==null&&Number.isFinite(n)?n:fallback;}
 get _defaultExpandedHeight(){return {small:64,'center-aligned':64,medium:112,large:152,'medium-flexible':this._subtitleProvided?136:112,'large-flexible':this._subtitleProvided?152:120}[this.variant];}
 get expandedHeight(){return Math.max(this.twoRows?this.collapsedHeight:-Infinity,this._height('expanded-height',this._defaultExpandedHeight));}
 set expandedHeight(v){if(v!=null&&!Number.isNaN(Number(v))&&Number(v)!==Infinity&&(!Number.isFinite(f(Number(v)))||(this.twoRows&&Number(v)<this.collapsedHeight)))throw new RangeError('Expanded height must be finite and at least the collapsed height');this._set('expanded-height',v);}
 get collapsedHeight(){return this._height('collapsed-height',64);}
 set collapsedHeight(v){if(v!=null&&!Number.isNaN(Number(v))&&Number(v)!==Infinity){const n=f(Number(v));if(!Number.isFinite(n)||(this.twoRows&&n>this._height('expanded-height',this._defaultExpandedHeight)))throw new RangeError('Collapsed height must be finite and at most the expanded height');}this._set('collapsed-height',v);}
 get heightOffset(){if(this._scrollBehavior)return this._scrollBehavior.state.heightOffset;const n=f(Number(this.getAttribute('height-offset')));return Number.isFinite(n)?Math.max(this.heightOffsetLimit,Math.min(0,n)):0;} set heightOffset(v){if(this._scrollBehavior)this._scrollBehavior.state.heightOffset=v==null?0:v;else this._set('height-offset',v);}
 get heightOffsetLimit(){return this._scrollBehavior?.state.heightOffsetLimit??-(this.twoRows?this.expandedHeight-this.collapsedHeight:Math.max(0,this.expandedHeight));}
 get collapsedFraction(){return this.heightOffsetLimit===0?0:f(this.heightOffset/this.heightOffsetLimit);}
 get overlappedFraction(){if(this.scrolled)return 1;if(this._scrollBehavior)return this._scrollBehavior.state.overlappedFraction;const n=f(Number(this.getAttribute('overlapped-fraction')));return Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;} set overlappedFraction(v){this._set('overlapped-fraction',v);}
 get scrollBehavior(){return this._scrollBehavior;}
 set scrollBehavior(value){if(value!=null&&(!value.state||!['onPreScroll','onPostScroll','onPostFling','settle'].every(key=>typeof value[key]==='function')||!['subscribe','updateHeightOffsetLimit'].every(key=>typeof value.state[key]==='function')))throw new TypeError('Expected a TopAppBarScrollBehavior');this._cancelScrollSettle();this._stopState?.();this._scrollBehavior=value??null;this._measuredScrollSize=null;this._bindScrollState();if(this.isConnected){this._configureScroll();this._queue();}}
 get scrollTarget(){return this._scrollTarget;}
 set scrollTarget(value){if(value!=null&&value!==window&&!(value instanceof HTMLElement))throw new TypeError('Expected an HTMLElement or window scroll target');this._cancelScrollSettle();this._scrollTarget=value??null;if(this.isConnected)this._configureScroll();}
 get scrollState(){return this._scrollBehavior?.state??null;}
 preScroll(available={x:0,y:0}){this._cancelScrollSettle();const result=this._scrollBehavior?.onPreScroll(available)||{x:0,y:0};this._sync();return result;}
 postScroll(consumed={x:0,y:0},available={x:0,y:0}){this._cancelScrollSettle();const result=this._scrollBehavior?.onPostScroll(consumed,available)||{x:0,y:0};this._sync();return result;}
 postFling(consumed={x:0,y:0},available={x:0,y:0}){return this._runScrollSettle(available.y??0,true,consumed);}
 get titleHorizontalAlignment(){if(this.variant==='center-aligned')return 'center';if(['medium','large'].includes(this.variant))return 'start';const v=this.getAttribute('title-horizontal-alignment');return ['start','center','end'].includes(v)?v:'start';} set titleHorizontalAlignment(v){this._set('title-horizontal-alignment',v);}
 get contentPadding(){try{return normalizeToolbarPadding(this.getAttribute('content-padding')??0);}catch{return normalizeToolbarPadding(0);}} set contentPadding(v){this._set('content-padding',v==null?null:serializeToolbarPadding(v));}
 get containerColor(){return this.getAttribute('container-color')||'';} set containerColor(v){this._set('container-color',v);}
 get scrolledContainerColor(){return this.getAttribute('scrolled-container-color')||'';} set scrolledContainerColor(v){this._set('scrolled-container-color',v);}
 get contentColor(){return this.getAttribute('content-color')||'';} set contentColor(v){this._set('content-color',v);}
 get navigationIconContentColor(){return this.getAttribute('navigation-icon-content-color')||'';} set navigationIconContentColor(v){this._set('navigation-icon-content-color',v);}
 get titleContentColor(){return this.getAttribute('title-content-color')||'';} set titleContentColor(v){this._set('title-content-color',v);}
 get actionIconContentColor(){return this.getAttribute('action-icon-content-color')||'';} set actionIconContentColor(v){this._set('action-icon-content-color',v);}
 get subtitleContentColor(){return this.getAttribute('subtitle-content-color')||'';} set subtitleContentColor(v){this._set('subtitle-content-color',v);}
 // A bar that has never been laid out creates its state and color owners while
 // connecting but is measured by its first resize observation (before it is
 // painted), so connecting does not force a layout. A reconnected bar lays out at once.
 connectedCallback(){if(!this._rendered)this.render();this._measuredScrollSize=null;this.setupInteractions();this._bindScrollState();this._sync({layout:!!this._laidOut});this._configureScroll();}
 disconnectedCallback(){this._abort?.abort();this._abort=null;this._resize?.disconnect();this._mutation?.disconnect();this._color?.dispose();this._color=null;this._stopState?.();this._stopState=null;this._scrollAbort?.abort();this._cancelScrollSettle();}
 attributeChangedCallback(name,oldValue,value){if(oldValue===value)return;if(name==='height-offset'&&this._scrollBehavior)this._scrollBehavior.state.heightOffset=value===null?0:Number(value);if(this._rendered&&this.isConnected)this._sync();}
 render(){
  this._bar=make('div','bar',this.shadowRoot);this._bar.setAttribute('part','bar');this._bar.setAttribute('role','group');
  this._viewport=make('div','viewport',this._bar);this._viewport.setAttribute('part','content');
  this._top=make('div','row collapsed',this._viewport);this._bottom=make('div','row expanded',this._viewport);
  this._leading=make('div','group leading',this._top);this._trailing=make('div','group trailing',this._top);
  const slot=(name,parent)=>{const n=make('slot','',parent);n.name=name;return n;};
  this._navigation=slot('leading',this._leading);this._actions=slot('trailing',this._trailing);
  this._titles={};
  for(const[name,parent]of [['top',this._top],['bottom',this._bottom]]){
   const group=make('div','titles',parent),records=[];
   for(const kind of ['headline','subtitle']){
    const line=make('div','line '+kind+'-line',group),s=slot(name==='top'?(kind==='headline'?'collapsed-title':'collapsed-subtitle'):(kind==='headline'?'title':'subtitle'),line);
    const label=make('span',kind,s),text=document.createTextNode('');label.append(text);const baseline=make('span','baseline',label);baseline.setAttribute('aria-hidden','true');records.push({line,slot:s,label,text,baseline,kind});
   }
   this._titles[name]={group,records};
  }
  this._probe=make('span','color-probe',this.shadowRoot);this._probe.setAttribute('aria-hidden','true');
  this._sizes=make('style','',this.shadowRoot);this._sizes.textContent=':host{}';this._rendered=true;
 }
 _queue(){if(this._queued||!this.isConnected)return;this._queued=true;queueMicrotask(()=>{if(!this._queued)return;this._queued=false;if(this.isConnected)this._sync();});}
 _clearRules(){while(this._sizes.sheet.cssRules.length>1)this._sizes.sheet.deleteRule(1);}
 _sync({layout=true}={}){
  // A synchronous pre/post-scroll render already consumes queued state work.
  this._queued=false;
  if(!this._rendered||!this.isConnected)return;
  const position=this._scrollPosition,before=position?.captureLayout();
  try{
  this._bottom.className='row expanded '+this.variant;this._bottom.hidden=!this.twoRows;
  this._bar.setAttribute('aria-label',this.getAttribute('aria-label')||'Top app bar');
  const subtitle=this._subtitleProvided;
  for(const[name,title]of Object.entries(this._titles))for(const record of title.records){
   const value=record.kind==='headline'?this.headline:this.subtitle;if(record.text.data!==value)record.text.data=value;
   record.line.hidden=record.kind==='subtitle'&&!subtitle;
   // Independent custom expanded/collapsed compositions retain their own DOM.
   // A single-row caller owns the main title/subtitle slots.
   const slotName=!this.twoRows&&name==='top'?(record.kind==='headline'?'title':'subtitle'):name==='top'?(record.kind==='headline'?'collapsed-title':'collapsed-subtitle'):(record.kind==='headline'?'title':'subtitle');
   if(record.slot.name!==slotName)record.slot.name=slotName;
   if(name==='bottom'&&!this.twoRows)record.slot.name='unused-'+record.kind;
  }
  if(layout){this._layout();this._laidOut=true;}this._colors();
  }finally{if(position===this._scrollPosition)position?.restoreLayout(before);}
 }
 _colors(){
  const css=getComputedStyle(this),resolve=(value,fallback)=>{return composeColorCSS(resolveComposeColor(this._probe,validColor(value,fallback)));};
  const role=name=>css.getPropertyValue('--md-sys-color-'+name).trim();
  const container=resolve(this.containerColor,role('surface')),scrolled=resolve(this.scrolledContainerColor,role('surface-container'));
  for(const[node,value,fallback]of [[this._leading,this.navigationIconContentColor,'on-surface'],[this._trailing,this.actionIconContentColor,'on-surface-variant']]){
   const color=resolve(value,validColor(this.contentColor,role(fallback)));write(node,'color',color);
   node.style.setProperty('--md-icon-button-content-color',color);node.style.setProperty('--md-icon-button-outline-color',color);node.style.setProperty('--md-icon-button-disabled-content-color',composeColorWithAlpha(this._probe,color,.38));
  }
  for(const title of Object.values(this._titles))for(const record of title.records)write(record.line,'color',resolve(record.kind==='headline'?this.titleContentColor:this.subtitleContentColor,validColor(this.contentColor,role(record.kind==='headline'?'on-surface':'on-surface-variant'))));
  if(this.twoRows){
   this._color?.dispose();this._color=null;
   const fraction=this.scrolled?1:this.collapsedFraction,progress=topAppBarColorFraction(fraction),a=resolveComposeColor(this._probe,container),b=resolveComposeColor(this._probe,scrolled);
   write(this._bar,'backgroundColor',composeColorCSS(ComposeColor.lerp(a,b,progress)));
   write(this._titles.top.group,'opacity',String(topAppBarTitleAlpha(this.collapsedFraction)));write(this._titles.bottom.group,'opacity',String(f(1-this.collapsedFraction)));
   this._titles.top.group.setAttribute('aria-hidden',String(this.collapsedFraction<.5));this._titles.bottom.group.setAttribute('aria-hidden',String(this.collapsedFraction>=.5));
   this._titles.top.group.inert=this.collapsedFraction<.5;this._titles.bottom.group.inert=this.collapsedFraction>=.5;
  }else{
   const target=this.overlappedFraction>.01?scrolled:container;
   if(!this._color)this._color=new ColorMotion(this,this._probe,target,c=>write(this._bar,'backgroundColor',c));else this._color.set(target);
   write(this._titles.top.group,'opacity','1');this._titles.top.group.removeAttribute('aria-hidden');this._titles.top.group.inert=false;
  }
 }
 _leaf(n,id){
  const r=n.getBoundingClientRect(),button=n.localName==='md-icon-button'?n.shadowRoot?.querySelector('button'):null,css=getComputedStyle(n);
  const b=button?getComputedStyle(button):null,minimum=parseFloat(css.getPropertyValue('--md-minimum-interactive-component-size'));
  const baseline=Number(n.getAttribute('data-last-baseline')),weight=Number(n.getAttribute('data-app-bar-weight'));
  return{id,width:Math.round(r.width),height:Math.round(r.height),line:n.hasAttribute('data-last-baseline')&&Number.isFinite(baseline)?Math.round(baseline):null,weight:weight>0?f(Math.min(weight,3.4028234663852886e38)):0,fill:n.getAttribute('data-app-bar-fill')!=='false',ink:b?{width:Math.round(parseFloat(b.width)),height:Math.round(parseFloat(b.height)),minimum:Number.isFinite(minimum)?minimum:48}:null};
 }
 _layout(){
  this._clearRules();const rtl=getComputedStyle(this).direction==='rtl',sizing=this._sizes.sheet.cssRules[0].style;
  const dimension=()=>{const s=getComputedStyle(this);return Math.max(0,Math.round(parseFloat(s.height)||0)-(s.boxSizing==='border-box'?(parseFloat(s.paddingTop)||0)+(parseFloat(s.paddingBottom)||0)+(parseFloat(s.borderTopWidth)||0)+(parseFloat(s.borderBottomWidth)||0):0));};
  sizing.setProperty('--_top-app-bar-height','0px');const minHeight=dimension();sizing.setProperty('--_top-app-bar-height','1000000px');const cap=dimension(),maxHeight=cap>=1000000?INF:Math.max(minHeight,cap);sizing.removeProperty('--_top-app-bar-height');
  const inset=Math.round(parseFloat(getComputedStyle(this._bar).paddingTop)||0);
  const width=Math.max(0,Math.round(this._viewport.getBoundingClientRect().width)),entries=[],collect=(slot,prefix)=>slot.assignedElements().filter(n=>getComputedStyle(n).display!=='none').map((n,i)=>{const input=this._leaf(n,prefix+i);entries.push({n,input});return input;});
  const navigation=collect(this._navigation,'navigation-'),actions=collect(this._actions,'action-');
  const rows={};let y=0;
  for(const name of this.twoRows?['top','bottom']:['top']){
   const title=this._titles[name],input={};
   for(const record of title.records){
    rect(record.line,{x:0,y:0,width:0,height:0});write(record.line,'width','max-content');write(record.line,'height','auto');
    const elements=collect(record.slot,name+'-'+record.kind+'-');
    if(elements.length)input[record.kind]=elements;
    else{const r=record.label.getBoundingClientRect(),baseline=record.baseline.getBoundingClientRect();input[record.kind]=[{id:name+'-'+record.kind,width:Math.ceil(r.width),height:Math.round(r.height),line:Math.round(baseline.top-r.top)}];}
   }
   const height=name==='bottom'?f(this.expandedHeight-this.collapsedHeight):this.twoRows?this.collapsedHeight:this.expandedHeight;
   const available=maxHeight===INF?INF:Math.max(0,maxHeight-inset-y),minimum=this.twoRows?0:Math.max(0,minHeight-inset);
   const layout=topAppBarContentLayout({id:name+'-row',minWidth:width,maxWidth:width,minHeight:minimum,maxHeight:available,rtl,height,scrolledOffset:name==='bottom'||!this.twoRows?this.heightOffset:0,alignment:this.titleHorizontalAlignment,vertical:name==='bottom'?'bottom':'center',titleBottomPadding:name==='bottom'?(this.variant.startsWith('medium')?24:28):0,contentPadding:this.twoRows?0:this.contentPadding,navigation:name==='top'?navigation:[],actions:name==='top'?actions:[],title:input.headline,subtitle:input.subtitle,subtitleProvided:this._subtitleProvided});
   rows[name]=layout;const row=name==='top'?this._top:this._bottom;rect(row,{x:0,y,...layout.size});
   const positions=layout.placements;rect(title.group,positions.title);
   for(const record of title.records){const box=positions[record.kind==='headline'?'headline-box':'subtitle-box']||positions['title-box'];if(!box)continue;const leaf=positions[name+'-'+record.kind]||box;rect(record.line,{x:leaf.x-positions.title.x,y:leaf.y-positions.title.y,width:leaf.width,height:box.height});}
   if(name==='top'){rect(this._leading,positions.navigationIcon);rect(this._trailing,positions.actionIcons);}
   for(const {n,input:leafInput}of entries){const leaf=find(layout.node,leafInput.id),p=positions[leafInput.id];if(!leaf||!p)continue;
    const parent=n.slot==='leading'?positions.navigationIcon:n.slot==='trailing'?positions.actionIcons:positions[n.slot.includes('subtitle')?'subtitle-box':'headline-box']||positions['title-box'];if(!parent)continue;
    const body=leafInput.ink?minimumInteractiveLayout({...leafInput.ink,...leaf.constraints}).body:null;
    const native=body?`--md-toolbar-control-position:absolute;--md-toolbar-control-x:${body.x}px;--md-toolbar-control-y:${body.y}px;--md-toolbar-control-layout-width:${leaf.size.width}px;--md-toolbar-control-layout-height:${leaf.size.height}px;`:'';
    const index=[...this.children].indexOf(n)+1;
    this._sizes.sheet.insertRule(`::slotted(:nth-child(${index})){position:absolute!important;left:${p.x-parent.x-leaf.offset.x}px!important;top:${p.y-parent.y-leaf.offset.y}px!important;width:${leaf.size.width}px!important;height:${leaf.size.height}px!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;--md-toolbar-control-min-width:${leaf.constraints.minWidth}px;--md-toolbar-control-min-height:${leaf.constraints.minHeight}px;--md-toolbar-control-max-width:${leaf.constraints.maxWidth}px;--md-toolbar-control-max-height:${leaf.constraints.maxHeight}px;${native}}`,this._sizes.sheet.cssRules.length);
   }
   y+=layout.size.height;
  }
  const observed=new Set(entries.flatMap(({n})=>[n,n.shadowRoot?.querySelector('button')].filter(Boolean)));
  for(const n of this._observedChildren||[])if(!observed.has(n))this._resize?.unobserve(n);
  for(const n of observed)if(!this._observedChildren?.has(n))this._resize?.observe(n);
  this._observedChildren=observed;
  this._layoutRows=rows;write(this._viewport,'height',y+'px');sizing.setProperty('--_top-app-bar-height',Math.max(minHeight,y+inset)+'px');
  // onSizeChanged belongs to the scrolling row, after window-inset padding.
  // Changing only the limit must not reassign/clamp the source height offset.
  if(this._scrollBehavior){const size=rows[this.twoRows?'bottom':'top'].size,key=`${this.twoRows}:${size.width}:${size.height}`;if(key!==this._measuredScrollSize){this._measuredScrollSize=key;this._scrollBehavior.state.updateHeightOffsetLimit(size.height);}}
 }
 _bindScrollState(){this._stopState?.();this._stopState=this.isConnected&&this._scrollBehavior?this._scrollBehavior.state.subscribe(()=>this._queue()):null;}
 _configureScroll(){
  this._scrollAbort?.abort();if(!this.isConnected||!this._rendered)return;
  this._scrollAbort=new AbortController();const{signal}=this._scrollAbort,target=this._scrollTarget;
  const position=this._scrollPosition=new ScrollPosition(target),scrolling=()=>position.element;
  target?.addEventListener('scroll',()=>{const delta=position.consume();if(!delta)return;const b=this._scrollBehavior;if(!b)return;
   // Programmatic/touch scroll reports consumed DOM movement only. The precise
   // pre/post pipeline remains available through preScroll/postScroll.
   if(b.kind==='enter-always')b.onPreScroll({x:0,y:delta});this.postScroll({x:0,y:delta});
  },{signal,passive:true});
  target?.addEventListener('wheel',event=>{
   const b=this._scrollBehavior,n=scrolling();if(!b||!n||event.defaultPrevented||event.ctrlKey||!event.deltaY)return;
   position.begin();
   // Wheel input provides a pre-scroll delta. Route it through the actual source
   // connection, then measure what the DOM consumed and report the remainder.
   const unit=event.deltaMode===1?parseFloat(getComputedStyle(n).lineHeight)||16:event.deltaMode===2?n.clientHeight:1,available=f(-event.deltaY*unit),pre=this.preScroll({x:0,y:available}),remaining=f(available-pre.y),before=n.scrollTop;
   event.preventDefault();n.scrollTo({top:before-remaining,left:n.scrollLeft+event.deltaX*unit,behavior:'instant'});const consumed=f(before-n.scrollTop);position.commit();
   this.postScroll({x:0,y:consumed},{x:0,y:f(remaining-consumed)});
  },{signal,passive:false});
  target?.addEventListener('scrollend',()=>{if(position.end())this.postFling();},{signal,passive:true});
  this.addEventListener('pointerdown',event=>this._barDragStart(event),{signal});this.addEventListener('pointermove',event=>this._barDragMove(event),{signal});
  const stop=event=>this._barDragStop(event);for(const type of ['pointerup','pointercancel','lostpointercapture'])this.addEventListener(type,stop,{signal});
  this.addEventListener('click',event=>{if(this._suppressDragClick&&event.detail!==0){this._suppressDragClick=false;event.preventDefault();event.stopImmediatePropagation();}},{signal,capture:true});
  this._reduced=matchMedia('(prefers-reduced-motion: reduce)');this._reduced.addEventListener('change',()=>{if(this._reduced.matches){this._scrollSettle?.finish();this._scrollTick(performance.now());}},{signal});
  this._sizes.sheet.cssRules[0].style.setProperty('--_top-app-bar-touch-action',this._scrollBehavior&&!this._scrollBehavior.isPinned?'pan-x':'auto');
 }
 _cancelScrollSettle(){
  if(this._scrollRaf)cancelAnimationFrame(this._scrollRaf);this._scrollRaf=0;this._scrollSettle=null;this._scrollResolve?.({x:0,y:0});this._scrollResolve=null;
  const drag=this._drag;this._drag=null;if(drag&&this.hasPointerCapture(drag.id))this.releasePointerCapture(drag.id);
 }
 _runScrollSettle(velocity,fromContent=false,consumed={x:0,y:0}){
  this._cancelScrollSettle();if(!this.isConnected||!this._scrollBehavior)return Promise.resolve({x:0,y:0});
  const motion=this._scrollSettle=fromContent?this._scrollBehavior.onPostFling(consumed,{x:0,y:velocity}):this._scrollBehavior.settle(velocity);
  const promise=new Promise(resolve=>this._scrollResolve=resolve);if(this._reduced?.matches)motion.finish();
  if(motion.done)this._scrollTick(performance.now());else this._scrollRaf=requestAnimationFrame(time=>this._scrollTick(time));return promise;
 }
 _scrollTick(now){
  this._scrollRaf=0;const motion=this._scrollSettle;if(!motion)return;motion.sampleFrame(now,()=>this._sync());this._sync();
  if(motion.done){this._scrollSettle=null;this._scrollResolve?.({x:0,y:motion.returnedVelocity});this._scrollResolve=null;}else this._scrollRaf=requestAnimationFrame(time=>this._scrollTick(time));
 }
 _barDragStart(event){
  if(!this._scrollBehavior||this._scrollBehavior.isPinned||event.defaultPrevented||event.button!==0||event.isPrimary===false)return;
  this._cancelScrollSettle();const tracker=new PointerVelocityTracker();tracker.down(event.timeStamp,event.clientY);this._drag={id:event.pointerId,last:event.clientY,active:false,slop:new HorizontalTouchSlop(pointerSlop(event.pointerType)),tracker};this._suppressDragClick=false;
 }
 _barDragMove(event){
  const drag=this._drag;if(!drag||drag.id!==event.pointerId)return;if(event.defaultPrevented){if(drag.active)this._runScrollSettle(0);else this._cancelScrollSettle();return;}
  const delta=event.clientY-drag.last;drag.last=event.clientY;
  for(const sample of event.getCoalescedEvents?.()||[]){if(sample.timeStamp===event.timeStamp&&sample.clientY===event.clientY)continue;drag.tracker.move(sample.timeStamp,sample.clientY);}drag.tracker.move(event.timeStamp,event.clientY);
  let amount=delta;if(!drag.active){amount=drag.slop.add(delta);if(amount===null)return;drag.active=true;try{this.setPointerCapture(event.pointerId);}catch{}}
  event.preventDefault();this._scrollBehavior.state.heightOffset=f(this.heightOffset+amount);this._suppressDragClick=true;this._sync();
 }
 _barDragStop(event){
  if(event.type==='lostpointercapture'&&event.target!==this)return;const drag=this._drag;if(!drag||drag.id!==event.pointerId)return;this._drag=null;
  if(this.hasPointerCapture(event.pointerId))this.releasePointerCapture(event.pointerId);if(drag.active)this._runScrollSettle(event.type==='pointerup'?drag.tracker.up(event.timeStamp):0);
 }
 setupInteractions(){
  this._abort?.abort();this._resize?.disconnect();this._mutation?.disconnect();this._abort=new AbortController();const{signal}=this._abort;
  for(const slot of this.shadowRoot.querySelectorAll('slot'))slot.addEventListener('slotchange',()=>this._queue(),{signal});
  this._observedChildren=new Set();this._resize=new ResizeObserver(()=>this._queue());this._resize.observe(this);
  this._mutation=new MutationObserver(()=>this._queue());this._mutation.observe(this,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['slot','size','variant','width','style','class','disabled','hidden','label','icon','data-last-baseline','data-app-bar-weight','data-app-bar-fill']});
  const stopTheme=observeThemeContext(this,()=>this._queue());signal.addEventListener('abort',stopTheme,{once:true});
  document.fonts?.addEventListener('loadingdone',()=>this._queue(),{signal});document.fonts?.ready.then(()=>{if(!signal.aborted)this._queue();});
  this._bar.addEventListener('click',event=>{
   if(event.defaultPrevented)return;const path=event.composedPath(),node=path.find(n=>n?.assignedSlot?.getRootNode()===this.shadowRoot);
   if(!node||!['leading','trailing'].includes(node.slot)||node.disabled||node.hasAttribute('disabled')||!path.some(n=>n?.matches?.('button,a[href],md-icon-button,[role="button"]')))return;
   this.dispatchEvent(new CustomEvent(node.slot==='leading'?'navigation-click':'action',{bubbles:true,composed:true,detail:{action:node.getAttribute('data-action')||node.getAttribute('aria-label')||node.textContent.trim()}}));
  },{signal});
 }
}
if(!customElements.get('md-top-app-bar'))customElements.define('md-top-app-bar',MdTopAppBar);
