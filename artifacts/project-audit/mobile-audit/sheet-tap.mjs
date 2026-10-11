import{chromium}from'playwright';import{serve}from'./server.mjs';import{tap,route,swipe}from'../../../test/browser/mobile.mjs';
const s=await serve(),b=await chromium.launch(),p=await b.newPage({viewport:{width:384,height:853},hasTouch:true,isMobile:true,deviceScaleFactor:2.8125});
try{
 await p.goto(s.url);await p.waitForFunction(()=>document.documentElement.hasAttribute('data-showcase-ready'));await route(p,'side-sheet');
 await p.evaluate(()=>{window.ev=[];for(const type of['pointerdown','pointerup','pointercancel','click','change'])window.addEventListener(type,e=>ev.push({type,path:e.composedPath().slice(0,6).map(n=>n.localName||n.nodeName),prevented:e.defaultPrevented}),true)});
 const h=p.locator('[data-toggle-side-sheet]');
 const pane=p.locator('.side-sheet-preview');await pane.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(400);const pb=await pane.boundingBox();await swipe(p,'chromium',pb.x+100,pb.y+pb.height*.5,-90,0);await p.waitForTimeout(500);await pane.evaluate(e=>e.scrollLeft=0);await p.waitForTimeout(300);
 for(const mode of['host','native','keyboard']){
  if(mode==='host')await tap(h);else if(mode==='native')await tap(h.locator('.btn'));else{await h.locator('.btn').focus();await p.keyboard.press('Space')}
  await p.waitForTimeout(1000);console.log(mode,JSON.stringify(await h.evaluate(h=>{const n=h.shadowRoot.querySelector('.btn'),r=n.getBoundingClientRect(),e={clientX:r.x+r.width/2,clientY:r.y+r.height/2,pointerType:'touch'};return{selected:h.selected,events:ev,button:r.toJSON(),host:h.getBoundingClientRect().toJSON(),input:h._surface.pointerInput(e),hit:h._surface.hitTest(e),html:n.outerHTML}})));await p.evaluate(()=>ev=[]);
 }
}finally{await b.close();await s.close()}
