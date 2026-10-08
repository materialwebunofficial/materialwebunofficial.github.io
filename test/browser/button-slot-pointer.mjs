import assert from 'node:assert/strict';
export async function testButtonSlotPointer(browser,base){
 const page=await browser.newPage({viewport:{width:960,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(async()=>{await customElements.whenDefined('md-button');await document.fonts.ready;document.querySelector('#fixture').innerHTML='<md-button id="slot-button" variant="filled" size="m">Explore components</md-button>';const h=document.querySelector('#slot-button');h._clicks=0;h.addEventListener('click',()=>h._clicks++);});
  const h=page.locator('#slot-button');await h.click();assert.equal(await h.evaluate(h=>h._clicks),1,'real pointer activation over assigned text');
  await h.evaluate(h=>h.innerHTML='<span><em>Nested label</em></span>');await h.locator('em').click();assert.equal(await h.evaluate(h=>h._clicks),2,'real pointer activation over assigned nested elements');
  const rect=await h.boundingBox();await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();
  await page.evaluate(r=>{const overlay=document.createElement('div');overlay.id='hit-overlay';overlay.style.cssText=`position:fixed;z-index:999;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;background:transparent`;document.body.append(overlay);},rect);
  await page.mouse.up();assert.equal(await h.evaluate(h=>h._clicks),2,'a foreign overlay at release still cancels captured activation');await page.locator('#hit-overlay').evaluate(n=>n.remove());
  await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();await page.mouse.move(rect.x+rect.width+30,rect.y+rect.height+30);await page.mouse.up();assert.equal(await h.evaluate(h=>h._clicks),2,'release outside the control remains canceled');
  await h.click();assert.equal(await h.evaluate(h=>h._clicks),3,'normal activation after canceled presses recovers');assert.deepEqual(errors,[]);
  console.log('Button slotted pointer: real assigned text/nested element activation, foreign-overlay/outside captured release cancellation and subsequent recovery passed.');
 }finally{await page.close();}
}
