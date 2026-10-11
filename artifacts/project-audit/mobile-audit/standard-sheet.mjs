import{chromium,firefox,webkit}from'playwright';import{serve}from'./server.mjs';import{tap,route,swipe}from'../../../test/browser/mobile.mjs';import assert from'node:assert/strict';
const s=await serve();
try{for(const[engine,type]of Object.entries({chromium,firefox,webkit})){
 const b=await type.launch();try{const p=await b.newPage({viewport:{width:384,height:853},hasTouch:true,...(engine==='chromium'?{isMobile:true}:{}),deviceScaleFactor:2.8125});await p.goto(s.url);await p.waitForFunction(()=>document.documentElement.hasAttribute('data-showcase-ready'));await route(p,'side-sheet');
 const h=p.locator('[data-toggle-side-sheet]'),sheet=p.locator('#standard-side-sheet-demo');
 for(let i=0;i<3;i++){const before=await sheet.evaluate(h=>h.open);await tap(h);await p.waitForTimeout(900);assert.equal(await sheet.evaluate(h=>h.open),!before);}
 const pane=p.locator('.side-sheet-preview');await pane.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(400);const r=await pane.boundingBox();await swipe(p,engine,r.x+100,r.y+r.height*.5,-90,0);await p.waitForTimeout(2500);await pane.evaluate(e=>e.scrollLeft=0);await p.waitForTimeout(500);const before=await sheet.evaluate(h=>h.open);await tap(h);await p.waitForTimeout(900);assert.equal(await sheet.evaluate(h=>h.open),!before);console.log(engine,'4 trusted touch toggles including after pan passed');
 }finally{await b.close()}
}}finally{await s.close()}
