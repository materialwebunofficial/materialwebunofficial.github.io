import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const fixtureRoot = new URL('../fixtures/androidx/navigation/', import.meta.url);
const source = fs.readFileSync(new URL('ShortNavigationBar.kt', fixtureRoot), 'utf8');
const itemSource = fs.readFileSync(new URL('NavigationItem.kt', fixtureRoot), 'utf8');
assert.ok(source.includes('Surface(color = containerColor, contentColor = contentColor, modifier = modifier)'));
assert.ok(source.includes('iconPosition: NavigationItemIconPosition = NavigationItemIconPosition.Top'));
assert.ok(source.includes('labelTextStyle = NavigationBarTokens.LabelTextFont.value'));
assert.ok(itemSource.includes('(totalIndicatorWidth * indicatorAnimationProgress).roundToInt()'));
const oracle = JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/motion/spring-oracle.json', import.meta.url)));
const manifest = JSON.parse(fs.readFileSync(new URL('sources.json', fixtureRoot)));
for (const [name, entry] of Object.entries(manifest.files)) {
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(name, fixtureRoot))).digest('hex'), entry.sha256, name);
}

export async function testNavigationParity(browser, base) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base, { waitUntil:'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await page.clock.install({ time:new Date('2026-10-02T10:00:00Z') });
    await page.clock.pauseAt(new Date('2026-10-02T10:00:01.008Z'));
    await page.evaluate(() => {
      const fixture = document.createElement('div');
      fixture.id = 'navigation-parity';
      fixture.setAttribute('data-motion-scheme', 'expressive');
      fixture.style.cssText = 'width:600px;position:relative';
      document.body.append(fixture);
      const el = document.createElement('md-navigation-bar');
      el.id = 'nav-parity'; el.style.width = '400px';
      el.items = [{icon:'home',label:'Home'}, {icon:'search',label:'Search'}, {icon:'library_books',label:'Library'}, {icon:'person',label:'Profile'}];
      fixture.append(el);
      el.addEventListener('change', event => { el._changes = [...(el._changes || []), event.detail.index]; });
    });
    const nav = page.locator('#nav-parity');
    const geometry = async () => nav.evaluate(el => {
      const bounds = node => {
        const r = node.getBoundingClientRect(), parent = node.parentElement.getBoundingClientRect();
        return {x:r.x-parent.x,y:r.y-parent.y,width:r.width,height:r.height};
      };
      return {height:el.getBoundingClientRect().height, shadow:getComputedStyle(el.shadowRoot.querySelector('.bar')).boxShadow,
        items:[...el.shadowRoot.querySelectorAll('.item')].map(button => ({
          button:bounds(button), indicator:bounds(button.querySelector('.indicator')), icon:bounds(button.querySelector('.icon')),
          label:button.querySelector('.label') ? bounds(button.querySelector('.label')) : null,
          ripple:bounds(button.querySelector('.ripple')), opacity:+getComputedStyle(button.querySelector('.indicator')).opacity,
          scale:getComputedStyle(button).scale, weight:button.querySelector('.label') && getComputedStyle(button.querySelector('.label')).fontWeight,
        }))};
    });
    let g = await geometry();
    assert.equal(g.height,64); assert.equal(g.shadow,'none');
    g.items.forEach((item, i) => {
      assert.deepEqual(item.button,{x:i*100,y:0,width:100,height:64});
      assert.deepEqual(item.icon,{x:38,y:10,width:24,height:24});
      assert.deepEqual(item.ripple,{x:22,y:6,width:56,height:32});
      assert.equal(item.indicator.width,i===0?56:0);
      assert.equal(item.opacity,i===0?1:0);
      assert.equal(item.label.y,42);assert.equal(item.label.height,16);
      assert.equal(item.weight,'500');assert.equal(item.scale,'none');
    });
    await nav.evaluate(el => el.vertical = true);
    assert.deepEqual(await geometry(),g,'vertical tokens never turn this into a rail');
    await nav.evaluate(el => el.tall = true);
    let tall = await geometry();
    assert.equal(tall.height,80);assert.equal(tall.items[0].icon.y,10);assert.equal(tall.items[0].label.y,42);
    await nav.evaluate(el => {el.tall=false;el.iconPosition='start';});
    g = await geometry();
    g.items.forEach(item => {
      assert.equal(item.ripple.height,40);assert.equal(item.ripple.y,12);
      assert.equal(item.ripple.width,Math.min(item.button.width,60+item.label.width));
      assert.equal(item.label.x-item.icon.x,28);
      assert.equal(item.icon.y,20);assert.equal(item.label.y,24);
    });
    // Known source arrangement percentages; short labels avoid intrinsic growth.
    for (const [count, padding, width] of [[3,120,120],[4,90,105],[5,60,96],[6,30,90],[7,0,85]]) {
      await nav.evaluate((el,count) => {
        el.style.width='600px';el.arrangement='centered';
        el.items=Array.from({length:count},()=>({icon:'home',label:'A'}));
      }, count);
      g=await geometry();
      g.items.forEach((item,i)=>assert.deepEqual(item.button,{x:padding+i*width,y:0,width,height:64},`centered ${count}`));
    }
    // A size change alone is laid out from the bar's resize observation, in
    // the next rendered frame before paint (as Compose measures in the next
    // frame). The page clock is paused, so this waits for real frames.
    const nextFrame=()=>page.waitForTimeout(50);
    await nav.evaluate(el => {el.items=Array.from({length:3},()=>({icon:'home',label:'A'}));el.style.width='603px';});
    await nextFrame();g=await geometry();g.items.forEach((item,i)=>assert.equal(item.button.x,121+i*120));
    await nav.evaluate(el=>el.style.width='300px');
    await nextFrame();g=await geometry();
    const grown=60+g.items[0].label.width, padding=60-3*Math.floor((grown-60)/2);
    g.items.forEach((item,i)=>assert.deepEqual(item.button,{x:padding+i*grown,y:0,width:grown,height:64},'centered intrinsic growth'));
    await nav.evaluate(el=>{el.dir='rtl';});
    g=await geometry();g.items.forEach((item,i)=>assert.equal(item.button.x,300-padding-(i+1)*grown));
    assert.equal(g.items[0].icon.x-(g.items[0].label.x+g.items[0].label.width),4,'logical start icon in RTL');
    await nav.evaluate(el=>{
      el.dir='ltr';el.iconPosition='top';el.arrangement='equal-weight';el.style.width='400px';
      el.items=[{icon:'home',label:'Home'},{icon:'search',label:'Search'},{icon:'mail'},{icon:'person',label:'Two\nlines'}];
    });
    g=await geometry();
    assert.equal(g.height,80,'shared intrinsic height');
    assert.equal(g.items[2].icon.y,28);assert.equal(g.items[2].ripple.y,24);
    assert.equal(g.items[3].label.height,32);assert.equal(g.items[0].ripple.y,6);
    // DefaultSpatial affects indicator width/alpha, independently of icons/labels.
    await nav.evaluate(el=>{
      el.items=[{icon:'home',label:'Home'},{icon:'search',label:'Search'},{icon:'mail',label:'Mail'},{icon:'person',label:'Profile'}];
      el.selected=1;
    });
    const sample = (from,to,time) => oracle.find(c=>c.stiffness===380&&c.dampingRatio===0.8&&c.from===from&&c.to===to&&c.velocity===0).samples.find(s=>s.time===time).position;
    let elapsed=0;
    for (const time of [16,32,64,80,128,160,192,224,256,320]) {
      await page.clock.runFor(time-elapsed);elapsed=time;
      g=await geometry();
      for (const [index,from,to] of [[0,1,0],[1,0,1]]) {
        const progress=sample(from,to,time), expectedWidth=Math.round(Math.fround(56*Math.max(0,progress)));
        assert.equal(g.items[index].indicator.width,expectedWidth,`indicator ${index} at ${time}ms`);
        assert.equal(g.items[index].indicator.x,Math.floor((100-expectedWidth)/2));
        assert.ok(Math.abs(g.items[index].opacity-Math.max(0,Math.min(1,progress)))<1e-6);
        assert.deepEqual(g.items[index].icon,{x:38,y:10,width:24,height:24});
        assert.equal(g.items[index].ripple.width,56,'ripple bounds stay independent of indicator overshoot');
      }
    }
    await nav.evaluate(el=>{el.selected=0;el._records.forEach(r=>r.motion.finish());el.selected=1;});
    await page.clock.runFor(80);
    const interrupt = await nav.evaluate(el=>{
      const motion=el._records[1].motion,current=motion.channels.progress.sample(performance.now());
      el.selected=0;
      return {current,from:motion.channels.progress.animation.from,velocity:motion.channels.progress.animation.velocity};
    });
    assert.equal(interrupt.from,interrupt.current.position);assert.equal(interrupt.velocity,interrupt.current.velocity);
    await page.clock.runFor(640);
    await page.emulateMedia({reducedMotion:'reduce'});
    await nav.evaluate(el=>el.selected=1);
    g=await geometry();assert.equal(g.items[0].indicator.width,0);assert.equal(g.items[1].indicator.width,56);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await nav.evaluate(el=>{
      el.parentElement.setAttribute('data-motion-scheme','standard');el.selected=2;
    });
    assert.equal(await nav.evaluate(el=>el._records[2].motion.channels.progress.animation.stiffness),700);
    await page.clock.runFor(640);
    // Disabled content has alpha.38; the selected indicator retains full fill.
    const colors=await nav.evaluate(el=>{
      el.selected=0;
      el.items=[{icon:'home',label:'Home',disabled:true},{icon:'search',label:'Search'},{icon:'mail',label:'Mail',enabled:false},{icon:'person',label:'Profile'}];
      const r=el._records[0];
      const probe=document.createElement('span');document.body.append(probe);
      probe.style.color='color-mix(in srgb, var(--md-sys-color-on-surface-variant) 38%, transparent)';
      const expected=getComputedStyle(probe).color;
      const result={icon:getComputedStyle(r.icon).color,label:getComputedStyle(r.label).color,
        opacity:getComputedStyle(r.button).opacity,indicator:+getComputedStyle(r.indicator).opacity,
        expected,tabs:el._records.map(r=>r.button.tabIndex)};
      probe.remove();return result;
    });
    assert.equal(colors.icon,colors.expected);assert.equal(colors.label,colors.expected);
    assert.equal(colors.opacity,'1');assert.equal(colors.indicator,1);assert.deepEqual(colors.tabs,[-1,0,-1,-1]);
    for (const mode of ['light','dark']) {
      for (const position of ['top','start']) {
        const state=await nav.evaluate((el,{mode,position})=>{
          document.documentElement.setAttribute('data-theme',mode);el.iconPosition=position;
          el._records.forEach(r=>r.motion.finish());
          const button=el._records[0],other=el._records[1],probe=document.createElement('span');document.body.append(probe);
          const resolve=value=>{probe.style.color=value;return getComputedStyle(probe).color;};
          const disabled=resolve('color-mix(in srgb, var(--md-sys-color-on-surface-variant) 38%, transparent)');
          const result=[getComputedStyle(button.icon).color===disabled,getComputedStyle(button.label).color===disabled,
            getComputedStyle(button.indicator).backgroundColor===resolve('var(--md-sys-color-secondary-container)'),
            getComputedStyle(other.label).color===resolve('var(--md-sys-color-on-surface-variant)')];
          el.selected=1;el._records.forEach(r=>r.motion.finish());
          result.push(getComputedStyle(other.icon).color===resolve('var(--md-sys-color-on-secondary-container)'),
            getComputedStyle(other.label).color===resolve(`var(--md-sys-color-${position==='top'?'secondary':'on-secondary-container'})`),
            getComputedStyle(other.label).fontWeight==='500');
          el.selected=0;el._records.forEach(r=>r.motion.finish());
          probe.remove();return result;
        },{mode,position});
        assert.deepEqual(state,[true,true,true,true,true,true,true],`${mode}/${position} role table`);
      }
    }
    // Manual web tab activation, RTL traversal, skipped disabled entries, Home/End.
    await nav.locator('.item').nth(1).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await nav.evaluate(el=>el.shadowRoot.activeElement.dataset.index),'3');
    assert.equal(await nav.evaluate(el=>el.selected),0);
    await page.keyboard.press('Space');
    assert.equal(await nav.evaluate(el=>el.selected),3);
    assert.deepEqual(await nav.evaluate(el=>el._changes),[3]);
    await nav.evaluate(el=>el.dir='rtl');
    await page.keyboard.press('ArrowRight');
    assert.equal(await nav.evaluate(el=>el.shadowRoot.activeElement.dataset.index),'1');
    await page.keyboard.press('Enter');
    assert.deepEqual(await nav.evaluate(el=>el._changes),[3,1]);
    await page.keyboard.press('End');assert.equal(await nav.evaluate(el=>el.shadowRoot.activeElement.dataset.index),'3');
    await page.keyboard.press('Home');assert.equal(await nav.evaluate(el=>el.shadowRoot.activeElement.dataset.index),'1');
    const preserved=await nav.evaluate(el=>{
      const button=el.shadowRoot.activeElement;el.containerColor='rgb(10, 20, 30)';el.contentColor='rgb(40, 50, 60)';el.iconPosition='start';
      return [el.shadowRoot.activeElement===button,getComputedStyle(el.shadowRoot.querySelector('.bar')).backgroundColor,
        getComputedStyle(el._records[1].ripple).color];
    });
    assert.deepEqual(preserved,[true,'rgb(10, 20, 30)','rgb(40, 50, 60)']);
    await nav.evaluate(el=>{
      el.containerColor=null;el.contentColor='bad-color';el.setAttribute('aria-label','Destinations');
      el.disabled=true;el._records[3].button.click();
    });
    assert.equal(await nav.evaluate(el=>el.selected),1);
    assert.ok(await nav.evaluate(el=>el._records.every(r=>r.button.disabled&&r.button.tabIndex===-1)));
    assert.equal(await nav.locator('.items').getAttribute('aria-label'),'Destinations');
    await nav.evaluate(el=>el.disabled=false);
    // Cancel press does not commit selection or scale anything.
    const canceled=await nav.evaluate(el=>{
      const r=el._records[3];
      r.button.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:88,pointerType:'mouse',isPrimary:true,button:0}));
      const pressed=r.button.classList.contains('pressed'),scale=getComputedStyle(r.button).scale;
      r.button.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:88}));r.button.click();
      return {pressed,scale,selected:el.selected,released:!r.button.classList.contains('pressed')};
    });
    assert.deepEqual(canceled,{pressed:true,scale:'none',selected:1,released:true});
    const lifecycle=await nav.evaluate(el=>{
      const motions=el._records.map(r=>r.motion),parent=el.parentElement;el.remove();
      const disposed=motions.every(m=>m.raf===null)&&el._resizeObserver===null&&el._themeCleanup===null;
      parent.append(el);el._records[3].button.click();
      return {disposed,newMotion:el._records[0].motion!==motions[0],changes:el._changes};
    });
    assert.deepEqual(lifecycle,{disposed:true,newMotion:true,changes:[3,1,3]});
    await nav.evaluate(el=>{el.items=[null,4,[],{icon:'home',label:'<img src=x onerror=alert(1)>'}];});
    assert.equal(await nav.locator('.item').count(),1);assert.equal(await nav.locator('img').count(),0);
    await nav.evaluate(el=>el.setAttribute('items','invalid json'));
    assert.equal(await nav.locator('.item').count(),0);assert.equal((await geometry()).height,64);
    assert.deepEqual(errors,[]);
  } finally {await page.close();}
}

export async function testNavigationShowcase(page, base) {
  await page.setViewportSize({width:390,height:844});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  const navigation=page.locator('md-navigation-bar.mobile-bottom-nav');
  assert.equal(await navigation.evaluate(el=>el.getBoundingClientRect().height),64);
  assert.equal(await navigation.evaluate(el=>el.selected),0);
  await navigation.getByRole('tab',{name:'Components',exact:true}).click();
  assert.equal(await page.evaluate(()=>document.body.dataset.activeTab),'components');
  assert.equal(await navigation.evaluate(el=>el.selected),2);
  assert.equal(new URL(page.url()).hash,'#components');
  await navigation.getByRole('tab',{name:'Get started',exact:true}).focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.body.dataset.activeTab),'get-started');
  assert.equal(new URL(page.url()).hash,'#get-started');
  await page.evaluate(()=>document.querySelector('md-navigation-rail.app-nav-rail').shadowRoot.querySelector('[data-index="0"]').click());
  assert.equal(await navigation.evaluate(el=>el.selected),0,'desktop navigation also updates mobile selection');
  await page.goto(base+'/#nav-bar',{waitUntil:'domcontentloaded'});
  assert.equal(await navigation.evaluate(el=>el.selected),2,'direct catalogue anchor selects Components');
  await page.setViewportSize({width:840,height:1000});
  assert.equal(await navigation.evaluate(el=>getComputedStyle(el).display),'none');
  const rail=page.locator('md-navigation-rail.app-nav-rail');
  assert.equal(await rail.evaluate(el=>el.getBoundingClientRect().width),96);
  await rail.getByRole('tab',{name:'Home',exact:true}).click();
  assert.equal(await page.evaluate(()=>document.body.dataset.activeTab),'home');
  assert.equal(await navigation.evaluate(el=>el.selected),0);
  await rail.getByRole('tab',{name:'Components',exact:true}).focus();
  await page.keyboard.press('Enter');
  assert.equal(await navigation.evaluate(el=>el.selected),2);
  const demo=page.locator('#wide-rail-demo');
  await page.locator('[data-toggle-rail="wide-rail-demo"]').click();
  assert.equal(await demo.evaluate(el=>el.expanded),true);
  await page.waitForTimeout(700);
  assert.equal(await demo.evaluate(el=>el.getBoundingClientRect().width),220);
  assert.equal(await page.locator('[data-toggle-rail="wide-rail-demo"]').textContent(),'Collapse rail');
  await page.locator('[data-toggle-rail="wide-rail-demo"]').click();
  await page.waitForTimeout(700);
  assert.equal(await demo.evaluate(el=>el.getBoundingClientRect().width),96);
  const drawerDemo=page.locator('#modal-drawer-demo');
  const drawerOpener=page.locator('[data-open-drawer="modal-drawer-demo"]');
  await drawerOpener.click();
  assert.equal(await drawerDemo.evaluate(el=>el.open&&el._layer.open),true);
  await page.waitForTimeout(800);
  assert.equal(await drawerDemo.locator('.drawer').evaluate(el=>el.getBoundingClientRect().width),360);
  await page.screenshot({path:'research/navigation-drawer-modal-840.png'});
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.getElementById('modal-drawer-demo')._layer.open);
  assert.ok(await drawerOpener.evaluate(el=>document.activeElement===el));
  await page.locator('#nav-drawer').screenshot({path:'research/navigation-drawer-standard-840.png'});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await navigation.evaluate(el=>el.getBoundingClientRect().height),64);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await drawerOpener.click();await page.waitForTimeout(800);
  const modalBounds=await drawerDemo.locator('.drawer').evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x,width:r.width,height:r.height};});
  assert.deepEqual(modalBounds,{x:0,width:360,height:844});
  await page.screenshot({path:'research/navigation-drawer-modal-390.png'});
  await page.locator('[data-close-drawer="modal-drawer-demo"]').click();
  await page.waitForFunction(()=>!document.getElementById('modal-drawer-demo')._layer.open);
}


export async function testCatalogueDrawer(page, base) {
  await page.setViewportSize({width:390,height:844});
  // A fresh document: the same URL with only a fragment would not reload it.
  await page.goto('about:blank');
  await page.goto(base+'/#components',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>customElements.get('md-navigation-drawer')&&document.getElementById('components-sub-nav')._records?.length>0);
  const drawer=page.locator('#components-sub-nav');
  const mobileOpener=page.locator('#mobile-drawer-toggle');
  const railOpener=page.locator('#rail-drawer-toggle');
  // Closed once the exit motion has finished and the modal layer has returned focus.
  const closed=()=>page.waitForFunction(()=>{const d=document.getElementById('components-sub-nav');return !d.open&&!d._layer?.open;});
  const bounds=()=>drawer.locator('.drawer').evaluate(el=>{
    const r=el.getBoundingClientRect(),s=getComputedStyle(el);
    return {x:Math.round(r.x),y:r.y,width:r.width,height:r.height,border:s.borderWidth,shadow:s.boxShadow};
  });
  const indexOf=value=>drawer.evaluate((el,value)=>el.items.findIndex(item=>item.value===value),value);
  // Catalog data: destinations grouped under Material component category headlines.
  assert.deepEqual(await drawer.evaluate(el=>el.items.filter(item=>item.section).map(item=>item.section)),
    ['Actions','Communication','Containment','Navigation','Selection','Text inputs','Styles']);
  assert.equal(await drawer.evaluate(el=>el.shadowRoot.querySelectorAll('.section').length),7);
  assert.equal(await drawer.evaluate(el=>el.items.filter(item=>item.value).every(item=>document.getElementById(item.value))),true,'every catalog destination exists');
  await mobileOpener.click();
  await page.waitForTimeout(800);
  assert.equal(await drawer.evaluate(el=>el.variant),'modal');
  assert.equal(await drawer.evaluate(el=>el.selected),await indexOf('overview'));
  assert.deepEqual(await bounds(),{x:0,y:0,width:360,height:844,border:'0px',shadow:'none'});
  assert.equal(await mobileOpener.locator('button').getAttribute('aria-expanded'),'true');
  const row=drawer.getByRole('tab',{name:'Buttons',exact:true});
  assert.deepEqual(await row.evaluate(el=>{const s=getComputedStyle(el);return {
    height:el.getBoundingClientRect().height,size:s.fontSize,weight:s.fontWeight,line:s.lineHeight,tracking:s.letterSpacing};
  }),{height:56,size:'16px',weight:'400',line:'24px',tracking:'0.5px'});
  await page.screenshot({path:'research/catalogue-drawer-modal-390.png'});
  await page.keyboard.press('Escape');await closed();
  assert.equal(await mobileOpener.locator('button').getAttribute('aria-expanded'),'false');
  assert.equal(await mobileOpener.evaluate(el=>document.activeElement===el),true);
  await mobileOpener.click();await page.waitForTimeout(800);
  await page.mouse.click(378,400);await closed();
  await mobileOpener.click();await page.waitForTimeout(800);
  await row.click();await closed();
  assert.equal(new URL(page.url()).hash,'#buttons');
  assert.equal(await drawer.evaluate(el=>el.selected),await indexOf('buttons'));
  assert.equal(await page.locator('md-navigation-bar.mobile-bottom-nav').evaluate(el=>el.selected),2);
  await page.setViewportSize({width:840,height:1000});
  await railOpener.click();await page.waitForTimeout(800);
  assert.deepEqual(await bounds(),{x:0,y:0,width:360,height:1000,border:'0px',shadow:'none'});
  assert.equal(await railOpener.locator('.btn').getAttribute('aria-expanded'),'true');
  assert.equal(await railOpener.locator('.btn').evaluate(b=>b.ariaControlsElements?.map(n=>n.id).join(' ')),'components-sub-nav');
  await page.screenshot({path:'research/catalogue-drawer-modal-840.png'});
  await drawer.getByRole('tab',{name:'Chips',exact:true}).click();await closed();
  assert.equal(new URL(page.url()).hash,'#chips');
  await page.setViewportSize({width:1440,height:1000});
  await page.waitForFunction(()=>document.getElementById('components-sub-nav').variant==='dismissible');
  await page.waitForTimeout(800);
  assert.equal(await drawer.evaluate(el=>el.open),true,'large windows dock the catalog beside the content');
  assert.deepEqual(await bounds(),{x:96,y:0,width:360,height:1000,border:'0px',shadow:'none'});
  assert.equal(await page.locator('.main').evaluate(el=>Math.round(el.getBoundingClientRect().x)),456);
  assert.equal(await railOpener.locator('.btn').getAttribute('aria-expanded'),'true');
  for(const theme of ['dark','light']) {
    if(await page.evaluate(()=>document.documentElement.dataset.theme)!==theme) await page.locator('#rail-theme-toggle').click();
    await page.waitForTimeout(350);
    assert.equal(await drawer.locator('.drawer').evaluate(el=>{
      const probe=document.createElement('div');probe.style.background='var(--md-sys-color-surface)';el.append(probe);
      const expected=getComputedStyle(probe).backgroundColor;probe.remove();return getComputedStyle(el).backgroundColor===expected;
    }),true,'docked drawer uses Surface in '+theme);
  }
  await page.screenshot({path:'research/catalogue-drawer-docked-1440.png'});
  await page.evaluate(()=>document.documentElement.dir='rtl');
  await page.waitForTimeout(100);
  assert.deepEqual(await bounds(),{x:984,y:0,width:360,height:1000,border:'0px',shadow:'none'});
  assert.equal(await page.locator('md-navigation-rail.app-nav-rail').evaluate(el=>el.getBoundingClientRect().x),1344);
  assert.equal(await page.locator('.main').evaluate(el=>Math.round(el.getBoundingClientRect().right)),984);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.evaluate(()=>document.documentElement.removeAttribute('dir'));
  await railOpener.click();await closed();await page.waitForTimeout(800);
  assert.equal(await page.locator('.main').evaluate(el=>Math.round(el.getBoundingClientRect().x)),96,'collapsing the docked catalog gives its width to the content');
  await railOpener.click();await page.waitForTimeout(800);
  assert.equal(await page.locator('.main').evaluate(el=>Math.round(el.getBoundingClientRect().x)),456);
  await page.setViewportSize({width:1199,height:1000});
  await page.waitForFunction(()=>document.getElementById('components-sub-nav').variant==='modal');
  await page.evaluate(()=>document.documentElement.dir='rtl');
  await railOpener.click();await page.waitForTimeout(800);
  assert.deepEqual(await bounds(),{x:839,y:0,width:360,height:1000,border:'0px',shadow:'none'});
  await page.keyboard.press('Escape');await closed();
  await page.evaluate(()=>document.documentElement.removeAttribute('dir'));
  await page.locator('md-navigation-rail.app-nav-rail').getByRole('tab',{name:'Home',exact:true}).click();
  await page.setViewportSize({width:1440,height:1000});
  await page.waitForTimeout(300);
  assert.equal(await drawer.evaluate(el=>el.variant),'modal','other views keep the catalog as a modal sheet');
  assert.equal(await page.locator('.main').evaluate(el=>Math.round(el.getBoundingClientRect().x)),96);
  assert.equal(await page.locator('#ambientWaveCanvas').count(),1);
}
