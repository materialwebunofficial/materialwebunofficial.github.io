import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
import {listenBrowserTestServer} from './browser-test-server.mjs';
import {testSelectComposition} from '../test/browser/select-composition.mjs';
import {testAutocompleteComposition} from '../test/browser/autocomplete-composition.mjs';
import {testDialogLifecycle} from '../test/browser/dialog-parity.mjs';
import {testNavigationRailModal} from '../test/browser/navigation-rail-modal.mjs';
import {testSearchBarParity} from '../test/browser/search-bar-parity.mjs';
import {testSegmentedButtonParity} from '../test/browser/segmented-button-parity.mjs';
import {testTextFieldEditor} from '../test/browser/text-field-editor.mjs';
import {testSelectionKeyboard} from '../test/browser/selection-keyboard.mjs';
import {testTooltipFocusParity} from '../test/browser/tooltip-focus.mjs';
import {testIndicatorVisibility} from '../test/browser/indicator-visibility.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/\/$/,'/index.html'));
 if(!file.startsWith(root)){res.writeHead(403).end();return;}
 fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream'});res.end(error?'Not found':data);});
});
await listenBrowserTestServer(server);const browser=await chromium.launch();
try{for(const test of [testSelectComposition,testAutocompleteComposition,testDialogLifecycle,testNavigationRailModal,testSearchBarParity,testSegmentedButtonParity,testTextFieldEditor,testSelectionKeyboard,testTooltipFocusParity,testIndicatorVisibility])await test(browser,'http://127.0.0.1:'+server.address().port);}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
