// DOM remeasurement/clamping is not a nested-scroll gesture. Keep the browser
// offset through a component layout, then absorb only that layout displacement.
// Source pre/post consumption and settling remain with the native controllers.
export class ScrollPosition {
 constructor(target){this.target=target;this.last=this.element?.scrollTop??0;this.pending=false;}
 get element(){return this.target===globalThis.window?document.scrollingElement:this.target;}
 consume(){const current=this.element?.scrollTop??0,delta=Math.fround(this.last-current);this.last=current;if(delta)this.pending=true;return delta;}
 commit(){this.last=this.element?.scrollTop??0;}
 begin(){this.pending=true;}
 end(){const pending=this.pending;this.pending=false;return pending;}
 captureLayout(){const element=this.element;return element?{element,top:element.scrollTop}:null;}
 restoreLayout(before){
  if(!before||before.element!==this.element)return;
  // CSS reverse scrolling may expose negative offsets; the DOM owns the sign.
  const element=before.element,maximum=Math.max(0,element.scrollHeight-element.clientHeight),wanted=Math.min(maximum,Math.max(-maximum,before.top));
  if(element.scrollTop!==wanted)element.scrollTop=wanted;
  this.last+=element.scrollTop-before.top;
 }
}
