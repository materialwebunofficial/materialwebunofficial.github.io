import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
import {listenBrowserTestServer} from './browser-test-server.mjs';
import '../test/unit/chip-state.test.mjs';
import '../test/unit/chip-elevation.test.mjs';
import '../test/unit/chip-layout.test.mjs';
import '../test/unit/chip-retained-content.test.mjs';
import {testChipLayout} from '../test/browser/chip-layout.mjs';
import {testChipFoundation} from '../test/browser/chip-foundation.mjs';
import {testSeedPresets} from '../test/browser/seed-presets.mjs';
import {testPointerRouting} from '../test/browser/pointer-routing.mjs';
import {testChipShowcase} from '../test/browser/chip-showcase.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream'});res.end(error?'Not found':data);});
});
await listenBrowserTestServer(server);const browser=await chromium.launch(),base='http://127.0.0.1:'+server.address().port;
const source={newPage:async options=>{const page=await browser.newPage(options);await page.route('**/dist/md3-expressive.esm.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:'export * from "/src/index.js";'}));return page;}};
try{const target=process.argv.includes('--source')?source:browser,snapshot=process.argv.includes('--source')?'source':'bundle';if(process.argv.includes('--showcase'))await testChipShowcase(target,base,snapshot);else if(process.argv.includes('--layout'))await testChipLayout(target,base);else if(process.argv.includes('--pointer'))await testPointerRouting(target,base);else if(process.argv.includes('--regressions')){await testSeedPresets(target,base);await testPointerRouting(target,base);await testChipShowcase(target,base,snapshot);}else{await testChipFoundation(target,base);await testChipLayout(target,base);if(!process.argv.includes('--foundation')){await testSeedPresets(target,base);await testPointerRouting(target,base);await testChipShowcase(target,base,snapshot);}}}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
