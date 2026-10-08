import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {testTooltipParity,testTooltipShowcase} from '../test/browser/tooltip-parity.mjs';
import {testTooltipFocusParity} from '../test/browser/tooltip-focus.mjs';
import {captureTooltipLayout,testTooltipLayout} from '../test/browser/tooltip-layout.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream'});res.end(error?'Not found':data);});
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch(),base=`http://127.0.0.1:${server.address().port}`;
const source={newPage:async options=>{const page=await browser.newPage(options);await page.route('**/dist/md3-expressive.esm.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:'export * from "/src/index.js";'}));return page;}};
try {const target=process.argv.includes('--source')?source:browser;if(process.argv.includes('--capture-layout'))await captureTooltipLayout(target,base);else{await testTooltipParity(target,base);await testTooltipLayout(target,base);await testTooltipFocusParity(target,base);await testTooltipShowcase(target,base);}}
finally {await browser.close();await new Promise(r=>server.close(r));}
