import assert from 'node:assert/strict';

export async function testTextFieldEditor(browser,base){
 let checks=0;
 const check=(value,label)=>{assert.ok(value,label);checks++;};
 for(const width of[1000,390])for(const mode of['light','dark'])for(const dir of['ltr','rtl']){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/test/browser/fixtures/toolbars.html');
   await page.waitForFunction(()=>customElements.get('md-text-field')&&document.fonts.status==='loaded');
   await page.evaluate(({dir,mode})=>{
    document.documentElement.dir=dir;
    document.querySelector('#fixture').innerHTML=`<md-theme color-mode="${mode}" style="display:block;width:min(320px,100%)"><form id="form"><md-text-field id="edit" name="notes" label="Notes" min-lines="2" max-lines="3" supporting-text="Description"></md-text-field><button id="outside" type="button">Outside</button></form></md-theme>`;
    window.events={input:0,change:0,focus:0,blur:0};const field=document.querySelector('#edit');
    for(const kind of Object.keys(events))field.addEventListener(kind,()=>events[kind]++);
    window.retainedEditors=[...field.shadowRoot.querySelectorAll('.editor')];
   },{dir,mode});
   const field=page.locator('#edit'),editor=field.locator('[part="input"]');
   const state=()=>field.evaluate(node=>{const e=node._fieldInput(),root=node.shadowRoot;return{tag:e.tagName,value:node.value,editorValue:e.value,box:root.querySelector('.field-box').getBoundingClientRect().height,height:e.getBoundingClientRect().height,scrollHeight:e.scrollHeight,scrollTop:e.scrollTop,form:new FormData(document.querySelector('#form')).get('notes'),focused:root.activeElement===e};});
   let result=await state();check(result.tag==='TEXTAREA'&&result.height===48&&result.box===80,'default multiline editor honors minimum two text lines');
   await editor.click();await editor.pressSequentially('One');await editor.press('Enter');await editor.pressSequentially('Two');
   result=await state();check(result.value==='One\nTwo'&&result.form===result.value&&result.height===48,'trusted newline editing updates host and submitted value');
   await editor.press('Enter');await editor.pressSequentially('Three');result=await state();check(result.height===72&&result.box===104,'third line expands container and actual editor');
   await editor.press('Enter');await editor.pressSequentially('Four');result=await state();check(result.height===72&&result.box===104&&result.scrollHeight>result.height&&result.scrollTop>0,'fourth line scrolls within maximum three lines');
   check(await page.evaluate(()=>events.input===18&&events.change===0),'each trusted edit emits one input event without early change');
   await page.locator('#outside').click();check(await page.evaluate(()=>events.change===1),'leaving edited field emits one change');
   await field.evaluate(node=>{node.maxLines=null;node.minLines=1;node.value='';node.supportingText='';});
   await editor.click();await editor.pressSequentially('A long sentence that should wrap when the field becomes narrower.');
   result=await state();check(result.height>24&&result.scrollHeight===result.height,'multiline content wraps and grows without a maximum');
   await field.evaluate(node=>node.style.width='180px');await page.waitForFunction(()=>document.querySelector('#edit')._fieldLayout.result.width===180);
   const narrowed=await state();check(narrowed.height>result.height,'ResizeObserver remeasures wrapping after allocation shrinks');
   await field.evaluate(node=>{node.style.width='';node.value='First\nSecond';node._fieldInput().setSelectionRange(2,5);});
   const before=await page.evaluate(()=>({...events}));
   await field.evaluate(node=>node.singleLine=true);
   result=await state();check(result.tag==='INPUT'&&result.editorValue==='First Second'&&result.value==='First\nSecond'&&result.form===result.value&&result.focused,'single-line projection retains raw model/form value and focus');
   check(await field.evaluate(node=>node._fieldInput().selectionStart===2&&node._fieldInput().selectionEnd===5),'editor switch preserves selection');
   check(await page.evaluate(before=>JSON.stringify(events)===JSON.stringify(before),before),'mode switch does not synthesize input/change/focus/blur');
   await field.evaluate(node=>node.singleLine=false);result=await state();check(result.tag==='TEXTAREA'&&result.editorValue==='First\nSecond'&&result.focused,'returning to multiline restores raw newlines');
   await field.evaluate(node=>{node.supportingText='Updated';node.leadingIcon='edit';node._fieldInput().setSelectionRange(1,3);node.error=true;});
   check(await field.evaluate(node=>node._fieldInput().selectionStart===1&&node._fieldInput().selectionEnd===3&&node.shadowRoot.activeElement===node._fieldInput()),'attribute sync retains selection and active editor');
   await field.evaluate(node=>{const inactive=node.shadowRoot.querySelector('[part="inactive-input"]');inactive.value='Corrupt';inactive.dispatchEvent(new Event('input',{bubbles:true}));});
   check((await state()).value==='First\nSecond','inactive retained editor cannot overwrite current model');
   await field.evaluate(node=>{node.readOnly=true;node.value='Read only';});await editor.pressSequentially('X');check((await state()).value==='Read only','readonly multiline editor refuses trusted modification');
   await field.evaluate(node=>{node.readOnly=false;node.disabled=true;});check(await editor.isDisabled(),'disabled active textarea follows form control semantics');
   await field.evaluate(node=>{node.disabled=false;node.error=false;node.type='email';node.value='invalid';});
   check(await field.evaluate(node=>node._fieldInput().tagName==='INPUT'&&node._fieldInput().type==='email'&&node.validity.typeMismatch),'typed fields retain HTML validation through input adapter');
   await field.evaluate(node=>{node.type='text';node.labelPosition='above';node.value='';node.placeholder='Visible placeholder';node.focus();});
   check(await field.evaluate(node=>{const r=node.shadowRoot,b=r.querySelector('.field-box').getBoundingClientRect(),l=r.querySelector('.label').getBoundingClientRect();return l.bottom<=b.top&&node._fieldFrame.label===1&&!r.querySelector('.placeholder').hidden&&r.querySelector('.label').htmlFor===node._fieldInput().id;}),'Above label remains separate and associated with actual editor');
   await field.evaluate(node=>{node.supportingText='';node.maxLength=0;});check(await field.evaluate(node=>!!node._fieldLayout.placements.supporting),'zero counter allocates support slot');
   await field.evaluate(node=>node.maxLength=null);check(await field.evaluate(node=>!node._fieldLayout.placements.supporting),'removing counter releases native support allocation despite retained text');
   await field.evaluate(node=>{const p=node.parentNode;node.value='Retained\nText';node.remove();p.append(node);});
   check(await field.evaluate(node=>[...node.shadowRoot.querySelectorAll('.editor')].every((e,i)=>e===retainedEditors[i])&&node.value==='Retained\nText'),'disconnect/reconnect retains both editors and text');
   await editor.click();await editor.press('End');await editor.pressSequentially('!');check((await state()).value.endsWith('!'),'reconnected editor has one live event owner');
   check(errors.length===0,'no page errors');
  }finally{await page.close();}
 }
 console.log('TextField editor: '+checks+' trusted multiline/line limits/scroll/resize/form/selection/mode/Above/counter/lifetime checks passed at 1000/390 light/dark LTR/RTL. HTML editing and font measurement are web adapters; native IME/shaping/runtime remain separate.');
}
