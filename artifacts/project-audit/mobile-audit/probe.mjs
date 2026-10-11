import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {chromium, firefox, webkit} from 'playwright';
import {listenBrowserTestServer} from '../../../scripts/browser-test-server.mjs';
const root=process.cwd(), out=path.join(root,'artifacts/project-audit/mobile-audit');
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/\/$/,'/index.html'));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':{'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.woff2':'font/woff2','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream'});res.end(err?'Not found':data);});
});
await listenBrowserTestServer(server);
const base=`http://127.0.0.1:${server.address().port}`;
const engine=process.env.ENGINE||'chromium',browser=await({chromium,firefox,webkit})[engine].launch();
const widths=(process.env.WIDTHS||'320,360,384,390,412,480,599,600,768,839,840,1024,1199,1200,1440').split(',').map(Number);
const report={engine,views:[],errors:[],requests:[]};
const ids=[...fs.readFileSync('index.html','utf8').matchAll(/<section class="category-section" id="([^"]+)"/g)].map(m=>m[1]);
try{
 for(const width of widths){
  const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:width<600?2.625:1,hasTouch:true,...(engine==='firefox'?{}:{isMobile:width<600}),reducedMotion:'no-preference'});
  page.on('pageerror',e=>report.errors.push({width,message:e.message}));page.on('response',r=>{if(r.status()>=400)report.requests.push({width,url:r.url(),status:r.status()});});
  await page.goto(base);await page.waitForFunction(()=>document.documentElement.hasAttribute('data-showcase-ready'));await page.evaluate(()=>document.fonts.ready);
  for(const theme of ['light','dark']){
   await page.emulateMedia({colorScheme:theme});
   await page.evaluate(async theme=>{document.documentElement.setAttribute('data-theme',theme);const m=await import('/dist/md3-expressive.esm.js');m.applyDynamicTheme(m.getActiveSeedHex(),theme==='dark');},theme);
   for(const id of ['home','get-started',...ids]){
    await page.evaluate(id=>{location.hash=id},id);await page.waitForTimeout(40);
    const previews=page.locator(id==='home'?'#tab-view-home':id==='get-started'?'#tab-view-get-started':`#${id} .comp-preview`);
    const count=await previews.count();
    for(let i=0;i<count;i++){
     await previews.nth(i).evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForTimeout(40);
     const state=await previews.nth(i).evaluate(el=>{
      const r=el.getBoundingClientRect(), cs=getComputedStyle(el);
      const clipped=[...el.children].filter(c=>{const b=c.getBoundingClientRect();return b.width>0&&(b.left<Math.max(0,r.left)-1||b.right>Math.min(innerWidth,r.right)+1)}).map(c=>({tag:c.localName,id:c.id,class:c.className,left:c.getBoundingClientRect().left,right:c.getBoundingClientRect().right,width:c.getBoundingClientRect().width}));
      return {pageOverflow:document.documentElement.scrollWidth-innerWidth,previewOverflow:el.scrollWidth-el.clientWidth,width:r.width,height:r.height,clipped,overflowX:cs.overflowX};
     });
     report.views.push({viewportWidth:width,theme,id,preview:i,...state});
     if((state.clipped.length||state.previewOverflow>1)&&width===390)await page.screenshot({path:path.join(out,`${engine}-layout-${theme}-${id}-${i}.png`)});
    }
   }
   if([320,390,600,840,1024,1440].includes(width)){
    await page.evaluate(()=>{location.hash='home'});await page.waitForTimeout(250);await page.screenshot({path:path.join(out,`${engine}-home-${width}-${theme}.png`)});
   }
  }
  console.log(`${engine}: ${width}px, ${report.views.length} inspected examples, ${report.views.filter(v=>v.clipped.length||v.previewOverflow>1).length} overflow candidates`);
  fs.writeFileSync(path.join(out,`probe-${engine}.json`),JSON.stringify(report,null,2));
  await page.close();
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
