import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
import {testSelectionParity} from '../test/browser/selection-parity.mjs';
import {testSwitchMotion} from '../test/browser/switch-motion.mjs';
import {testSelectionForms} from '../test/browser/selection-forms.mjs';
import {testSwitchColors} from '../test/browser/switch-color.mjs';
import {testSelectionKeyboard} from '../test/browser/selection-keyboard.mjs';
import {testSelectionIndication} from '../test/browser/selection-indication.mjs';
import {testCheckboxMd3} from '../test/browser/checkbox-md3.mjs';
import {testCheckboxStates} from '../test/browser/checkbox-states.mjs';
import {testSelectionMotion} from '../test/browser/selection-motion.mjs';
import {testSelectionColors} from '../test/browser/selection-color.mjs';
import {testSelectionLayout} from '../test/browser/selection-layout.mjs';
import {testPointerRouting} from '../test/browser/pointer-routing.mjs';
import {testPointerHover} from '../test/browser/pointer-hover.mjs';
import {testCapturedHover} from '../test/browser/captured-hover.mjs';
import {testFocusIndication} from '../test/browser/focus-indication.mjs';
import {listenBrowserTestServer} from './browser-test-server.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream'});res.end(error?'Not found':data);});
});
await listenBrowserTestServer(server);const browser=await chromium.launch(),base=`http://127.0.0.1:${server.address().port}`;
const source={newPage:async options=>{const page=await browser.newPage(options);await page.route('**/dist/md3-expressive.esm.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:'export * from "/src/index.js";'}));return page;}};
const target=process.argv.includes('--source')?source:browser,page=await target.newPage({viewport:{width:960,height:800}});
try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(async()=>{await customElements.whenDefined('md-switch');await document.fonts.ready;});
  if(process.argv.includes('--keyboard'))await testSelectionKeyboard(target,base);
  else if(process.argv.includes('--indication'))await testSelectionIndication(target,base);
  else if(process.argv.includes('--checkbox'))await testCheckboxMd3(target,base);
  else if(process.argv.includes('--states'))await testCheckboxStates(target,base);
  else if(process.argv.includes('--colors'))await testSelectionColors(target,base);
  else if(process.argv.includes('--layout'))await testSelectionLayout(target,base);
  else if(process.argv.includes('--routing'))await testPointerRouting(target,base);
  else if(process.argv.includes('--hover'))await testPointerHover(target,base);
  else if(process.argv.includes('--captured-hover'))await testCapturedHover(target,base);
  else if(process.argv.includes('--focus'))await testFocusIndication(target,base);
  else{await testSwitchColors(page);await testSelectionParity(page);await testSwitchMotion(target,base);await testSelectionForms(page);await testSelectionKeyboard(target,base);await testSelectionIndication(target,base);await testSelectionMotion(target,base);await testCheckboxMd3(target,base);await testCheckboxStates(target,base);await testSelectionColors(target,base);await testSelectionLayout(target,base);await testPointerRouting(target,base);await testPointerHover(target,base);await testCapturedHover(target,base);await testFocusIndication(target,base);}
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
