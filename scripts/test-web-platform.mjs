import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {fileURLToPath} from 'node:url';
import {chromium,firefox,webkit} from 'playwright';
import {listenBrowserTestServer} from './browser-test-server.mjs';
import {testWebPlatform} from '../test/browser/web-platform.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/__platform'){
  res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><link rel="stylesheet" href="/dist/tokens.css"><script type="module">await import('${url.searchParams.get('mode')==='src'?'/src/index.js':'/dist/md3-expressive.esm.js'}');document.documentElement.dataset.ready='true';</script><main id="fixture"></main></html>`);return;
 }
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname).replace(/\/$/,'/index.html'));
 if(!file.startsWith(root)){res.writeHead(403).end();return;}
 fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(error?'Not found':data);});
});
await listenBrowserTestServer(server);
try{
 for(const engine of (process.env.BROWSER_ENGINES||'chromium,firefox,webkit').split(',')){
  const browser=await ({chromium,firefox,webkit})[engine].launch();
  try{for(const mode of ['src','dist'])await testWebPlatform(browser,`http://127.0.0.1:${server.address().port}`,mode);console.log(`${engine}: passed`);}
  finally{await browser.close();}
 }
}finally{await new Promise(resolve=>server.close(resolve));}
