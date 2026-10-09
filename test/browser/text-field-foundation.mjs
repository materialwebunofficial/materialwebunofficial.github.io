import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
const directory=new URL('../fixtures/androidx/text-field/',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('states.meta.json',directory))),bytes=fs.readFileSync(new URL('states.json',directory));
assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),meta.sha256);
const colorRows=JSON.parse(bytes).filter(row=>row.kind==='colors'&&(row.enabled||!row.focused));

export async function testTextFieldFoundation(browser,base){
 let colors=0,checks=0;
 for(const width of [1000,390])for(const mode of ['light','dark'])for(const dir of ['ltr','rtl']){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/test/browser/fixtures/toolbars.html');
   await page.waitForFunction(()=>customElements.get('md-text-field')&&customElements.get('md-theme')&&document.fonts.status==='loaded',null,{timeout:10000});
   await page.evaluate(({mode,dir})=>{document.documentElement.dir=dir;document.querySelector('#fixture').innerHTML=`<md-theme id="field-theme" color-mode="${mode}" style="display:block;width:min(320px,100%)"><button id="outside">Outside</button><md-text-field id="field" label="Account" placeholder="Example" leading-icon="person" trailing-icon="close" prefix-text="$" suffix-text="USD" supporting-text="Supporting" error-text="Error" maxlength="20" value="Hello"></md-text-field></md-theme>`;},{mode,dir});
   for(const row of colorRows){
    await page.evaluate(row=>{const node=document.querySelector('#field');node.setAttribute('variant',row.variant);node.disabled=!row.enabled;node.error=row.error;if(row.focused)node.focus();else node.shadowRoot.querySelector('[part="input"]').blur();},row);
    const actual=await page.locator('#field').evaluate((node,row)=>{
     const root=node.shadowRoot,probe=document.createElement('span');root.append(probe);
     const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');
     const pixel=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];};
     const cssRole=role=>role==='transparent'?'transparent':'var(--md-sys-color-'+role.replace(/[A-Z]/g,(c,i)=>(i?'-':'')+c.toLowerCase())+')';
     const selectors={text:'[part="input"]',container:'.field-surface',indicator:'.outline',leading:'.leading',trailing:'.trailing',label:'.label',placeholder:'.placeholder',supporting:'.helper-text',prefix:'.prefix',suffix:'.suffix',cursor:'[part="input"]'};
     const records=[];
     for(const [name,expected]of Object.entries(row.values)){
      probe.style.color=cssRole(expected.role);let color=getComputedStyle(probe).color;
      // Native sRGB Color.copy packs .38 and .12 into alpha bytes97 and31;
      // the independent shared Color-alpha unit verifies that packing boundary.
      if(expected.copied)color=`rgb(from ${color} r g b / ${(expected.alpha>.2?97:31)/255})`;
      const element=root.querySelector(selectors[name]),style=getComputedStyle(element);
      const property=name==='container'?'backgroundColor':name==='indicator'?'stroke':name==='cursor'?'caretColor':'color';
      records.push({name,actual:pixel(style[property]),expected:pixel(color)});
     }
     probe.remove();return{records,opacity:getComputedStyle(root.querySelector('.tf-root')).opacity,labelBackground:getComputedStyle(root.querySelector('.label')).backgroundColor};
    },row);
    for(const record of actual.records){assert.deepEqual(record.actual,record.expected,'actual '+row.variant+' '+record.name+' '+JSON.stringify(row));colors++;}
    assert.equal(actual.opacity,'1','disabled roles do not fade the whole field');assert.equal(actual.labelBackground,'rgba(0, 0, 0, 0)','label does not paint a surface patch');checks+=2;
   }
   const field=page.locator('#field'),input=field.locator('[part="input"]');
   await field.evaluate(node=>{node.disabled=false;node.error=false;node.setAttribute('variant','outlined');node.value='';node.shadowRoot.querySelector('[part="input"]').blur();});
   await page.waitForTimeout(30);
   assert.equal(await input.getAttribute('placeholder'),'','empty unfocused label suppresses the placeholder');
   assert.equal(await field.evaluate(node=>node._fieldFrame.label),0);
   await input.click();assert.equal(await input.getAttribute('placeholder'),'Example');assert.equal(await field.evaluate(node=>node._fieldFrame.label),1);
   await page.evaluate(()=>{window.fieldInputs=0;window.fieldChanges=0;const node=document.querySelector('#field');node.addEventListener('input',()=>fieldInputs++);node.addEventListener('change',()=>fieldChanges++);});
   await input.pressSequentially('abc');await page.locator('#outside').click();
   assert.equal(await field.evaluate(node=>node.value),'abc');assert.equal(await field.evaluate(node=>node._fieldFrame.label),1);
   assert.deepEqual(await page.evaluate(()=>[fieldInputs,fieldChanges]),[3,1]);
   await input.click();await input.press('ControlOrMeta+A');await input.press('Backspace');await page.locator('#outside').click();assert.equal(await field.evaluate(node=>node._fieldFrame.label),0);
   checks+=8;
   await field.evaluate(node=>node.floatLabel='always');
   assert.equal(await field.evaluate(node=>node._fieldFrame.label),1,'empty always-float field uses the original minimized-label target');
   assert.equal(await input.getAttribute('placeholder'),'Example','always minimized label keeps the empty placeholder visible');
   await field.evaluate(node=>node.floatLabel='auto');
   assert.equal(await field.evaluate(node=>node._fieldFrame.label),0,'auto restores the empty unfocused expanded label');checks+=3;
   const shape=await field.evaluate(node=>{
    node.value='Filled';const input=node.shadowRoot.querySelector('[part="input"]'),label=node.shadowRoot.querySelector('.label'),outline=node.shadowRoot.querySelector('.outline');
    const form=document.createElement('form'),fieldset=document.createElement('fieldset');node.parentNode.append(form);form.append(fieldset);fieldset.append(node);fieldset.disabled=true;
    const disabled=node.disabled&&input.disabled;fieldset.disabled=false;const enabled=!node.disabled&&!input.disabled;
    node._testInput=input;node._testOutline=outline;return{disabled,enabled,helper:input.getAttribute('aria-describedby'),for:label.htmlFor,id:input.id};
   });
   assert.equal(shape.disabled,true);assert.equal(shape.enabled,true);assert.equal(shape.for,shape.id);assert.ok(shape.helper.includes('field-supporting')&&shape.helper.includes('field-counter'));checks+=4;
   await page.waitForFunction(()=>Number(document.querySelector('#field').shadowRoot.querySelector('.cutout').getAttribute('width'))>8,null,{timeout:10000});
   assert.ok(await field.evaluate(node=>Number(node.shadowRoot.querySelector('.cutout').getAttribute('width'))>8),'actual measured label cuts the border');
   const retained=await field.evaluate(node=>{const input=node._testInput,outline=node._testOutline;node.setAttribute('leading-icon','search');node.setAttribute('label','Changed label');return input===node.shadowRoot.querySelector('[part="input"]')&&outline===node.shadowRoot.querySelector('.outline');});assert.equal(retained,true);checks+=2;
   await page.emulateMedia({reducedMotion:'no-preference'});await input.click();await page.locator('#outside').click();
   await field.evaluate(node=>node.value='');
   await page.waitForFunction(()=>document.querySelector('#field')._fieldMotion.raf===null,null,{timeout:10000});
   await input.click();
   const motion=await field.evaluate(node=>({targets:node._fieldTargets,label:node._fieldMotion.channels.label.animation,placeholder:node._fieldMotion.channels.placeholder.animation,thickness:node._fieldContainer.thickness.state.operation.spec,css:getComputedStyle(node.shadowRoot.querySelector('.label')).transitionDuration}));
   // Explicit MotionScheme springs have no typed Dp threshold override:
   // animateDpAsState forwards that spec; VectorizedSpringSpec defaults to .01f.
   assert.equal(motion.targets.placeholder.spec,'SlowEffects');assert.equal(motion.label.stiffness,800);assert.equal(motion.label.dampingRatio,Math.fround(.6));assert.equal(motion.placeholder.stiffness,800);assert.equal(motion.placeholder.dampingRatio,1);assert.equal(motion.thickness.visibilityThreshold,Math.fround(.01));assert.equal(motion.css,'0s');checks+=7;
   const lifetime=await field.evaluate(node=>{node.value='';node.focus();const motion=node._fieldMotion,colors=node._fieldColorBinding,parent=node.parentNode;node.remove();const disposed=motion.disposed&&motion.raf===null&&colors.disposed;parent.append(node);return{disposed,retained:node.shadowRoot.querySelector('[part="input"]')===node._testInput,newOwner:node._fieldMotion!==motion};});
   assert.equal(lifetime.disposed,true);assert.equal(lifetime.retained,true);assert.equal(lifetime.newOwner,true);checks+=3;
   await page.emulateMedia({reducedMotion:'reduce'});
   const api=await page.evaluate(()=>{
    const node=document.createElement('md-text-field');node.label='Address';node.placeholder='name@example.com';node.variant='invalid';node.type='email';node.name='address';node.leadingIcon='mail';node.trailingIcon='close';node.supportingText='Help';node.errorText='Error';node.required=true;node.value='preset@example.com';
    const form=document.createElement('form');document.querySelector('#fixture').append(form);form.append(node);
    const results={pending:node.value==='preset@example.com',canonical:node.variant==='outlined',reflected:node.getAttribute('leading-icon')==='mail'&&node.shadowRoot.querySelector('[part="input"]').type==='email',formValue:new FormData(form).get('address')==='preset@example.com'};
    node.value='bad';results.typeMismatch=node.validity.typeMismatch&&!node.checkValidity();node.value='';results.required=node.validity.valueMissing&&!node.checkValidity();
    node.readOnly=true;results.readOnly=node.checkValidity();node.readOnly=false;node.value='valid@example.com';results.valid=node.checkValidity();
    node.setCustomValidity('Rejected');results.custom=node.validity.customError&&node.validationMessage==='Rejected';node.setCustomValidity('');results.cleared=node.checkValidity();
    node.setAttribute('value','reset@example.com');node.value='other@example.com';form.reset();results.reset=node.value==='reset@example.com';node.formStateRestoreCallback('restored@example.com');results.restore=node.value==='restored@example.com';
    node.maxLength=0;results.zeroCounter=node.shadowRoot.querySelector('.counter').textContent===node.value.length+'/0'&&getComputedStyle(node.shadowRoot.querySelector('.counter')).display!=='none'&&node.shadowRoot.querySelector('[part="input"]').getAttribute('aria-describedby').includes('field-counter');node.maxLength=-1;results.invalidLimit=node.maxlength===null&&node.shadowRoot.querySelector('[part="input"]').getAttribute('maxlength')===null;
    node.label='';node.setAttribute('aria-label','Email address');results.accessibleName=node.shadowRoot.querySelector('[part="input"]').getAttribute('aria-label')==='Email address';node.focus();results.focus=node.shadowRoot.activeElement===node.shadowRoot.querySelector('[part="input"]');
    form.remove();return results;
   });
   for(const [name,value]of Object.entries(api)){assert.equal(value,true,'public field API/form '+name);checks++;}
   await field.evaluate(node=>{node.disabled=false;node.error=false;node.style.setProperty('--md-sys-color-on-surface','rgba(10, 20, 30, .2)');node.style.setProperty('--md-sys-color-on-surface-variant','rgb(40, 50, 60)');node.style.setProperty('--md-sys-color-primary','rgb(70, 80, 90)');node.shadowRoot.querySelector('[part="input"]').blur();});
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('#field').shadowRoot.querySelector('[part="input"]')).color==='rgba(10, 20, 30, 0.2)',null,{timeout:10000});
   await field.evaluate(node=>node.disabled=true);
   const copiedAlpha=await field.evaluate(node=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');ctx.fillStyle=getComputedStyle(node.shadowRoot.querySelector('[part="input"]')).color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];});
   assert.equal(copiedAlpha[3],97,'disabled alpha replaces custom role alpha');assert.ok(Math.abs(copiedAlpha[0]-10)<=1&&Math.abs(copiedAlpha[1]-20)<=1&&Math.abs(copiedAlpha[2]-30)<=1,'custom role channels retained through packed Canvas alpha');
   await field.evaluate(node=>{node.disabled=false;node.focus();});
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('#field').shadowRoot.querySelector('[part="input"]')).caretColor==='rgb(70, 80, 90)',null,{timeout:10000});checks+=4;
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow/RTL viewport fit');assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 console.log('TextField foundation: '+colors+' actual rendered role/packed-alpha comparisons and '+checks+' input/placeholder/label/cutout/fieldset/ARIA/retained/lifecycle checks, 8 viewport/theme/direction profiles passed. Browser font/outline/transition-frame bindings remain separate from full native measurement and raster.');
}
