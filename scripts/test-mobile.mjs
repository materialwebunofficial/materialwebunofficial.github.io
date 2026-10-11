import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import assert from 'node:assert/strict';
import {chromium, firefox, webkit} from 'playwright';
import {listenBrowserTestServer} from './browser-test-server.mjs';
import {testMobileInteractions} from '../test/browser/mobile.mjs';

const root=process.cwd();
const output=process.env.MOBILE_RESULTS_DIR||'test-results/mobile';
fs.mkdirSync(output,{recursive:true});
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{
    res.writeHead(error?404:200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream'});
    res.end(error?'Not found':data);
  });
});
await listenBrowserTestServer(server);
const base=`http://127.0.0.1:${server.address().port}`;
try{
  const shields=process.argv.includes('--brave-shields');
  for(const engine of(shields?'brave':process.env.BROWSER_ENGINES||'chromium,firefox,webkit').split(',')){
    let browser;
    if(shields){
      const profile=process.env.MD3E_BRAVE_TEST_PROFILE||fs.mkdtempSync(path.join(os.tmpdir(),'md3e-brave-shields-'));
      const relative=path.relative(os.tmpdir(),profile);
      assert.ok(!relative.startsWith('..')&&!path.isAbsolute(relative)&&path.basename(profile).startsWith('md3e-brave-shields-'),'Use only an isolated temporary Brave profile');
      const context=await chromium.launchPersistentContext(profile,{
        executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',
        viewport:{width:384,height:853},isMobile:true,hasTouch:true,deviceScaleFactor:2.8125,
        ignoreDefaultArgs:['--disable-extensions','--disable-component-update','--disable-background-networking','--disable-component-extensions-with-background-pages']
      });
      const directories=['gkboaolpopklhgplhaaiboijnklogmbc','mfddibmblmbccpadfndgakiopmmhebop','iodkpdagapdfkphljnddpjlldadblomo'].map(id=>path.join(profile,id));
      const started=Date.now();
      try{while(!directories.every(dir=>fs.existsSync(dir)&&fs.readdirSync(dir).some(name=>/^\d/.test(name)))){
        assert.ok(Date.now()-started<120000,'Default Shields filters did not download');await new Promise(resolve=>setTimeout(resolve,1000));
      }}catch(error){await context.close();throw error;}
      console.log('Brave: default Shields catalog, resources and filter data loaded in an isolated mobile test profile');
      browser={newPage:async options=>{const page=await context.newPage();await page.setViewportSize(options.viewport);return page;},close:()=>context.close()};
    }else browser=await({chromium,firefox,webkit})[engine].launch();
    try{
      const sizes=(process.env.MOBILE_SIZES||'320x640,384x853,853x384').split(',').map(value=>value.split('x').map(Number));
      for(const[width,height]of sizes)await testMobileInteractions(browser,base,{engine,width,height,output});
    }finally{await browser.close();}
  }
}finally{await new Promise(resolve=>server.close(resolve));}
