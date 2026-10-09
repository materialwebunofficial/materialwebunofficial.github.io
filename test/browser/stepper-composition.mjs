import assert from 'node:assert/strict';
export async function testStepperComposition(browser,base){
 let checks=0;const check=(value,label)=>{assert.ok(value,label);checks++;};
 for(const width of[1000,390])for(const mode of['light','dark'])for(const dir of['ltr','rtl']){
  const page=await browser.newPage({viewport:{width,height:850}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.waitForFunction(()=>customElements.get('md-stepper'),null,{timeout:10000});
   await page.evaluate(({mode,dir})=>{
    document.documentElement.setAttribute('data-theme',mode);document.documentElement.dir=dir;
    document.querySelector('#fixture').innerHTML='<md-stepper id="workflow"><md-step label="Account" description="Details"><input id="account" value="Keep me"><md-stepper id="nested"><md-step label="Nested one">One</md-step><md-step label="Nested two">Two</md-step></md-stepper></md-step><md-step label="Unavailable" disabled>Disabled</md-step><md-step-panel label="Preferences" description="Theme"><button id="inside">Inside</button></md-step-panel><md-step label="Confirm">Done</md-step></md-stepper>';
    const host=document.querySelector('#workflow');window.stepChanges=[];window.stepResets=0;host.addEventListener('step-change',event=>{if(event.target===host)window.stepChanges.push(event.detail);});host.addEventListener('reset',event=>{if(event.target===host)window.stepResets++;});
   },{mode,dir});
   check(await page.evaluate(()=>{const h=document.querySelector('#workflow');return h.getSteps().length===4&&h._records.length===4&&h._records.every(record=>record.control.localName==='button'&&record.control.classList.contains('step-header')&&record.step.assignedSlot===record.slot)&&h._records.every(record=>record.connector.isConnected);}),'direct Step/StepPanel records own step headers and slots, excluding nested workflows');
   check(await page.evaluate(()=>{const h=document.querySelector('#workflow');return h.activeStep===0&&h.getSteps()[0].active&&!h.getSteps()[0].hidden&&h.getSteps().slice(1).every(step=>step.hidden&&step.inert)&&h._records[0].control.getAttribute('aria-current')==='step'&&h._records[0].control.ariaControlsElements[0]===h.getSteps()[0];}),'only current panel is exposed and the actual control references its region');
   await page.evaluate(()=>{const h=document.querySelector('#workflow');window.stepControls=h._records.map(record=>record.control);window.stepButtons=h._records.map(record=>record.control);window.stepPanels=h.getSteps().map(step=>step._body);});
   await page.locator('#workflow .header-bar').first().locator('.step-header').nth(1).click({force:true});
   check(await page.evaluate(()=>document.querySelector('#workflow').activeStep===0&&window.stepChanges.length===0),'disabled header cannot navigate');
   await page.locator('#workflow').evaluate(h=>h._records[2].control.focus());await page.keyboard.press('Enter');
   check(await page.evaluate(()=>{const h=document.querySelector('#workflow');return h.activeStep===2&&window.stepChanges.length===1&&window.stepChanges[0].previousStep===0&&h.getSteps()[0].completed&&!h.getSteps()[1].completed&&h._records[0].control.dataset.state==='done';}),'trusted activation skips a disabled step and reports one accepted transition');
   await page.keyboard.press('Enter');check(await page.evaluate(()=>window.stepChanges.length===1),'reactivating current header does not emit a duplicate transition');
   await page.evaluate(()=>{const h=document.querySelector('#workflow');h.goTo(1);h.goTo(-1);h.goTo(Infinity);h.goTo(2.5);h.goTo(100);});
   check(await page.evaluate(()=>document.querySelector('#workflow').activeStep===2&&window.stepChanges.length===1),'invalid and disabled programmatic destinations are rejected');
   await page.evaluate(()=>document.querySelector('#workflow').previous());
   check(await page.evaluate(()=>document.querySelector('#workflow').activeStep===0&&window.stepChanges.at(-1).previousStep===2),'previous skips unavailable steps');
   await page.locator('#account').fill('Retained text');
   await page.evaluate(()=>document.querySelector('#workflow').next());
   check(await page.evaluate(()=>{const h=document.querySelector('#workflow');return h.activeStep===2&&h.getSteps()[0].inert&&h.shadowRoot.activeElement===h._records[2].control;}),'hiding a focused panel restores focus to its current navigation control');
   await page.evaluate(()=>document.querySelector('#workflow').reset());
   check(await page.evaluate(()=>document.querySelector('#workflow').activeStep===0&&document.querySelector('#account').value==='Retained text'&&window.stepResets===1),'reset preserves caller input nodes and resets workflow state');
   await page.evaluate(()=>{const h=document.querySelector('#workflow');h.getSteps()[2].label='Updated preferences';h.getSteps()[2].description='Updated detail';h.getSteps()[2].error=true;});
   await page.waitForFunction(()=>document.querySelector('#workflow')._records[2].label.textContent==='Updated preferences');
   check(await page.evaluate(()=>{const h=document.querySelector('#workflow'),r=h._records[2];return r.description.textContent==='Updated detail'&&r.control.dataset.state==='error'&&r.control.getAttribute('aria-label').includes('Error')&&h._records.every((r,i)=>r.control===window.stepControls[i]&&r.control===window.stepButtons[i])&&h.getSteps().every((step,i)=>step._body===window.stepPanels[i]);}),'metadata/error updates retain controls and panels');
   await page.evaluate(()=>{const h=document.querySelector('#workflow');h.linear=true;h._records[0].control.focus();});
   check(await page.evaluate(()=>document.querySelector('#workflow')._records.slice(1).every(r=>r.control.disabled)),'linear mode locks forward header navigation');
   await page.keyboard.press('End');check(await page.evaluate(()=>document.querySelector('#workflow').shadowRoot.activeElement===document.querySelector('#workflow')._records[0].control),'keyboard focus excludes linear-locked headers');
   await page.evaluate(()=>document.querySelector('#workflow').next());
   check(await page.evaluate(()=>document.querySelector('#workflow').activeStep===2&&!document.querySelector('#workflow')._records[0].control.disabled),'programmatic next progresses linear workflow while earlier headers remain available');
   await page.evaluate(()=>{const h=document.querySelector('#workflow');h.disabled=true;h.next();h.prev();h.goTo(0);h.reset();});
   check(await page.evaluate(()=>document.querySelector('#workflow').activeStep===2&&document.querySelector('#workflow')._records.every(r=>r.control.disabled)&&window.stepResets===1),'workflow disabled state blocks all navigation actions');
   await page.evaluate(()=>{const h=document.querySelector('#workflow');h.disabled=false;h.linear=false;h.activeStep=0;h._records[0].control.focus();});
   await page.keyboard.press(dir==='rtl'?'ArrowLeft':'ArrowRight');
   check(await page.evaluate(()=>document.querySelector('#workflow').shadowRoot.activeElement===document.querySelector('#workflow')._records[2].control&&document.querySelector('#workflow').activeStep===0),'horizontal focus follows logical direction without changing the active step');
   await page.evaluate(()=>{const h=document.querySelector('#workflow');h.orientation='vertical';h._records[0].control.focus();});await page.keyboard.press('ArrowDown');
   check(await page.evaluate(()=>document.querySelector('#workflow').shadowRoot.activeElement===document.querySelector('#workflow')._records[2].control),'vertical keyboard focus skips unavailable steps');
   await page.evaluate(()=>{const h=document.querySelector('#workflow');h.remove();document.querySelector('#fixture').append(h);window.stepChanges=[];h._records[2].control.focus();});
   await page.keyboard.press('Space');
   check(await page.evaluate(()=>{const h=document.querySelector('#workflow');return h.activeStep===2&&h._records.length===4&&window.stepChanges.length===1&&h._records.every((r,i)=>r.control===window.stepControls[i]);}),'reconnect retains headers and restores one event owner');
   await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>document.querySelector('#workflow').goTo(3));
   check(await page.evaluate(()=>{const s=document.querySelector('#workflow').getSteps()[3];return s._body.style.opacity==='1'&&s._motion.raf===null&&!s._motion.channels.alpha.animation;}),'reduced motion settles shared effects immediately');
   await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>{const h=document.querySelector('#workflow');h.goTo(0);h.goTo(2);h.goTo(0);});
   await page.waitForFunction(()=>!document.querySelector('#workflow').getSteps().some(step=>step._motion?.channels.alpha.animation));
   check(await page.evaluate(()=>{const h=document.querySelector('#workflow');return h.activeStep===0&&h.getSteps().filter(step=>!step.hidden).length===1&&h.getSteps()[0]._body.style.opacity==='1';}),'rapid transitions finish with one exposed retained panel');
   await page.evaluate(()=>{const h=document.querySelector('#workflow');const step=document.createElement('md-step-panel');step.label='Added';step.textContent='Added content';h.append(step);});
   await page.waitForFunction(()=>document.querySelector('#workflow')._records.length===5);
   await page.evaluate(()=>{const h=document.querySelector('#workflow');window.stepMovedControl=h._records[4].control;h.prepend(h.getSteps()[4]);});
   await page.waitForFunction(()=>document.querySelector('#workflow')._records[0].control===window.stepMovedControl);
   check(await page.evaluate(()=>document.querySelector('#workflow')._records[0].label.textContent==='Added'),'dynamic insertion/reordering preserves option identity');
   await page.evaluate(()=>document.querySelector('#workflow').activeStep=999);
   check(await page.evaluate(()=>document.querySelector('#workflow').activeStep===4&&document.querySelector('#workflow').getSteps().filter(step=>step.active).length===1),'out-of-range controlled index clamps to a real panel');
   const bounds=await page.locator('#workflow').boundingBox();check(bounds.x>=0&&bounds.x+bounds.width<=width,'both orientations fit their viewport');
   await page.evaluate(()=>{const h=document.querySelector('#workflow');window.stepMotions=h.getSteps().map(step=>step._motion);h.remove();});
   check(await page.evaluate(()=>window.stepMotions.every(motion=>motion.disposed&&motion.raf===null)),'disconnect disposes all owned effects');
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 console.log('Stepper: '+checks+' trusted input/state/ARIA/RTL/retained/nested/reversal/lifecycle/viewport checks, 1000/390 light/dark passed.');
}
export async function testStepperShowcase(browser,base){
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{await page.goto(base+'/#stepper');await page.waitForFunction(()=>customElements.get('md-stepper'),null,{timeout:10000});
  for(const width of[1440,390])for(const colorMode of['light','dark']){
   await page.setViewportSize({width,height:900});await page.evaluate(colorMode=>customElements.get('md-expressive-theme').applyGlobal({scheme:'expressive',colorMode}),colorMode);
   await page.locator('#stepper-reset-btn').click();assert.ok(await page.locator('#stepper-prev-btn').evaluate(node=>node.disabled));
   await page.locator('#stepper-next-btn').click();await page.locator('#stepper-next-btn').click();
   assert.equal(await page.locator('#demo-stepper').evaluate(node=>node.activeStep),2);assert.ok(await page.locator('#stepper-next-btn').evaluate(node=>node.disabled));
   await page.locator('#stepper-prev-btn').click();await page.locator('#stepper-reset-btn').click();
   assert.equal(await page.locator('#demo-stepper').evaluate(node=>node.activeStep),0);
   const bounds=await page.locator('#demo-stepper').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width);
   for(const card of await page.locator('#demo-stepper md-step > md-card').all())assert.ok(await card.evaluate(node=>node instanceof customElements.get('md-card')));
  }
  assert.deepEqual(errors,[]);console.log('Stepper showcase: actual navigation/reset/boundary controls and viewport fit, 1440/390 light/dark passed.');
 }finally{await page.close();}
}
