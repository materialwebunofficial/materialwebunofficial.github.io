import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
import {captureButtonLayout,testButtonParity} from '../test/browser/button-parity.mjs';
import {captureToggleButtonLayout,testToggleButtonLayout} from '../test/browser/toggle-button-layout.mjs';
import {testButtonSurface} from '../test/browser/button-surface.mjs';
import {testButtonPointer} from '../test/browser/button-pointer.mjs';
import {testButtonStateLayer} from '../test/browser/button-state-layer.mjs';
import {testButtonKeyboard} from '../test/browser/button-keyboard.mjs';
import {listenBrowserTestServer} from './browser-test-server.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,data)=>{res.writeHead(e?404:200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream'});res.end(e?'Not found':data);});});
await listenBrowserTestServer(server);const browser=await chromium.launch(),base=`http://127.0.0.1:${server.address().port}`;
const source={newPage:async options=>{const page=await browser.newPage(options);await page.route('**/dist/md3-expressive.esm.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:'export * from "/src/index.js";'}));return page;}};
try{const target=process.argv.includes('--source')?source:browser;if(process.argv.includes('--keyboard'))await testButtonKeyboard(target,base);else if(process.argv.includes('--state-layer'))await testButtonStateLayer(target,base);else if(process.argv.includes('--pointer'))await testButtonPointer(target,base);else if(process.argv.includes('--surface'))await testButtonSurface(target,base);else if(process.argv.includes('--capture-layout'))await captureButtonLayout(target,base);else if(process.argv.includes('--capture-toggle-layout'))await captureToggleButtonLayout(target,base);else if(process.argv.includes('--toggle-layout'))await testToggleButtonLayout(target,base);else await testButtonParity(target,base);}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
