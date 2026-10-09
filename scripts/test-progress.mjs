import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
import {listenBrowserTestServer} from './browser-test-server.mjs';
import {testProgressParity} from '../test/browser/progress-parity.mjs';
import {testProgressMotion,testProgressShowcase} from '../test/browser/progress-motion.mjs';
import {testProgressWaveOwner} from '../test/browser/progress-wave-owner.mjs';
import {testIndicatorVisibility} from '../test/browser/indicator-visibility.mjs';
import {testLoadingColor} from '../test/browser/loading-color.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream'});res.end(error?'Not found':data);});
});
await listenBrowserTestServer(server);const browser=await chromium.launch(),base='http://127.0.0.1:'+server.address().port;
const source={newPage:async options=>{const page=await browser.newPage(options);await page.route('**/dist/md3-expressive.esm.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:'export * from "/src/index.js";'}));return page;}};
try{const target=process.argv.includes('--source')?source:browser;if(process.argv.includes('--visibility')){await testIndicatorVisibility(target,base);await testLoadingColor(target,base);}else if(process.argv.includes('--owners'))await testProgressWaveOwner(target,base);else{if(!process.argv.includes('--showcase')){await testProgressParity(target,base);await testProgressMotion(target,base);await testProgressWaveOwner(target,base);await testIndicatorVisibility(target,base);await testLoadingColor(target,base);}await testProgressShowcase(target,base);}}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
