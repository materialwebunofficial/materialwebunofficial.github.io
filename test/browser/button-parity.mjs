import assert from 'node:assert/strict';
import fs from 'node:fs';
import {testButtonComposition} from './button-composition.mjs';
import {testToggleButtonParity} from './toggle-button-parity.mjs';
import {testButtonElevationMotion} from './button-elevation.mjs';
import {testButtonSlotPointer} from './button-slot-pointer.mjs';
import {testButtonSurface} from './button-surface.mjs';
import {testButtonPointer} from './button-pointer.mjs';
import {testButtonStateLayer} from './button-state-layer.mjs';
import {testButtonKeyboard} from './button-keyboard.mjs';
const shapes=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/button/shape-oracle.json',import.meta.url)),(_,v)=>typeof v==='number'?Math.fround(v):v);
const defaults=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/button/layout-oracle.json',import.meta.url))).defaults;
const colors=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/button/color-oracle.json',import.meta.url)));
const sizes=['xs','s','m','l','xl'];
async function testButtonElevation(browser,base){
  const page=await browser.newPage({viewport:{width:960,height:800}});
  try{
    await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(async()=>{await customElements.whenDefined('md-button');await document.fonts.ready;});
    for(const variant of ['filled','tonal','elevated','outlined','text']){
      const name={filled:'FilledButton',tonal:'FilledTonalButton',elevated:'ElevatedButton'}[variant];
      const native=name?fs.readFileSync(new URL(`../fixtures/androidx/button/${name}Tokens.kt`,import.meta.url),'utf8'):'';
      const level=field=>name?Number(native.match(new RegExp(`\\b${field}:[^\\n]+\\s+get\\(\\) = ElevationTokens.Level(\\d)`))[1]):0;
      const expected={rest:level('ContainerElevation'),hover:level(variant==='tonal'?'HoverContainerElevation':'HoveredContainerElevation'),pressed:level('PressedContainerElevation'),disabled:0};
      await page.mouse.move(1,1);await page.evaluate(variant=>{document.querySelector('#fixture').innerHTML=`<md-button id="elevation" variant="${variant}" label="Explore components"></md-button>`;},variant);
      const button=page.locator('#elevation .btn');
      const verify=async state=>{
        await page.waitForFunction(()=>document.querySelector('#elevation')._elevationMotion.raf===null,null,{polling:20});
        const result=await button.evaluate((b,level)=>{const probe=document.createElement('span');probe.style.boxShadow=`var(--md-sys-elevation-level${level})`;b.parentNode.append(probe);const result={actual:getComputedStyle(b).boxShadow,expected:getComputedStyle(probe).boxShadow};probe.remove();return result;},expected[state]);
        assert.equal(result.actual,result.expected,`${variant}/${state} original elevation token`);
      };
      await verify('rest');await button.hover();await verify('hover');await page.mouse.down();await verify('pressed');await page.mouse.up();
      await page.locator('#elevation').evaluate(h=>h.disabled=true);await verify('disabled');
    }
    console.log('Button elevation: five variants/rest-hover-real primary press-disabled match original default token levels; Filled hover correctly raises 0→1dp.');
  }finally{await page.close();}
}
async function layoutCases(browser,base,visit){
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(async()=>{await customElements.whenDefined('md-button');await document.fonts.ready;});let index=0;
    for(const rtl of [false,true])for(const size of sizes)for(const variant of ['filled','outlined','text'])for(const config of [{label:''},{label:'Material'},{label:'Material',leading:true,trailing:true},{label:'First line\nSecond line',font:true}]){
      await page.evaluate(({rtl,size,variant,config})=>{
        const fixture=document.querySelector('#fixture');fixture.replaceChildren();const host=document.createElement('md-button');host.id='button';host.dir=rtl?'rtl':'ltr';host.setAttribute('size',size);host.setAttribute('variant',variant);host.setAttribute('label',config.label);
        if(config.leading)host.setAttribute('icon','add');if(config.trailing)host.setAttribute('trailing-icon','arrow_forward');
        let style=document.querySelector('#button-fonts');if(!style){style=document.createElement('style');style.id='button-fonts';document.head.append(style);}
        style.textContent=config.font?'#button::part(button){font:500 14px/20px monospace !important;letter-spacing:0 !important}':'';
        fixture.append(host);if(config.font)host.shadowRoot.querySelector('.lbl').style.whiteSpace='pre-wrap';
      },{rtl,size,variant,config});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const result=await page.evaluate(()=>{
        const h=document.querySelector('#button'),b=h.shadowRoot.querySelector('.btn'),label=b.querySelector('.lbl'),root=b.getBoundingClientRect();
        const rect=n=>{const r=n.getBoundingClientRect();return{x:Math.round(r.left-root.left),y:Math.round(r.top-root.top),width:n.offsetWidth,height:n.offsetHeight};};
        const css=getComputedStyle(b);const text={width:label.offsetWidth,height:label.offsetHeight,first:0,last:0};
        return{input:{height:{xs:32,s:40,m:56,l:96,xl:136}[h.size],rtl:h.dir==='rtl',leading:!!h.icon,trailing:!!h.trailingIcon,text},rendered:{size:{width:b.offsetWidth,height:b.offsetHeight},text:rect(label),leading:h.icon?rect(b.querySelector('.lead-ico')):null,trailing:h.trailingIcon?rect(b.querySelector('.trail-ico')):null,host:{width:h.offsetWidth,height:h.offsetHeight},padding:[parseFloat(css.paddingLeft),parseFloat(css.paddingTop),parseFloat(css.paddingRight),parseFloat(css.paddingBottom)],border:parseFloat(css.borderWidth),outline:parseFloat(b.style.getPropertyValue('--_button-outline-width')),radius:parseFloat(css.borderTopLeftRadius)}};
      });
      const source=defaults[sizes.indexOf(size)];assert.deepEqual(result.rendered.padding,[source.start,source.vertical,source.end,source.vertical]);assert.equal(result.rendered.border,0,'Surface outline does not consume measurement space');assert.ok(result.rendered.size.width>=58);assert.ok(result.rendered.host.height>=48);assert.equal(result.rendered.outline,variant==='outlined'?size==='xl'?3:size==='l'?2:1:0);
      if(config.leading)assert.deepEqual([result.rendered.leading.width,result.rendered.leading.height],[source.icon,source.icon]);
      assert.equal(result.rendered.radius,Math.min(result.rendered.size.width,result.rendered.size.height)/2,'round shape follows actual resized bounds');
      await visit({index:index++,rtl,size,variant,config,...result});
    }assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
export async function captureButtonLayout(browser,base){const cases=[];await layoutCases(browser,base,c=>cases.push(c));fs.writeFileSync(new URL('../../research/button-browser-layout-inputs.json',import.meta.url),JSON.stringify(cases,null,2)+'\n');console.log(`Captured ${cases.length} real Button text/icon leaves for original native Row measurement.`);}
export async function testButtonParity(browser,base){
  await testButtonElevation(browser,base);
  const reference=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/button/browser-layout-oracle.json',import.meta.url)));let count=0;
  await layoutCases(browser,base,actual=>{const expected=reference[actual.index];assert.deepEqual(actual.input,expected.input);assert.deepEqual(actual.rendered.size,expected.expected.size,`${actual.size}/${actual.variant}/${actual.config.label} body size`);for(const id of ['text','leading','trailing'])assert.deepEqual(actual.rendered[id],expected.expected.placements[id]??null,`${actual.index}/${id} original center Row placement`);count++;});
  const page=await browser.newPage({viewport:{width:390,height:800},reducedMotion:'reduce',hasTouch:true});
  try{await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(async()=>{await customElements.whenDefined('md-button');document.querySelector('#fixture').innerHTML='<form id="form"><fieldset id="fieldset"><md-button id="button" toggle label="Save"><button id="slotted">Nested content</button></md-button></fieldset></form>';window.retainedSlot=document.querySelector('#button').shadowRoot.querySelector('slot');window.retainedLabel=document.querySelector('#button').shadowRoot.querySelector('.lbl');});
    assert.equal(await page.locator('#button').evaluate(n=>{n.focus();return n.shadowRoot.activeElement===n.shadowRoot.querySelector('.btn');}),true);
    await page.locator('#button').evaluate(n=>{n.click();});assert.equal(await page.locator('#button').evaluate(n=>n.selected),true);
    await page.locator('#button').evaluate(n=>{n.setAttribute('label','<img src=x onerror="window.bad=true">');n.setAttribute('icon','add');n.setAttribute('size','xs');});assert.equal(await page.locator('#button').evaluate(n=>n.shadowRoot.querySelectorAll('img').length),0);
    assert.deepEqual(await page.locator('#button').evaluate(n=>({label:n.shadowRoot.querySelector('.lbl')===window.retainedLabel,slot:n.shadowRoot.querySelector('slot')===window.retainedSlot,focused:n.shadowRoot.activeElement===n.shadowRoot.querySelector('.btn')})),{label:true,slot:true,focused:true});
    await page.locator('#fieldset').evaluate(n=>n.disabled=true);assert.equal(await page.locator('#button').evaluate(n=>n.disabled&&n.shadowRoot.querySelector('.btn').disabled),true);
    await page.locator('#button').evaluate(n=>n.click());assert.equal(await page.locator('#button').evaluate(n=>n.selected),true);await page.locator('#fieldset').evaluate(n=>n.disabled=false);
    await page.locator('#button').evaluate(n=>{n.removeAttribute('label');document.querySelector('#slotted').focus();n.setAttribute('trailing-icon','arrow_forward');n.setAttribute('size','s');});assert.equal(await page.locator('#slotted').evaluate(n=>n===document.activeElement),true,'slot content keeps focus through unrelated updates');
    for(const size of ['unknown','toString','__proto__'])assert.deepEqual(await page.locator('#button').evaluate((n,size)=>{n.setAttribute('size',size);n.setAttribute('variant','unknown');n.setAttribute('shape','unknown');n.setAttribute('type','unknown');return{size:n.size,variant:n.variant,shape:n.shape,type:n.type};},size),{size:'s',variant:'filled',shape:'round',type:'button'});
    await page.locator('#button').evaluate(n=>{n.setAttribute('label','Save');n.removeAttribute('trailing-icon');n.setAttribute('size','xs');n.focus();});
    await page.keyboard.down('Space');assert.equal(await page.locator('#button').evaluate(n=>n._pressed&&parseFloat(n.shadowRoot.querySelector('.btn').style.borderRadius)===8),true);
    await page.keyboard.up('Space');assert.equal(await page.locator('#button').evaluate(n=>!n._pressed&&!n.selected),true);
    const box=await page.locator('#button').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+2);await page.mouse.down();
    assert.equal(await page.locator('#button').evaluate(n=>n._pressed),false,'native minimum target expansion excludes Mouse outside the XS visual container');await page.mouse.up();assert.equal(await page.locator('#button').evaluate(n=>n.selected),false);
    await page.touchscreen.tap(box.x+box.width/2,box.y+2);assert.equal(await page.locator('#button').evaluate(n=>n.selected),true,'Touch receives the original 48dp minimum target');
    await page.locator('#button').evaluate(n=>n.ariaLabel='Save action');assert.equal(await page.locator('#button').getByRole('checkbox',{name:'Save action',exact:true}).count(),1);
    await page.locator('#button').evaluate(n=>n.removeAttribute('aria-label'));assert.equal(await page.locator('#button').getByRole('checkbox',{name:'Save',exact:true}).count(),1);
    for(const variant of Object.keys(colors.variants))for(const disabled of [false,true])for(const palette of [0,1]){
      const expected=colors.variants[variant];
      const result=await page.evaluate(({variant,disabled,palette,expected,roles})=>{
        const h=document.querySelector('#button');h.removeAttribute('toggle');h.setAttribute('variant',variant);h.disabled=disabled;const b=h.shadowRoot.querySelector('.btn');
        // Two distinct role palettes, changed on the same retained component.
        for(const [id,name]of Object.entries(roles)){const role=name.replace(/[A-Z]/g,(c,i)=>(i?'-':'')+c.toLowerCase());h.style.setProperty('--md-sys-color-'+role,`rgb(${(Number(id)*31+palette*83)%255},${(Number(id)*47+palette*59)%255},${(Number(id)*67+palette*17)%255})`);}
        const probe=document.createElement('span');h.append(probe);const resolved=color=>{const name=roles[color.role],token=name?`var(--md-sys-color-${name.replace(/[A-Z]/g,(c,i)=>(i?'-':'')+c.toLowerCase())})`:null;probe.style.color=color.role<0?'transparent':color.alpha===1?token:`color-mix(in srgb,${token} ${color.alpha*100}%,transparent)`;return getComputedStyle(probe).color;};
        const css=getComputedStyle(b),wanted={container:resolved(expected[disabled?'disabledContainer':'container']),content:resolved(expected[disabled?'disabledContent':'content'])};
        probe.style.color=css.backgroundColor;const container=getComputedStyle(probe).color;probe.style.color=css.color;const content=getComputedStyle(probe).color;probe.remove();return{actual:{container,content},wanted,colorTransitions:b.getAnimations().map(a=>a.transitionProperty).filter(p=>['color','background-color','border-color'].includes(p))};
      },{variant,disabled,palette,expected,roles:colors.roles});assert.deepEqual(result.actual,result.wanted,`${variant}/${disabled}/${palette} original public ButtonColors bindings`);assert.deepEqual(result.colorTransitions,[],'ordinary ButtonColors resolves directly without an invented color transition');
    }
  }finally{await page.close();}
  const animated=await browser.newPage({viewport:{width:960,height:800}});let frames=0;
  try{await animated.addInitScript(()=>{window.buttonTime=0;window.buttonJobs=new Map();let id=0;performance.now=()=>window.buttonTime;requestAnimationFrame=fn=>{const key=++id;window.buttonJobs.set(key,fn);return key;};cancelAnimationFrame=key=>window.buttonJobs.delete(key);window.buttonFrame=time=>{window.buttonTime=time;const jobs=[...window.buttonJobs.values()];window.buttonJobs.clear();for(const fn of jobs)fn(time);};});await animated.goto(base+'/test/browser/fixtures/toolbars.html');await animated.evaluate(async()=>{await customElements.whenDefined('md-button');await document.fonts.ready;});
    for(const c of shapes.filter(c=>c.events.every(e=>e.shape==='round'||e.shape==='8'))){await animated.evaluate(scheme=>{window.buttonTime=0;document.querySelector('#fixture').innerHTML=`<md-theme motion-scheme="${scheme}"><md-button id="button" label="Material"></md-button></md-theme>`;const b=document.querySelector('#button').shadowRoot.querySelector('.btn');b.style.width='160px';b.style.height='40px';b.style.minHeight='40px';document.querySelector('#button')._updateShape();},c.scheme);let at=0;
      for(const expected of c.frames){const events=[];while(at<c.events.length&&c.events[at].time<=expected.time)events.push(c.events[at++]);const actual=await animated.evaluate(({time,events})=>{window.buttonTime=time;const h=document.querySelector('#button'),b=h.shadowRoot.querySelector('.btn');for(const e of events){if(e.shape==='8')b.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,pointerType:'mouse',button:0,isPrimary:true,bubbles:true,clientX:b.getBoundingClientRect().left+b.getBoundingClientRect().width/2,clientY:b.getBoundingClientRect().top+b.getBoundingClientRect().height/2}));else{h.setAttribute('shape',e.shape==='round'?'round':'square');if(e.shape==='16')h.setAttribute('size','m');if(h._pressed)b.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,pointerType:'mouse',button:0,isPrimary:true,bubbles:true,clientX:b.getBoundingClientRect().left+b.getBoundingClientRect().width/2,clientY:b.getBoundingClientRect().top+b.getBoundingClientRect().height/2}));}}b.style.width=time>=144?'120px':'160px';b.style.height=b.style.minHeight=time>=144?'80px':'40px';h._updateShape();window.buttonFrame(time);const p=h._shapeState.progress.sample(time);return{progress:p.position,velocity:p.velocity,radius:parseFloat(b.style.borderRadius),transform:getComputedStyle(b).transform};},{time:expected.time,events});for(const key of ['progress','velocity','radius'])assert.ok(Math.abs(actual[key]-expected[key])<(key==='radius'?1e-4:2e-5),`${JSON.stringify(c.events)} renderer ${key}@${expected.time}: ${actual[key]} != ${expected[key]}`);assert.equal(actual.transform,'none');frames++;}
    }
    assert.equal(await animated.locator('#button').evaluate(n=>{const motion=n._shapeMotion;n.remove();return motion.disposed&&motion.raf===null;}),true);
  }finally{await animated.close();}
  console.log(`Button browser: ${count} original Row geometries/defaults, five sizes/outlined surface/multiline/empty/RTL, 20 original normal/disabled live-color pairs, stable slots/focus, fieldset disabling/native activation/48dp Touch-only target/keyboard presses and ${frames} original shape-progress frames passed.`);
  await testButtonComposition(browser,base);
  await testToggleButtonParity(browser,base);
  await testButtonElevationMotion(browser,base);
  await testButtonSlotPointer(browser,base);
  await testButtonSurface(browser,base);
  await testButtonPointer(browser,base);
  await testButtonStateLayer(browser,base);
  await testButtonKeyboard(browser,base);
}
