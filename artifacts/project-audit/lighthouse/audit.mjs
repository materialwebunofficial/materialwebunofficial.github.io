import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {brotliCompressSync} from 'node:zlib';
import {chromium} from 'playwright';

const option=(key,fallback)=>process.argv.find(arg=>arg.startsWith(`--${key}=`))?.slice(key.length+3)??fallback;
const root=path.resolve(option('site','artifacts/showcase-site'))+path.sep;
const label=option('label','baseline'),runs=Number(option('runs','2')),form=option('form','desktop');
const output=path.resolve('artifacts/project-audit/lighthouse');
const modules=path.join(process.env.MD3E_LIGHTHOUSE_TOOLS||path.join(os.tmpdir(),'md3e-lighthouse-13-5-0'),'node_modules');
const {default:lighthouse}=await import(pathToFileURL(path.join(modules,'lighthouse/core/index.js')));
const {launch}=await import(pathToFileURL(path.join(modules,'chrome-launcher/dist/index.js')));
const {default:desktop}=await import(pathToFileURL(path.join(modules,'lighthouse/core/config/desktop-config.js')));
const compressed=process.argv.includes('--compress');
const encoded=new Map();
if(compressed){
 const prepare=folder=>{for(const item of fs.readdirSync(folder,{withFileTypes:true})){const file=path.join(folder,item.name);if(item.isDirectory())prepare(file);else if(/\.(html|js|css|svg)$/.test(file))encoded.set(file,brotliCompressSync(fs.readFileSync(file)));}};
 prepare(root);
}
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/\/$/,'/index.html'));
 if(!file.startsWith(root)){res.writeHead(403).end();return;}
 fs.readFile(file,(error,data)=>{
  if(error){res.writeHead(404).end('Not found');return;}
  const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png'}[path.extname(file)]||'application/octet-stream';
  // Each audit launches a fresh browser. A normal cache policy lets two font
  // aliases reuse their download without turning a cold visit into warm data.
  const headers={'Content-Type':type,'Cache-Control':'public, max-age=600'};
  if(compressed&&encoded.has(file)&&req.headers['accept-encoding']?.includes('br')){data=encoded.get(file);headers['Content-Encoding']='br';}
  res.writeHead(200,headers).end(data);
 });
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`,summary=[];
try{
 for(let run=1;run<=runs;run++)for(const view of ['home','components']){
  const chrome=await launch({chromePath:chromium.executablePath(),chromeFlags:['--headless=new','--no-sandbox'],logLevel:'error'});
  try{
   const result=await lighthouse(`${base}/#${view}`,{port:chrome.port,logLevel:'error',output:['json','html'],onlyCategories:['performance','accessibility','best-practices','seo']},form==='desktop'?desktop:undefined);
   if(result.lhr.runtimeError)throw new Error(JSON.stringify(result.lhr.runtimeError));
   const name=`${label}-${form}-${view}-${run}`;
   fs.writeFileSync(path.join(output,name+'.json'),result.report[0]);fs.writeFileSync(path.join(output,name+'.html'),result.report[1]);
   const audits=result.lhr.audits;
   const record={name,version:result.lhr.lighthouseVersion,userAgent:result.lhr.environment.hostUserAgent,compressed,scores:Object.fromEntries(Object.entries(result.lhr.categories).map(([k,v])=>[k,v.score])),audits:Object.fromEntries(['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift','speed-index','unminified-javascript','unused-javascript','forced-reflow-insight','network-dependency-tree-insight','render-blocking-insight','long-tasks','total-byte-weight'].filter(k=>audits[k]).map(k=>[k,{score:audits[k].score,value:audits[k].numericValue,display:audits[k].displayValue,savings:audits[k].details?.overallSavingsBytes}]))};
   summary.push(record);fs.writeFileSync(path.join(output,`${label}-${form}-summary.json`),JSON.stringify(summary,null,2));console.log(JSON.stringify(record));
  }finally{await chrome.kill();}
 }
}finally{await new Promise(resolve=>server.close(resolve));}
