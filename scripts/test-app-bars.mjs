import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {testAppBarParity,testAppBarShowcase,testIconMinimumParity} from '../test/browser/app-bar-parity.mjs';
import {testTopAppBarParity} from '../test/browser/top-app-bar-parity.mjs';
import {testTopAppBarScroll} from '../test/browser/top-app-bar-scroll.mjs';
import {testBottomAppBarLayout} from '../test/browser/bottom-app-bar-layout.mjs';
import {testBottomAppBarScroll} from '../test/browser/bottom-app-bar-scroll.mjs';
import {testFabSurface} from '../test/browser/fab-surface.mjs';
import {testFabInteractions} from '../test/browser/fab-interactions.mjs';
import {testFabExpansion} from '../test/browser/fab-expansion.mjs';
import {testRippleParity} from '../test/browser/ripple-parity.mjs';
import {testToolbarParity} from '../test/browser/toolbar-parity.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const server=http.createServer((req,res)=>{
 const filename=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
 if(!filename.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(filename,(err,data)=>{
  res.writeHead(err?404:200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml'}[path.extname(filename)]||'application/octet-stream'});
  res.end(err?'Not found':data);
 });
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch();
fs.mkdirSync(new URL('../research/',import.meta.url),{recursive:true});
const source={newPage:async options=>{
 const page=await browser.newPage(options);
 await page.route('**/dist/md3-expressive.esm.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:'export * from "/src/index.js";'}));
 return page;
}};
try{
 const target=process.argv.includes('--source')?source:browser;
 if(process.argv.includes('--bottom-scroll-only')){await testBottomAppBarScroll(target,base);}
 else if(process.argv.includes('--bottom-only')){await testBottomAppBarLayout(target,base);await testBottomAppBarScroll(target,base);await testAppBarParity(target,base);}
 else if(process.argv.includes('--showcase-only')){await testAppBarShowcase(target,base);}
 else if(process.argv.includes('--scroll-only')){await testTopAppBarScroll(target,base);}
 else if(process.argv.includes('--top-only')){await testTopAppBarParity(target,base);await testTopAppBarScroll(target,base);}
 else{await testIconMinimumParity(target,base);await testAppBarParity(target,base);await testBottomAppBarLayout(target,base);await testBottomAppBarScroll(target,base);await testTopAppBarParity(target,base);await testTopAppBarScroll(target,base);await testAppBarShowcase(target,base);}
 if(!process.argv.includes('--app-bars-only')&&!process.argv.includes('--top-only')&&!process.argv.includes('--scroll-only')&&!process.argv.includes('--showcase-only')&&!process.argv.includes('--bottom-only')&&!process.argv.includes('--bottom-scroll-only')){
  await testFabSurface(target,base);await testFabInteractions(target,base);await testFabExpansion(target,base);await testRippleParity(target,base);await testToolbarParity(target,base);
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
