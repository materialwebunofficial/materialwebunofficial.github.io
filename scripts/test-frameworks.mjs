import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';
import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
import {build} from 'esbuild';import {chromium} from 'playwright';
import {listenBrowserTestServer} from './browser-test-server.mjs';
const root=process.cwd(),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'md3e-frameworks-'));
const npm=process.env.npm_execpath||path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
const logs=path.join(root,'test-results/frameworks');fs.mkdirSync(logs,{recursive:true});
function run(name,command,args,cwd=temporary){
 const result=spawnSync(command,args,{cwd,encoding:'utf8',maxBuffer:16*1024*1024,windowsHide:true,
  env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NODE_PATH:''}});
 fs.writeFileSync(path.join(logs,name+'.log'),(result.stdout||'')+(result.stderr||''));
 assert.equal(result.status,0,`${name}: ${result.stdout||''}${result.stderr||''}`);return result.stdout;
}
let server,browser;
try{
 fs.cpSync('test/frameworks',temporary,{recursive:true});
 const packed=JSON.parse(run('pack',process.execPath,[npm,'pack','--ignore-scripts','--json','--pack-destination',temporary],root))[0];
 run('install-frameworks',process.execPath,[npm,'ci','--no-audit','--no-fund']);
 run('install-library',process.execPath,[npm,'install','--ignore-scripts','--no-save','--package-lock=false','--no-audit','--no-fund',path.join(temporary,packed.filename)]);
 run('server-render',process.execPath,['render-ssr.mjs']);
 run('next-build',process.execPath,['node_modules/next/dist/bin/next','build','--webpack']);
 const output=path.join(temporary,'out');fs.mkdirSync(path.join(output,'vue'),{recursive:true});
 await build({entryPoints:[path.join(temporary,'vue-client.mjs')],bundle:true,minify:true,format:'esm',outfile:path.join(output,'vue/client.js')});
 const installed=path.join(temporary,'node_modules/@materialwebunofficial/md3e-web/dist');
 fs.copyFileSync(path.join(installed,'tokens.css'),path.join(output,'vue/tokens.css'));
 fs.cpSync(path.join(installed,'fonts'),path.join(output,'vue/fonts'),{recursive:true});
 fs.writeFileSync(path.join(output,'vue/index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><link rel="stylesheet" href="./tokens.css"><div id="app">${fs.readFileSync(path.join(temporary,'vue-ssr.html'),'utf8')}</div><script type="module" src="./client.js"></script></html>`);
 server=http.createServer((req,res)=>{
  const file=path.resolve(output,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/\/$/,'/index.html'));
  if(!file.startsWith(output+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream'});res.end(error?'Not found':data);});
 });
 await listenBrowserTestServer(server);browser=await chromium.launch();
 for(const [name,route]of [['Next.js / React','/'],['Vue SSR','/vue/']]){
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'||/hydration|mismatch/i.test(message.text()))errors.push(message.text());});
  await page.goto('http://127.0.0.1:'+server.address().port+route);
  await page.waitForFunction(()=>document.querySelector('main')?.dataset.ready==='true');
  await page.locator('#toggle button').click();assert.equal(await page.locator('#toggle').evaluate(el=>el.selected),true,`${name} custom element activation`);
  await page.locator('#field input').fill('Updated');assert.equal(await page.locator('#value').textContent(),'Updated',`${name} custom input event updates framework state`);
  assert.equal(await page.locator('#field').evaluate(el=>el.value),'Updated',`${name} value binding`);
  assert.deepEqual(errors,[],`${name} hydrates without runtime or hydration errors`);
  console.log(`${name}: server render, production build, hydration, registration, events and value binding passed`);await page.close();
 }
}finally{
 if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
 assert.ok(path.resolve(temporary).startsWith(path.resolve(os.tmpdir())+path.sep));
 fs.rmSync(temporary,{recursive:true,force:true});
}
