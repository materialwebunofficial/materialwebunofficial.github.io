import fs from 'node:fs';import assert from 'node:assert/strict';
const native=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/picker/colors.json',import.meta.url)));
export async function testPickerColors(browser,base){
 let checks=0;
 for(const width of [1440,390])for(const dark of [false,true]){
  const page=await browser.newPage({viewport:{width,height:920},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(base+'/test/browser/fixtures/toolbars.html');
   await page.evaluate(dark=>{
    document.documentElement.dataset.theme=dark?'dark':'light';
    const root=document.querySelector('#fixture');root.style.cssText='display:block;padding:16px';
    root.innerHTML='<md-time-picker id="time" inline></md-time-picker><md-date-picker id="date" value="10/09/2026" inline style="width:360px;max-width:100%"></md-date-picker><md-date-picker id="range" range start-date="10/09/2026" end-date="10/14/2026" inline style="width:360px;max-width:100%"></md-date-picker>';
   },dark);
   await page.evaluate(()=>document.fonts.ready);
   if(process.argv.includes('--capture')&&(width===1440&&!dark||width===390&&dark)){
    await page.evaluate(()=>{const root=document.querySelector('#fixture');root.style.cssText='display:flex;align-items:start;flex-wrap:wrap;gap:24px;padding:16px';});
    await page.locator('#fixture').screenshot({path:'research/picker-'+(process.argv.includes('--source')?'source':'bundle')+'-'+width+'-'+(dark?'dark':'light')+'.png'});
   }
   const palette=async vibrant=>{
    await page.evaluate(vibrant=>document.querySelector('#time').richColors=vibrant,vibrant);
    const actual=await page.evaluate(()=>{
     const host=document.querySelector('#time'),root=host.shadowRoot,probe=document.createElement('span');root.append(probe);
     const role=css=>{probe.style.color=css;return getComputedStyle(probe).color;};
     const all=Object.fromEntries([...root.querySelector('.picker-dialog').style].filter(k=>k.startsWith('--time-')).map(k=>[k,role(root.querySelector('.picker-dialog').style.getPropertyValue(k))]));
     const paint=(selector,property)=>getComputedStyle(root.querySelector(selector))[property];
     const result={all,container:paint('.picker-dialog','backgroundColor'),dial:paint('.clock-face','backgroundColor'),active:paint('.time-card.active','backgroundColor'),activeText:paint('.time-card.active','color'),inactive:paint('#min-card','backgroundColor'),period:paint('#am-btn','backgroundColor'),periodText:paint('#am-btn','color'),unselectedPeriod:paint('#pm-btn','backgroundColor')};probe.remove();return result;
    });
    const expected=vibrant?native.vibrant:native.time;
    for(const [property,field]of Object.entries({container:'containerColor',dial:'clockDialColor',active:'timeSelectorSelectedContainerColor',activeText:'timeSelectorSelectedContentColor',inactive:'timeSelectorContainerColor',period:'periodSelectorSelectedContainerColor',periodText:'periodSelectorSelectedContentColor',unselectedPeriod:'periodSelectorContainerColor'})){
     const key='--time-'+field.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());assert.equal(actual[property],actual.all[key],`${width}/${dark}/${vibrant} ${property}`);checks++;
    }
    assert.equal(Object.keys(actual.all).length,Object.keys(expected).length);checks++;
   };
   await palette(false);await palette(true);await palette(false);
   // Deliberately unrelated theme values catch any surviving hand-picked palette.
   await page.evaluate(()=>{document.querySelector('#time').style.cssText='--md-sys-color-surface-container-lowest:#003355;--md-sys-color-primary:#dd2200;--md-sys-color-on-primary-container:#223344;';});
   await palette(true);
   const date=await page.evaluate(()=>{
    const root=document.querySelector('#date').shadowRoot,day=root.querySelector('.day-cell.selected'),ink=day.querySelector('.day-text'),probe=document.createElement('span');root.append(probe);
    const css=getComputedStyle(ink),wk=getComputedStyle(root.querySelector('.weekdays-row'));probe.style.color='var(--md-sys-color-on-surface)';const weekday=getComputedStyle(probe).color;probe.style.color='var(--md-sys-color-on-primary)';const selected=getComputedStyle(probe).color;
    const result={count:root.querySelectorAll('.day-cell').length,grid:root.querySelector('.days-grid').getBoundingClientRect().height,cell:day.getBoundingClientRect().height,ink:ink.getBoundingClientRect().width,font:css.fontSize,weight:css.fontWeight,line:css.lineHeight,weekdayFont:wk.fontSize,weekdayLine:wk.lineHeight,weekday: wk.color,expectedWeekday:weekday,color:css.color,expectedColor:selected};probe.remove();return result;
   });
   assert.equal(date.count,42);assert.equal(date.grid,288);assert.equal(date.cell,48);assert.equal(date.ink,native.tokens['DatePickerModalTokens.DateContainerWidth']);assert.equal(date.font,'16px');assert.equal(date.weight,'400');assert.equal(date.line,'24px');assert.equal(date.weekdayFont,'16px');assert.equal(date.weekdayLine,'24px');assert.equal(date.weekday,date.expectedWeekday);assert.equal(date.color,date.expectedColor);checks+=11;
   const range=page.locator('#range');
   const ltr=await range.evaluate(host=>{const cell=host.shadowRoot.querySelector('.range-start'),ink=getComputedStyle(cell,'::before');return{height:parseFloat(ink.height),left:ink.left,right:ink.right};});
   await range.evaluate(host=>host.dir='rtl');
   const rtl=await range.evaluate(host=>{const cell=host.shadowRoot.querySelector('.range-start'),ink=getComputedStyle(cell,'::before');return{height:parseFloat(ink.height),left:ink.left,right:ink.right};});
   assert.equal(ltr.height,40);assert.equal(rtl.height,40);assert.equal(ltr.right,'0px');assert.equal(rtl.left,'0px');checks+=4;
   await range.evaluate(host=>{host.startDate='10/09/2026';host.endDate='10/09/2026';});
   assert.equal(await range.evaluate(host=>getComputedStyle(host.shadowRoot.querySelector('.range-start.range-end'),'::before').display),'none');checks++;
   await range.evaluate(host=>host.endDate='');
   assert.equal(await range.evaluate(host=>host.shadowRoot.querySelectorAll('.range-start,.range-end').length),0);checks++;
   // Month navigation preserves six weeks for four, five and six-week months.
   for(const month of [1,2,7]){
    const geometry=await page.locator('#date').evaluate((host,month)=>{host.state.viewYear=2026;host.state.viewMonth=month;host._updateUI();return{count:host.shadowRoot.querySelectorAll('.day-cell').length,height:host.shadowRoot.querySelector('.days-grid').getBoundingClientRect().height};},month);
    assert.deepEqual(geometry,{count:42,height:288});checks++;
   }
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 console.log('Picker real DOM: '+checks+' palette, theme mutation, day geometry, range and month checks');
}
