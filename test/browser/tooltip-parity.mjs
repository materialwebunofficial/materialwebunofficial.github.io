import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
const oracle=JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/tooltip/oracle.json.gz',import.meta.url))));
const spring=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/motion/spring-oracle.json',import.meta.url)),(_,v)=>typeof v==='number'?Math.fround(v):v);
const interrupted=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/snackbar/motion-oracle.json',import.meta.url)),(_,v)=>typeof v==='number'?Math.fround(v):v);

export async function testTooltipParity(browser,base) {
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.goto(base+'/test/browser/fixtures/toolbars.html');
    await page.evaluate(async()=>{await customElements.whenDefined('md-tooltip');await document.fonts.ready;document.querySelector('#fixture').innerHTML='<md-theme id="scope"><button id="anchor" aria-describedby="existing">Info</button><md-tooltip id="tip" for="anchor" text="Help" caret></md-tooltip></md-theme>';});
    const tip=page.locator('#tip'),anchor=page.locator('#anchor');
    await anchor.hover();assert.equal(await tip.evaluate(n=>n.open),true);
    const roles=await tip.evaluate(n=>{
      const style=getComputedStyle(n._tip),probe=n._probe,resolve=value=>{probe.style.color=value;return getComputedStyle(probe).color;};
      return {fill:n._path.getAttribute('fill'),color:style.color,expectedFill:resolve('var(--md-sys-color-inverse-surface)'),expectedColor:resolve('var(--md-sys-color-inverse-on-surface)'),shadow:n._shadow.layer.style.display,size:[n._tip.offsetWidth,n._tip.offsetHeight],described:n.target.getAttribute('aria-describedby'),pane:n._tip.getAttribute('aria-label')};
    });
    assert.equal(roles.fill,roles.expectedFill);assert.equal(roles.color,roles.expectedColor);assert.equal(roles.shadow,'none');assert.equal(roles.size[1],24);assert.ok(roles.size[0]>=40);assert.equal(roles.described,'existing tip');assert.equal(roles.pane,'Tooltip');
    const cases=oracle.positions.filter(c=>c.input.window.width===390&&c.input.window.height===844&&c.input.spacing===4&&c.input.anchor.left<1000);
    const actual=await page.evaluate(cases=>{
      const n=document.querySelector('#tip'),a=document.querySelector('#anchor'),results=[];a.style.cssText='position:fixed;padding:0;border:0;';
      for(const c of cases){const i=c.input;a.style.left=i.anchor.left+'px';a.style.top=i.anchor.top+'px';a.style.width=(i.anchor.right-i.anchor.left)+'px';a.style.height=(i.anchor.bottom-i.anchor.top)+'px';n.style.direction=i.rtl?'rtl':'ltr';n.placement=i.placement;n._tip.style.maxWidth='none';n._tip.style.minWidth='0px';n._tip.style.minHeight='0px';n._tip.style.width=i.popup.width+'px';n._tip.style.height=i.popup.height+'px';n._layout({measureContent:false});results.push({...n._positionResult});}
      n._tip.style.width='';n._tip.style.height='';n._tip.style.minWidth='';n._tip.style.minHeight='';a.style.cssText='';n.placement='top';n.style.direction='';n._sync();n._layout();return results;
    },cases);
    for(let i=0;i<cases.length;i++)assert.deepEqual(actual[i],cases[i].expected,JSON.stringify(cases[i].input));
    await tip.evaluate(n=>{n.text='<img src=x onerror="window.bad=true">';});assert.equal(await tip.evaluate(n=>n._body.querySelectorAll('img').length),0);
    await tip.evaluate(n=>{n.text='';});assert.equal(await tip.evaluate(n=>n.shadowRoot.querySelector('.text').textContent),'');
    await tip.evaluate(n=>{n.text='This deliberately long label wraps into several lines at the native 200 dp maximum width.';});assert.ok(await tip.evaluate(n=>n._tip.offsetWidth<=200&&n._tip.offsetHeight>24));
    await tip.evaluate(n=>{n.variant='rich';n.headline='Context';n.text='A supporting message';n.insertAdjacentHTML('beforeend','<md-button slot="action" variant="text" label="Read more"></md-button>');n.hasAction=true;n.isPersistent=true;});
    await page.waitForFunction(()=>!document.querySelector('#tip')._actions.hidden);
    await anchor.focus();await page.keyboard.press('Tab');assert.equal(await tip.locator('[slot="action"]').evaluate(n=>n.matches(':focus-within')),true);
    const rich=await tip.evaluate(n=>{
      n._layout();const p=n._probe,resolve=v=>{p.style.color=v;return getComputedStyle(p).color;};
      return {head:getComputedStyle(n._head).color,expected:resolve('var(--md-sys-color-on-surface-variant)'),baseline:n._head.offsetTop+n._titleLeaf.offsetTop+n._head.querySelector('.baseline').offsetTop,bodyBaseline:n._bodyBox.offsetTop+n._textLeaf.offsetTop+n._body.querySelector('.baseline').offsetTop-(n._head.offsetTop+n._head.offsetHeight),shadow:n._shadow.layer.style.display,actions:[n._actions.offsetHeight,n._actions.offsetLeft]};
    });
    assert.equal(rich.head,rich.expected);assert.equal(rich.baseline,28);assert.equal(rich.bodyBaseline,24);assert.equal(rich.shadow,'block');assert.ok(rich.actions[0]>=36);assert.equal(rich.actions[1],16);
    await page.keyboard.press('Escape');assert.equal(await tip.evaluate(n=>n.open),false);
    await tip.evaluate(n=>{n.headline=null;n.text='Updated';n.variant='plain';n.isPersistent=false;n.enableUserInput=false;n.dismiss();});
    await anchor.dispatchEvent('pointerenter',{pointerType:'mouse'});assert.equal(await tip.evaluate(n=>n.open),false);
    await page.mouse.move(389,843);await anchor.evaluate(n=>n.blur());
    await tip.evaluate(n=>{n.enableUserInput=true;n.longPressTimeoutMillis=500;});
    await page.clock.install({time:new Date(0)});await page.clock.pauseAt(new Date(1000));
    await anchor.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:8});await page.clock.runFor(499);assert.equal(await tip.evaluate(n=>n.open),false);
    await page.clock.runFor(1);assert.equal(await tip.evaluate(n=>n.open),true);
    await anchor.dispatchEvent('pointerup',{pointerType:'touch',pointerId:8});await page.clock.runFor(1499);assert.equal(await tip.evaluate(n=>n.open),true);
    await page.clock.runFor(1);assert.equal(await tip.evaluate(n=>n.open),false);
    await anchor.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:18});await page.clock.runFor(2000);assert.equal(await tip.evaluate(n=>n.open),true);
    await anchor.dispatchEvent('pointerup',{pointerType:'touch',pointerId:18});assert.equal(await tip.evaluate(n=>n.open),false);
    await anchor.evaluate(n=>{n._clicked=0;n.addEventListener('click',()=>n._clicked++);});await anchor.dispatchEvent('click',{detail:1});assert.equal(await anchor.evaluate(n=>n._clicked),0);
    await anchor.dispatchEvent('pointerdown',{pointerType:'pen',pointerId:9});await page.clock.runFor(100);await anchor.dispatchEvent('pointercancel',{pointerType:'pen',pointerId:9});await page.clock.runFor(500);assert.equal(await tip.evaluate(n=>n.open),false);
    await tip.evaluate(n=>{n.containerColor='rgba(10,20,30,.5)';n.contentColor='rgb(41 51 61)';n.shape={type:'cut',corners:8};n.open=true;});
    assert.equal(await tip.evaluate(n=>getComputedStyle(n._tip).color),'rgb(41, 51, 61)');assert.equal(await tip.evaluate(n=>n._path.getAttribute('fill')),'rgba(10, 20, 30, 0.5)');assert.match(await tip.evaluate(n=>n._surface.style.clipPath),/^polygon/);
    await tip.evaluate(n=>{n.target=document.querySelector('#anchor');});assert.equal(await anchor.getAttribute('aria-describedby'),'existing tip');
    await tip.evaluate(n=>{n.open=true;n.maxWidth=0;n._layout();});assert.equal(await tip.evaluate(n=>n._tip.offsetWidth),0);assert.equal(await tip.evaluate(n=>n._tip.hidden),false);
    await tip.evaluate(n=>{n.maxWidth=null;n.containerColor=null;n.contentColor=null;n.shape=null;const parent=n.parentNode;n.remove();parent.append(n);});
    assert.equal(await tip.evaluate(n=>n.open),false);assert.equal(await anchor.getAttribute('aria-describedby'),'existing tip');
    await tip.evaluate(n=>n.remove());assert.equal(await anchor.getAttribute('aria-describedby'),'existing');
    await page.evaluate(()=>{document.querySelector('#fixture').innerHTML='<md-theme lang="tr"><md-snackbar id="snack" message="Kaydedildi" with-dismiss-action duration="indefinite"></md-snackbar></md-theme>';document.querySelector('#snack').show();});
    const snack=page.locator('#snack');assert.equal(await snack.evaluate(n=>n._records.get(n._current).dismiss.getAttribute('aria-label')),'Kapat');
    await snack.evaluate(n=>n._records.get(n._current).dismiss.shadowRoot.querySelector('button').focus());
    assert.equal(await snack.evaluate(n=>n._records.get(n._current).tooltip.open),true);
    await page.keyboard.press('Escape');assert.equal(await snack.evaluate(n=>n.open),true);assert.equal(await snack.evaluate(n=>n._records.get(n._current).tooltip.open),false);
    await page.keyboard.press('Escape');assert.equal(await snack.evaluate(n=>n.open),false);
    assert.deepEqual(errors,[]);
    console.log(`Tooltip browser: ${cases.length} native edge/RTL positions, default roles/sizes/shadows, rich baselines/action keyboard focus, wrapping/safe updates, input enablement, native long-press duration/cancellation, custom colors/shapes, description cleanup and localized snackbar tooltip/Escape passed.`);
  } finally {await page.close();}
  const animated=await browser.newPage({viewport:{width:960,height:800}});
  try {
    await animated.addInitScript(()=>{window.tipTime=0;window.tipJobs=new Map();let id=0;performance.now=()=>window.tipTime;requestAnimationFrame=fn=>{const k=++id;window.tipJobs.set(k,fn);return k;};cancelAnimationFrame=k=>window.tipJobs.delete(k);window.tipFrame=time=>{window.tipTime=time;const jobs=[...window.tipJobs.values()];window.tipJobs.clear();for(const fn of jobs)fn(time);};});
    await animated.goto(base+'/test/browser/fixtures/toolbars.html');await animated.evaluate(async()=>{await customElements.whenDefined('md-tooltip');});
    let frames=0;
    for(const scheme of ['expressive','standard'])for(const entering of [true,false]){
      await animated.evaluate(({scheme,entering})=>{document.querySelector('#fixture').innerHTML=`<md-theme motion-scheme="${scheme}"><button id="anchor">Info</button><md-tooltip id="tip" for="anchor" text="Help"></md-tooltip></md-theme>`;window.tipTime=0;const n=document.querySelector('#tip');n._state.transition.targetState=true;if(!entering){window.tipFrame(2000);window.tipTime=0;n.dismiss();}}, {scheme,entering});
      const spatial=scheme==='expressive'?{stiffness:800,dampingRatio:Math.fround(.6)}:{stiffness:1400,dampingRatio:Math.fround(.9)},effects={stiffness:3800,dampingRatio:1};
      const native=(from,to,s)=>spring.find(c=>c.from===Math.fround(from)&&c.to===Math.fround(to)&&c.velocity===0&&c.stiffness===s.stiffness&&c.dampingRatio===s.dampingRatio);
      const scale=native(entering?.8:1,entering?1:.8,spatial),alpha=native(entering?0:1,entering?1:0,effects);
      assert.ok(scale&&alpha);
      const times=[...new Set([...scale.samples,...alpha.samples].map(s=>s.time))].sort((a,b)=>a-b);
      for(const time of times){
        const actual=await animated.evaluate(time=>{window.tipFrame(time);const n=document.querySelector('#tip');return {scale:n._motion.channels.scale.sample(window.tipTime).position,alpha:n._motion.channels.alpha.sample(window.tipTime).position,hidden:n._tip.hidden};},time);
        for(const [key,c] of [['scale',scale],['alpha',alpha]]){const expected=c.samples.find(f=>f.time===time);if(expected)assert.ok(Math.abs(actual[key]-expected.position)<2e-6,`${scheme}/${entering}/${key}@${time}`);}
        if(!entering){const done=time>=Math.max(scale.duration,alpha.duration);assert.equal(actual.hidden,done,'popup retires after both channels complete');}frames++;
      }
    }
    for(const c of interrupted){
      await animated.evaluate(({scheme,cut})=>{document.querySelector('#fixture').innerHTML=`<md-theme motion-scheme="${scheme}"><button id="anchor">Info</button><md-tooltip id="tip" for="anchor" text="Help"></md-tooltip></md-theme>`;window.tipTime=0;const n=document.querySelector('#tip');n._state.transition.targetState=true;window.tipFrame(cut);n.dismiss();},c);
      const times=[...new Set([...c.scale.frames,...c.alpha.frames].map(f=>f.time))].sort((a,b)=>a-b);
      for(const time of times){const actual=await animated.evaluate(time=>{window.tipFrame(time);const n=document.querySelector('#tip');return {...Object.fromEntries(['scale','alpha'].map(key=>[key,n._motion.channels[key].sample(window.tipTime)])),visible:n.state.isVisible,hidden:n._tip.hidden,inert:n._tip.inert,ariaHidden:n._tip.getAttribute('aria-hidden')};},c.cut+time);for(const key of ['scale','alpha']){const expected=c[key].frames.find(f=>f.time===time);if(expected)for(const field of ['position','velocity'])assert.ok(Math.abs(actual[key][field]-expected[field])<2e-5,`${key} interrupted ${c.cut}/${time}/${field}`);}const done=time>=Math.max(c.scale.duration,c.alpha.duration);assert.equal(actual.visible,!done,'interrupted exit retains currentState until both channels finish');assert.equal(actual.hidden,done);assert.equal(actual.inert,done);assert.equal(actual.ariaHidden,String(done));frames++;}
    }
    for(const c of oracle.transitions){
      await animated.evaluate(initial=>{document.querySelector('#fixture').innerHTML='<button id="anchor">Info</button><md-tooltip id="tip" for="anchor" text="Help"></md-tooltip>';window.tipTime=0;window.transitionTip=document.querySelector('#tip');window.transitionTip.state=new window.toolbarApi.TooltipState({initialIsVisible:initial});},c.initial);
      for(let i=0;i<c.events.length;i++){
        // "run" only changes the native host's bookkeeping flag. It is not a
        // channel/frame event; scalar frames are checked separately above.
        const actual=await animated.evaluate(op=>{const n=window.transitionTip;if(op==='true'||op==='false')n.state.transition.targetState=op==='true';if(op==='end')n._motion.finish();if(op==='dispose')n.remove();return {current:n.state.transition.currentState,target:n.state.transition.targetState,visible:n.state.isVisible};},c.events[i]);
        const {current,target,visible}=c.expected[i];assert.deepEqual(actual,{current,target,visible},`native transition ${JSON.stringify(c)} @${i}`);
      }
    }
    console.log(`Tooltip motion: ${frames} native FastSpatial/FastEffects frames including interrupted entry and both-channel retirement passed.`);
    console.log(`Tooltip transition: ${oracle.transitions.length} unchanged native updateTarget/end/dispose bookkeeping histories match actual renderer current/target/visible state.`);
  } finally {await animated.close();}
}

export async function testTooltipShowcase(browser,base){
  for(const width of [1440,390])for(const mode of ['light','dark']){
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
    try{await page.goto(base+'/#tooltips');await page.evaluate(async mode=>{await customElements.whenDefined('md-tooltip');await document.fonts.ready;document.documentElement.setAttribute('data-theme',mode);},mode);
      await page.locator('#btn-tip-1').hover();assert.equal(await page.locator('md-tooltip[for="btn-tip-1"]').evaluate(n=>n.open),true);
      await page.locator('#btn-tip-2').hover();assert.equal(await page.locator('md-tooltip[for="btn-tip-2"]').evaluate(n=>n.open),true);
      const result=await page.locator('md-tooltip[for="btn-tip-2"]').evaluate(n=>({x:n._positionResult.x,y:n._positionResult.y,width:n._tip.offsetWidth,height:n._tip.offsetHeight,window:innerWidth,windowH:innerHeight}));assert.ok(result.x>=0&&result.y>=0&&result.x+result.width<=result.window&&result.y+result.height<=result.windowH);
      await page.screenshot({path:`research/tooltip-showcase-${width}-${mode}.png`});
    }finally{await page.close();}
  }
  console.log('Tooltip showcase: plain/rich examples stay within the window at 1440/390 in light/dark.');
}
