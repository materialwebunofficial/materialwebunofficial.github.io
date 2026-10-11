import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import{fileURLToPath}from'node:url';import{chromium}from'playwright';
import{serve}from'./server.mjs';import{tap,route,swipe,popupBounds}from'../../../test/browser/mobile.mjs';
async function heldTap(locator,cdp){await locator.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await locator.page().waitForTimeout(200);const r=await locator.boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await locator.page().waitForTimeout(80);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
const server=await serve(),browser=await chromium.launch(),out=path.dirname(fileURLToPath(import.meta.url));
const page=await browser.newPage({viewport:{width:384,height:853},deviceScaleFactor:2.8125,isMobile:true,hasTouch:true}),report={checks:[],errors:[]};
const check=(ok,name)=>{assert.ok(ok,name);report.checks.push(name)};
page.on('pageerror',e=>report.errors.push(e.message));
try{
 await page.goto(server.url);await page.waitForFunction(()=>document.documentElement.hasAttribute('data-showcase-ready'));await page.evaluate(()=>document.fonts.ready);
 const cdp=await page.context().newCDPSession(page);
 for(const theme of ['light','dark']){
  await page.evaluate(async theme=>{document.documentElement.dataset.theme=theme;const m=await import('/dist/md3-expressive.esm.js');m.applyDynamicTheme(m.getActiveSeedHex(),theme==='dark')},theme);await page.waitForTimeout(1400);
  await route(page,'home');
  for(const seed of await page.locator('#home-seed-chips md-chip').all()){
   await tap(seed);await page.waitForTimeout(500);check(await seed.evaluate(h=>h.selected),`${theme}: seed touch selection commits`);
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${theme}: seed controls wrap within the page`);
  }
  await route(page,'tabs');const tabs=page.locator('#travel-tabs');await tap(tabs.locator('[role=tab]').nth(2));
  check(await tabs.evaluate(h=>h.selected===2),`${theme}: primary tab touch selects Explore`);
  await route(page,'sliders');const slider=page.locator('md-slider[aria-label="Continuous selection"]');
  await slider.evaluate(e=>e.scrollIntoView({block:'center'}));const sb=await slider.locator('.slider-root').boundingBox();
  await swipe(page,'chromium',sb.x+sb.width*.65,sb.y+sb.height/2,-sb.width*.4,0);
  check(await slider.evaluate(h=>h.value<50),`${theme}: horizontal touch drag updates slider`);
  await route(page,'carousel');const carousel=page.locator('md-carousel[layout="uncontained"]');await carousel.evaluate(e=>e.scrollIntoView({block:'center'}));
  const cb=await carousel.locator('.viewport').boundingBox(),before=await carousel.evaluate(h=>h._scroll);
  await swipe(page,'chromium',cb.x+cb.width*.8,cb.y+cb.height*.5,-cb.width*.6,0);await page.waitForTimeout(900);
  const after=await carousel.evaluate(h=>h._scroll);check(after!==before,`${theme}: carousel responds to a horizontal swipe`);
  await route(page,'side-sheet');const pane=page.locator('.side-sheet-preview');await pane.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForTimeout(400);const pb=await pane.boundingBox();
  // A sheet owns its horizontal dismiss drag; pan the adjacent content pane.
  await swipe(page,'chromium',pb.x+Math.min(100,pb.width*.3),pb.y+pb.height*.5,-90,0);
  check(await pane.evaluate(e=>e.scrollLeft>0),`${theme}: both panes of the standard sheet example are reachable`);
  await page.waitForTimeout(2500);await pane.evaluate(e=>e.scrollLeft=0);await page.waitForTimeout(500);await heldTap(page.locator('[data-toggle-side-sheet="standard-side-sheet-demo"]'),cdp);
  await page.waitForTimeout(800);
  check(await page.locator('#standard-side-sheet-demo').evaluate(h=>!h.open),`${theme}: standard side sheet toggles from its first pane`);
  await tap(page.locator('[data-toggle-side-sheet="standard-side-sheet-demo"]'));
 }
 // Available viewport simulations are independent of a physical Android IME.
 for(const [width,height,scale]of [[384,620,1],[384,520,1],[853,384,1],[384,853,1.3],[320,640,1.5]]){
  await page.setViewportSize({width,height});await cdp.send('Emulation.setEmulatedOSTextScale',{scale});await page.waitForTimeout(500);
  for(const [id,opener,target,surface]of [
   ['dialogs','#open-dialog-btn','#sample-dialog','.dialog'],['date-pickers','#open-date-picker-btn','#sample-date-picker','.picker-dialog'],
   ['time-pickers','#open-time-picker-btn','#sample-time-picker','.picker-dialog'],['bottom-sheet','#open-bottom-sheet-btn','#sample-bottom-sheet','.sheet'],
   ['side-sheet','#open-side-sheet-btn','#sample-side-sheet','.sheet'],['search','md-search-bar[full-screen] input','md-search-bar[full-screen]','.fs-surface']]){
   report.current={width,height,scale,id};await route(page,id);await tap(page.locator(opener));await page.waitForTimeout(1200);
   await popupBounds(page.locator(target+' '+surface),width,height);check(true,`${width}x${height} text scale ${scale}: ${id} stays within viewport width`);
   if(width===384&&height===620){
    await page.setViewportSize({width:853,height:384});await page.waitForTimeout(500);await popupBounds(page.locator(target+' '+surface),853,384);
    await page.setViewportSize({width,height});await page.waitForTimeout(500);check(true,`${id}: open surface follows orientation changes`);
   }
   check(await page.locator(target).evaluate(h=>{const d=h.shadowRoot.querySelector('dialog');return d.scrollLeft===0&&d.scrollTop===0}),`${width}x${height} text scale ${scale}: ${id} outer window has no extra scrolling`);
   await page.keyboard.press('Escape');await page.waitForTimeout(1000);if(await page.locator(target+' dialog[open]').count()){await page.keyboard.press('Escape');await page.waitForTimeout(1000)}
   check(await page.locator(target+' dialog[open]').count()===0,`${id}: cancels after viewport/text change`);
  }
 }
 await cdp.send('Emulation.setEmulatedOSTextScale',{scale:1});await page.setViewportSize({width:384,height:853});
 await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:24,bottom:24,left:0,right:0}});await route(page,'home');await page.waitForTimeout(500);
 const safe=await page.evaluate(()=>({top:getComputedStyle(document.querySelector('main')||document.querySelector('.app-content')).paddingTop,bottom:getComputedStyle(document.querySelector('main')||document.querySelector('.app-content')).paddingBottom}));report.safeArea=safe;
 check(safe.top==='88px'&&safe.bottom==='88px','24px safe-area overrides reserve space around both fixed bars');
 await page.screenshot({path:path.join(out,'safe-area-home.png')});
 await page.emulateMedia({reducedMotion:'reduce'});await route(page,'dialogs');await tap(page.locator('#open-dialog-btn'));await page.waitForTimeout(100);
 check(await page.locator('#sample-dialog dialog[open]').count()===1,'reduced motion: dialog opens and remains usable');await page.keyboard.press('Escape');await page.waitForTimeout(100);
 check(await page.locator('#sample-dialog dialog[open]').count()===0,'reduced motion: dialog closes promptly');
 assert.deepEqual(report.errors,[]);console.log(`${report.checks.length} additional touch, viewport, text-scale and reduced-motion checks passed`);
}catch(e){report.failure=e.stack;await page.screenshot({path:path.join(out,'conditions-failure.png')});throw e}
finally{fs.writeFileSync(path.join(out,'conditions-held-settled.json'),JSON.stringify(report,null,2));await browser.close();await server.close()}
