import fs from 'node:fs';import assert from 'node:assert/strict';
const native=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/picker/period.json',import.meta.url)));
export async function testPickerPeriod(browser,base){
 let checks=0;
 for(const width of [1440,390])for(const dark of [false,true])for(const horizontal of [false,true]){
  const page=await browser.newPage({viewport:{width,height:920},reducedMotion:'reduce'}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(base+'/test/browser/fixtures/toolbars.html');
   await page.evaluate(({dark,horizontal})=>{document.documentElement.dataset.theme=dark?'dark':'light';document.querySelector('#fixture').innerHTML='<md-time-picker id="picker" inline layout-type="'+(horizontal?'horizontal':'vertical')+'"></md-time-picker>';window.periodChanges=0;document.querySelector('#picker').addEventListener('change',()=>window.periodChanges++);},{dark,horizontal});
   await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const host=page.locator('#picker'),am=host.locator('#am-btn'),pm=host.locator('#pm-btn');
   const actual=await host.evaluate(host=>{
    const group=host._periodGroup,rect=group.group.getBoundingClientRect(),css=getComputedStyle(group.group);
    return{width:rect.width,height:rect.height,border:css.borderWidth,items:group.buttons.map(owner=>{const r=owner.button.getBoundingClientRect(),css=getComputedStyle(owner.button);return{width:r.width,height:r.height,x:r.x-rect.x,y:r.y-rect.y,radius:parseFloat(css.borderRadius),font:css.fontSize,weight:css.fontWeight,checked:owner.button.getAttribute('aria-checked'),role:owner.button.getAttribute('role')};})};
   });
   const expected=native.find(row=>row.type==='layout'&&row.horizontal===horizontal&&!row.vibrant&&row.density===1&&row.width===(horizontal?216:52)&&row.height===(horizontal?38:80)).result;
   assert.equal(actual.width,expected.width);assert.equal(actual.height,expected.height);assert.equal(actual.border,'0px');checks+=3;
   for(let i=0;i<2;i++){const {radius,font,weight,checked,role,...geometry}=actual.items[i];assert.deepEqual(geometry,expected.items[i]);assert.equal(radius,i===0?12:19);assert.equal(font,'16px');assert.equal(weight,i===0?'700':'500');assert.equal(checked,i===0?'true':'false');assert.equal(role,'checkbox');checks+=6;}
   await am.click();assert.equal(await page.evaluate(()=>window.periodChanges),0);checks++;
   const box=await pm.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
   assert(await host.evaluate(host=>host._periodGroup.buttons[1].pressed));assert.equal(await pm.evaluate(button=>parseFloat(getComputedStyle(button).borderRadius)),12);checks+=2;
   await page.mouse.up();assert.equal(await host.evaluate(host=>host.state.period),'PM');assert.equal(await page.evaluate(()=>window.periodChanges),1);assert.equal(await pm.getAttribute('aria-checked'),'true');checks+=3;
   await pm.click();assert.equal(await page.evaluate(()=>window.periodChanges),1);checks++;
   await am.focus();await page.keyboard.down('Space');await page.keyboard.down('Space');assert.equal(await page.evaluate(()=>window.periodChanges),1);await page.keyboard.up('Space');assert.equal(await host.evaluate(host=>host.state.period),'AM');assert.equal(await page.evaluate(()=>window.periodChanges),2);checks+=3;
   await pm.focus();await page.keyboard.press('Enter');assert.equal(await host.evaluate(host=>host.state.period),'PM');assert.equal(await page.evaluate(()=>window.periodChanges),3);checks+=2;
   await host.evaluate(host=>host.value='08:45 AM');assert.equal(await am.getAttribute('aria-checked'),'true');assert.equal(await pm.getAttribute('aria-checked'),'false');assert.equal(await page.evaluate(()=>window.periodChanges),3);checks+=3;
   // Cancelling a gesture does not alter the selected period.
   const cancel=await host.evaluate(host=>{const owner=host._periodGroup.buttons[1],b=owner.button,r=b.getBoundingClientRect(),init={pointerId:77,pointerType:'mouse',clientX:r.x+r.width/2,clientY:r.y+r.height/2,button:0,buttons:1,bubbles:true,composed:true};b.dispatchEvent(new PointerEvent('pointerdown',init));b.dispatchEvent(new PointerEvent('pointercancel',init));return{period:host.state.period,pressed:owner.pressed};});
   assert.deepEqual(cancel,{period:'AM',pressed:false});assert.equal(await page.evaluate(()=>window.periodChanges),3);checks+=2;
   for(const attribute of ['mode','rich-colors','is-24-hour']){
    const disposed=await host.evaluate((host,attribute)=>{const old=host._periodGroup;host.setAttribute(attribute,attribute==='mode'?'input':'');return{group:old.disposed,buttons:old.buttons.every(owner=>owner.disposed&&owner.abort.signal.aborted&&owner.motion.disposed&&owner.motion.raf===null&&owner.surface.disposed)};},attribute);
    assert.deepEqual(disposed,{group:true,buttons:true});checks++;
   }
   assert.equal(await host.locator('.period-btn').count(),0);checks++;
   await host.evaluate(host=>host.is24Hour=false);assert.equal(await host.locator('.period-btn').count(),2);checks++;
   const detached=await host.evaluate(host=>{window.savedPicker=host;const old=host._periodGroup;host.remove();return old.disposed&&old.buttons.every(owner=>owner.disposed&&owner.motion.raf===null);});assert(detached);checks++;
   await page.evaluate(()=>document.querySelector('#fixture').append(window.savedPicker));
   await host.locator('#pm-btn').click();assert.equal(await page.evaluate(()=>window.periodChanges),4,JSON.stringify(await host.evaluate(host=>({state:host.state,time:host._pickerTime?.save(),inputDisposed:host._input?.disposed,periodDisposed:host._periodGroup?.disposed,owners:host._periodGroup?.buttons.map(owner=>({pressed:owner.pressed,disposed:owner.disposed}))}))));checks++;
   // Reduced motion is tested above; ordinary motion must retain its owner on
   // press -> check -> release rather than starting a second closing animation.
   await page.emulateMedia({reducedMotion:'no-preference'});
   const retained=await host.evaluate(host=>{const owner=host._periodGroup.buttons[0],state=owner.state;owner.pressed=true;owner.refresh();const first=owner.state;host.state.period='AM';host._periodGroup.refresh();owner.pressed=false;owner.refresh();return{same:owner.state===state&&owner.state===first,target:owner.state.targetShape};});
   assert.deepEqual(retained,{same:true,target:{unit:'px',value:12}});checks++;
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 console.log('Picker period actual controls: '+checks+' native geometry, shape/press, trusted mouse/keyboard, state mutation, cancellation and disposal checks');
}
