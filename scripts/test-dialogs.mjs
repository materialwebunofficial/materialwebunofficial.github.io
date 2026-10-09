import {testComposeColorCSS} from '../test/browser/compose-color-css.mjs';
import '../test/unit/compose-color.test.mjs';
import '../test/unit/packed-color-runtime.test.mjs';
import '../test/unit/packed-color-broadcast-group.test.mjs';
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
import {listenBrowserTestServer} from './browser-test-server.mjs';
import {testDialogLifecycle,testDialogShowcase} from '../test/browser/dialog-parity.mjs';
import '../test/unit/picker-colors.test.mjs';
import {testPickerColors} from '../test/browser/picker-colors.mjs';
import '../test/unit/picker-period.test.mjs';
import {testPickerPeriod} from '../test/browser/picker-period.mjs';
import '../test/unit/picker-clock.test.mjs';
import '../test/unit/picker-clock-runtime.test.mjs';
import {testPickerClock} from '../test/browser/picker-clock.mjs';
import {testPickerClockRuntime} from '../test/browser/picker-clock-runtime.mjs';
import '../test/unit/picker-clock-broadcast-runtime.test.mjs';
import {testPickerClockBroadcast} from '../test/browser/picker-clock-broadcast.mjs';
import '../test/unit/picker-input.test.mjs';
import {testPickerInput} from '../test/browser/picker-input.mjs';
import '../test/unit/picker-input-colors.test.mjs';
import {testPickerInputContainer} from '../test/browser/picker-input-container.mjs';
import '../test/unit/text-field-container-runtime.test.mjs';
import '../test/unit/text-field-broadcast-group.test.mjs';
import {testTextFieldContainerRuntime} from '../test/browser/text-field-container-runtime.mjs';
import {testTextFieldBroadcast} from '../test/browser/text-field-broadcast.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream'});res.end(error?'Not found':data);});
});
await listenBrowserTestServer(server);const browser=await chromium.launch(),base=`http://127.0.0.1:${server.address().port}`;
const source={newPage:async options=>{const page=await browser.newPage(options);await page.route('**/dist/md3-expressive.esm.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:'export * from "/src/index.js";'}));return page;}};
try{const target=process.argv.includes('--source')?source:browser;if(process.argv.includes('--color-css-only'))await testComposeColorCSS(target,base);else if(process.argv.includes('--clock-broadcast-only'))await testPickerClockBroadcast(target,base);else if(process.argv.includes('--broadcast-only'))await testTextFieldBroadcast(target,base);else if(process.argv.includes('--container-runtime-only'))await testTextFieldContainerRuntime(target,base);else if(process.argv.includes('--input-container-only'))await testPickerInputContainer(target,base);else if(process.argv.includes('--input-only')){await testPickerInput(target,base);await testPickerInputContainer(target,base);}else if(process.argv.includes('--clock-runtime-only')){await testPickerClockRuntime(target,base);await testPickerClockBroadcast(target,base);}else if(process.argv.includes('--clock-only')){await testPickerClock(target,base);await testPickerClockRuntime(target,base);await testPickerClockBroadcast(target,base);}else if(process.argv.includes('--period-only'))await testPickerPeriod(target,base);else{await testComposeColorCSS(target,base);if(!process.argv.includes('--colors-only'))await testDialogLifecycle(target,base);if(!process.argv.includes('--lifecycle-only')){await testPickerColors(target,base);if(!process.argv.includes('--colors-only')){await testPickerPeriod(target,base);await testPickerClock(target,base);await testPickerClockRuntime(target,base);await testPickerClockBroadcast(target,base);await testPickerInput(target,base);await testPickerInputContainer(target,base);await testTextFieldContainerRuntime(target,base);await testTextFieldBroadcast(target,base);await testDialogShowcase(target,base);}}}}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
