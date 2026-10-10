import {focusPointerTarget} from './focus-indication.js';
import {hitPointerTree} from './pointer-tree.js';
import {domPointerInput} from './dom-pointer-geometry.js';

const routers=new WeakMap(),events=new WeakMap(),clicks=new WeakMap();
const parent=node=>node.assignedSlot||node.parentElement||node.getRootNode?.().host||null;
function ancestors(node){const path=[];for(;node;node=parent(node))path.push(node);return path;}
function deepHit(root,event){let hit=root.elementFromPoint?.(event.clientX,event.clientY);while(hit?.shadowRoot){const inner=hit.shadowRoot.elementFromPoint?.(event.clientX,event.clientY);if(!inner||inner===hit)break;hit=inner;}return hit;}
function renderedTopLayer(node,style){
  // overlay stays auto during a discrete exit transition after :popover-open
  // or :modal ceases to match. Older engines expose only the state selectors.
  return style.overlay==='auto'||!('overlay' in style)&&node.matches(':popover-open,:modal,:fullscreen');
}
function paintAncestors(node,style){
  const path=[];
  for(;node;node=parent(node)){path.push(node);if(renderedTopLayer(node,style(node)))break;}
  return path;
}
function visible(entry,event,path,style){
  if(!entry.el.isConnected||!entry.el.getClientRects().length)return false;
  const css=style(entry.el);if(css.visibility==='hidden'||css.visibility==='collapse'||css.pointerEvents==='none'&&!(entry.precise&&entry.disabled()))return false;
  for(const node of path.slice(1)){
    const css=style(node);if(css.display==='contents')continue;
    const r=node.getBoundingClientRect(),clipX=css.overflowX!=='visible',clipY=css.overflowY!=='visible';
    if(clipX&&(event.clientX<r.left||event.clientX>=r.right)||clipY&&(event.clientY<r.top||event.clientY>=r.bottom))return false;
  }
  return true;
}
function domOrder(a,b){
  const ap=ancestors(a).reverse(),bp=ancestors(b).reverse();let i=0;while(i<ap.length&&i<bp.length&&ap[i]===bp[i])i++;
  if(!i||i===ap.length||i===bp.length)return 0;
  const owner=ap[i-1],children=owner.assignedElements?.({flatten:true})??[...(owner.shadowRoot??owner).children];
  return children.indexOf(ap[i])-children.indexOf(bp[i]);
}
class PointerRouter{
  constructor(document){
    this.document=document;this.entries=new Set();this.byElement=new WeakMap();this.pointers=new Map();this.hoverObservers=new Map();this.hoverPaths=new Map();this.abort=new AbortController();
    const options={capture:true,signal:this.abort.signal};
    for(const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture']){
      document.addEventListener(type,event=>this.pointer(event),options);
      document.addEventListener(type,event=>this.handle(event),{signal:this.abort.signal});
    }
    document.addEventListener('click',event=>this.click(event),options);
    for(const type of ['pointerover','pointermove'])document.addEventListener(type,event=>this.hover(event),options);
    document.addEventListener('pointerout',event=>{if(event.isTrusted&&event.pointerType!=='touch'&&!event.buttons){if(event.relatedTarget===null)this.clearHover(event.pointerId,event);else this.hover(event);}},options);
    document.addEventListener('pointercancel',event=>{if(event.isTrusted)this.clearHover(event.pointerId,event);},options);
    document.defaultView.addEventListener('blur',event=>{
      if(event.target!==document.defaultView)return;
      for(const id of [...this.hoverPaths.keys()])this.clearHover(id,event);
      // Element focus transfers also pass through Window's capture listener.
      // Only a window blur cancels the retained pointer. Keep its cancellation
      // marker until up/cancel/click or a fresh down replaces the stream.
      for(const [id,record]of this.pointers){record.hoverCanceled=true;record.blocked=true;record.owner?.handlers.pointercancel?.({pointerId:id});}
    },options);
  }
  geometry(entry,event){return entry.input?.(event)??{...domPointerInput(entry.el,event),radius:0,clipping:false,target:0};}
  tree(event,{painted=false}={}){
    const styles=new Map(),style=node=>{let css=styles.get(node);if(!css){css=getComputedStyle(node);styles.set(node,css);}return css;};
    // Like Compose hit testing, only nodes whose bounds reach the pointer take
    // part: a touch may extend a small control to its 48dp minimum (at most
    // 24dp beyond its box). Every other node is skipped before any style,
    // clip or paint-order work, so a page of controls costs what the few
    // under the pointer cost.
    const reach=event.pointerType==='touch'?24:8;
    const candidates=[...this.entries].filter(entry=>{
      // Content skipped by content-visibility (off screen) cannot be under the pointer.
      if(entry.el.checkVisibility&&!entry.el.checkVisibility({contentVisibilityAuto:true}))return false;
      const r=entry.el.getBoundingClientRect();
      return event.clientX>=r.left-reach&&event.clientX<=r.right+reach&&event.clientY>=r.top-reach&&event.clientY<=r.bottom+reach;});
    const paths=new Map(candidates.map(entry=>[entry,paintAncestors(entry.el,style)]));
    const layer=path=>{const root=path.at(-1);return root&&renderedTopLayer(root,style(root))?root:null;};
    const hitLayer=layer(paintAncestors(deepHit(this.document,event),style));
    // Top-layer boxes are root siblings, independent of their DOM ancestors.
    // Their controls cannot be clipped by, or compete with, another layer.
    // getClientRects also excludes display:none shadow-including ancestors.
    let entries=candidates.filter(entry=>layer(paths.get(entry))===hitLayer&&visible(entry,event,paths.get(entry),style));
    const nodes=new Map(),stacks=new Map(),rendered=new Map();
    const rank=entry=>{
      const ranks=[];let present=true;
      for(let node=entry.el;node;){const root=node.getRootNode();let stack=stacks.get(root);if(!stack){stack=root.elementsFromPoint?.(event.clientX,event.clientY)??[];stacks.set(root,stack);}let index=stack.findIndex(hit=>hit===node||node.contains(hit));// Disabled clickable nodes remain in the native hit tree. Their web
        // button can suppress DOM input; outer host hit lists still enforce
        // ancestor clips and foreground paint order.
        if(root.elementsFromPoint&&index<0&&!(node===entry.el&&root.host&&entry.precise&&entry.disabled()&&style(node).pointerEvents==='none'))present=false;ranks.unshift(index<0?stack.length:index);node=root.host;}
      rendered.set(entry,present);
      return ranks;
    };
    const ranks=new Map(entries.map(entry=>[entry,rank(entry)]));
    // Hover has no minimum-target expansion. Native DOM hit lists account for
    // CSS ancestor shape clips that a rectangular overflow check cannot see.
    if(painted)entries=entries.filter(entry=>!entry.precise||rendered.get(entry));
    entries.sort((a,b)=>{const ar=ranks.get(a),br=ranks.get(b);for(let i=0;i<Math.min(ar.length,br.length);i++)if(ar[i]!==br[i])return br[i]-ar[i];return domOrder(a.el,b.el);});
    const root={id:null,width:0,height:0,radius:0,pointer:false,clipping:false,inner:true,children:[]};
    for(const entry of entries){const input=this.geometry(entry,event);if(input)nodes.set(entry,{id:entry,input,pointer:entry.pointerNode(),clipping:input.clipping??true,inner:true,children:[]});}
    for(const entry of entries){const node=nodes.get(entry);if(!node)continue;let owner=null;for(const p of paths.get(entry).slice(1)){const candidate=this.byElement.get(p);if(nodes.has(candidate)){owner=nodes.get(candidate);break;}}(owner??root).children.push(node);}
    const type={mouse:'Mouse',touch:'Touch',pen:'Stylus'}[event.pointerType];
    return hitPointerTree(root,{x:event.clientX,y:event.clientY,type}).path;
  }
  hover(event){
    if(!this.hoverObservers.size||!event.isTrusted||event.pointerType==='touch')return;
    this.retireUnpressedHover(event.pointerId);
    if(event.buttons){this.capturedHover(event);return;}
    // One input dispatches pointerout, pointerover and pointermove with the
    // same time and position; its hover path is resolved once.
    const input=`${event.pointerId}|${event.timeStamp}|${event.clientX}|${event.clientY}`;
    if(this.hoverInput===input)return;
    this.hoverInput=input;
    const hit=deepHit(this.document,event),physical=ancestors(hit).map(node=>this.byElement.get(node)).find(Boolean);
    let path=this.tree(event,{painted:true});const owner=path.at(-1);
    if(owner&&!physical&&!ancestors(owner.el).includes(hit)&&!ancestors(hit).includes(owner.el))path=[];
    this.hoverPaths.set(event.pointerId,new Set(path));this.paintHover(event);
  }
  retireUnpressedHover(pointerId){
    // A DOM hover event represents the current hovering device. Retire an
    // older unpressed device rather than preserving a stale geometric Enter.
    // Active down paths retain their independent cancellation/ownership record.
    for(const id of this.hoverPaths.keys())if(id!==pointerId){const record=this.pointers.get(id);if(!record?.pressed||record.hoverCanceled)this.hoverPaths.delete(id);}
  }
  capturedHover(event){
    this.hoverInput=null;
    const record=this.pointers.get(event.pointerId);
    if(!record)return;
    const root=this.document.documentElement;
    const inWindow=event.clientX>=0&&event.clientY>=0&&event.clientX<=root.clientWidth&&event.clientY<=root.clientHeight;
    const path=record.hoverCanceled||!inWindow?[]:record.path.filter(entry=>{
      if(!this.entries.has(entry)||!entry.el.isConnected||!entry.el.getClientRects().length)return false;
      const input=this.geometry(entry,event);
      // HitPathTracker uses the retained down path and inclusive rectangular
      // local bounds during a press; an outline is used by fresh hit testing.
      return input&&input.x>=0&&input.y>=0&&input.x<=input.width&&input.y<=input.height;
    });
    this.hoverPaths.set(event.pointerId,new Set(path));this.paintHover(event);
  }
  clearHover(id,event){this.hoverInput=null;this.hoverPaths.delete(id);this.paintHover(event);}
  paintHover(event){
    for(const [el,observers]of this.hoverObservers){
      const entry=this.byElement.get(el),active=!!entry&&[...this.hoverPaths.values()].some(path=>path.has(entry));
      if(entry&&entry.hoverActive===active)continue;
      if(entry)entry.hoverActive=active;
      for(const observer of observers)observer(active,event,true);
    }
  }
  pointer(event){
    if(!event.isTrusted)return;
    let record=this.pointers.get(event.pointerId);
    if(event.type==='pointerdown'){
      if(event.isPrimary===false||event.pointerType==='mouse'&&event.button!==0)return;
      const registered=event.composedPath().map(node=>this.byElement.get(node)).filter(Boolean),domOrigin=registered[0],origin=registered.find(entry=>entry.precise);
      if(origin?.ignoreEvent(event)||!origin&&domOrigin?.ignoreEvent(event)||!origin&&!domOrigin&&event.pointerType!=='touch')return;
      if(record)clearTimeout(record.timer);
      const path=this.tree(event),owner=path.at(-1)??null;
      if(!origin){
        // Native minimum bounds include their zero-distance edge; DOM boxes
        // are half open. At that edge the browser can target the containing
        // layout instead of a pseudo-element. Preserve unrelated foreground UI.
        const hit=deepHit(this.document,event);
        if(!owner?.precise||!ancestors(owner.el).includes(hit))return;
        if(hit.matches?.('button,input,select,textarea,a[href],summary,[contenteditable="true"],[role="button"],[role="checkbox"],[role="radio"],[role="switch"]')&&!this.byElement.has(hit))return;
      }
      const receivers=new Set(registered);
      for(const node of ancestors(owner?.el)){const entry=this.byElement.get(node);if(entry)receivers.add(entry);}
      record={owner,receivers,path,pressed:true,hoverCanceled:false,blocked:true,released:false,mismatch:owner!==(domOrigin??origin),timer:null};this.pointers.set(event.pointerId,record);
      if(record.mismatch)event.preventDefault();
    }
    if(!record)return;
    events.set(event,{record,handled:false});
    if(event.type==='pointercancel'){record.pressed=false;record.hoverCanceled=true;record.blocked=true;this.expire(event.pointerId,record);}
    if(event.type==='pointerup'){record.pressed=false;this.expire(event.pointerId,record);}
  }
  expire(id,record){clearTimeout(record.timer);record.timer=setTimeout(()=>{if(this.pointers.get(id)===record)this.pointers.delete(id);this.retire();},1000);}
  handle(event){
    const routed=events.get(event);if(!routed)return false;
    if(routed.handled)return true;routed.handled=true;
    const {record}=routed,owner=record.owner;
    if(!owner||!this.entries.has(owner))return true;
    const accepted=owner.handlers[event.type]?.(event);
    if(event.type==='pointerdown'){
      record.blocked=accepted!==true||record.owner!==owner||!owner.el.isConnected;
      if(!record.blocked&&record.mismatch)focusPointerTarget(owner.el);
    }else if(event.type==='pointerup'){
      record.released=accepted===true;record.blocked||=!record.released;
    }
    return true;
  }
  ownsAt(entry,event){
    const record=this.pointers.get(event.pointerId);if(record?.owner!==entry)return null;
    const hit=deepHit(this.document,event),physical=ancestors(hit).map(node=>this.byElement.get(node)).find(Boolean);
    const containing=ancestors(entry.el).includes(hit)&&(!hit.matches?.('button,input,select,textarea,a[href],summary,[contenteditable="true"],[role="button"],[role="checkbox"],[role="radio"],[role="switch"]')||this.byElement.has(hit));
    // PointerInputEventProcessor hit-tests a pressed pointer on down, not up.
    // Keep that path across layout changes; only unrelated foreground UI is
    // rejected by this DOM adapter. Bounds cancellation still occurs on moves.
    return containing||!!physical&&(record.receivers.has(physical)||ancestors(physical.el).includes(entry.el));
  }
  click(event){
    if(!event.isTrusted||event.detail===0)return;
    const record=this.pointers.get(event.pointerId);if(!record)return;
    this.pointers.delete(event.pointerId);clearTimeout(record.timer);
    const owner=record.owner;
    if(record.blocked||!record.released||!owner||!this.entries.has(owner)||!owner.canActivate()){
      event.preventDefault();event.stopImmediatePropagation();this.retire();return;
    }
    clicks.set(event,owner);
    if(!event.composedPath().includes(owner.el)){
      event.preventDefault();event.stopImmediatePropagation();
      const EventClass=this.document.defaultView.PointerEvent??this.document.defaultView.MouseEvent;
      const init={bubbles:true,cancelable:true,composed:true};
      for(const key of ['detail','clientX','clientY','screenX','screenY','button','buttons','ctrlKey','shiftKey','altKey','metaKey','pointerId','pointerType','isPrimary','width','height','pressure'])init[key]=event[key];
      const click=new EventClass('click',init);clicks.set(click,owner);owner.el.dispatchEvent(click);
    }
    this.retire();
  }
  remove(entry){
    this.entries.delete(entry);this.byElement.delete(entry.el);this.hoverInput=null;
    for(const path of this.hoverPaths.values())path.delete(entry);
    for(const observer of this.hoverObservers.get(entry.el)??[])observer(false);
    for(const record of this.pointers.values()){record.receivers.delete(entry);if(record.owner===entry){record.owner=null;record.blocked=true;}}
    this.retire();
  }
  retire(){if(!this.entries.size&&!this.pointers.size&&!this.hoverObservers.size){this.abort.abort();routers.delete(this.document);}}
}

/** Resolve trusted DOM targeting before a registered press binding consumes it.
 * Untrusted events remain explicitly already routed; keys/semantic clicks bypass
 * this pointer adapter. Each document's registry retires with its last binding.
 */
export function registerPointerBinding(el,{input,precise=false,disabled=()=>false,pointerNode=()=>true,ignoreEvent=()=>false,handlers,canActivate,signal}={}){
  const document=el.ownerDocument;if(!document?.defaultView||signal?.aborted)return {handle:()=>false,cancel(){},ownsAt:()=>null,acceptClick:()=>true};
  let router=routers.get(document);if(!router){router=new PointerRouter(document);routers.set(document,router);}
  const entry={el,input,precise,disabled,enabled:!disabled(),pointerNode,ignoreEvent,handlers,canActivate};router.entries.add(entry);router.byElement.set(el,entry);router.hoverInput=null;
  signal?.addEventListener('abort',()=>router.remove(entry),{once:true});
  return {
    refresh(){
      const enabled=!disabled();if(enabled===entry.enabled)return;entry.enabled=enabled;router.hoverInput=null;
      // AbstractClickableNode disposes hover interactions on disable while
      // HitPathTracker retains its geometric in/out state. Re-enable does not
      // manufacture a second Enter for a pointer which has never left.
      // Only retire an Enter owned by this router. Explicitly injected
      // collector interactions have an independent source/exit lifecycle.
      if(!enabled&&entry.hoverActive)for(const observer of router.hoverObservers.get(el)??[])observer(false,undefined,true);
    },
    handle:event=>router.handle(event),
    ownsAt:event=>router.ownsAt(entry,event),
    acceptClick:event=>!clicks.has(event)||clicks.get(event)===entry,
    cancel(){for(const record of router.pointers.values())if(record.owner===entry)record.blocked=true;}
  };
}


/** Route fresh hover through the shared hit tree, and pressed hover through
 * its retained down path with inclusive rectangular local bounds. Authored
 * events and unregistered bindings retain explicit direct DOM delivery.
 */
export function bindPointerHover(el,{hitTest=()=>true,onHover,signal}={}){
  if(signal?.aborted)return {dispose(){}};
  const document=el.ownerDocument;let router=null,disposed=false;
  const update=(active,event,routed=false)=>{if(!disposed)onHover(active&&(routed||hitTest(event)),event);};
  if(document?.defaultView){
    router=routers.get(document);if(!router){router=new PointerRouter(document);routers.set(document,router);}
    let observers=router.hoverObservers.get(el);if(!observers){observers=new Set();router.hoverObservers.set(el,observers);}observers.add(update);
  }
  const direct=event=>!event.isTrusted||!router?.byElement.has(el);
  const move=event=>{if(event.pointerType!=='touch'&&direct(event))update(true,event);};
  const leave=event=>{if(direct(event))update(false,event);};
  el.addEventListener('pointerenter',move,{signal});el.addEventListener('pointermove',move,{signal});el.addEventListener('pointerleave',leave,{signal});
  function dispose(){
    if(disposed)return;disposed=true;
    el.removeEventListener('pointerenter',move);el.removeEventListener('pointermove',move);el.removeEventListener('pointerleave',leave);
    const observers=router?.hoverObservers.get(el);observers?.delete(update);if(!observers?.size)router?.hoverObservers.delete(el);router?.retire();
  }
  signal?.addEventListener('abort',dispose,{once:true});return {dispose};
}
