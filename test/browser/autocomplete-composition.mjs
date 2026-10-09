import assert from 'node:assert/strict';
export async function testAutocompleteComposition(browser,base){
 let checks=0;const check=(value,label)=>{assert.ok(value,label);checks++;};
 for(const width of[1000,390])for(const mode of['light','dark'])for(const dir of['ltr','rtl']){
  const page=await browser.newPage({viewport:{width,height:760}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(()=>customElements.whenDefined('md-autocomplete'));
   await page.evaluate(({mode,dir})=>{
    document.documentElement.setAttribute('data-theme',mode);document.documentElement.dir=dir;
    document.querySelector('#fixture').innerHTML='<form style="width:min(320px,100%)"><md-autocomplete id="ac" name="framework" label="Framework" required></md-autocomplete><button id="after" type="button">After</button><md-text-field id="plain" label="Plain"></md-text-field></form>';
    const ac=document.querySelector('#ac');ac.options=['React','Redux',{label:'Reserved',value:'reserved',disabled:true},{label:'Vue',value:'vue'},'Lit'];window.selects=[];window.inputs=[];
    ac.addEventListener('select',event=>window.selects.push(event.detail));ac.addEventListener('input',event=>window.inputs.push(event.detail?.value));
    window.acInput=ac.shadowRoot.querySelector('input');window.acRoot=ac.shadowRoot.querySelector('.field-box');window.acMenu=ac.shadowRoot.querySelector('md-menu');
   },{mode,dir});
   check(await page.evaluate(()=>document.querySelector('#ac') instanceof customElements.get('md-text-field')&&!!document.querySelector('#ac').shadowRoot.querySelector('md-icon-button')&&window.acMenu.popupRole==='listbox'),'shared field/action/menu');
   check(await page.evaluate(()=>!document.querySelector('form').checkValidity()&&new FormData(document.querySelector('form')).get('framework')===''),'required form is initially invalid');
   await page.locator('#ac input').focus();
   await page.waitForFunction(()=>window.acMenu.open);
   check(await page.evaluate(()=>window.acInput===document.querySelector('#ac').shadowRoot.activeElement&&window.acInput.getAttribute('aria-expanded')==='true'&&window.acMenu.matches('[role="listbox"]')&&window.acInput.getRootNode().getElementById(window.acInput.getAttribute('aria-controls'))===window.acMenu),'editable popup retains focus and scoped control relation');
   await page.waitForFunction(()=>!Object.values(window.acMenu._motion.channels).some(channel=>channel.animation));
   const menuBounds=await page.locator('#ac md-menu .menu').boundingBox(),fieldBounds=await page.locator('#ac .field-box').boundingBox();
   check(Math.abs(menuBounds.width-fieldBounds.width)<1&&menuBounds.x>=0&&menuBounds.x+menuBounds.width<=width,'menu matches field and viewport');
   await page.locator('#ac input').fill('Re');
   check(await page.evaluate(()=>document.querySelector('#ac').value==='Re'&&window.inputs.length===1&&window.inputs[0]==='Re'),'one forwarded input event with current value');
   check(await page.evaluate(()=>[...window.acMenu.querySelectorAll('md-menu-item')].filter(item=>!item.hidden).length===3),'case-insensitive filtering');
   await page.keyboard.press('ArrowDown');
   check(await page.evaluate(()=>{const item=window.acInput.getRootNode().getElementById(window.acInput.getAttribute('aria-activedescendant'));return item?.label==='React'&&item.getAttribute('role')==='option'&&item.getAttribute('aria-selected')==='true'&&window.acInput===document.querySelector('#ac').shadowRoot.activeElement;}),'same-root active descendant and selected option');
   const aria=await page.locator('#ac').ariaSnapshot();check(aria.includes('combobox "Framework"')&&aria.includes('listbox "Framework"')&&aria.includes('option "React" [selected]')&&!aria.includes('menuitem'),'actual accessible combobox/listbox/option tree');
   await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');
   check(await page.evaluate(()=>window.acInput.getRootNode().getElementById(window.acInput.getAttribute('aria-activedescendant'))?.label==='Redux'),'navigation skips disabled and stays at final enabled result');
   await page.keyboard.press('Enter');
   check(await page.evaluate(()=>document.querySelector('#ac').value==='Redux'&&!document.querySelector('#ac').open&&window.selects.length===1&&window.selects[0].value==='Redux'),'keyboard selection once');
   check(await page.evaluate(()=>new FormData(document.querySelector('form')).get('framework')==='Redux'&&document.querySelector('form').checkValidity()),'form submission uses accepted value');
   await page.locator('#ac md-icon-button').click();
   check(await page.evaluate(()=>document.querySelector('#ac').value===''&&window.inputs.length===2&&window.inputs[1]===''&&document.querySelector('#ac').shadowRoot.activeElement===window.acInput),'shared clear action updates form and input once');
   await page.locator('#ac md-menu-item').filter({hasText:'Vue'}).click();
   check(await page.evaluate(()=>document.querySelector('#ac').value==='vue'&&window.selects.length===2&&!document.querySelector('#ac').open),'pointer object-label selection once');
   await page.waitForFunction(()=>!window.acMenu._visible);
   await page.locator('#ac input').fill('Re');await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');
   check(await page.evaluate(()=>document.querySelector('#ac').value==='Re'&&!document.querySelector('#ac').open&&!window.acInput.hasAttribute('aria-activedescendant')),'Escape retains uncommitted text');
   await page.keyboard.press('ArrowDown');await page.keyboard.press('Tab');
   check(await page.evaluate(()=>document.querySelector('#ac').shadowRoot.activeElement!==window.acInput&&!document.querySelector('#ac').open),'Tab leaves the combobox without trapping');
   await page.locator('#after').focus();await page.waitForFunction(()=>!window.acMenu._visible);
   check(await page.evaluate(()=>document.activeElement.id==='after'),'exit does not steal the next focus');
   await page.evaluate(()=>{const h=document.querySelector('#ac');h.value='No match';});
   await page.locator('#ac input').focus();
   check(await page.evaluate(()=>!document.querySelector('#ac').open),'no results do not open an empty popup');
   await page.evaluate(()=>{const h=document.querySelector('#ac');h.value='';h.label='Library';h.placeholder='Filter';h.remove();document.querySelector('form').prepend(h);window.inputs=[];window.selects=[];});
   await page.locator('#ac input').fill('Lit');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
   check(await page.evaluate(()=>window.acInput===document.querySelector('#ac').shadowRoot.querySelector('input')&&window.acRoot===document.querySelector('#ac').shadowRoot.querySelector('.field-box')&&window.inputs.length===1&&window.selects.length===1),'retained controls and reconnect has one listener');
   check(await page.locator('#ac label.label').textContent()==='Library'&&await page.locator('#ac input').getAttribute('placeholder')==='Filter','live field attributes');
   await page.evaluate(()=>{const h=document.querySelector('#ac');h.disabled=true;h.open=true;});
   check(await page.evaluate(()=>!document.querySelector('#ac').open&&window.acInput.disabled&&!window.acMenu.enabled),'disabled state closes and suppresses input');
   await page.evaluate(()=>{const h=document.querySelector('#ac');h.disabled=false;h.setAttribute('value','Initial');h.value='Changed';document.querySelector('form').reset();});
   check(await page.evaluate(()=>document.querySelector('#ac').value==='Initial'&&new FormData(document.querySelector('form')).get('framework')==='Initial'),'form reset restores default value');
   await page.evaluate(()=>{const h=document.querySelector('#ac');h.formStateRestoreCallback('Restored');});
   check(await page.evaluate(()=>document.querySelector('#ac').value==='Restored'),'form state restores');
   await page.evaluate(()=>{const h=document.querySelector('#ac');const fieldset=document.createElement('fieldset');h.before(fieldset);fieldset.append(h);fieldset.disabled=true;});
   check(await page.evaluate(()=>window.acInput.disabled&&!window.acMenu.enabled),'fieldset disabled flows to shared controls');
   await page.evaluate(()=>{document.querySelector('fieldset').disabled=false;});
   check(await page.evaluate(()=>!window.acInput.disabled&&window.acMenu.enabled),'fieldset enable recovers');
   await page.evaluate(()=>{const h=document.querySelector('#ac');h.options=[{label:'Disabled duplicate',value:'same',disabled:true},{label:'Enabled duplicate',value:'same'}];h.value='';h.readOnly=true;});
   check(await page.evaluate(()=>window.acInput.readOnly&&document.querySelector('form').checkValidity()),'shared read-only field reflects and skips required editing constraint');
   await page.locator('#ac input').focus();await page.locator('#ac md-menu-item').filter({hasText:'Enabled duplicate'}).click();
   check(await page.evaluate(()=>document.querySelector('#ac').value==='same'),'duplicate values retain item identity and enabled choice');
   await page.waitForFunction(()=>!window.acMenu._visible);
   await page.evaluate(()=>{window.plainEvents={input:0,change:0};const h=document.querySelector('#plain');for(const name of['input','change'])h.addEventListener(name,()=>window.plainEvents[name]++);});
   await page.locator('#plain [part="input"]').fill('Plain value');await page.locator('#after').focus();
   check(await page.evaluate(()=>window.plainEvents.input===1&&window.plainEvents.change===1&&document.querySelector('#plain').value==='Plain value'),'shared TextField forwards input/change once');
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 console.log('Autocomplete shared exposed-dropdown composition: '+checks+' trusted input/form/ARIA/RTL/retained/lifecycle checks.');
}
export async function testAutocompleteShowcase(browser,base){
 const page=await browser.newPage({viewport:{width:1440,height:760}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(base+'/#autocomplete');await page.evaluate(()=>customElements.whenDefined('md-autocomplete'));
  for(const width of[1440,390])for(const colorMode of['light','dark']){
   await page.setViewportSize({width,height:760});await page.evaluate(colorMode=>customElements.get('md-expressive-theme').applyGlobal({scheme:'expressive',colorMode}),colorMode);
   await page.locator('#demo-autocomplete input').fill('Vue');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
   assert.equal(await page.locator('#demo-autocomplete input').inputValue(),'Vue 3');
   await page.waitForFunction(()=>!document.querySelector('#demo-autocomplete').shadowRoot.querySelector('md-menu')._visible);
   const bounds=await page.locator('#demo-autocomplete').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width);
  }
  assert.deepEqual(errors,[]);console.log('Autocomplete showcase: actual typing/arrow/selection controls and viewport fit, 1440/390 light/dark passed.');
 }finally{await page.close();}
}
