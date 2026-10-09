import assert from 'node:assert/strict';
export async function testSelectComposition(browser,base){
 let checks=0;const check=(value,label)=>{assert.ok(value,label);checks++;};
 for(const width of[1000,390])for(const mode of['light','dark'])for(const dir of['ltr','rtl']){
  const page=await browser.newPage({viewport:{width,height:760}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.waitForFunction(()=>customElements.get('md-select'),null,{timeout:10000});
   await page.evaluate(({mode,dir})=>{
    document.documentElement.setAttribute('data-theme',mode);document.documentElement.dir=dir;
    const options='<md-option value="a">Alpha</md-option><md-option value="b">Beta</md-option><md-option value="d" disabled>Forbidden</md-option><md-option value="c">Gamma</md-option><md-option value="c">Gamma alternative</md-option>';
    document.querySelector('#fixture').innerHTML='<form id="form" style="width:min(340px,100%)"><fieldset id="fieldset" style="margin:0;padding:0;border:0"><md-select id="select" label="Choice" name="choice" value="b" required>'+options+'</md-select><button id="after" type="button">After</button><md-select id="multi" label="Choices" name="choices" multiple value="a,b">'+options+'</md-select></fieldset></form>';
    const h=document.querySelector('#select');window.selectInput=h.shadowRoot.querySelector('input');window.selectMenu=h._selectMenu;window.selectEvents=[];window.selectInputs=[];h.addEventListener('change',event=>window.selectEvents.push(event.detail.value));h.addEventListener('input',event=>window.selectInputs.push(event.detail.value));
   },{mode,dir});
   check(await page.evaluate(()=>{const h=document.querySelector('#select');return h instanceof customElements.get('md-text-field')&&window.selectInput.readOnly&&window.selectInput.value==='Beta'&&h.querySelector('md-option[value="b"]').selected&&h.shadowRoot.querySelector('slot').hidden;}),'initial parser upgrade resolves selected label through shared field and hidden option data');
   check(await page.evaluate(()=>new FormData(document.querySelector('#form')).get('choice')==='b'&&document.querySelector('#form').checkValidity()),'form submits value rather than display text');
   await page.evaluate(()=>window.selectItems=document.querySelector('#select')._optionRecords.map(record=>record.item));
   await page.locator('#select input').click();
   check(await page.evaluate(()=>window.selectInput===document.querySelector('#select').shadowRoot.activeElement&&window.selectInput.getRootNode().getElementById(window.selectInput.getAttribute('aria-controls'))===window.selectMenu),'popup retains field focus with an actual same-root control relation');
   await page.waitForFunction(()=>!Object.values(window.selectMenu._motion.channels).some(channel=>channel.animation));
   const popup=await page.locator('#select md-menu .menu').boundingBox(),field=await page.locator('#select .field-box').boundingBox();
   check(Math.abs(popup.width-field.width)<1&&popup.x>=0&&popup.x+popup.width<=width,'native exposed menu provider matches anchor and viewport');
   await page.keyboard.press('ArrowDown');
   check(await page.evaluate(()=>{const item=window.selectInput.getRootNode().getElementById(window.selectInput.getAttribute('aria-activedescendant'));return item?.label==='Gamma'&&document.querySelector('#select').value==='b'&&window.selectMenu.querySelectorAll('[aria-selected="true"]').length===1&&item.getAttribute('aria-selected')==='false';}),'exploration skips disabled without changing committed selection or announcing two selected options');
   await page.keyboard.press('Escape');check(await page.evaluate(()=>!document.querySelector('#select').open&&document.querySelector('#select').value==='b'&&window.selectEvents.length===0),'Escape preserves accepted value');
   await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
   check(await page.evaluate(()=>document.querySelector('#select').value==='c'&&window.selectInput.value==='Gamma'&&!document.querySelector('#select').open&&window.selectEvents.join(',')==='c'&&window.selectInputs.join(',')==='c'),'keyboard commits one input/change with value and label separated');
   await page.locator('#select input').click();await page.locator('#select md-menu-item').last().locator('button').click();
   check(await page.evaluate(()=>document.querySelector('#select').value==='c'&&window.selectInput.value==='Gamma alternative'&&window.selectEvents.length===2&&document.querySelector('#select').querySelectorAll('md-option[selected]').length===1),'duplicate values preserve the chosen option identity');
   await page.evaluate(()=>document.querySelector('#select').value='c');
   check(await page.evaluate(()=>window.selectInput.value==='Gamma'&&document.querySelector('#select').getAttribute('value')==='b'),'programmatic value resolves the first match and preserves reset default');
   await page.locator('#select input').click();await page.keyboard.press('Home');await page.keyboard.press('Tab');
   await page.waitForFunction(()=>!window.selectMenu._visible);
   check(await page.evaluate(()=>document.querySelector('#select').value==='a'&&document.activeElement.id==='after'),'Tab accepts the active single choice and exit does not steal next focus');
   await page.locator('#multi input').click();await page.keyboard.press('End');await page.keyboard.press('Space');
   check(await page.evaluate(()=>{const h=document.querySelector('#multi');return h.open&&h.value==='a,b,c'&&h._selectMenu.getAttribute('aria-multiselectable')==='true'&&h.querySelectorAll('md-option[selected]').length===3;}),'multiple keyboard toggle retains popup and preserves CSV form API');
   await page.keyboard.press('Space');check(await page.evaluate(()=>document.querySelector('#multi').value==='a,b'&&document.querySelector('#multi').open),'multiple second toggle removes only that option');
   await page.keyboard.press('Escape');await page.evaluate(()=>document.querySelector('#form').reset());
   check(await page.evaluate(()=>document.querySelector('#select').value==='b'&&window.selectInput.value==='Beta'&&document.querySelector('#multi').value==='a,b'),'form reset restores authored defaults and display labels');
   await page.evaluate(()=>document.querySelector('#select').value='');
   check(await page.evaluate(()=>document.querySelector('#select').validity.valueMissing&&!document.querySelector('#form').checkValidity()),'required Select validates despite its readonly display input');
   await page.evaluate(()=>{const h=document.querySelector('#select');h.setCustomValidity('Choose another');h.value='a';});
   check(await page.evaluate(()=>document.querySelector('#select').validity.customError&&document.querySelector('#select').validationMessage==='Choose another'),'custom validity is retained across value changes');
   await page.evaluate(()=>{document.querySelector('#select').setCustomValidity('');document.querySelector('#fieldset').disabled=true;});
   check(await page.evaluate(()=>document.querySelector('#select').disabled&&window.selectInput.disabled&&!document.querySelector('#select').willValidate&&!new FormData(document.querySelector('#form')).has('choice')),'fieldset-disabled state reaches display, validity and form association');
   await page.locator('#select .field-box').click({force:true});check(await page.evaluate(()=>!document.querySelector('#select').open),'disabled field cannot open');
   await page.evaluate(()=>{document.querySelector('#fieldset').disabled=false;const h=document.querySelector('#select');h.value='b';h.label='Updated';h.hideRequiredMarker=true;});
   check(await page.evaluate(()=>{const h=document.querySelector('#select');return h.shadowRoot.querySelector('input')===window.selectInput&&h._selectMenu===window.selectMenu&&h._optionRecords.every((record,i)=>record.item===window.selectItems[i])&&h.shadowRoot.querySelector('.label').textContent==='Updated';}),'label/state updates retain controls and option rows');
   await page.evaluate(()=>document.querySelector('#select md-option[value="b"]').setAttribute('headline','Changed beta'));
   await page.waitForFunction(()=>window.selectInput.value==='Changed beta');check(true,'selected option label mutation updates display');
   await page.evaluate(()=>document.querySelector('#select md-option[value="b"]').value='renamed');
   await page.waitForFunction(()=>document.querySelector('#select').value==='renamed');
   check(await page.evaluate(()=>new FormData(document.querySelector('#form')).get('choice')==='renamed'),'selected option value mutation updates form value');
   await page.evaluate(()=>{const h=document.querySelector('#select');h.value='c';h.remove();document.querySelector('#fieldset').prepend(h);window.selectEvents=[];window.selectInputs=[];});
   await page.locator('#select input').click();await page.waitForTimeout(300);
   check(await page.evaluate(()=>document.querySelector('#select').open&&document.querySelector('#select').shadowRoot.activeElement===window.selectInput),'a disabled/dismissed sibling popup cannot steal focus after reenable');
   await page.locator('#select md-menu-item').filter({hasText:'Alpha'}).locator('button').click();
   check(await page.evaluate(()=>window.selectEvents.length===1&&window.selectInputs.length===1&&document.querySelector('#select').value==='a'),'reconnect has one activation/event owner');
   await page.evaluate(()=>{const h=document.querySelector('#select');for(let i=0;i<30;i++){const option=document.createElement('md-option');option.value='added-'+i;option.textContent='Added '+i;h.append(option);}});
   await page.waitForFunction(()=>document.querySelector('#select')._optionRecords.length===35);
   await page.locator('#select input').click();await page.keyboard.press('End');
   check(await page.evaluate(()=>{const h=document.querySelector('#select');return h._selectMenu.activeItem.value==='added-29'&&h._selectMenu._menu.scrollTop>0&&h.value==='a';}),'long-menu keyboard navigation scrolls its own surface without changing value');
   await page.keyboard.press('Enter');
   await page.keyboard.type('al');
   check(await page.evaluate(()=>{const h=document.querySelector('#select');return h.open&&h._selectMenu.activeItem.label==='Alpha'&&h.value==='added-29';}),'typeahead explores a prefix without accepting it');
   await page.keyboard.press('Escape');await page.waitForTimeout(510);await page.keyboard.type('gg');
   check(await page.evaluate(()=>document.querySelector('#select')._selectMenu.activeItem.label==='Gamma alternative'),'repeated typeahead characters cycle matching enabled options');
   await page.keyboard.press('Escape');
   await page.evaluate(()=>{const h=document.querySelector('#select');h.open=true;window.selectMotion=h._selectMenu._motion;h.open=false;h.open=true;});
   await page.waitForFunction(()=>!Object.values(window.selectMenu._motion.channels).some(channel=>channel.animation));
   check(await page.evaluate(()=>window.selectMotion===window.selectMenu._motion&&document.querySelector('#select').open),'popup reversal retains one source motion controller');
   const bounds=await page.locator('#select').boundingBox();check(bounds.x>=0&&bounds.x+bounds.width<=width,'responsive field fits');
   await page.evaluate(()=>{const h=document.querySelector('#select');window.selectDisposedMotion=h._selectMenu._motion;h.remove();});
   check(await page.evaluate(()=>window.selectDisposedMotion.disposed&&window.selectDisposedMotion.raf===null&&!window.selectMenu._visible),'disconnect cancels popup and owned motion');
   await page.evaluate(()=>{const h=document.createElement('md-select');h.id='early';h.innerHTML='<md-option value="early-value">Early label</md-option>';h.value='early-value';document.querySelector('#fieldset').prepend(h);});
   check(await page.evaluate(()=>document.querySelector('#early').value==='early-value'&&document.querySelector('#early').shadowRoot.querySelector('input').value==='Early label'),'value assigned before connection survives mounting');
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 console.log('Select: '+checks+' trusted input/key/form/ARIA/retained/option/lifecycle/viewport checks, 1000/390 light/dark LTR/RTL passed.');
}
export async function testSelectShowcase(browser,base){
 const page=await browser.newPage({viewport:{width:1440,height:800}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{await page.goto(base+'/#select');await page.waitForFunction(()=>customElements.get('md-select'),null,{timeout:10000});
  for(const width of[1440,390])for(const colorMode of['light','dark']){
   await page.setViewportSize({width,height:800});await page.evaluate(colorMode=>customElements.get('md-expressive-theme').applyGlobal({scheme:'expressive',colorMode}),colorMode);
   for(const select of await page.locator('#select md-select').all()){
    await select.locator('input').click();await page.keyboard.press('End');await page.keyboard.press('Enter');
    assert.ok(await select.evaluate(node=>node.value));await page.keyboard.press('Escape');
    const bounds=await select.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width);
   }
  }
  assert.deepEqual(errors,[]);console.log('Select showcase: both real single/multiple controls and viewport fit, 1440/390 light/dark passed.');
 }finally{await page.close();}
}
