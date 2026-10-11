import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';import {chromium} from 'playwright';import {listenBrowserTestServer} from '../../../scripts/browser-test-server.mjs';
const root=process.cwd(),dir=path.join(root,'artifacts/project-audit/ui-followup'),profile=process.argv.includes('--reuse')?fs.readFileSync(path.join(dir,'shields-profile-path.txt'),'utf8'):fs.mkdtempSync(path.join(os.tmpdir(),'md3e-brave-shields-'));
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,d)=>{res.writeHead(e?404:200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream'});res.end(e?'Not found':d);});});
await listenBrowserTestServer(server);
const context=await chromium.launchPersistentContext(profile,{executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',headless:true,viewport:{width:1828,height:980},deviceScaleFactor:1.4,colorScheme:'dark',ignoreDefaultArgs:['--disable-extensions','--disable-component-update','--disable-background-networking','--disable-component-extensions-with-background-pages'],args:['--force-device-scale-factor=1.4','--host-resolver-rules=MAP md3e.test 127.0.0.1','--no-proxy-server']});
const page=await context.newPage(),errors=[],failed=[];
page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push({url:r.url(),failure:r.failure()}));
await page.route('**/dist/md3-expressive.esm.js',route=>route.fulfill({contentType:'text/javascript',body:'export * from "/src/index.js";'}));
if(process.argv.includes('--no-containment'))await page.route('**/styles/showcase.css',route=>route.fulfill({contentType:'text/css',body:fs.readFileSync(path.join(root,'styles/showcase.css'),'utf8').replace('content-visibility: auto; contain-intrinsic-size: auto 480px;','')}));
try{
 const settings=await context.newPage();await settings.goto('brave://components');console.log('Components initially: '+(await settings.locator('body').innerText()).slice(0,6000));
 await page.goto(`http://md3e.test:${server.address().port}/#extended-fabs`);await page.waitForTimeout(1500);
 for(let repeat=0;repeat<1;repeat++){
  await page.waitForTimeout(6000);await page.reload();await page.waitForTimeout(1000);
  const cards=await page.locator('#extended-fabs .comp-card').evaluateAll(cards=>cards.map(card=>({height:card.getBoundingClientRect().height,preview:card.querySelector('.comp-preview').getBoundingClientRect().height,fabs:[...card.querySelectorAll('md-fab')].map(host=>{const button=host.shadowRoot.querySelector('button');return {height:host.getBoundingClientRect().height,button:button.getBoundingClientRect().height,clip:host.shadowRoot.querySelector('.content-viewport').getBoundingClientRect().toJSON(),content:host.shadowRoot.querySelector('.content').getBoundingClientRect().toJSON(),style:getComputedStyle(host.shadowRoot.querySelector('.content')).cssText};})})));
  console.log(JSON.stringify({repeat,cards,errors,failed}));
 }
 await page.locator('#extended-fabs .comp-card').first().screenshot({path:path.join(dir,'fabs-shields-on-before.png')});
 console.log('Card styles: '+JSON.stringify(await page.locator('#extended-fabs .comp-card').first().evaluate(card=>{
  const describe=node=>{const s=getComputedStyle(node);return {tag:node.localName,classes:node.className,cv:s.contentVisibility,contain:s.contain,height:s.height,visible:node.checkVisibility({contentVisibilityAuto:true}),display:s.display,visibility:s.visibility,opacity:s.opacity,text:node.textContent,html:node.outerHTML,font:s.font};};
  return {ancestors:[card,card.parentElement,card.parentElement.parentElement].map(describe),nodes:[...card.querySelectorAll('md-fab')].map(host=>[...host.shadowRoot.querySelectorAll('button,.content-viewport,.content,.material-symbols-outlined,.lbl')].map(describe))};
 })));
 await page.locator('#extended-fabs .comp-card').first().evaluate(card=>card.style.contentVisibility='visible');await page.waitForTimeout(1000);
 await page.locator('#extended-fabs .comp-card').first().screenshot({path:path.join(dir,'fabs-shields-on-without-containment.png')});
 console.log('Without containment height: '+await page.locator('#extended-fabs .comp-card').first().evaluate(card=>card.getBoundingClientRect().height));
 await settings.reload();console.log('Components finally: '+(await settings.locator('body').innerText()).slice(0,6000));
 fs.writeFileSync(path.join(dir,'shields-profile-path.txt'),profile);
}finally{await context.close();await new Promise(r=>server.close(r));}
