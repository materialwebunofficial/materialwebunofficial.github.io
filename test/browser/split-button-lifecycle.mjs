import assert from 'node:assert/strict';
export async function testSplitButtonLifecycle(browser,base){
 const page=await browser.newPage({viewport:{width:750,height:700}}),errors=[];let checks=0;
 page.on('pageerror',e=>errors.push(e.message));const equal=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(()=>customElements.whenDefined('md-split-button'));
  for(const size of ['xs','s','m','l','xl'])for(const dir of ['ltr','rtl']){
   await page.evaluate(({size,dir})=>document.querySelector('#fixture').innerHTML=`<md-split-button id="split" size="${size}" dir="${dir}" label="Edit"></md-split-button>`,{size,dir});
   const host=page.locator('#split'),button=host.locator('.btn-right');await button.click();
   equal(await host.evaluate(h=>{const menu=h.shadowRoot.querySelector('.dropdown-menu'),job=menu._springAnim;h._sync();h.openMenu();return{same:job===menu._springAnim,open:h.open,inert:menu.inert};}),{same:true,open:true,inert:false},`${size}/${dir} no repeated opening on sync/openMenu`);
   await page.waitForTimeout(350);await button.hover();await page.mouse.down();await page.waitForTimeout(280);
   equal(await button.evaluate(b=>b.classList.contains('pressed')),true,`${size}/${dir} native pressed shape precedence retained`);
   await page.mouse.up();equal(await host.evaluate(h=>{const button=h.shadowRoot.querySelector('.btn-right'),menu=h.shadowRoot.querySelector('.dropdown-menu');return{open:h.open,checked:button.classList.contains('open'),expanded:button.getAttribute('aria-expanded'),inert:menu.inert,exiting:h._closing,visible:getComputedStyle(menu).visibility};}),{open:false,checked:false,expanded:'false',inert:true,exiting:true,visible:'visible'},`${size}/${dir} checked retires on click while popup exits`);
   await page.waitForTimeout(230);equal(await host.evaluate(h=>({closing:h._closing,visibility:getComputedStyle(h.shadowRoot.querySelector('.dropdown-menu')).visibility})),{closing:false,visibility:'hidden'},`${size}/${dir} no second checked->default target at exit`);
   await host.evaluate(h=>{h.openMenu();h.close();h.openMenu();});await page.waitForTimeout(240);equal(await host.evaluate(h=>({open:h.open,closing:h._closing,visible:getComputedStyle(h.shadowRoot.querySelector('.dropdown-menu')).visibility})),{open:true,closing:false,visible:'visible'},`${size}/${dir} stale closing job cannot retire a reopened menu`);
   equal(await host.evaluate(h=>{h.close();const job=h.shadowRoot.querySelector('.dropdown-menu')._springAnim,parent=h.parentNode;h.remove();const retired=job.playState==='idle';parent.append(h);return retired&&!h.open&&!h._closing&&getComputedStyle(h.shadowRoot.querySelector('.dropdown-menu')).visibility==='hidden';}),true,`${size}/${dir} detached exit retires`);
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{const h=document.querySelector('#split');h.openMenu();h.close();});await page.waitForTimeout(30);
  equal(await page.locator('#split').evaluate(h=>h.open||h._closing),false,'reduced motion closes semantically and visually');
  assert.deepEqual(errors,[]);console.log(`Split button lifecycle: ${checks} trusted activation and opening/checked/exit/reversal/disposal checks across five sizes and RTL passed. Shape spring/geometry/color/native popup parity remains separately open.`);
 }finally{await page.close();}
}
