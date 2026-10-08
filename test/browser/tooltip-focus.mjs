import assert from 'node:assert/strict';

// These are real DOM window/focus adapters. The source decision rules are
// BasicTooltip.kt and AndroidPopup.android.kt, not an executed Android window.
export async function testTooltipFocusParity(browser,base) {
  const page=await browser.newPage({viewport:{width:960,height:800},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const active=()=>page.evaluate(()=>{
    let n=document.activeElement;while(n?.shadowRoot?.activeElement)n=n.shadowRoot.activeElement;
    return n?.id || n?.getRootNode().host?.id || n?.className;
  });
  try {
    await page.goto(base+'/test/browser/fixtures/toolbars.html');
    await page.evaluate(async()=>{
      await customElements.whenDefined('md-tooltip');await document.fonts.ready;
      customElements.define('tooltip-nested-action',class extends HTMLElement {
        constructor(){super();this.attachShadow({mode:'open'}).innerHTML='<button id="nested">Nested action</button><slot></slot>';}
      });
      document.querySelector('#fixture').innerHTML=`<md-theme><button id="before">Before</button><div id="moving"><button id="anchor">Info</button></div><md-tooltip id="tip" for="anchor" variant="rich" text="Help" headline="Context" has-action is-persistent enable-user-input="false"><div slot="action"><button disabled>Disabled</button><div inert><button>Inert</button></div><button hidden>Hidden</button><button id="first">First</button><md-button id="second" variant="text" label="Second"></md-button><tooltip-nested-action id="third"><button id="fourth">Slotted action</button></tooltip-nested-action></div></md-tooltip><button id="outside" style="position:fixed;left:700px;top:650px">Outside</button></md-theme>`;
      window.tip=document.querySelector('#tip');window.anchor=document.querySelector('#anchor');window.outside=document.querySelector('#outside');
      outside.clicks=0;outside.downs=0;outside.addEventListener('click',()=>outside.clicks++);outside.addEventListener('pointerdown',()=>outside.downs++);
      document.querySelector('#before').focus();tip.focusable=true;tip.show().catch(()=>{});
    });
    assert.equal(await active(),'first','focusable popup takes focus, skipping unavailable descendants');
    for(const id of ['second','nested','fourth','first']){await page.keyboard.press('Tab');assert.equal(await active(),id);}
    await page.keyboard.press('Shift+Tab');assert.equal(await active(),'fourth','reverse traversal wraps within popup');
    await page.evaluate(()=>document.querySelector('#outside').focus());assert.equal(await active(),'first','focus cannot escape active popup');
    await page.keyboard.down('Escape');assert.equal(await page.evaluate(()=>tip.open),true,'popup waits for Escape up');
    await page.keyboard.up('Escape');assert.equal(await page.evaluate(()=>tip.open),false);assert.equal(await active(),'before','popup removal restores prior focus');
    // The anchor keyboard path forces a popup window even though focusable is false.
    await page.evaluate(()=>{tip.focusable=false;tip.enableUserInput=true;anchor.focus();});
    await page.keyboard.press('Shift+Tab');assert.equal(await active(),'first','source anchor isTab ignores shift when entering popup');
    await page.evaluate(()=>document.querySelector('#first').disabled=true);
    await page.waitForFunction(()=>document.querySelector('#second').matches(':focus-within'));
    assert.equal(await active(),'second','live disabled action releases its focus');
    await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>tip.open),false);assert.equal(await active(),'anchor');
    await page.evaluate(()=>{document.querySelector('#first').disabled=false;tip.enableUserInput=false;tip.focusable=true;tip.show().catch(()=>{});});
    await page.locator('#outside').click({force:true});
    assert.deepEqual(await page.evaluate(()=>[tip.open,outside.downs,outside.clicks]),[false,0,0],'focusable outside press dismisses and consumes the complete pointer sequence');
    await page.evaluate(()=>{tip.focusable=false;tip.show().catch(()=>{});});
    await page.locator('#outside').click();
    assert.deepEqual(await page.evaluate(()=>[tip.open,outside.downs,outside.clicks]),[false,1,1],'nonfocusable outside press passes through');
    await page.evaluate(()=>{document.querySelector('#before').focus();tip.focusable=true;tip.requests=0;tip.onDismissRequest=()=>tip.requests++;tip.show().catch(()=>{});});
    await page.locator('#outside').click({force:true});
    assert.deepEqual(await page.evaluate(()=>[tip.open,tip.requests,outside.clicks]),[true,1,1],'custom dismissal callback owns state; outside press still consumed');
    await page.keyboard.press('Escape');assert.deepEqual(await page.evaluate(()=>[tip.open,tip.requests]),[true,2]);
    await page.evaluate(()=>{tip.enableUserInput=true;tip.enableUserInput=false;});
    assert.equal(await page.evaluate(()=>tip.open),true,'input modifier replacement preserves the manual request');
    await page.evaluate(()=>{tip.target=document.querySelector('#outside');});
    assert.equal(await page.evaluate(()=>tip.open),true,'anchor replacement preserves remembered manual state');
    await page.evaluate(()=>{tip.target=anchor;});
    await page.evaluate(()=>{tip.onDismissRequest=null;tip.focusable=false;tip.hasAction=false;tip.forceFocusableForA11y=true;});
    assert.equal(await page.evaluate(()=>tip._focusScope.active),false,'accessibility force flag requires source hasAction');
    await page.evaluate(()=>tip.hasAction=true);assert.equal(await active(),'first');
    await page.evaluate(()=>tip.dismiss());assert.equal(await active(),'before');
    // A plain focusable popup has a focus root even without actionable content.
    await page.evaluate(()=>{tip.variant='plain';tip.hasAction=false;tip.forceFocusableForA11y=false;tip.focusable=true;tip.show().catch(()=>{});});
    assert.equal(await active(),'tip');await page.keyboard.press('Tab');assert.equal(await active(),'tip');
    await page.evaluate(()=>tip.remove());assert.equal(await active(),'before','disconnect restores window focus');
    await page.evaluate(()=>{document.querySelector('#anchor').after(tip);tip.focusable=false;tip.enableUserInput=true;tip.variant='rich';tip.hasAction=true;anchor.focus();});
    await page.keyboard.press('Tab');assert.equal(await active(),'first','reconnection keeps nested controls and bindings');
    await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>tip.open),false);
    await page.evaluate(()=>{document.querySelector('#before').focus();tip.enableUserInput=false;tip.hasAction=false;tip.show().catch(()=>{});});
    await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>tip.open),true,'an unfocused nonfocusable popup does not consume unrelated keys');
    await page.evaluate(()=>tip.dismiss());
    await page.evaluate(()=>{tip.enableUserInput=true;anchor.dispatchEvent(new PointerEvent('pointerenter',{pointerType:'mouse'}));});
    assert.equal(await page.evaluate(()=>tip.open),true);
    await page.evaluate(()=>tip.enableUserInput=false);assert.equal(await page.evaluate(()=>tip.open),false,'removed input scope cancels its hover request');
    // A native focusable child popup can replace an outgoing parent without
    // leaving a stale focus return target in the retired popup.
    await page.evaluate(()=>{
      tip.variant='rich';tip.hasAction=true;tip.focusable=true;tip.show('prevent-user-input').catch(()=>{});
      const next=document.createElement('md-tooltip');next.id='next';next.target=document.querySelector('#outside');next.focusable=true;next.enableUserInput=false;next.isPersistent=true;next.text='Second popup';document.querySelector('#fixture').append(next);next.show().catch(()=>{});
    });
    assert.equal(await active(),'first','lower-priority replacement cannot steal an active request');
    await page.evaluate(()=>{document.querySelector('#next').show('prevent-user-input').catch(()=>{});});assert.equal(await active(),'next');
    assert.equal(await page.evaluate(()=>tip.open),true,'canceled PreventUserInput leaves prior native state visible');
    // Complete source priority cancellation is checked in the independent state
    // oracle. Here replace the current popup explicitly to test the DOM stack.
    await page.evaluate(()=>tip.dismiss());assert.equal(await active(),'next','retirement underneath the replacement keeps top popup focus');
    await page.evaluate(()=>{document.querySelector('#next').remove();tip.dismiss();});
    assert.equal(await active(),'before');
    await page.evaluate(()=>{
      const holder=document.createElement('div');holder.id='shadow-anchor';holder.attachShadow({mode:'open'}).innerHTML='<button id="inner-anchor">Shadow anchor</button>';document.querySelector('#fixture').append(holder);
      tip.target=holder.shadowRoot.querySelector('button');tip.enableUserInput=true;tip.focusable=false;tip.target.focus();
    });
    await page.keyboard.press('Tab');assert.equal(await active(),'first');
    await page.keyboard.press('Escape');assert.equal(await active(),'inner-anchor','focus return crosses open shadow ancestry');
    await page.evaluate(()=>{
      tip.enableUserInput=false;tip.focusable=true;tip.show().catch(()=>{});
      const dialog=document.createElement('dialog');dialog.id='dialog';dialog.innerHTML='<button id="dialog-first" autofocus>First dialog action</button><button id="dialog-second">Second dialog action</button>';document.querySelector('#fixture').append(dialog);dialog.showModal();
    });
    assert.equal(await active(),'dialog-first','a later modal takes its own focus');
    await page.keyboard.press('Tab');assert.equal(await active(),'dialog-second','underlying tooltip does not trap modal keyboard input');
    await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.querySelector('#dialog').open),false);assert.equal(await page.evaluate(()=>tip.open),true);
    assert.equal(await active(),'first','popup focus resumes after the later modal closes');
    await page.evaluate(()=>{tip.dismiss();document.querySelector('#dialog').remove();});
    assert.deepEqual(errors,[]);
    console.log('Tooltip focus: native focusable/forced/disabled-input rules, nested shadow/slot action traversal, live disabled controls, Escape down/up, focus restoration/disposal, outside pointer consumption/pass-through, custom dismissal, preserved manual state and later-modal ownership passed.');
  } finally {await page.close();}

  const moving=await browser.newPage({viewport:{width:960,height:800},reducedMotion:'reduce'});
  try {
    await moving.goto(base+'/test/browser/fixtures/toolbars.html');
    await moving.evaluate(async()=>{await customElements.whenDefined('md-tooltip');document.querySelector('#fixture').innerHTML='<div id="wrapper" style="position:fixed;left:150px;top:300px"><button id="anchor">Info</button></div><md-tooltip id="tip" for="anchor" text="Moving anchor" caret is-persistent enable-user-input="false"></md-tooltip>';window.tip=document.querySelector('#tip');tip.show().catch(()=>{});});
    const sample=()=>moving.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{const n=document.querySelector('#tip'),r=n.target.getBoundingClientRect();resolve({anchor:n._positionInput.anchor,rect:{left:Math.round(r.left),top:Math.round(r.top),right:Math.round(r.right),bottom:Math.round(r.bottom)},point:n._positionResult});}))));
    const initial=await sample();
    await moving.evaluate(()=>document.querySelector('#wrapper').style.transform='translate(93px, 47px)');
    const transformed=await sample();assert.deepEqual(transformed.anchor,transformed.rect);assert.notDeepEqual(transformed.point,initial.point);
    await moving.evaluate(()=>{window.animation=document.querySelector('#wrapper').animate([{transform:'translate(93px, 47px)'},{transform:'translate(250px, -90px) scale(1.2)'}],{duration:500,fill:'forwards'});});
    for(let i=0;i<8;i++){const state=await sample();assert.deepEqual(state.anchor,state.rect,'WAAPI ancestor bounds are followed on visible frames');}
    await moving.evaluate(()=>animation.finished);const end=await sample();assert.deepEqual(end.anchor,end.rect);assert.notDeepEqual(end.point,transformed.point);
    await moving.evaluate(()=>{window.layouts=0;const original=tip._layout.bind(tip);tip._layout=()=>{layouts++;original();};});
    for(let i=0;i<5;i++)await sample();assert.equal(await moving.evaluate(()=>layouts),0,'unchanged bounds skip layout and outline recomputation');
    await moving.evaluate(()=>tip.dismiss());assert.equal(await moving.evaluate(()=>tip._positionFrame),null,'hidden popup cancels position polling');
    await moving.evaluate(()=>{tip.show().catch(()=>{});tip.remove();});assert.equal(await moving.evaluate(()=>tip._positionFrame),null,'disconnect cancels position polling');
    console.log('Tooltip anchors: CSS/WAAPI ancestor translation/scale tracked while visible; unchanged bounds skip layout, and retirement/disposal cancel polling.');
  } finally {await moving.close();}

  const animated=await browser.newPage({viewport:{width:960,height:800}});
  try {
    await animated.addInitScript(()=>{window.focusTime=0;window.focusJobs=new Map();let id=0;performance.now=()=>focusTime;requestAnimationFrame=fn=>{const k=++id;focusJobs.set(k,fn);return k;};cancelAnimationFrame=k=>focusJobs.delete(k);window.focusFrame=time=>{focusTime=time;const jobs=[...focusJobs.values()];focusJobs.clear();for(const fn of jobs)fn(time);};});
    await animated.goto(base+'/test/browser/fixtures/toolbars.html');
    await animated.evaluate(async()=>{await customElements.whenDefined('md-tooltip');document.querySelector('#fixture').innerHTML='<button id="before">Before</button><button id="anchor">Info</button><md-tooltip id="tip" for="anchor" text="Help" focusable is-persistent enable-user-input="false"></md-tooltip>';document.querySelector('#before').focus();window.tip=document.querySelector('#tip');tip.show().catch(()=>{});focusFrame(1000);});
    await animated.keyboard.press('Escape');
    assert.deepEqual(await animated.evaluate(()=>[tip.open,tip.state.isVisible,tip._focusScope.active,tip.shadowRoot.activeElement===tip._tip]),[false,true,true,true],'explicit focusable window remains through native exit');
    await animated.evaluate(()=>focusFrame(1100));assert.equal(await animated.evaluate(()=>tip._focusScope.active),true);
    await animated.evaluate(()=>focusFrame(2000));assert.deepEqual(await animated.evaluate(()=>[tip.state.isVisible,tip._focusScope.active,document.activeElement.id]),[false,false,'before']);
    assert.equal(await animated.evaluate(()=>tip._positionFrame),null);
    console.log('Tooltip animated focus: explicit popup window/focus survives closing motion and retires with both native channels.');
  } finally {await animated.close();}

  const touch=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  try {
    await touch.goto(base+'/test/browser/fixtures/toolbars.html');
    await touch.evaluate(async()=>{await customElements.whenDefined('md-tooltip');document.querySelector('#fixture').innerHTML='<button id="anchor" style="position:fixed;left:100px;top:150px">Info</button><md-tooltip id="tip" for="anchor" text="Help" focusable is-persistent enable-user-input="false"></md-tooltip><button id="outside" style="position:fixed;left:200px;top:650px">Outside</button>';window.tip=document.querySelector('#tip');window.outside=document.querySelector('#outside');outside.clicks=0;outside.addEventListener('click',()=>outside.clicks++);tip.show().catch(()=>{});});
    await touch.touchscreen.tap(215,663);assert.deepEqual(await touch.evaluate(()=>[tip.open,outside.clicks]),[false,0]);
    await touch.evaluate(()=>{tip.focusable=false;tip.show().catch(()=>{});});
    await touch.touchscreen.tap(215,663);assert.deepEqual(await touch.evaluate(()=>[tip.open,outside.clicks]),[false,1]);
    await touch.evaluate(()=>{tip.focusable=true;tip.onDismissRequest=()=>tip.remove();tip.show().catch(()=>{});});
    await touch.touchscreen.tap(215,663);assert.equal(await touch.evaluate(()=>outside.clicks),1,'consumed touch stays consumed if dismissal callback disconnects popup');
    console.log('Tooltip touch: actual outside taps consume only for focusable windows, including immediate disconnection.');
  } finally {await touch.close();}
}
