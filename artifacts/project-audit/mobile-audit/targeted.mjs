import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {chromium,firefox} from 'playwright';
import {listenBrowserTestServer} from '../../../scripts/browser-test-server.mjs';
const root=process.cwd(),out=path.join(root,'artifacts/project-audit/mobile-audit');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream'});res.end(e?'Not found':b);});});
await listenBrowserTestServer(server);const base=`http://127.0.0.1:${server.address().port}`;
try{
 const browser=await firefox.launch();const page=await browser.newPage({viewport:{width:320,height:640},hasTouch:true});
 await page.addInitScript(()=>{window.inputEvents=[];for(const type of ['pointerdown','pointerup','click'])window.addEventListener(type,e=>inputEvents.push({type,path:e.composedPath().slice(0,6).map(n=>n.localName||n.nodeName),detail:e.detail}),true)});
 await page.goto(base);await page.waitForFunction(()=>document.documentElement.hasAttribute('data-showcase-ready'));await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>location.hash='nav-drawer');await page.waitForTimeout(400);
 const button=page.locator('[data-open-drawer="modal-drawer-demo"]');
 for(const mode of ['original','pointer-events-none']){
  if(mode!=='original')await button.evaluate(host=>{const style=document.createElement('style');style.textContent='.label-slot{pointer-events:none} .label-slot::slotted(*){pointer-events:auto}';host.shadowRoot.append(style)});
  await button.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await page.evaluate(()=>inputEvents.length=0);await button.tap();await page.waitForTimeout(800);
  console.log(mode,await page.evaluate(()=>({open:document.getElementById('modal-drawer-demo').open,events:inputEvents})));
  await page.keyboard.press('Escape');await page.waitForTimeout(800);
 }
 await page.evaluate(()=>location.hash='time-pickers');await page.waitForTimeout(500);
 for(const picker of await page.locator('md-time-picker[inline]').all()){
  await picker.scrollIntoViewIfNeeded();await page.waitForTimeout(300);
  console.log('firefox inline',await picker.evaluate(h=>({host:h.getBoundingClientRect().toJSON(),nodes:[...h.shadowRoot.querySelectorAll('.picker-dialog,.picker-header,.picker-main,.input-row,.clock-face,.period-toggle,.time-display')].map(n=>({cls:n.className,box:n.getBoundingClientRect().toJSON(),scroll:n.scrollWidth,client:n.clientWidth,padding:getComputedStyle(n).padding,flex:getComputedStyle(n).flexDirection}))})));
 }
 await browser.close();
 const cb=await chromium.launch(),cp=await cb.newPage({viewport:{width:384,height:853},isMobile:true,hasTouch:true});
 await cp.goto(base);await cp.waitForFunction(()=>document.documentElement.hasAttribute('data-showcase-ready'));await cp.evaluate(()=>document.fonts.ready);
 await cp.evaluate(async()=>{document.documentElement.dataset.theme='dark';const m=await import('/dist/md3-expressive.esm.js');m.applyDynamicTheme(m.getActiveSeedHex(),true)});await cp.waitForTimeout(1600);
 for(const id of ['cards','text-fields']){
  await cp.evaluate(id=>location.hash=id,id);await cp.waitForTimeout(500);
  for(const [i,card]of(await cp.locator('#'+id+' .comp-preview').all()).entries()){
   await card.scrollIntoViewIfNeeded();await cp.waitForTimeout(800);
   if(id==='cards'&&i===5||id==='text-fields'&&i===0){await card.screenshot({path:path.join(out,`dark-${id}-${i}.png`)});console.log(id,i,await card.evaluate(el=>{const h=el.querySelector('md-card,md-text-field'),r=h.shadowRoot.querySelector('.card,#field-supporting');return{html:r?.outerHTML,color:r&&getComputedStyle(r).color,bg:r&&getComputedStyle(r).backgroundColor,role:getComputedStyle(h).getPropertyValue('--md-sys-color-surface')}}));}
  }
 }
 await cb.close();
}finally{await new Promise(r=>server.close(r));}
