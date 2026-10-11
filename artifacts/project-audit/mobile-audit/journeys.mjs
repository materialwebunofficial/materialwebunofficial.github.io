import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import {chromium,firefox,webkit} from 'playwright';
import {listenBrowserTestServer} from '../../../scripts/browser-test-server.mjs';
const root=process.cwd(),out=path.join(root,'artifacts/project-audit/mobile-audit');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream'});res.end(err?'Not found':data);});});
await listenBrowserTestServer(server);const base=`http://127.0.0.1:${server.address().port}`;
const engine=process.env.ENGINE||'chromium',browser=await({chromium,firefox,webkit})[engine].launch();
const report={engine,cases:[],errors:[]};
async function tap(page,locator){await locator.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForTimeout(100);const b=await locator.boundingBox();await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);}
async function swipe(page,x,y,dy){
 if(engine!=='chromium')return;
 const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+dy*i/12}]});await page.waitForTimeout(16);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await page.waitForTimeout(120);
}
try{
for(const [width,height] of (process.env.COMPACT?'390x844':process.env.SIZES||'320x640,390x844,412x915,844x390,600x960,1024x768').split(',').map(s=>s.split('x').map(Number))){
 const page=await browser.newPage({viewport:{width,height},hasTouch:true,deviceScaleFactor:width<600?2.625:1,...(engine==='firefox'?{}:{isMobile:width<600})});
 page.on('pageerror',e=>report.errors.push({width,height,message:e.message}));
 await page.goto(base);await page.waitForFunction(()=>document.documentElement.hasAttribute('data-showcase-ready'));await page.evaluate(()=>document.fonts.ready);
 for(const theme of ['light','dark']){
  await page.evaluate(async theme=>{document.documentElement.setAttribute('data-theme',theme);const m=await import('/dist/md3-expressive.esm.js');m.applyDynamicTheme(m.getActiveSeedHex(),theme==='dark');},theme);
  for(const [id,opener,target,surface] of [
   ['dialogs','#open-dialog-btn','#sample-dialog','.dialog'],['bottom-sheet','#open-bottom-sheet-btn','#sample-bottom-sheet','.sheet'],
   ['side-sheet','#open-side-sheet-btn','#sample-side-sheet','.sheet'],['date-pickers','#open-date-picker-btn','#sample-date-picker','.picker-dialog'],
   ['time-pickers','#open-time-picker-btn','#sample-time-picker','.picker-dialog'],['nav-drawer','[data-open-drawer="modal-drawer-demo"]','#modal-drawer-demo','.drawer'],
   ['nav-rail','[data-open-rail="modal-rail-demo"]','#modal-rail-demo','.rail']]){
   const entry={width,height,theme,id};
   try{
    await page.evaluate(id=>{location.hash=id},id);await page.waitForTimeout(150);
    await page.locator(opener).scrollIntoViewIfNeeded();await page.waitForTimeout(150);
    await page.locator(opener).evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForTimeout(150);
    entry.beforeScroll=await page.evaluate(()=>scrollY);await tap(page,page.locator(opener));
    await page.waitForTimeout(1150);
    entry.open=await page.locator(target).evaluate((host,surface)=>{
     const el=host.shadowRoot.querySelector(surface),win=host.shadowRoot.querySelector('dialog'),b=el?.getBoundingClientRect();
     const rect=b?{x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom}:null;
     return {attribute:host.open??host.expanded,window:win?.open,windowScroll:win?[win.scrollLeft,win.scrollTop]:null,rect,scrollY,overflow:el?el.scrollWidth-el.clientWidth:null,color:el?getComputedStyle(el).color:null,background:el?getComputedStyle(el).backgroundColor:null,bodyOverflow:getComputedStyle(document.body).overflow};
    },surface);
    await page.screenshot({path:path.join(out,`${engine}-${theme}-${width}x${height}-${id}.png`)});
    await swipe(page,width-5,Math.min(height-30,150),Math.min(220,height-190));
    entry.afterBackgroundSwipe=await page.evaluate(()=>scrollY);
    const close=page.locator(target+' md-icon-button.close');
    // A real Escape key also verifies the browser's modal cancel integration.
    await page.keyboard.press('Escape');await page.waitForTimeout(1150);
    const still=await page.locator(target).evaluate(host=>!!host.shadowRoot.querySelector('dialog[open]'));
    if(still){await page.keyboard.press('Escape');await page.waitForTimeout(1150);}
    entry.closed=await page.locator(target).evaluate(host=>!host.shadowRoot.querySelector('dialog[open]'));
    entry.afterCloseScroll=await page.evaluate(()=>scrollY);
   }catch(e){entry.error=e.message;await page.evaluate(()=>{for(const host of document.querySelectorAll('md-dialog,md-date-picker,md-time-picker,md-bottom-sheet,md-side-sheet,md-navigation-drawer,md-navigation-rail'))if(host.open||host.expanded){host.close?.();host.collapse?.();}}).catch(()=>{});}
   report.cases.push(entry);fs.writeFileSync(path.join(out,`journeys-${engine}.json`),JSON.stringify(report,null,2));
   console.log(JSON.stringify(entry));
  }
 }
 await page.close();
}
}finally{await browser.close();await new Promise(r=>server.close(r));}
