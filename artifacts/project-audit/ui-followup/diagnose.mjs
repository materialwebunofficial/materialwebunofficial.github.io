import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright';
import {listenBrowserTestServer} from '../../../scripts/browser-test-server.mjs';
const root=process.cwd(), output=path.join(root,'artifacts/project-audit/ui-followup');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream'});res.end(error?'Not found':data);});
});
await listenBrowserTestServer(server);
const browser=await chromium.launch({executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',args:['--force-device-scale-factor=1.4']});
const page=await browser.newPage({viewport:{width:1828,height:980},deviceScaleFactor:1.4,colorScheme:'dark'}), results={};
await page.route('**/dist/md3-expressive.esm.js',route=>route.fulfill({contentType:'text/javascript',body:'export * from "/src/index.js";'}));
const base=`http://127.0.0.1:${server.address().port}`;
try{
 await page.goto(base+'/test/browser/fixtures/toolbars.html');
 await page.evaluate(async()=>{await customElements.whenDefined('md-bottom-sheet');document.querySelector('#fixture').innerHTML='<md-bottom-sheet id="bottom" modal headline="Test"><button>Content focus</button><div style="height:100px">Content</div></md-bottom-sheet><md-side-sheet id="side" headline="Test"><button>Content focus</button></md-side-sheet>';});
 results.sheets=await page.evaluate(async()=>{
  const out=[];
  for(const id of ['bottom','side'])for(const clip of [false,true]){
   const host=document.getElementById(id),win=host.shadowRoot.querySelector('.window');
   win.style.overflow=clip?'clip':'hidden';
   for(let repeat=0;repeat<3;repeat++){
    const frames=[],start=performance.now();host.open=true;
    await new Promise(resolve=>{
     const sample=time=>{const scrim=host.shadowRoot.querySelector('.scrim'),sheet=host.shadowRoot.querySelector('.sheet'),r=scrim.getBoundingClientRect(),s=sheet.getBoundingClientRect();frames.push({t:time-start,scroll:[win.scrollLeft,win.scrollTop],scrim:[r.x,r.y,r.width,r.height],surface:[s.x,s.y,s.width,s.height],alpha:getComputedStyle(scrim).opacity});if(time-start<450)requestAnimationFrame(sample);else resolve();};requestAnimationFrame(sample);
    });
    out.push({id,clip,repeat,frames});host.open=false;await new Promise(resolve=>setTimeout(resolve,700));
   }
  }
  return out;
 });
 await page.goto(base+'/#menus');await page.waitForTimeout(1200);
 await page.locator('#menus md-menu').first().evaluate(host=>host.show());await page.waitForTimeout(600);
 results.menu=await page.locator('#menus md-menu-item').evaluateAll(items=>items.map(host=>{
  const text=host.shadowRoot.querySelector('.text'),label=host.shadowRoot.querySelector('.label'),button=host.shadowRoot.querySelector('button');
  const before={text:text.getBoundingClientRect().toJSON(),label:label.textContent,max:text.style.maxWidth,button:getComputedStyle(button).width};text.style.maxWidth='';
  const after={text:text.getBoundingClientRect().toJSON(),button:getComputedStyle(button).width};return {before,after};
 }));
 await page.goto(base+'/#buttons');await page.waitForTimeout(1200);
 for(const hash of ['#extended-fabs','#color-lab','#extended-fabs','#home','#extended-fabs']){
  await page.evaluate(hash=>{location.hash=hash;},hash);await page.waitForTimeout(1200);
  if(hash==='#extended-fabs'){
   const card=page.locator('#extended-fabs .comp-card').first();await card.scrollIntoViewIfNeeded();
   results.fabs??=[];results.fabs.push(await card.evaluate(card=>({rect:card.getBoundingClientRect().toJSON(),preview:card.querySelector('.comp-preview').getBoundingClientRect().toJSON(),fabs:[...card.querySelectorAll('md-fab')].map(host=>{const root=host.shadowRoot;return {label:host.label,height:host.getBoundingClientRect().height,body:root.querySelector('button').getBoundingClientRect().toJSON(),content:root.querySelector('.content').getBoundingClientRect().toJSON(),clip:root.querySelector('.content-viewport').getBoundingClientRect().toJSON()};})})));
   await card.screenshot({path:path.join(output,`fabs-route-${results.fabs.length}.png`)});
  }
 }
 fs.writeFileSync(path.join(output,'diagnose.json'),JSON.stringify(results,null,2));
 console.log(JSON.stringify({sheets:results.sheets.map(({id,clip,repeat,frames})=>({id,clip,repeat,first:frames[0],last:frames.at(-1),scrollMax:Math.max(...frames.map(f=>Math.abs(f.scroll[0])+Math.abs(f.scroll[1])))})),menu:results.menu,fabs:results.fabs},null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
