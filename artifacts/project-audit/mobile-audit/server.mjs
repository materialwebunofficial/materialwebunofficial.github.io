import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import {listenBrowserTestServer} from '../../../scripts/browser-test-server.mjs';
export async function serve(root=process.cwd()){
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream'});res.end(e?'Not found':b);});
 });
 await listenBrowserTestServer(server);return{url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(r=>server.close(r))};
}
