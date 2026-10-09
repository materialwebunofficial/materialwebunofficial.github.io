import fs from 'node:fs';import assert from 'node:assert/strict';
const native=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/picker/input.json',import.meta.url)));
export async function testPickerInput(browser,base){
 let checks=0;
 for(const width of [1440,390])for(const dark of [false,true])for(const is24 of [false,true])for(const vibrant of [false,true]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(()=>document.fonts.ready);
   const cases=[['Hour',7,false,0,2,'99'],['Hour',19,false,0,2,''],['Hour',7,false,1,1,'9'],['Hour',7,false,2,2,'2'],['Hour',7,false,0,2,'9'],['Hour',7,true,0,2,'9'],['Hour',19,false,0,2,'12'],['Hour',19,true,0,2,'12'],['Hour',7,false,0,2,'100'],['Hour',7,false,0,2,'x'],['Hour',7,false,0,2,'١٢'],['Hour',7,false,0,2,'𝟟'],['Minute',7,false,0,2,'99'],['Minute',19,false,0,2,''],['Minute',7,false,0,2,'５']];
   for(const [unit,hour,a11y,start,end,insert]of cases){
    const before=unit==='Minute'?'17':is24?String(hour).padStart(2,'0'):'07';
    const expected=native.records.find(row=>row.is24===is24&&row.hour===hour&&row.unit===unit&&row.a11y===a11y&&row.before===before&&row.start===start&&row.end===end&&row.insert===insert);assert(expected);
    await page.evaluate(({dark,is24,vibrant,hour,a11y})=>{document.documentElement.dataset.theme=dark?'dark':'light';document.querySelector('#fixture').innerHTML='<md-time-picker id="native-input" inline mode="input" '+(is24?'is-24-hour ':'')+(vibrant?'rich-colors ':'')+(a11y?'accessibility-services-enabled ':'')+'value="'+(is24?hour:hour%12||12).toString().padStart(2,'0')+':17'+(is24?'':hour>=12?' PM':' AM')+'"></md-time-picker>';window.inputChanges=0;window.inputErrors=0;const h=document.querySelector('#native-input');h.addEventListener('change',()=>window.inputChanges++);h.addEventListener('input-error',()=>window.inputErrors++);},{dark,is24,vibrant,hour,a11y});
    const host=page.locator('#native-input');if(unit==='Minute')await host.locator('#min-input-selector').click();
    const field=host.locator(unit==='Hour'?'#hour-input':'#min-input');await field.focus();await field.evaluate((field,{start,end})=>field.setSelectionRange(start,end),{start,end});
    if(insert)await page.keyboard.insertText(insert);else await page.keyboard.press('Backspace');
    const actual=await host.evaluate((host,unit)=>{const owner=host._input,time=owner.time,field=owner.fields.find(field=>field.unit===unit),element=field.element,css=getComputedStyle(element),support=element.closest('.input-card-wrap').querySelector('.input-sublabel');return{text:element.value,start:element.selectionStart,end:element.selectionEnd,hour:time.hour,minute:time.minute,hourInput:host.hourInput,minuteInput:host.minuteInput,selection:time.selection,hourValid:time.isHourInputValid,minuteValid:time.isMinuteInputValid,errors:window.inputErrors,changes:window.inputChanges,inputInvalid:element.getAttribute('aria-invalid'),live:support.getAttribute('aria-live'),support:support.textContent,font:css.fontSize,width:parseFloat(css.width),height:parseFloat(css.height),radius:parseFloat(css.borderRadius),gap:parseFloat(getComputedStyle(element.closest('.input-card-wrap')).gap),selected:!element.hidden,selectorVisible:!field.selector.hidden,selectorRole:field.selector.getAttribute('role'),active:host.shadowRoot.activeElement?.id,isInputValid:host.isInputValid};},unit);
    const {userOverride,...result}=expected.result;
    for(const name of Object.keys(result)){assert.deepEqual(actual[name],result[name],JSON.stringify({width,dark,is24,vibrant,unit,hour,a11y,insert,start,end,name}));checks++;}
    assert.equal(actual.changes,result.hour!==hour||result.minute!==17?1:0);assert.equal(actual.isInputValid,result.hourValid&&result.minuteValid);assert.equal(actual.inputInvalid,String(!(unit==='Hour'?result.hourValid:result.minuteValid)));checks+=3;
    assert.equal(actual.width,native.tokens.width);assert.equal(actual.height,native.tokens.height);assert.equal(actual.gap,native.tokens.supportTop);assert.equal(actual.font,'45px');assert.equal(actual.radius,8);checks+=5;
    assert.equal(actual.selected,result.selection===unit);assert.equal(actual.selectorVisible,result.selection!==unit);assert.equal(actual.selectorRole,'radio');assert.equal(actual.active,result.selection==='Hour'?'hour-input':'min-input');checks+=4;
    if(!result.hourValid||!result.minuteValid){assert.equal(actual.live,'polite');assert(actual.support.includes('must be'));checks+=2;}
   }
   // Raw invalid input survives view changes in the shared native state, while
   // dial output remains the last valid canonical time. External values reset it.
   await page.evaluate(()=>{const h=document.querySelector('#native-input');h.is24Hour=true;h.value='07:17';h.state.activeUnit='hours';h._updateDisplay();});
   await hostInput(page).focus();await hostInput(page).selectText();await page.keyboard.insertText('99');
   const retained=await page.evaluate(()=>{const h=document.querySelector('#native-input'),time=h._pickerTime,old=h._input;h.mode='dial';const dial=h._clock;const valid=h.value;h.mode='input';return{same:time===h._pickerTime&&dial.time===time,raw:h.hourInput,text:h.shadowRoot.querySelector('#hour-input').value,valid,disposed:old.disposed,surfaces:old.fields.every(field=>field.surface.disposed)};});
   assert.deepEqual(retained,{same:true,raw:99,text:'99',valid:'07:17',disposed:true,surfaces:true});checks++;
   await page.evaluate(()=>{const h=document.querySelector('#native-input');h.style.setProperty('--md-sys-color-error','#1122cc');h.style.setProperty('--md-sys-color-error-container','#ccddee');h.style.setProperty('--md-sys-color-on-error-container','#334455');});
   const painted=await hostInput(page).evaluate(element=>{const css=getComputedStyle(element),support=getComputedStyle(element.closest('.input-card-wrap').querySelector('.input-sublabel'));return[css.color,css.backgroundColor,getComputedStyle(element.parentElement.querySelector('.time-input-outline')).color,support.color];});
   assert.deepEqual(painted,['rgb(17, 34, 204)','rgb(204, 221, 238)','rgb(17, 34, 204)','rgb(17, 34, 204)']);checks++;
   await page.locator('#native-input #min-input-selector').click();
   const selector=page.locator('#native-input #hour-input-selector');await page.waitForFunction(()=>getComputedStyle(document.querySelector('#native-input').shadowRoot.querySelector('#hour-input-selector')).backgroundColor==='rgb(204, 221, 238)');
   assert.deepEqual(await selector.evaluate(element=>{const css=getComputedStyle(element);return[css.color,css.backgroundColor];}),['rgb(51, 68, 85)','rgb(204, 221, 238)']);checks++;
   await selector.click();
   await page.evaluate(()=>{const h=document.querySelector('#native-input');for(const name of ['error','error-container','on-error-container'])h.style.removeProperty('--md-sys-color-'+name);});
   await page.evaluate(()=>document.querySelector('#native-input').value='19:23');assert.equal(await hostInput(page).inputValue(),'19');assert(await page.evaluate(()=>document.querySelector('#native-input').isInputValid));checks+=2;
   const old=await page.evaluate(()=>{const h=document.querySelector('#native-input');window.savedInput=h;window.oldInput=h._input;h.remove();return window.oldInput.disposed&&window.oldInput.fields.every(field=>field.surface.disposed);});assert(old);checks++;
   await page.evaluate(()=>document.querySelector('#fixture').append(window.savedInput));await hostInput(page).focus();await hostInput(page).selectText();await page.keyboard.insertText('12');assert.equal(await page.evaluate(()=>document.querySelector('#native-input').hourInput),12);checks++;
   if(process.env.MD3_CAPTURE_PICKER_INPUT&&is24&&!vibrant&&((width===1440&&!dark)||(width===390&&dark))){await page.evaluate(()=>{const h=document.querySelector('#native-input');h.state.activeUnit='hours';h._updateDisplay();});await hostInput(page).focus();await hostInput(page).selectText();await page.keyboard.insertText('99');await page.locator('#native-input').screenshot({path:'research/picker-input-'+(process.argv.includes('--source')?'source':'bundle')+'-'+width+'-'+(dark?'dark':'light')+'.png'});}
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 console.log('Picker input actual DOM: '+checks+' native edit snapshots, raw/canonical state, cursor, trusted Unicode/blank/replacement edits, focus, 72px/DisplayMedium fields, accessibility setting and lifetime checks');
}
const hostInput=page=>page.locator('#native-input #hour-input');
