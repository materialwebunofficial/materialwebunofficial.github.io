import assert from 'node:assert/strict';

const profiles = [
  {tag:'md-checkbox'}, {tag:'md-radio-button'}, {tag:'md-switch'},
  {tag:'md-button', attrs:'variant="filled"'},
  {tag:'md-button', attrs:'variant="tonal"'},
  {tag:'md-button', attrs:'variant="elevated"'},
  {tag:'md-button', attrs:'variant="tonal" toggle'}, {tag:'md-fab'}
];

export async function testFocusIndication(browser, base) {
  const page = await browser.newPage({viewport:{width:960,height:800},hasTouch:true,reducedMotion:'reduce'});
  const cdp = await page.context().newCDPSession(page), errors = [];
  let checks = 0;
  page.on('pageerror', error => errors.push(error.message));
  const control = id => page.locator('#focus-'+id).locator('button,[role="checkbox"],[role="radio"],[role="switch"]');
  async function state(id) {
    return page.locator('#focus-'+id).evaluate(async host => {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const element = host.shadowRoot.querySelector('button,[role]');
      return {
        focused:element.matches(':focus'), visible:element.matches(':focus-visible'),
        alpha:+(getComputedStyle(element).getPropertyValue(host.localName==='md-fab'?'--md-fab-state-alpha':host.localName==='md-button'?'--md-button-state-alpha':'--md-selection-state-alpha') || 0),
        clicks:host._focusClicks
      };
    });
  }
  async function check(id, visible, label, checkBrowser=true) {
    const actual = await state(id); checks++;
    assert.equal(actual.focused,true,label+' retains semantic DOM focus');
    if (checkBrowser) assert.equal(actual.visible,visible,label+' browser focus-visible');
    assert.ok(Math.abs(actual.alpha-(visible?.1:0))<1e-6,`${label} indication: ${actual.alpha}`);
  }
  async function pointer(type, id, point) {
    const r = await control(id).boundingBox(), x = point?.x??r.x+r.width/2, y = point?.y??r.y+r.height/2;
    await page.evaluate(() => window.focusPointer = null);
    if (type==='touch') await page.touchscreen.tap(x,y);
    else if (type==='pen') {
      for (const event of ['mouseMoved','mousePressed','mouseReleased']) await cdp.send('Input.dispatchMouseEvent',{type:event,pointerType:'pen',x,y,button:event==='mouseMoved'?'none':'left',buttons:event==='mousePressed'?1:0,clickCount:event==='mouseMoved'?0:1});
    } else await page.mouse.click(x,y);
    assert.deepEqual(await page.evaluate(() => window.focusPointer),{type,trusted:true},'actual trusted '+type);
    if (type==='pen') await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',pointerType:'pen',x:1,y:1,button:'none',buttons:0});
    else await page.mouse.move(1,1);
  }
  try {
    await page.goto(base+'/test/browser/fixtures/toolbars.html');
    await page.waitForFunction(() => customElements.get('md-fab'));
    await page.evaluate(() => document.addEventListener('pointerdown', event => {
      window.focusPointer={type:event.pointerType,trusted:event.isTrusted};
      window.focusOrigin=event.composedPath().find(element=>element.matches?.('[role="checkbox"]'))?.getRootNode().host.id;
    },{capture:true}));
    for (const p of profiles) {
      for (const type of ['mouse','touch','pen']) {
        await page.evaluate(p => {
          document.querySelector('#fixture').innerHTML=`<button id="focus-before">Before</button><${p.tag} id="focus-a" ${p.attrs??''}>Action</${p.tag}><${p.tag} id="focus-b" ${p.attrs??''}>Next</${p.tag}>`;
          for (const host of document.querySelectorAll('#focus-a,#focus-b')) {host._focusClicks=0;host.addEventListener('click',()=>host._focusClicks++);}
        },p);
        const label=p.tag+'/'+(p.attrs??'')+'/'+type;
        await pointer(type,'a'); await check('a',false,label+' pointer release/leave');
        await page.keyboard.press('a'); await check('a',true,label+' keyboard on same focused element');
        const clicks=(await state('a')).clicks;
        await page.keyboard.press('Enter');
        assert.equal((await state('a')).clicks,clicks+1,label+' keyboard activation is retained');
        await pointer(type,'a'); await check('a',false,label+' same-element pointer removes keyboard indication',false);
        await page.locator('#focus-before').focus(); await page.keyboard.press('Tab');
        await check('a',true,label+' actual Tab navigation');
        await control('b').focus(); await check('b',true,label+' script transfer inherits visible focus');
        await pointer(type,'b'); await check('b',false,label+' pointer switches input',false);
        await page.locator('#focus-before').click();
        await pointer(type,'b'); await check('b',false,label+' new pointer focus');
        await control('a').focus(); await check('a',false,label+' script transfer inherits hidden focus');
        await page.keyboard.press('a'); await check('a',true,label+' keyboard restores script focus');
        await page.locator('#focus-a').evaluate(host => {host.disabled=true;});
        assert.equal((await state('a')).alpha,0,label+' disabled indication clears'); checks++;
        await page.locator('#focus-a').evaluate(host => {
          host._oldFocusControl=host.shadowRoot.querySelector('button,[role]');
          const parent=host.parentElement;host.remove();
          host._focusRetired=!host._oldFocusControl.style.getPropertyValue(host.localName==='md-fab'?'--md-fab-state-alpha':host.localName==='md-button'?'--md-button-state-alpha':'--md-selection-state-alpha');
          parent.append(host);host.disabled=false;
        });
        await page.locator('#focus-a').evaluate(host => {
          if (!host._focusRetired) throw Error('Disconnected focus adapter retained an inline indication');
        });
        await control('a').focus(); await page.keyboard.press('a');
        await check('a',true,label+' reconnected binding');
      }
    }
    for (const type of ['mouse','touch','pen']) {
      await page.evaluate(() => {
        document.querySelector('#fixture').innerHTML='<div style="position:fixed;left:100px;top:100px;width:70px;height:48px;--md-minimum-interactive-component-size:0px"><md-checkbox id="focus-a" style="position:absolute;left:0;top:15px"></md-checkbox><md-checkbox id="focus-b" style="position:absolute;left:30px;top:15px"></md-checkbox></div>';
        for (const host of document.querySelectorAll('#focus-a,#focus-b')) {host._focusClicks=0;host.addEventListener('click',()=>host._focusClicks++);}
      });
      await control('b').focus(); await page.keyboard.press('a'); await check('b',true,'overlap prior keyboard '+type);
      await pointer(type,'a',{x:117,y:124});
      assert.equal(await page.evaluate(()=>window.focusOrigin),'focus-b','browser expansion targets B '+type);
      await check('a',false,'native direct A beats DOM-expanded B '+type,false);
      assert.deepEqual(await page.evaluate(()=>['a','b'].map(id=>document.querySelector('#focus-'+id).checked)),[true,false],'one selected owner activates '+type);
      assert.equal((await state('b')).alpha,0,'old keyboard owner loses indication '+type); checks++;
      await page.keyboard.press('a'); await check('a',true,'routed owner keyboard recovery '+type);
    }
    assert.deepEqual(errors,[]);
    console.log(`Shared focus indication: ${checks} trusted Mouse/Touch/Pen, same-element keyboard/pointer changes, Tab, script-visible/hidden focus transfer, activation, disabled and reconnect checks across eight selection/Button/FAB profiles passed. DOM focus remains user-agent-owned; no complete native focus-manager claim.`);
  } finally {await cdp.detach();await page.close();}
}
