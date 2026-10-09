import {testComposeColorCSS} from '../test/browser/compose-color-css.mjs';
import '../test/unit/compose-color.test.mjs';
import '../test/unit/packed-color-runtime.test.mjs';
import '../test/unit/packed-color-broadcast-group.test.mjs';
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
import {listenBrowserTestServer} from './browser-test-server.mjs';
import '../test/unit/text-field-state.test.mjs';import '../test/unit/color-alpha.test.mjs';
import '../test/unit/text-field-cutout.test.mjs';
import '../test/unit/text-field-layout.test.mjs';
import {testTextFieldEditor} from '../test/browser/text-field-editor.mjs';
import {testTextFieldLayoutBinding} from '../test/browser/text-field-layout.mjs';
import {testTextFieldFoundation} from '../test/browser/text-field-foundation.mjs';
import '../test/unit/text-field-container-runtime.test.mjs';
import '../test/unit/text-field-broadcast-group.test.mjs';
import {testTextFieldContainerRuntime} from '../test/browser/text-field-container-runtime.mjs';
import {testTextFieldBroadcast} from '../test/browser/text-field-broadcast.mjs';
import {testTextFieldCutoutBinding} from '../test/browser/text-field-cutout.mjs';
import {testSelectComposition,testSelectShowcase} from '../test/browser/select-composition.mjs';
import {testAutocompleteComposition,testAutocompleteShowcase} from '../test/browser/autocomplete-composition.mjs';
import {testStepperComposition,testStepperShowcase} from '../test/browser/stepper-composition.mjs';
import {testDialogLifecycle,testDialogShowcase} from '../test/browser/dialog-parity.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream'});res.end(error?'Not found':data);});
});
await listenBrowserTestServer(server);const browser=await chromium.launch(),base='http://127.0.0.1:'+server.address().port;
const source={newPage:async options=>{const page=await browser.newPage(options);await page.route('**/dist/md3-expressive.esm.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:'export * from "/src/index.js";'}));return page;}};
try{const target=process.argv.includes('--source')?source:browser;if(process.argv.includes('--color-css-only'))await testComposeColorCSS(target,base);else if(process.argv.includes('--broadcast-only'))await testTextFieldBroadcast(target,base);else if(process.argv.includes('--container-runtime-only'))await testTextFieldContainerRuntime(target,base);else if(process.argv.includes('--editor'))await testTextFieldEditor(target,base);else if(process.argv.includes('--layout'))await testTextFieldLayoutBinding(target,base);else{await testComposeColorCSS(target,base);await testTextFieldFoundation(target,base);await testTextFieldContainerRuntime(target,base);await testTextFieldBroadcast(target,base);await testTextFieldCutoutBinding(target,base);await testTextFieldEditor(target,base);await testTextFieldLayoutBinding(target,base);if(!process.argv.includes('--foundation')){await testSelectComposition(target,base);await testSelectShowcase(target,base);await testAutocompleteComposition(target,base);await testAutocompleteShowcase(target,base);await testStepperComposition(target,base);await testStepperShowcase(target,base);await testDialogLifecycle(target,base);await testDialogShowcase(target,base);}}}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
