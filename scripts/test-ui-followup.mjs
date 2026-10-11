import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium, firefox, webkit} from 'playwright';
import {listenBrowserTestServer} from './browser-test-server.mjs';
import {testUiFollowup, testSheetEntry, inspectEarlyNavigation, testRailLayoutBatching} from '../test/browser/ui-followup.mjs';
import {testMenuParity} from '../test/browser/menu-parity.mjs';
import {testNavigationDrawerParity} from '../test/browser/navigation-drawer-parity.mjs';
import {testNavigationRailModal} from '../test/browser/navigation-rail-modal.mjs';
import {testFabExpansion} from '../test/browser/fab-expansion.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),source=process.argv.includes('--source');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
 if(!file.startsWith(root)){res.writeHead(403).end();return;}
 fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream'});res.end(error?'Not found':data);});
});
await listenBrowserTestServer(server);
const base=`http://127.0.0.1:${server.address().port}`;
const brave='C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe';
const shields=process.argv.includes('--brave-shields');
assert.ok(!(process.argv.includes('--parity')&&(process.argv.includes('--brave')||shields)),'Run exact-pixel native parity without fractional Brave scale; the UI regressions cover Brave at 1.4.');
const engineName=process.argv.find(arg=>arg.startsWith('--engine='))?.slice('--engine='.length);
const targets=(process.argv.includes('--brave')||shields?[['brave',chromium,{executablePath:brave,args:['--force-device-scale-factor=1.4']}]]:[['chromium',chromium,{}],['firefox',firefox,{}],['webkit',webkit,{}]]).filter(([name])=>!engineName||name===engineName);
assert.ok(targets.length,'Unknown browser engine');
try{
 for(const[name,engine,options]of targets){
  let browser;
  if(shields){
   // Only a disposable test profile is permitted, never the user's Brave data.
   const profile=process.env.MD3E_BRAVE_TEST_PROFILE||fs.mkdtempSync(path.join(os.tmpdir(),'md3e-brave-shields-'));
   const relative=path.relative(os.tmpdir(),profile);
   assert.ok(!relative.startsWith('..')&&!path.isAbsolute(relative)&&path.basename(profile).startsWith('md3e-brave-shields-'),'Brave profile must be an isolated md3e-brave-shields-* directory under the OS temp directory');
   browser=await engine.launchPersistentContext(profile,{...options,viewport:{width:1828,height:980},deviceScaleFactor:1.4,colorScheme:'dark',ignoreDefaultArgs:['--disable-extensions','--disable-component-update','--disable-background-networking','--disable-component-extensions-with-background-pages']});
   // Playwright normally disables component updates. A Brave process without
   // its filter catalog/resources cannot verify real Shields compatibility.
   const catalog=path.join(profile,'gkboaolpopklhgplhaaiboijnklogmbc'),resources=path.join(profile,'mfddibmblmbccpadfndgakiopmmhebop'),filters=path.join(profile,'iodkpdagapdfkphljnddpjlldadblomo');
   console.log('Waiting for the isolated Brave profile to load its default Shields filters.');
   const started=Date.now();
   try{while(![catalog,resources,filters].every(p=>fs.existsSync(p)&&fs.readdirSync(p).some(n=>/^\d/.test(n)))){assert.ok(Date.now()-started<120000,'Brave Shields components did not download within 120 seconds');await new Promise(r=>setTimeout(r,1000));}}
   catch(error){await browser.close();throw error;}
   console.log('Brave Shields filter catalog, resources and default filter data are present.');
  }else browser=await engine.launch(options);
  const target={newPage:async opts=>{const page=await browser.newPage(shields?undefined:opts);if(shields&&opts?.viewport)await page.setViewportSize(opts.viewport);if(source)await page.route('**/dist/md3-expressive.esm.js',route=>route.fulfill({contentType:'text/javascript',body:'export * from "/src/index.js";'}));return page;}};
  try{
   if(process.argv.includes('--menu-only'))await testMenuParity(target,base);
   else if(process.argv.includes('--navigation-only'))await inspectEarlyNavigation(target,base);
   else if(process.argv.includes('--parity')){
    await testMenuParity(target,base);await testNavigationDrawerParity(target,base);await testNavigationRailModal(target,base);await testFabExpansion(target,base);
   }else{await testSheetEntry(target,base);await testUiFollowup(target,base);await inspectEarlyNavigation(target,base);if(name==='chromium'||name==='brave')await testRailLayoutBatching(target,base);}
   console.log(`${name}: UI follow-up passed (${source?'source':'dist'})`);
  }finally{await browser.close();}
 }
}finally{await new Promise(resolve=>server.close(resolve));}
