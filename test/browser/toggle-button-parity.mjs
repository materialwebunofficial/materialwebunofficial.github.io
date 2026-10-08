import assert from 'node:assert/strict';
import fs from 'node:fs';
import {testButtonComposition} from './button-composition.mjs';
import {testToggleBorder} from './toggle-border.mjs';
import {testToggleButtonLayout} from './toggle-button-layout.mjs';
const colors=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/toggle-button/color-oracle.json',import.meta.url)));
const defaults=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/button/layout-oracle.json',import.meta.url))).defaults;

export async function testToggleButtonParity(browser,base){
  const page=await browser.newPage({viewport:{width:960,height:800},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));let pairs=0;
  try{
    await page.goto(base+'/test/browser/fixtures/toolbars.html');
    await page.evaluate(async()=>{await customElements.whenDefined('md-button');await document.fonts.ready;document.querySelector('#fixture').innerHTML='<md-button id="button" toggle label="Toggle"></md-button>';});
    for(const variant of Object.keys(colors.variants))for(const disabled of [false,true])for(const checked of [false,true])for(const palette of [0,1]){
      const expected=colors.variants[variant];
      const result=await page.evaluate(async({variant,disabled,checked,palette,expected,roles})=>{
        const h=document.querySelector('#button'),b=h.shadowRoot.querySelector('.btn');h.setAttribute('variant',variant);h.disabled=disabled;h.selected=checked;
        for(const [id,name]of Object.entries(roles)){const role=name.replace(/[A-Z]/g,(c,i)=>(i?'-':'')+c.toLowerCase());h.style.setProperty('--md-sys-color-'+role,`rgb(${(Number(id)*31+palette*83)%255},${(Number(id)*47+palette*59)%255},${(Number(id)*67+palette*17)%255})`);}
        // Border is now animateColorAsState; let the actual theme observer
        // receive the palette mutation, then reduced motion settles its target.
        await new Promise(resolve=>queueMicrotask(()=>queueMicrotask(resolve)));
        const probe=document.createElement('span');h.shadowRoot.append(probe);
        const resolve=color=>{const name=roles[color.role],token=name?`var(--md-sys-color-${name.replace(/[A-Z]/g,(c,i)=>(i?'-':'')+c.toLowerCase())})`:null;probe.style.color=color.role<0?'transparent':color.alpha===1?token:`color-mix(in srgb,${token} ${color.alpha*100}%,transparent)`;return getComputedStyle(probe).color;};
        const css=getComputedStyle(b),want={container:resolve(expected[disabled?'disabledContainer':checked?'checkedContainer':'container']),content:resolve(expected[disabled?'disabledContent':checked?'checkedContent':'content'])};
        const wantedBorder=variant==='outlined'&&!checked?resolve(expected[disabled?'disabledBorder':'border']):null;
        probe.style.color=css.borderColor;const border=getComputedStyle(probe).color;
        probe.style.color=css.backgroundColor;const container=getComputedStyle(probe).color;probe.style.color=css.color;const content=getComputedStyle(probe).color;probe.remove();
        return{actual:{container,content},want,border,wantedBorder,role:b.getAttribute('role'),checked:b.getAttribute('aria-checked'),transitions:b.getAnimations().map(a=>a.transitionProperty).filter(p=>['background-color','color'].includes(p)),outline:parseFloat(b.style.getPropertyValue('--_button-outline-width'))};
      },{variant,disabled,checked,palette,expected,roles:colors.roles});
      assert.deepEqual(result.actual,result.want,`${variant}/${disabled}/${checked}/${palette} original ToggleButtonColors`);
      assert.equal(result.role,'checkbox');assert.equal(result.checked,String(checked));assert.deepEqual(result.transitions,[],'native content/container colors resolve directly');
      assert.equal(result.outline,variant==='outlined'&&!checked?expected.borderWidth:0,'native outlined default border is absent when checked');
      if(result.wantedBorder!==null)assert.equal(result.border,result.wantedBorder,'original border color/disabled alpha');pairs++;
    }
    // With no text width, the original height-only Row minimum leaves the
    // public content padding as the body width. Surface reserves a 48dp target.
    for(const [index,size]of ['xs','s','m','l','xl'].entries())for(const dir of ['ltr','rtl']){
      const measured=await page.locator('#button').evaluate((h,{size,dir})=>{h.setAttribute('size',size);h.setAttribute('variant','filled');h.setAttribute('label','');h.dir=dir;h.disabled=false;h.selected=false;const b=h.shadowRoot.querySelector('.btn');return{body:[b.offsetWidth,b.offsetHeight],host:[h.offsetWidth,h.offsetHeight]};},{size,dir});
      const d=defaults[index];assert.deepEqual(measured.body,[d.start+d.end,d.height],`${size}/${dir} height-only minimum`);assert.deepEqual(measured.host,[Math.max(48,d.start+d.end),Math.max(48,d.height)],'native minimum interaction reservation');
      assert.equal(await page.locator('#button').evaluate(h=>{h.setAttribute('variant','outlined');return parseFloat(h.shadowRoot.querySelector('.btn').style.getPropertyValue('--_button-outline-width'));}),colors.variants.outlined.borderWidth,'native automatic-size Toggle uses the public 1dp border default at every size');
    }
    // Actual keyboard and pointer activation, cancellation and mode changes.
    await page.locator('#button').evaluate(h=>{h.setAttribute('size','s');h.setAttribute('variant','filled');h.setAttribute('label','Toggle');h.focus();window.toggleChanges=0;h.addEventListener('change',()=>window.toggleChanges++);});
    await page.keyboard.press('Space');assert.equal(await page.locator('#button').evaluate(h=>h.selected),true);
    await page.keyboard.press('Enter');assert.equal(await page.locator('#button').evaluate(h=>h.selected),false);
    await page.locator('#button').getByRole('checkbox').click();assert.equal(await page.locator('#button').evaluate(h=>h.selected),true);
    assert.equal(await page.evaluate(()=>window.toggleChanges),3);
    const box=await page.locator('#button').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
    assert.equal(await page.locator('#button').evaluate(h=>h._pressed&&parseFloat(h.shadowRoot.querySelector('.btn').style.borderRadius)===6),true);
    await page.mouse.move(box.x+box.width+30,box.y+box.height+30);await page.mouse.up();assert.equal(await page.locator('#button').evaluate(h=>h.selected&&!h._pressed),true,'drag cancellation retains the selection');
    assert.equal(await page.locator('#button').evaluate(h=>{const b=h.shadowRoot.querySelector('.btn');h.removeAttribute('toggle');return b===h.shadowRoot.querySelector('.btn')&&b.getAttribute('role')==='button'&&!b.hasAttribute('aria-checked')&&!b.hasAttribute('aria-pressed');}),true);
    assert.deepEqual(errors,[]);console.log(`ToggleButton browser: ${pairs} original enabled/checked/disabled live color pairs, five height-only minima/RTL/48dp targets, Checkbox semantics, Space/Enter/pointer activation, cancellation and retained mode changes passed.`);
  }finally{await page.close();}
  await testButtonComposition(browser,base,{toggle:true});
  await testToggleBorder(browser,base);
  await testToggleButtonLayout(browser,base);
}
