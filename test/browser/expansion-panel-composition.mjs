import assert from 'node:assert/strict';
export async function testExpansionPanelComposition(browser,base){
 let checks=0;const check=(value,label)=>{assert.ok(value,label);checks++;};
 for(const width of[1000,390])for(const mode of['light','dark'])for(const dir of['ltr','rtl']){
  const page=await browser.newPage({viewport:{width,height:760}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.waitForFunction(()=>customElements.get('md-expansion-panel'),null,{timeout:10000});
   await page.evaluate(({mode,dir})=>{document.documentElement.setAttribute('data-theme',mode);document.documentElement.dir=dir;document.querySelector('#fixture').innerHTML='<md-expansion-panel id="panel" headline="Details" supporting-text="Description"><p>Content that wraps when the viewport is narrow.</p><md-button id="inside" label="Inside"></md-button></md-expansion-panel><button id="after">After</button>';const h=document.querySelector('#panel');window.panelHeader=h._header;window.panelRegion=h._region;window.panelEvents=[];h.addEventListener('toggle',event=>window.panelEvents.push(event.detail.open));},{mode,dir});
   check(await page.evaluate(()=>{const h=document.querySelector('#panel');return !!h.shadowRoot.querySelector('md-card')&&!!h.shadowRoot.querySelector('md-list-item')&&!h.shadowRoot.querySelector('button')&&h._region.inert&&h._region.getBoundingClientRect().height===0;}),'shared primitives and initially collapsed content');
   check(await page.evaluate(()=>window.panelHeader._item.ariaControlsElements[0]===window.panelRegion),'actual control relation crosses ancestor shadow scope');
   await page.locator('#panel md-list-item .item').click();
   await page.waitForFunction(()=>!Object.values(document.querySelector('#panel')._motion.channels).some(channel=>channel.animation));
   check(await page.evaluate(()=>{const h=document.querySelector('#panel');return h.open&&window.panelEvents.join(',')==='true'&&h._region.offsetHeight===h._body.offsetHeight&&!h._region.inert;}),'trusted activation opens once to natural content height');
   const aria=await page.locator('#panel').ariaSnapshot();check(aria.includes('heading "Details" [level=3]')&&aria.includes('button "Details" [expanded]')&&aria.includes('region "Details"'),'heading/button/labelled region accessible tree');
   check(await page.evaluate(()=>{const h=document.querySelector('#panel');return getComputedStyle(h._region).transitionDuration==='0s'&&getComputedStyle(h).opacity==='1';}),'one motion owner and no whole-component fade');
   await page.locator('#panel md-list-item .item').focus();await page.keyboard.press('Space');
   await page.waitForFunction(()=>!Object.values(document.querySelector('#panel')._motion.channels).some(channel=>channel.animation));
   check(await page.evaluate(()=>!document.querySelector('#panel').open&&window.panelEvents.join(',')==='true,false'),'shared keyboard activation once');
   await page.keyboard.press('Tab');check(await page.evaluate(()=>document.activeElement.id==='after'),'collapsed content is excluded from Tab');
   await page.evaluate(()=>{const h=document.querySelector('#panel');h.headline='Updated';h.supportingText='';h.headingLevel=2;});
   check(await page.evaluate(()=>{const h=document.querySelector('#panel');return h._header===window.panelHeader&&h._region===window.panelRegion&&h._header.getAttribute('headline')==='Updated'&&!h._header.hasAttribute('supporting-text');}),'content updates retain controls and remove absent support line');
   await page.locator('#panel md-list-item .item').click();await page.waitForFunction(()=>!Object.values(document.querySelector('#panel')._motion.channels).some(channel=>channel.animation));
   await page.locator('#inside button').focus();await page.evaluate(()=>document.querySelector('#panel').open=false);
   check(await page.evaluate(()=>document.querySelector('#panel')._header.shadowRoot.activeElement===document.querySelector('#panel')._header._item&&document.querySelector('#panel')._region.inert),'programmatic collapse restores header focus and blocks content');
   await page.evaluate(()=>{const h=document.querySelector('#panel');h.open=true;window.motion=h._motion;h.open=false;h.open=true;});
   await page.waitForFunction(()=>!Object.values(document.querySelector('#panel')._motion.channels).some(channel=>channel.animation));
   check(await page.evaluate(()=>{const h=document.querySelector('#panel');return h._motion===window.motion&&h.open&&h._region.offsetHeight===h._body.offsetHeight;}),'reversal retains one controller and settles at last intent');
   await page.evaluate(()=>{const p=document.createElement('p');p.textContent='Additional content after expansion.';document.querySelector('#panel').append(p);});
   await page.waitForFunction(()=>{const h=document.querySelector('#panel');return h._region.offsetHeight===h._body.offsetHeight&&!Object.values(h._motion.channels).some(channel=>channel.animation);});
   check(await page.evaluate(()=>document.querySelector('#panel')._region.offsetHeight===document.querySelector('#panel')._body.offsetHeight),'dynamic slotted content adjusts height');
   await page.evaluate(()=>document.querySelector('#panel').disabled=true);
   await page.locator('#panel md-list-item .item').click({force:true});
   check(await page.evaluate(()=>{const h=document.querySelector('#panel');return h.open&&h._header.disabled&&getComputedStyle(h).opacity==='1';}),'disabled header cannot toggle while content stays readable');
   await page.evaluate(()=>{const h=document.querySelector('#panel');h.disabled=false;h.remove();document.querySelector('#fixture').prepend(h);window.panelEvents=[];});
   await page.locator('#panel md-list-item .item').click();
   check(await page.evaluate(()=>window.panelEvents.length===1&&!document.querySelector('#panel').open),'reconnect has one activation listener');
   await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>document.querySelector('#panel').open=true);
   check(await page.evaluate(()=>{const h=document.querySelector('#panel');return h._motion.raf===null&&h._region.offsetHeight===h._body.offsetHeight;}),'reduced motion settles immediately');
   const bounds=await page.locator('#panel').boundingBox();check(bounds.x>=0&&bounds.x+bounds.width<=width,'responsive panel fits');
   await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>{const h=document.querySelector('#panel');h.open=false;window.disposedMotion=h._motion;h.remove();});
   await page.waitForTimeout(40);check(await page.evaluate(()=>window.disposedMotion.disposed&&window.disposedMotion.raf===null),'disconnect cancels motion');
   await page.evaluate(()=>{
    document.querySelector('#fixture').innerHTML='<md-accordion id="group"><md-expansion-panel id="one" headline="One" open><md-accordion><md-expansion-panel id="nested-one" headline="Nested one" open>Nested content</md-expansion-panel><md-expansion-panel id="nested-two" headline="Nested two">More content</md-expansion-panel></md-accordion></md-expansion-panel><md-expansion-panel id="two" headline="Two">Second content</md-expansion-panel></md-accordion>';
   });
   await page.locator('#two md-list-item .item').click();
   check(await page.evaluate(()=>!document.querySelector('#one').open&&document.querySelector('#two').open&&document.querySelector('#nested-one').open),'single accordion closes its sibling without changing nested intent');
   await page.locator('#one').locator('md-list-item .item').first().click();
   await page.locator('#nested-two md-list-item .item').click();
   check(await page.evaluate(()=>document.querySelector('#one').open&&!document.querySelector('#two').open&&!document.querySelector('#nested-one').open&&document.querySelector('#nested-two').open),'nested accordion owns only its own panels');
   await page.evaluate(()=>document.querySelector('#group').setAttribute('multi',''));
   await page.locator('#two md-list-item .item').click();
   check(await page.evaluate(()=>document.querySelector('#one').open&&document.querySelector('#two').open),'multi attribute permits simultaneous panels');
   await page.evaluate(()=>{window.detachedGroup=document.querySelector('#group');window.detachedGroup.removeAttribute('multi');window.detachedGroup.remove();const two=window.detachedGroup.querySelector('#two');two.open=false;two.toggle();});
   check(await page.evaluate(()=>window.detachedGroup.querySelector('#one').open),'detached accordion has no active event owner');
   await page.evaluate(()=>{window.detachedGroup.querySelector('#two').open=false;document.querySelector('#fixture').append(window.detachedGroup);});
   await page.locator('#two md-list-item .item').click();
   check(await page.evaluate(()=>!document.querySelector('#one').open&&document.querySelector('#two').open),'reconnected accordion restores sibling exclusivity');
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 console.log('ExpansionPanel shared Card/ListItem/motion composition: '+checks+' trusted input/ARIA/retained/reversal/content/lifecycle checks.');
}
export async function testExpansionPanelShowcase(browser,base){
 const page=await browser.newPage({viewport:{width:1440,height:760}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{await page.goto(base+'/#expansion-panel');await page.waitForFunction(()=>customElements.get('md-expansion-panel'),null,{timeout:10000});
  for(const width of[1440,390])for(const colorMode of['light','dark']){
   await page.setViewportSize({width,height:760});await page.evaluate(colorMode=>customElements.get('md-expressive-theme').applyGlobal({scheme:'expressive',colorMode}),colorMode);
   for(const panel of await page.locator('#expansion-panel md-expansion-panel').all()){
    const before=await panel.evaluate(node=>node.open);await panel.locator('md-list-item .item').click();
    await page.waitForFunction(id=>{const h=[...document.querySelectorAll('#expansion-panel md-expansion-panel')].find(node=>node._panelId===id);return !Object.values(h._motion.channels).some(channel=>channel.animation);},await panel.evaluate(node=>node._panelId));
    assert.equal(await panel.evaluate(node=>node.open),!before);const bounds=await panel.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width);
   }
  }
  assert.deepEqual(errors,[]);console.log('ExpansionPanel showcase: all three real disclosures and viewport fit, 1440/390 light/dark passed.');
 }finally{await page.close();}
}
