import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import {chromium} from 'playwright';import {listenBrowserTestServer} from '../../../scripts/browser-test-server.mjs';
const root=process.cwd(),out=path.join(root,'artifacts/project-audit/mobile-audit');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream'});res.end(e?'Not found':b);});});
await listenBrowserTestServer(server);const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:384,height:853},isMobile:true,hasTouch:true,deviceScaleFactor:2.8125}),report=[];
try{
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>document.documentElement.hasAttribute('data-showcase-ready'));await page.evaluate(()=>document.fonts.ready);
 await page.addScriptTag({path:'C:/Users/sagla/AppData/Local/Temp/md3e-lighthouse-13-5-0/node_modules/axe-core/axe.min.js'});
 const ids=[...fs.readFileSync('index.html','utf8').matchAll(/<section class="category-section" id="([^"]+)"/g)].map(m=>m[1]);
 for(const theme of ['light','dark']){
  await page.evaluate(async theme=>{document.documentElement.dataset.theme=theme;const m=await import('/dist/md3-expressive.esm.js');m.applyDynamicTheme(m.getActiveSeedHex(),theme==='dark');},theme);await page.waitForTimeout(1600);
  for(const id of ['home','get-started',...ids]){
   await page.evaluate(id=>{location.hash=id},id);await page.waitForTimeout(200);
   const selector=['home','get-started'].includes(id)?`#tab-view-${id}`:`#${id}`;
   const previews=await page.locator(`#${id} .comp-preview`).all(),parts=[];
   // Color motion is visibility-aware. Audit each rendered preview after it
   // settles, rather than forcing skipped cards to layout from an axe traversal.
   for(let i=0;i<Math.max(1,previews.length);i++){
    if(previews.length){await previews[i].evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForTimeout(1300);}
    else await page.waitForTimeout(1300);
    const include=previews.length?`${selector} .comp-preview:nth-match(${i+1})`:selector;
    const scope=previews.length?await previews[i].evaluate(e=>{e.dataset.axeMobile='current';return '[data-axe-mobile="current"]'}):selector;
    parts.push(await page.evaluate(async selector=>{const result=await axe.run({include:[selector]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return{violations:result.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:result.incomplete.map(v=>({id:v.id,nodes:v.nodes.length}))};},scope));
    if(previews.length)await previews[i].evaluate(e=>delete e.dataset.axeMobile);
   }
   const result={previews:previews.length,violations:parts.flatMap(r=>r.violations),incomplete:parts.flatMap(r=>r.incomplete)};
   report.push({theme,id,...result});fs.writeFileSync(path.join(out,'accessibility.json'),JSON.stringify(report,null,2));
   if(result.violations.length)console.log(JSON.stringify(report.at(-1)));
  }
  console.log(`${theme}: ${ids.length+2} pages/sections checked`);
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
