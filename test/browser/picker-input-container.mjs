import fs from 'node:fs';import assert from 'node:assert/strict';
const directory=new URL('../fixtures/androidx/',import.meta.url),rows=JSON.parse(fs.readFileSync(new URL('picker/input-colors.json',directory)));
export async function testPickerInputContainer(browser,base){
 let branches=0,checks=0;
 for(const vibrant of [false,true])for(const dark of [false,true]){
  const page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(()=>document.fonts.ready);
   for(const error of [false,true])for(const focused of [false,true]){
    await page.evaluate(({vibrant,dark})=>{document.documentElement.dataset.theme=dark?'dark':'light';document.querySelector('#fixture').innerHTML='<button id="outside">Outside</button><md-time-picker autofocus id="input-container" mode="input" inline is-24-hour accessibility-services-enabled value="07:17" '+(vibrant?'rich-colors':'')+'></md-time-picker>';},{vibrant,dark});
    const input=page.locator('#input-container #hour-input');if(error){await input.focus();await input.selectText();await page.keyboard.insertText('99');}if(focused)await input.focus();else await page.locator('#outside').focus();
    const expected=rows.find(row=>row.kind==='field'&&row.vibrant===vibrant&&row.enabled&&row.error===error&&row.focused===focused);
    const actual=await page.locator('#input-container').evaluate((host,expected)=>{
     const field=host._input.fields[0],css=getComputedStyle(field.element),probe=document.createElement('span');field.slot.append(probe);
     const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d'),pixel=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];};
     const role=name=>'var(--md-sys-color-'+name.replace(/[A-Z]/g,(c,i)=>(i?'-':'')+c.toLowerCase())+')';
     const resolve=color=>{probe.style.color=color.role==='transparent'?'transparent':role(color.role);return pixel(getComputedStyle(probe).color);};
     const result={container:pixel(css.backgroundColor),expectedContainer:resolve(expected.background),indicator:pixel(getComputedStyle(field.outline).color),expectedIndicator:resolve(expected.borderColor),text:pixel(css.color),expectedText:resolve({role:expected.error?'Error':host.richColors?'Primary':'OnPrimaryContainer'}),caret:pixel(css.caretColor),expectedCaret:resolve({role:'Primary'}),width:Number(field.outline.querySelector('rect').getAttribute('stroke-width')),cssBorder:css.borderTopWidth,fieldWidth:field.element.getBoundingClientRect().width};probe.remove();return result;
    },expected);
    for(const key of ['container','indicator','text','caret']){assert.deepEqual(actual[key],actual['expected'+key[0].toUpperCase()+key.slice(1)],JSON.stringify({vibrant,dark,error,focused,key}));branches++;}
    assert.equal(actual.width,expected.borderWidth);assert.equal(actual.cssBorder,'0px');assert.equal(actual.fieldWidth,96);checks+=3;
   }
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 console.log('Time input Container DOM: '+branches+' native theme branches, '+checks+' continuous SVG stroke/focus checks');
}
