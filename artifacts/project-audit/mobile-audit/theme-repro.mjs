import fs from'node:fs';import{chromium}from'playwright';import{serve}from'./server.mjs';import{route}from'../../../test/browser/mobile.mjs';
const s=await serve(),b=await chromium.launch(),p=await b.newPage({viewport:{width:384,height:853},hasTouch:true,isMobile:true});
try{
 if(process.env.THEME_DEBUG){
  await p.addInitScript(()=>window.themeDebug=[]);
  await p.route('**/dist/md3-expressive.esm.js',r=>r.fulfill({contentType:'text/javascript',body:'export * from "/src/index.js"'}));
  await p.route('**/src/theme/theme-context.js',r=>{
   let code=fs.readFileSync('src/theme/theme-context.js','utf8');
   code=code.replace('const { root, margin } = skipRoot(element);','const { root, margin } = skipRoot(element);if(element.getAttribute("label")==="Fixed Header Label")themeDebug.push({type:"wait",root:root.outerHTML.slice(0,180),margin,visible:rendered(element),rootVisible:root.checkVisibility({contentVisibilityAuto:true})});');
   code=code.replace('run: drawn => {','run: drawn => {if(element.getAttribute("label")==="Fixed Header Label")themeDebug.push({type:"run",drawn,stopWaiting:!!stopWaiting,visible:rendered(element)});');
   code=code.replace('const schedule = () => {','const schedule = () => {if(element.getAttribute("label")==="Fixed Header Label")themeDebug.push({type:"schedule",queued,stopWaiting:!!stopWaiting,visible:rendered(element)});');
   code=code.replace('release(root, group);\n  for (const [element, run]', 'release(root, group);themeDebug.push({type:"wake",root:root.outerHTML.slice(0,100)});\n  for (const [element, run]');
   r.fulfill({contentType:'text/javascript',body:code});
  });
 }
 await p.goto(s.url);await p.waitForFunction(()=>document.documentElement.hasAttribute('data-showcase-ready'));await route(p,'text-fields');
 const field=p.locator('md-text-field[label="Fixed Header Label"]');await field.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(1200);
 await route(p,'switch');await p.evaluate(async()=>{document.documentElement.dataset.theme='dark';const m=await import('/dist/md3-expressive.esm.js');m.applyDynamicTheme(m.getActiveSeedHex(),true)});await p.waitForTimeout(1600);
 await route(p,'text-fields');await field.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(2000);
 const dump=()=>field.evaluate(h=>({visible:h.checkVisibility({contentVisibilityAuto:true}),box:h.getBoundingClientRect().toJSON(),role:getComputedStyle(h).getPropertyValue('--md-sys-color-on-surface-variant'),root:h.shadowRoot.querySelector('.tf-root').style.cssText,helper:getComputedStyle(h.shadowRoot.querySelector('.helper-text')).color,descriptor:h._fieldColors.supporting,records:h._fieldColorBinding.records.map(r=>({property:r.property,color:r.color,token:r.token,target:getComputedStyle(r.probe).color}))}));
 console.log('before refresh',JSON.stringify(await dump()));if(process.env.THEME_DEBUG)console.log('debug',JSON.stringify(await p.evaluate(()=>themeDebug)));await field.evaluate(h=>h._fieldColorBinding.refresh());await p.waitForTimeout(500);console.log('after refresh',JSON.stringify(await dump()));
}finally{await b.close();await s.close()}
