import assert from 'node:assert/strict';
export async function testPaginatorComposition(browser,base){
 let checks=0;const check=(value,label)=>{assert.ok(value,label);checks++;};
 for(const width of[1000,390])for(const mode of['light','dark'])for(const dir of['ltr','rtl']){
  const page=await browser.newPage({viewport:{width,height:760}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(()=>customElements.whenDefined('md-paginator'));
   await page.evaluate(({mode,dir})=>{document.documentElement.setAttribute('data-theme',mode);document.documentElement.dir=dir;document.querySelector('#fixture').innerHTML='<md-paginator id="pager" length="125" page-size="10" show-first-last-buttons></md-paginator>';window.pages=[];document.querySelector('#pager').addEventListener('page',event=>window.pages.push(event.detail));}, {mode,dir});
   check(await page.evaluate(()=>{const h=document.querySelector('#pager'),r=h.shadowRoot;window.pagerRoot=r.querySelector('nav');window.pagerNext=r.querySelector('#btn-next');window.pagerMenu=r.querySelector('md-menu');return !r.querySelector('button')&&r.querySelectorAll('md-icon-button').length===4&&!!r.querySelector('md-button')&&!!r.querySelector('md-divider');}),'shared primitives own all paginator controls');
   check(await page.locator('#pager #range-label').textContent()==='1 – 10 of 125','initial range');
   check(await page.evaluate(()=>document.querySelector('#pager').shadowRoot.querySelector('#btn-prev').disabled),'previous boundary disabled');
   await page.locator('#pager #btn-next').click();
   check(await page.evaluate(()=>document.querySelector('#pager').pageIndex===1&&window.pages.length===1&&window.pages[0].previousPageIndex===0),'trusted next emits once');
   check(await page.evaluate(()=>window.pagerRoot===document.querySelector('#pager').shadowRoot.querySelector('nav')&&window.pagerNext===document.querySelector('#pager').shadowRoot.querySelector('#btn-next')),'paging retains controls');
   await page.locator('#pager #btn-next button').focus();await page.keyboard.press('Enter');
   check(await page.evaluate(()=>document.querySelector('#pager').pageIndex===2&&window.pages.length===2),'keyboard next emits once');
   await page.evaluate(()=>document.querySelector('#pager').pageIndex=5);
   await page.locator('#pager #page-size-toggle').click();
   await page.waitForFunction(()=>document.querySelector('#pager').shadowRoot.querySelector('md-menu').open);
   check(await page.evaluate(()=>{const m=window.pagerMenu;return m._menu.matches(':popover-open')&&m._anchor()===document.querySelector('#pager').shadowRoot.querySelector('#page-size-toggle')&&m._items.length===5;}),'shared anchored native dropdown menu');
   await page.locator('#pager md-menu-item[value="25"]').click();
   await page.waitForFunction(()=>document.querySelector('#pager').pageSize===25);
   check(await page.evaluate(()=>{const h=document.querySelector('#pager'),event=window.pages.at(-1);return h.pageIndex===2&&event.previousPageIndex===5&&event.pageIndex===2&&event.pageSize===25;}),'size change preserves first item and correct previous-page event');
   await page.waitForFunction(()=>!window.pagerMenu._visible);
   check(await page.evaluate(()=>window.pagerMenu===document.querySelector('#pager').shadowRoot.querySelector('md-menu')&&window.pagerMenu._items.filter(item=>item.selected).length===1),'retained menu and one selected size');
   await page.locator('#pager #btn-last').click();
   check(await page.locator('#pager #range-label').textContent()==='101 – 125 of 125','last range');
   check(await page.evaluate(()=>document.querySelector('#pager').shadowRoot.querySelector('#btn-next').disabled),'next boundary disabled');
   check(await page.evaluate(dir=>document.querySelector('#pager').shadowRoot.querySelector('#btn-next').getAttribute('icon')===(dir==='rtl'?'chevron_left':'chevron_right'),dir),'logical RTL navigation icon');
   await page.evaluate(()=>{const h=document.querySelector('#pager');h.length=2;});
   check(await page.locator('#pager #range-label').textContent()==='1 – 2 of 2','reduced length has valid visible range');
   await page.evaluate(()=>{const h=document.querySelector('#pager');h.length=0;});
   check(await page.locator('#pager #range-label').textContent()==='0 of 0','empty range');
   await page.evaluate(()=>{const h=document.querySelector('#pager');h.length=125;h.pageIndex=0;h.disabled=true;h.nextPage();});
   check(await page.evaluate(()=>{const h=document.querySelector('#pager'),r=h.shadowRoot;return h.pageIndex===0&&[...r.querySelectorAll('md-icon-button,md-button')].every(button=>button.disabled)&&!r.querySelector('md-menu').enabled;}),'disabled state belongs to all primitives');
   await page.evaluate(()=>{const h=document.querySelector('#pager');h.disabled=false;h.hidePageSize=true;h.showFirstLastButtons=false;});
   check(await page.evaluate(()=>{const r=document.querySelector('#pager').shadowRoot;return getComputedStyle(r.querySelector('.page-size-box')).display==='none'&&getComputedStyle(r.querySelector('#btn-first')).display==='none';}),'optional controls hide without rebuilding');
   await page.evaluate(()=>{const h=document.querySelector('#pager');h.hidePageSize=false;h.pageSizeOptions=[-1,'bad',20,20];h.pageSize=10;h.remove();document.querySelector('#fixture').append(h);window.pages=[];});
   check(await page.evaluate(()=>{const h=document.querySelector('#pager');return h.pageSizeOptions.join(',')==='20'&&h.shadowRoot.querySelector('md-menu').items.map(item=>item.value).join(',')==='20,10';}),'validated options include current value');
   await page.locator('#pager #btn-next').click();
   check(await page.evaluate(()=>window.pages.length===1&&document.querySelector('#pager').pageIndex===1),'reconnect has one listener');
   await page.locator('#pager #page-size-toggle button').focus();await page.keyboard.press('ArrowDown');
   const keyboard=await page.evaluate(()=>{const m=window.pagerMenu,b=document.querySelector('#pager').shadowRoot.querySelector('#page-size-toggle');return{open:m.open,enabled:m.enabled,connected:m.isConnected,aborted:m._abortController?.signal.aborted,inert:m._trigger.inert,hostDisabled:b.disabled,innerDisabled:b.shadowRoot.querySelector('button').disabled,active:document.activeElement?.localName,menuActive:m.shadowRoot.activeElement?.localName,buttonActive:b.shadowRoot.activeElement?.localName};});
   assert.ok(keyboard.open,'shared menu keyboard state '+JSON.stringify(keyboard));
   await page.keyboard.press('Escape');await page.waitForFunction(()=>!window.pagerMenu._visible);
   check(await page.evaluate(()=>!window.pagerMenu.open),'shared menu keyboard opening and Escape');
   const bounds=await page.locator('#pager').boundingBox();check(bounds.x>=0&&bounds.x+bounds.width<=width,'responsive paginator fits');
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 console.log('Paginator shared MD3E composition: '+checks+' input/state/RTL/retained/lifecycle checks.');
}
export async function testPaginatorShowcase(browser,base){
 const page=await browser.newPage({viewport:{width:1440,height:760}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(base+'/#paginator');await page.evaluate(()=>customElements.whenDefined('md-paginator'));
  for(const width of[1440,390])for(const colorMode of['light','dark']){
   await page.setViewportSize({width,height:760});
   await page.evaluate(colorMode=>{customElements.get('md-expressive-theme').applyGlobal({scheme:'expressive',colorMode});const h=document.querySelector('#demo-paginator');h.pageSize=10;h.pageIndex=0;},colorMode);
   await page.locator('#demo-paginator #btn-next').click();
   assert.equal(await page.locator('#paginator-content-preview .md-title-medium').textContent(),'Active Page Records 11–20 (Page 2)');
   await page.locator('#demo-paginator #page-size-toggle').click();
   await page.waitForFunction(()=>document.querySelector('#demo-paginator').shadowRoot.querySelector('md-menu').open);
   await page.locator('#demo-paginator md-menu-item[value="25"]').click();
   await page.waitForFunction(()=>!document.querySelector('#demo-paginator').shadowRoot.querySelector('md-menu')._visible);
   assert.equal(await page.locator('#paginator-content-preview .md-title-medium').textContent(),'Active Page Records 1–25 (Page 1)');
   await page.locator('#demo-paginator #btn-last').click();
   assert.equal(await page.locator('#paginator-content-preview .md-title-medium').textContent(),'Active Page Records 101–125 (Page 5)');
   const bounds=await page.locator('#demo-paginator').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width,'showcase paginator fits');
  }
  assert.deepEqual(errors,[]);console.log('Paginator showcase: trusted navigation, size selection, live data preview and viewport fit, 1440/390 light/dark passed.');
 }finally{await page.close();}
}
