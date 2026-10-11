import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {chromium} from 'playwright';
import {testNavigationRailParity} from '../../../test/browser/navigation-rail-parity.mjs';
const root=process.cwd()+path.sep;
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root)){res.writeHead(403).end();return;}fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream'}).end(error?'Not found':data);});});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch();
try{await testNavigationRailParity(browser,`http://127.0.0.1:${server.address().port}`);console.log('Navigation rail source geometry, color and spring oracle passed.');}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
