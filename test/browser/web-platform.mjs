import assert from 'node:assert/strict';

/** Consumer-level regressions for REPORT.MD. Runs unchanged against source and dist. */
export async function testWebPlatform(browser, base, mode='dist') {
  const page=await browser.newPage({viewport:{width:1000,height:800},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  let checks=0;
  const check=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
  const mount=async html=>{await page.evaluate(html=>{document.querySelector('#fixture').innerHTML=html;},html);};
  try {
    await page.goto(`${base}/__platform?mode=${mode}`);
    await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
    for(const [tag,attribute]of [['md-checkbox','checked'],['md-switch','checked'],['md-button','selected'],['md-icon-button','selected']]){
      for(const kind of ['trusted','inner','host','keyboard']){
        await mount(`<${tag} id="control" toggle icon="check">Toggle</${tag}>`);
        await page.evaluate(()=>{
          window.changes=0;const host=document.querySelector('#control');
          host.addEventListener('change',()=>window.changes++);
          host.addEventListener('click',event=>event.preventDefault(),{once:true});
        });
        const inner=page.locator('#control').locator('button,[role="checkbox"],[role="switch"]').first();
        const click=async()=>{
          if(kind==='trusted')await inner.click();
          else if(kind==='keyboard'){await inner.focus();await page.keyboard.press('Space');}
          else await page.evaluate(kind=>{const h=document.querySelector('#control');(kind==='host'?h:h.shadowRoot.querySelector('button,[role="checkbox"],[role="switch"]')).click();},kind);
          await page.waitForTimeout(20);
        };
        await click();
        check(await page.evaluate(attribute=>[!!document.querySelector('#control')[attribute],window.changes],attribute),[false,0],`${tag} ${kind} cancellation`);
        await click();
        check(await page.evaluate(attribute=>[!!document.querySelector('#control')[attribute],window.changes],attribute),[true,1],`${tag} ${kind} uncancelled activates once`);
      }
    }
    for(const stop of [false,true]){
      await mount('<form id="form"><md-button type="submit">Save</md-button><md-button type="reset">Reset</md-button><md-text-field name="text" value="initial"></md-text-field></form>');
      await page.evaluate(stop=>{
        window.submits=0;const form=document.querySelector('form');
        form.addEventListener('submit',event=>{event.preventDefault();window.submits++;});
        form.addEventListener('click',event=>{event.preventDefault();if(stop)event.stopImmediatePropagation();},{once:true});
      },stop);
      await page.locator('md-button[type="submit"] button').click();await page.waitForTimeout(20);
      check(await page.evaluate(()=>window.submits),0,'ancestor cancellation prevents submit');
      await page.locator('md-button[type="submit"] button').click();await page.waitForTimeout(20);
      check(await page.evaluate(()=>window.submits),1,'uncancelled form submits once');
      await page.evaluate(()=>{document.querySelector('md-text-field').value='edited';document.querySelector('md-button[type="reset"]').addEventListener('click',e=>e.preventDefault(),{once:true});});
      await page.locator('md-button[type="reset"] button').click();
      check(await page.evaluate(()=>document.querySelector('md-text-field').value),'edited','cancelled reset preserves value');
    }
    await mount('<form><label for="field">Customer name</label><span id="external">Account number</span><md-text-field id="field" name="n" single-line aria-labelledby="external" aria-label="Explicit" label="Internal" pattern="[0-9]+" minlength="3"></md-text-field></form>');
    check(await page.locator('#field input').getAttribute('aria-label'),'Account number','labelledby precedence');
    await page.locator('label[for="field"]').click();
    check(await page.evaluate(()=>{const h=document.querySelector('#field');return h.shadowRoot.activeElement===h._fieldInput();}),true,'native external label focuses editor');
    check(await page.evaluate(()=>{const h=document.querySelector('#field');h.value='ab';return [h.checkValidity(),h._fieldInput().pattern,h._fieldInput().minLength];}),[false,'[0-9]+',3],'standard text constraints');
    await page.evaluate(()=>{document.querySelector('#field').removeAttribute('aria-labelledby');});
    check(await page.locator('#field input').getAttribute('aria-label'),'Explicit','aria-label precedence');
    await page.evaluate(()=>{document.querySelector('#field').removeAttribute('aria-label');document.querySelector('label').textContent='Updated name';});
    await page.waitForFunction(()=>document.querySelector('#field')._fieldInput().getAttribute('aria-label')==='Updated name');checks++;
    await page.evaluate(()=>{const h=document.querySelector('#field');h.singleLine=false;h.removeAttribute('pattern');});
    check(await page.locator('#field textarea').getAttribute('aria-label'),'Updated name','multiline editor shares naming');
    await mount('<form><md-text-field name="n" type="number" min="10" max="20" step="2"></md-text-field></form>');
    check(await page.evaluate(()=>{const h=document.querySelector('md-text-field');h.value='3';return [h.checkValidity(),h.validity.rangeUnderflow,h.validity.stepMismatch];}),[false,true,true],'number limits reach internals');
    check(await page.evaluate(()=>{const h=document.querySelector('md-text-field');h.value='invalid-number';return [h.value,h._fieldInput().value,new FormData(document.querySelector('form')).get('n'),h.checkValidity()];}),['','','',true],'optional number sanitization');
    check(await page.evaluate(()=>{const h=document.querySelector('md-text-field');h.value='12';h.setAttribute('min','14');return h.checkValidity();}),false,'live constraint changes');
    await mount('<form><md-autocomplete name="a" value="Alpha" options=\'["Alpha","Beta"]\'></md-autocomplete></form>');
    check(await page.evaluate(()=>{const h=document.querySelector('md-autocomplete');h.setCustomValidity('Server rejected this');h.options=['Alpha','Gamma'];h.open=true;return [h.checkValidity(),h.validity.customError,h.validationMessage,document.querySelector('form').checkValidity()];}),[false,true,'Server rejected this',false],'autocomplete custom error survives option/open updates');
    check(await page.evaluate(()=>{const h=document.querySelector('md-autocomplete');h.setCustomValidity('');return h.checkValidity();}),true,'custom error explicitly clears');
    await mount('<form><md-select name="s" required><md-option value="a" selected>A</md-option><md-option value="b">B</md-option></md-select></form>');
    check(await page.evaluate(()=>document.querySelector('md-select').value),'a','declarative default selection');
    check(await page.evaluate(()=>{const h=document.querySelector('md-select');h.children[1].selected=true;return [h.value,...[...h.children].map(o=>o.selected)];}),['b',false,true],'property selection is synchronous');
    check(await page.evaluate(()=>{const h=document.querySelector('md-select');h.value='missing';return [h.value,h.checkValidity(),new FormData(document.querySelector('form')).get('s')];}),['',false,''],'unknown required choice normalizes empty');
    check(await page.evaluate(()=>{document.querySelector('form').reset();const h=document.querySelector('md-select');return [h.value,...[...h.children].map(o=>o.selected)];}),['a',true,false],'reset restores declarative selected default');
    await page.evaluate(()=>{const h=document.querySelector('md-select');h.children[1].defaultSelected=true;});
    check(await page.evaluate(()=>document.querySelector('md-select').value),'b','selected attribute changes update non-dirty selection');
    await page.evaluate(()=>document.querySelector('md-select').replaceChildren());
    await page.waitForFunction(()=>document.querySelector('md-select').value==='');
    check(await page.evaluate(()=>new FormData(document.querySelector('form')).get('s')),'','removing every option clears submitted choice');
    await mount('<span id="popup">Popup</span><md-button aria-expanded="true" aria-haspopup="menu" aria-controls="popup">Open</md-button><md-icon-button icon="delete" aria-label="Delete account"></md-icon-button><label for="consent">Original consent</label><md-checkbox id="consent"></md-checkbox>');
    check(await page.evaluate(()=>{const h=document.querySelector('md-button');for(const a of ['aria-expanded','aria-haspopup','aria-controls'])h.removeAttribute(a);const b=h.shadowRoot.querySelector('button');return [b.getAttribute('aria-expanded'),b.getAttribute('aria-haspopup'),b.ariaControlsElements?.length||0];}),[null,null,0],'ARIA states/relations remove symmetrically');
    check(await page.evaluate(()=>{const h=document.querySelector('md-icon-button'),clone=h.cloneNode(true);h.after(clone);return [h.matches('[aria-label="Delete account"]'),h.outerHTML.includes('Delete account'),clone.shadowRoot.querySelector('button').getAttribute('aria-label')];}),[true,true,'Delete account'],'public ARIA survives selectors, serialization and clone');
    await page.evaluate(()=>document.querySelector('label').textContent='Updated consent');
    await page.waitForFunction(()=>document.querySelector('md-checkbox').shadowRoot.querySelector('[role="checkbox"]').getAttribute('aria-label')==='Updated consent');checks++;
    await page.evaluate(()=>{const h=document.querySelector('md-checkbox');h.setAttribute('aria-labelledby','popup');h.checked=true;});
    check(await page.locator('md-checkbox [role="checkbox"]').getAttribute('aria-label'),'Popup','state synchronization preserves author naming');
    await page.evaluate(()=>{const h=document.querySelector('md-button');h.setAttribute('aria-describedby','popup');});
    check(await page.locator('md-button button').getAttribute('aria-description'),'Popup','external description forwards');
    await page.evaluate(()=>document.querySelector('md-button').removeAttribute('aria-describedby'));
    check(await page.evaluate(()=>{const b=document.querySelector('md-button').shadowRoot.querySelector('button');return [b.getAttribute('aria-description'),b.ariaDescribedByElements?.length||0];}),[null,0],'removing external description clears reflected targets');
    await page.evaluate(()=>{const h=document.querySelector('md-checkbox');for(let i=0;i<8;i++){h.remove();document.querySelector('#fixture').append(h);}window.changes=0;h.addEventListener('change',()=>window.changes++);h.click();});
    check(await page.evaluate(()=>window.changes),1,'reconnect retains one activation');
    await mount('<span id="group-name">Destination</span><md-navigation-bar aria-labelledby="group-name" items=\'[{"label":"Inbox","icon":"inbox"},{"label":"Sent","icon":"send"}]\'></md-navigation-bar><md-chip label="Filter" variant="filter" removable></md-chip>');
    check(await page.evaluate(()=>{const h=document.querySelector('md-navigation-bar');return [h.shadowRoot.querySelector('nav').getAttribute('aria-label'),...Array.from(h.shadowRoot.querySelectorAll('button'),b=>b.getAttribute('aria-label'))];}),['Destination','Inbox','Sent'],'group naming leaves individual navigation names intact');
    await page.evaluate(()=>{window.removes=0;const h=document.querySelector('md-chip');h.addEventListener('remove',e=>{e.preventDefault();window.removes++;});h.addEventListener('click',e=>e.preventDefault(),{once:true});});
    await page.locator('md-chip .remove-btn').focus();await page.keyboard.press('Space');
    check(await page.evaluate(()=>[window.removes,document.querySelector('md-chip').selected]),[0,false],'consumer cancellation prevents chip removal');
    await page.keyboard.press('Space');
    check(await page.evaluate(()=>[window.removes,document.querySelector('md-chip').selected]),[1,false],'nested remove activates once without selecting chip');
    await page.evaluate(()=>document.querySelector('md-chip').click());
    check(await page.evaluate(()=>[window.removes,document.querySelector('md-chip').selected]),[1,true],'host activation belongs to the chip primary control');
    for(const invalid of ['02/31/2026','2026-02-29','02x/12/2026','13/01/2026','0000-02-29','']){
      await mount(`<md-date-picker inline value="${invalid}"></md-date-picker>`);
      check(await page.evaluate(()=>{const h=document.querySelector('md-date-picker');return [h.value,h.state.selectedDate,h.shadowRoot.querySelectorAll('.day-cell.selected').length];}),['',null,0],`strict date ${invalid}`);
    }
    await mount('<md-date-picker inline value="2028-02-29"></md-date-picker>');
    check(await page.evaluate(()=>{const h=document.querySelector('md-date-picker');const before=h.value;h.value='';return [before,h.value,h.state.selectedDate];}),['02/29/2028','',null],'valid leap date and clear');
    check(await page.evaluate(()=>{const h=document.querySelector('md-date-picker');h.yearRange=[1,9999];h.value='0099-01-01';const kept=[h.value,h.state.selectedDate?.getFullYear()];h.removeAttribute('year-range');h.value='0099-01-01';return [...kept,h.value,h.state.selectedDate];}),['01/01/0099',99,'01/01/0099',null],'four-digit years keep their century; outside DatePickerDefaults.YearRange (1900..2100) the value is no selection');
    check(errors,[],'no runtime errors');
    console.log(`Web platform (${mode}): ${checks} consumer checks passed`);
  } finally {await page.close();}
}
