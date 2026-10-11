import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {chromium} from 'playwright';
const option=(key,fallback)=>process.argv.find(arg=>arg.startsWith(`--${key}=`))?.slice(key.length+3)??fallback;
const root=path.resolve(option('site','artifacts/showcase-site'))+path.sep,label=option('label','baseline');
const server=http.createServer((req,res)=>{if(req.url==='/probe'){res.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><html lang="en"><body></body></html>');return;}const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root)){res.writeHead(403).end();return;}fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':file.endsWith('.js')?'text/javascript':'text/css'}).end(error?'Not found':data);});});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1200,height:900},reducedMotion:'reduce'}),base=`http://127.0.0.1:${server.address().port}`;
 await page.goto(base+'/probe');
 await page.setContent(`<html><link rel="stylesheet" href="${base}/dist/tokens.min.css"><body><md-navigation-rail expanded></md-navigation-rail></body></html>`);
 await page.evaluate(async base=>{await import(base+'/dist/md3-expressive.esm.js');await document.fonts.ready;document.querySelector('md-navigation-rail').items=Array.from({length:30},(_,i)=>({icon:'home',label:'Destination number '+i}));},base);
 await page.waitForTimeout(300);
 const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
 const records=[];
 for(let i=0;i<3;i++){
  const before=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  await page.evaluate(()=>{const rail=document.querySelector('md-navigation-rail');for(let j=0;j<10;j++)rail._measureLayout();});
  const after=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  records.push(Object.fromEntries(['LayoutCount','RecalcStyleCount','LayoutDuration','ScriptDuration'].map(k=>[k,after[k]-before[k]])));
 }
 fs.writeFileSync(`artifacts/project-audit/lighthouse/${label}-layout.json`,JSON.stringify({items:30,measurementsPerSample:10,records},null,2));console.log(label,JSON.stringify(records));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
