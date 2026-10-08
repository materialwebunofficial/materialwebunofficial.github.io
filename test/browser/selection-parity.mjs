import assert from 'node:assert/strict';

export async function testSelectionParity(page) {
  await page.evaluate(() => {
    const host=document.createElement('div');host.id='selection-parity';
    host.style.cssText='position:fixed;inset:0;z-index:99999;background:var(--md-sys-color-surface);display:flex;align-items:start';
    host.innerHTML=`<form id="selection-a"><md-checkbox id="check" name="check" checked indeterminate></md-checkbox>
      <md-switch id="switch" name="switch" checked></md-switch>
      <md-radio-button id="radio-a" name="group" value="a" checked></md-radio-button>
      <md-radio-button id="radio-disabled" name="group" value="disabled" disabled></md-radio-button>
      <md-radio-button id="radio-b" name="group" value="b"></md-radio-button>
      <fieldset disabled><md-checkbox id="fieldset-check" name="disabled" checked></md-checkbox></fieldset></form>
      <form id="selection-b"><md-radio-button id="other-form" name="group" checked></md-radio-button></form>`;
    document.body.append(host);
  });
  try {
    const check=page.locator('#check .chk-root'),radio=page.locator('#radio-a .radio-root');
    assert.equal(await page.locator('#check .box').evaluate(el=>el.getBoundingClientRect().width),18);
    assert.equal(await page.locator('#check svg').evaluate(el=>el.getBoundingClientRect().width),18);
    assert.equal(await check.getAttribute('aria-checked'),'mixed');
    assert.equal(await page.locator('#check .mark-check').evaluate(el=>getComputedStyle(el).opacity),'1');
    assert.equal(await page.locator('#check .mark-check').getAttribute('d'),'M 4.5 9 L 9 9 L 13.5 9');
    assert.equal(await page.locator('#check svg path').count(),1);
    await check.press('Space');
    assert.equal(await check.getAttribute('aria-checked'),'true');
    await check.press('Space');
    assert.equal(await check.getAttribute('aria-checked'),'false');
    await page.locator('#switch .switch-root').press('Space');
    await radio.press('ArrowDown');
    assert.equal(await page.locator('#radio-b').evaluate(el=>el.checked),true);
    assert.equal(await page.locator('#other-form').evaluate(el=>el.checked),true,'groups must respect form ownership');
    assert.equal(await radio.getAttribute('tabindex'),'-1');
    assert.equal(await page.locator('#radio-b .radio-root').getAttribute('tabindex'),'0');
    assert.equal(await page.locator('#fieldset-check .chk-root').getAttribute('aria-disabled'),'true');
    assert.deepEqual(await page.locator('#selection-a').evaluate(form=>[...new FormData(form)]),[['group','b']]);
    await page.locator('#selection-a').evaluate(form=>form.reset());
    assert.equal(await check.getAttribute('aria-checked'),'mixed');
    assert.equal(await page.locator('#switch').evaluate(el=>el.checked),true);
    assert.equal(await page.locator('#radio-a').evaluate(el=>el.checked),true);
    assert.equal(await page.locator('#radio-b').evaluate(el=>el.checked),false);
    const data=await page.evaluate(() => {
      const check=document.getElementById('check');
      check.formStateRestoreCallback(JSON.stringify({checked:false,indeterminate:true}));
      const restored=!check.checked&&check.indeterminate;
      check.indeterminate=false;check.checked=false;
      const form=check.parentElement;check.remove();form.append(check);
      let changes=0,inputs=0;
      check.addEventListener('change',()=>changes++);check.addEventListener('input',()=>inputs++);
      check.click();
      const sw=document.getElementById('switch');sw.icon='close';
      const iconNode=sw.shadowRoot.querySelector('.icon');sw.icon='check';
      const stableIcon=iconNode===sw.shadowRoot.querySelector('.icon')&&iconNode.textContent==='check';
      const checked=check.checked;
      check.disabled=true;
      const boxStyle=getComputedStyle(check.shadowRoot.querySelector('.box'));
      return {restored,changes,inputs,checked,stableIcon,opacity:boxStyle.opacity};
    });
    assert.deepEqual(data,{restored:true,changes:1,inputs:1,checked:true,stableIcon:true,opacity:'1'});
    await page.locator('#radio-b').evaluate(el=>{el.checked=true;});
    assert.equal(await page.locator('#radio-a').evaluate(el=>el.checked),false,'programmatic group exclusivity');
    await page.locator('#switch').evaluate(el=>{el.setAttribute('dir','rtl');el.checked=false;});
    await page.waitForTimeout(700);
    const before=await page.locator('#switch .handle').boundingBox();
    await page.locator('#switch').evaluate(el=>{el.checked=true;});
    await page.waitForTimeout(700);
    const after=await page.locator('#switch .handle').boundingBox();
    assert.ok(after.x<before.x,'RTL switch must move to inline end');
    await page.locator('#switch .switch-root').press('Enter');
    assert.equal(await page.locator('#switch').evaluate(el=>el.checked),false,'inherited ClickableNode Enter key-up toggles the switch');
    await page.locator('#switch').evaluate(sw=>{sw.checked=true;sw.disabled=true;});
    await page.waitForTimeout(700);
    const disabledColors = await page.evaluate(async() => {
      const {resolveColorAlpha}=await import('/src/theme/color-alpha.js');
      const {resolveSurfaceColor}=await import('/src/theme/surface-color.js');
      const sw=document.getElementById('switch');
      const checkbox=document.getElementById('check');
      const probe=document.createElement('span');sw.parentElement.append(probe);
      const resolve = value => resolveSurfaceColor(probe,value).key;
      const surface=resolve('var(--md-sys-color-surface)');
      const switchTrack=resolve(resolveColorAlpha(probe,{color:'var(--md-sys-color-on-surface)',alpha:.12,over:'var(--md-sys-color-surface)'}));
      const checkboxBox=resolve(resolveColorAlpha(probe,{color:'var(--md-sys-color-on-surface)',alpha:.38}));
      const result = {switchTrack:[resolve(getComputedStyle(sw.shadowRoot.querySelector('.track')).backgroundColor),switchTrack],
        switchThumb:resolve(getComputedStyle(sw.shadowRoot.querySelector('.handle')).backgroundColor)===surface,
        checkboxBox:resolve(getComputedStyle(checkbox.shadowRoot.querySelector('.box-fill')).fill)===checkboxBox,
        checkboxMark:resolve(getComputedStyle(checkbox.shadowRoot.querySelector('.mark-check')).stroke)===surface};
      probe.remove();return result;
    });
    for (const [role,matches] of Object.entries(disabledColors)) {
      if (Array.isArray(matches)) assert.equal(matches[0],matches[1],role);
      else assert.equal(matches,true,role);
    }
    await page.locator('#selection-parity').evaluate(host => {
      host.style.cssText='position:fixed;top:24px;left:24px;z-index:99999;padding:24px;background:var(--md-sys-color-surface);display:grid;grid-template-columns:repeat(6,56px);gap:16px';
      host.innerHTML = ['', 'checked','indeterminate','checked disabled','indeterminate disabled','error checked'].map(attrs=>`<md-checkbox ${attrs}></md-checkbox>`).join('')+
        ['', 'checked','disabled','checked disabled'].map(attrs=>`<md-radio-button ${attrs}></md-radio-button>`).join('')+'<span></span><span></span>'+
        ['', 'checked','disabled','checked disabled','icon="close"','icon="check" checked'].map(attrs=>`<md-switch ${attrs}></md-switch>`).join('');
    });
    await page.waitForTimeout(700);
    await page.locator('#selection-parity').screenshot({path:'research/selection-controls.png'});
  } finally { await page.locator('#selection-parity').evaluate(el=>el.remove()); }
}
