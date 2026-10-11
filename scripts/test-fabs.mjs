import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {listenBrowserTestServer} from './browser-test-server.mjs';
import {testFabKeyboard} from '../test/browser/fab-keyboard.mjs';
import {testFabInteractions} from '../test/browser/fab-interactions.mjs';
import {testFabExpansion,testFabShowcase} from '../test/browser/fab-expansion.mjs';
import {testFabSurface} from '../test/browser/fab-surface.mjs';
import {testFabPointer} from '../test/browser/fab-pointer.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(e,data)=>{res.writeHead(e?404:200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream'});res.end(e?'Not found':data);});
});
await listenBrowserTestServer(server);
const browser=await chromium.launch(),base=`http://127.0.0.1:${server.address().port}`;
const source={newPage:async options=>{const page=await browser.newPage(options);await page.route('**/dist/md3-expressive.esm.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:'export * from "/src/index.js";'}));return page;}};
try{
  const target=process.argv.includes('--source')?source:browser;
  if(process.argv.includes('--pointer'))await testFabPointer(target,base);
  else{await testFabKeyboard(target,base);if(!process.argv.includes('--keyboard')){await testFabPointer(target,base);await testFabInteractions(target,base);await testFabExpansion(target,base);await testFabSurface(target,base);await testFabShowcase(target,base);}}
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
