import assert from 'node:assert/strict';

export async function testSeedPresets(browser,base){
 let checks=0;const check=(value,label)=>{assert.ok(value,label);checks++;};
 for(const width of[1440,390])for(const mode of['light','dark'])for(const dir of['ltr','rtl']){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(base+'/#theming');
   await page.waitForFunction(()=>document.querySelectorAll('#preset-swatches md-chip').length===6&&customElements.get('md-chip'),null,{timeout:10000});
   await page.evaluate(({mode,dir})=>{document.documentElement.dir=dir;customElements.get('md-expressive-theme').applyGlobal({scheme:'expressive',colorMode:mode});window.seedControls=[...document.querySelectorAll('#preset-swatches md-chip')].map(chip=>chip.shadowRoot.querySelector('.chip'));window.seedChanges=0;document.querySelector('#preset-swatches').addEventListener('change',()=>window.seedChanges++);},{mode,dir});
   check(await page.locator('#preset-swatches').getAttribute('aria-labelledby')==='preset-swatches-label','named seed choice group');
   const chips=await page.locator('#preset-swatches md-chip').all();
   for(const chip of chips){
    const hex=(await chip.getAttribute('data-hex')).toLowerCase();
    await chip.locator('.chip').click();
    check(await page.evaluate(hex=>{const selected=[...document.querySelectorAll('#preset-swatches md-chip')].filter(node=>node.selected);return selected.length===1&&selected[0].dataset.hex.toLowerCase()===hex&&localStorage.getItem('md3e_seed_hex').toLowerCase()===hex&&document.querySelector('#hex-code-input').value.toLowerCase()===hex;},hex),'trusted seed choice changes theme/input/one selected item');
    check((await chip.ariaSnapshot()).includes('[checked]'),'selection is exposed to accessibility');
    if(chip===chips[0])await page.evaluate(()=>window.baselineSeedControls=['hue-slider','chroma-slider','tone-slider','hue-val-display','chroma-val-display','tone-val-display'].map(id=>{const node=document.getElementById(id);return node.value??node.textContent;}));
   }
   check(await page.evaluate(()=>window.seedChanges===6),'one change per trusted activation');
   await chips[5].locator('.chip').focus();await page.keyboard.press('Space');
   check(await page.evaluate(()=>window.seedChanges===7&&document.querySelectorAll('#preset-swatches md-chip[selected]').length===1),'reactivating current seed keeps caller selection and emits once');
   await page.keyboard.press('Shift+Tab');await page.keyboard.press('Enter');
   check(await page.evaluate(()=>window.seedChanges===8&&document.querySelectorAll('#preset-swatches md-chip[selected]').length===1),'keyboard can select previous seed');
   check(await page.evaluate(()=>[...document.querySelectorAll('#preset-swatches md-chip')].every((chip,i)=>chip.shadowRoot.querySelector('.chip')===window.seedControls[i])),'theme/selection updates retain controls');
   await page.locator('#hex-code-input input').fill('#123456');
   check(await page.evaluate(()=>document.querySelectorAll('#preset-swatches md-chip[selected]').length===0&&localStorage.getItem('md3e_seed_hex').toLowerCase()==='#123456'),'custom seed clears preset selection');
   await page.locator('#reset-color-btn').click();
   check(await page.evaluate(()=>localStorage.getItem('md3e_seed_hex').toLowerCase()==='#6750a4'&&document.querySelector('#preset-swatches md-chip').selected&&document.querySelectorAll('#preset-swatches md-chip[selected]').length===1),'reset restores baseline selection and theme');
   check(await page.evaluate(()=>JSON.stringify(window.baselineSeedControls)===JSON.stringify(['hue-slider','chroma-slider','tone-slider','hue-val-display','chroma-val-display','tone-val-display'].map(id=>{const node=document.getElementById(id);return node.value??node.textContent;}))),'reset restores real HCT coordinates and labels rather than rounded constants');
   check(await page.evaluate(()=>[...document.querySelectorAll('#preset-swatches md-chip')].every(chip=>{const leading=chip.shadowRoot.querySelector('.leading-ico');return leading.querySelector('slot').assignedElements().length===1&&leading.querySelector('.leading-icon-text').hidden&&getComputedStyle(leading).display!=='none'&&getComputedStyle(chip).borderTopWidth==='0px';})),'seed data occupies shared leading slot without an extra host frame or glyph');
   await page.evaluate(()=>{document.documentElement.style.setProperty('--md-sys-color-secondary-container','#13579b');document.documentElement.style.setProperty('--md-sys-color-on-secondary-container','#fedcba');});
   await page.waitForFunction(()=>{const chip=document.querySelector('#preset-swatches md-chip[selected]').shadowRoot.querySelector('.chip'),style=getComputedStyle(chip);return style.backgroundColor==='rgb(19, 87, 155)'&&style.color==='rgb(254, 220, 186)';});
   check(true,'selected surface/content follow changed system tokens');
   for(const chip of chips){const box=await chip.boundingBox();check(box.x>=-.5&&box.x+box.width<=width+.5,'seed choice fits viewport');}
   await page.evaluate(()=>{const fixture=document.createElement('div');fixture.id='chip-slot-fixture';fixture.innerHTML='<md-chip id="slot-chip" variant="filter" label="Custom" selected><span slot="leading-icon">Custom leading</span></md-chip>';document.querySelector('#theming').append(fixture);window.slotChanges=0;document.querySelector('#slot-chip').addEventListener('change',()=>window.slotChanges++);});
   check(await page.evaluate(()=>document.querySelector('#slot-chip').shadowRoot.querySelector('.leading-icon-text').hidden),'custom content takes precedence over the automatic icon');
   await page.evaluate(()=>document.querySelector('#slot-chip [slot]').remove());
   await page.waitForFunction(()=>!document.querySelector('#slot-chip').shadowRoot.querySelector('.leading-icon-text').hidden);
   check(await page.evaluate(()=>document.querySelector('#slot-chip').shadowRoot.querySelector('.leading-icon-text').textContent==='check'),'removing custom leading restores the selected check');
   await page.evaluate(()=>{const chip=document.querySelector('#slot-chip');chip.remove();document.querySelector('#chip-slot-fixture').append(chip);});
   await page.locator('#slot-chip .chip').click();
   check(await page.evaluate(()=>window.slotChanges===1&&!document.querySelector('#slot-chip').selected),'reconnect has one keyboard/pointer activation owner');
   await page.evaluate(()=>document.querySelector('#slot-chip').disabled=true);await page.locator('#slot-chip .chip').click({force:true});
   check(await page.evaluate(()=>window.slotChanges===1&&!document.querySelector('#slot-chip').selected),'disabled shared control cannot change selection');
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 console.log('Seed presets: '+checks+' trusted input/key/selection/token/slot/retained/lifecycle/viewport checks, 1440/390 light/dark LTR/RTL passed.');
}
