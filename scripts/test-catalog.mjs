import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium,firefox,webkit} from 'playwright';
import {listenBrowserTestServer} from './browser-test-server.mjs';

const root=process.argv.includes('--showcase')
 ? path.resolve('artifacts/showcase-site')+path.sep
 : fileURLToPath(new URL('../',import.meta.url));
const categories=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<section class="category-section" id="([^"]+)"/g)].map(match=>match[1]);
assert.ok(categories.length>=43,'catalog categories are discoverable');
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(process.env.CATALOG_SOURCE==='1'&&url.pathname==='/dist/md3-expressive.esm.js'){
  res.writeHead(200,{'Content-Type':'text/javascript'}).end("export * from '/src/index.js';");return;
 }
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname).replace(/\/$/,'/index.html'));
 if(!file.startsWith(root)){res.writeHead(403).end();return;}
 fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png'}[path.extname(file)]||'application/octet-stream'});res.end(error?'Not found':data);});
});
await listenBrowserTestServer(server);
const base='http://127.0.0.1:'+server.address().port;
const output=process.env.CATALOG_RESULTS_DIR||'test-results';fs.mkdirSync(output,{recursive:true});
try{
 for(const engine of (process.env.BROWSER_ENGINES||'chromium,firefox,webkit').split(',')){
  const browser=await ({chromium,firefox,webkit})[engine].launch();const views=[],errors=[],requests=[];
  try{
   for(const width of [320,390,1440]){
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
    await page.addInitScript(()=>{
      window.__resizeDeliveries=0;
      const Native=window.ResizeObserver;
      window.ResizeObserver=class extends Native {
        constructor(callback){super((entries,observer)=>{window.__resizeDeliveries++;callback(entries,observer);});}
      };
    });
    if(process.env.CATALOG_DIAGNOSTICS==='1')await page.addInitScript(()=>{
     window.__resizeHistory=[];window.__resizeErrors=[];const Native=window.ResizeObserver;
     window.ResizeObserver=class extends Native{
      constructor(callback){const stack=new Error().stack;super((entries,observer)=>{
       window.__resizeHistory.push({at:performance.now(),stack,targets:entries.map(({target,contentRect})=>({tag:target.localName,host:target.getRootNode().host?.localName,class:target.className,width:contentRect.width,height:contentRect.height}))});
       if(window.__resizeHistory.length>40)window.__resizeHistory.shift();callback(entries,observer);
      });}
     };
     window.addEventListener('error',event=>{if(event.message.includes('ResizeObserver'))window.__resizeErrors.push({message:event.message,recent:window.__resizeHistory.slice(-15)});});
    });
    page.on('pageerror',error=>errors.push({width,url:page.url(),message:error.message}));
    page.on('response',response=>{if(response.status()>=400)requests.push({width,url:response.url(),status:response.status()});});
    await page.goto(base);await page.waitForFunction(()=>document.documentElement.hasAttribute('data-showcase-ready'));
    for(const theme of ['light','dark']){
     await page.evaluate(async theme=>{
      const {applyDynamicTheme,getActiveSeedHex}=await import('/dist/md3-expressive.esm.js');
      document.documentElement.setAttribute('data-theme',theme);applyDynamicTheme(getActiveSeedHex(),theme==='dark');
     },theme);
     for(const id of categories){
      await page.evaluate(id=>{location.hash=id;},id);await page.waitForTimeout(80);
      const state=await page.evaluate(id=>{const section=document.getElementById(id);return {height:section.getBoundingClientRect().height,overflow:document.documentElement.scrollWidth-innerWidth};},id);
      views.push({width,theme,id,...state});
     }
    }
    // Deferring resize writes must settle the layout, not move a feedback loop
    // into an endless series of RAFs. Check an idle view with motion reduced.
    await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(()=>{location.hash='text-fields';});
    await page.waitForTimeout(500);
    await page.evaluate(()=>{window.__resizeDeliveries=0;});
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(()=>window.__resizeDeliveries),0,`${engine} ${width}: idle layout has no continuing resize feedback`);
    if(process.env.CATALOG_DIAGNOSTICS==='1')fs.writeFileSync(path.join(output,`resize-diagnostics-${engine}-${width}.json`),JSON.stringify(await page.evaluate(()=>window.__resizeErrors),null,2));
    await page.close();
   }
  }finally{await browser.close();}
  const failures=views.filter(view=>view.height<=0||view.overflow>1);
  const result={engine,views:views.length,failures,errors,requests};
  fs.writeFileSync(path.join(output,`catalog-${engine}.json`),JSON.stringify(result,null,2));
  console.log(`${engine}: ${views.length} catalog views, ${failures.length} visibility/overflow failures, ${errors.length} runtime errors, ${requests.length} failed resources`);
  assert.deepEqual(failures,[],'visible categories fit the viewport');assert.deepEqual(requests,[],'catalog assets load');assert.deepEqual(errors,[],'catalog has no JavaScript or ResizeObserver errors');
 }
}finally{await new Promise(resolve=>server.close(resolve));}
