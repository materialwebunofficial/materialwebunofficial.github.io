import assert from 'node:assert/strict';
import fs from 'node:fs';
const loadCases=family=>JSON.parse(fs.readFileSync(new URL(`../fixtures/androidx/${family}/composition-oracle.json`,import.meta.url)),(_,v)=>typeof v==='number'?Math.fround(v):v);

export async function testButtonComposition(browser,base,{toggle=false}={}){
  const cases=loadCases(toggle?'toggle-button':'button');
  const page=await browser.newPage({viewport:{width:960,height:800}}),errors=[];let frames=0;
  page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.addInitScript(()=>{
      window.buttonTime=0;window.buttonJobs=new Map();let id=0;
      performance.now=()=>window.buttonTime;
      requestAnimationFrame=fn=>{const key=++id;window.buttonJobs.set(key,fn);return key;};
      cancelAnimationFrame=key=>window.buttonJobs.delete(key);
      window.buttonFrame=time=>{window.buttonTime=time;const jobs=[...window.buttonJobs.values()];window.buttonJobs.clear();for(const fn of jobs)fn(time);};
      window.drainButtonTheme=()=>new Promise(resolve=>queueMicrotask(()=>queueMicrotask(resolve)));
      window.sizeButton=time=>{
        const h=document.querySelector('#button'),b=h.shadowRoot.querySelector('.btn');
        const width=time>=144?'240px':'320px',height=time>=144?'180px':'160px';
        // Toggle's native Row now measures inside caller constraints. Host
        // sizes represent those constraints; direct body writes are renderer output.
        if(h.toggle){h.style.width=width;h.style.height=height;h._toggleDOM.measure();}
        else{b.style.width=width;b.style.height=b.style.minHeight=height;}
      };
    });
    await page.goto(base+'/test/browser/fixtures/toolbars.html');
    await page.evaluate(async toggle=>{await customElements.whenDefined('md-button');await document.fonts.ready;window.buttonPresetRole=toggle?'SpatialFast':'EffectMedium';window.savedButtonPresets={expressive:window.toolbarApi.SpringPhysics.PRESETS['expressive'+window.buttonPresetRole],standard:window.toolbarApi.SpringPhysics.PRESETS['standard'+window.buttonPresetRole]};},toggle);
    for(const c of cases){
      await page.evaluate(async({scheme,toggle})=>{
        const presets=window.toolbarApi.SpringPhysics.PRESETS;
        presets['expressive'+window.buttonPresetRole]=window.savedButtonPresets.expressive;presets['standard'+window.buttonPresetRole]=window.savedButtonPresets.standard;
        window.buttonTime=0;
        document.querySelector('#fixture').innerHTML=`<div id="button-theme" data-motion-scheme="${scheme}"><md-button id="button" ${toggle?'toggle':''} label="Material"></md-button></div>`;
        const h=document.querySelector('#button');window.sizeButton(0);h._updateShape();await window.drainButtonTheme();
        window.buttonPreviousState=h._shapeState;window.buttonGeneration=1;
        h.focus();window.buttonRetainedControl=h.shadowRoot.querySelector('.btn');window.buttonRetainedSlot=h.shadowRoot.querySelector('slot');
      },{scheme:c.scheme,toggle});
      let at=0;
      for(const expected of c.frames){
        const events=[];while(at<c.events.length&&c.events[at].time<=expected.time)events.push(c.events[at++]);
        const actual=await page.evaluate(async({time,events})=>{
          window.buttonTime=time;const h=document.querySelector('#button'),b=h.shadowRoot.querySelector('.btn'),theme=document.querySelector('#button-theme');
          const remember=()=>{if(h._shapeState!==window.buttonPreviousState){window.buttonGeneration++;window.buttonPreviousState=h._shapeState;}};
          for(const e of events){
            const oldMotion=h._shapeMotion,oldJob=oldMotion.raf;
            if(e.size)h.setAttribute('size',e.size);
            if(e.square!==undefined)h.setAttribute('shape',e.square?'square':'round');
            if(e.checked!==undefined)h.selected=e.checked;
            if(e.role)theme.style.setProperty('--md-sys-shape-corner-'+e.role,e.value+(e.percent?'%':'px'));
            if(e.scheme)theme.setAttribute('data-motion-scheme',e.scheme);
            if(e.spec){const presets=window.toolbarApi.SpringPhysics.PRESETS;presets['expressive'+window.buttonPresetRole]={...e.spec};presets['standard'+window.buttonPresetRole]={...e.spec};window.dispatchEvent(new CustomEvent('theme-change',{detail:{target:theme}}));}
            if(e.incidental){h.setAttribute('label','Material changed');h.setAttribute('icon','add');}
            if(e.pressed!==undefined){const r=b.getBoundingClientRect();b.dispatchEvent(new PointerEvent(e.pressed?'pointerdown':'pointerup',{pointerId:1,pointerType:'mouse',button:0,isPrimary:true,bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2}));}
            await window.drainButtonTheme();remember();
            if(h._shapeMotion!==oldMotion&&(!oldMotion.disposed||oldMotion.raf!==null||oldJob!==null&&window.buttonJobs.has(oldJob)))throw new Error('Replaced Button state retained its old RAF controller');
          }
          window.sizeButton(time);h._updateShape();remember();window.buttonFrame(time);
          const p=h._shapeState.progress.sample(time);
          return{generation:window.buttonGeneration,progress:p.position,velocity:p.velocity,radius:parseFloat(b.style.borderRadius),transform:getComputedStyle(b).transform,
            retained:b===window.buttonRetainedControl&&h.shadowRoot.querySelector('slot')===window.buttonRetainedSlot,focused:h.shadowRoot.activeElement===b};
        },{time:expected.time,events});
        assert.equal(actual.generation,expected.generation,`${c.name}/${c.scheme} renderer state@${expected.time}`);
        // Chromium serializes inline CSS lengths to six significant digits.
        // Scalar progress/velocity and the separate model retain Float tolerance.
        const cssRounding=.5*10**(Math.floor(Math.log10(Math.max(Math.abs(expected.radius),1)))-5);
        // Large synthetic bounds can make FastSpatial extrapolate below zero.
        // Native CornerBasedShape then rejects the outline; the web renderer
        // keeps its matching raw spring and draws zero-radius valid CSS.
        for(const key of ['progress','velocity','radius']){const wanted=key==='radius'?Math.max(0,expected[key]):expected[key];assert.ok(Math.abs(actual[key]-wanted)<2e-5+(key==='radius'?cssRounding:0),`${c.name}/${c.scheme} renderer ${key}@${expected.time}: ${actual[key]} != ${wanted}`);}
        assert.equal(actual.transform,'none');assert.equal(actual.retained,true);assert.equal(actual.focused,true);frames++;
      }
    }
    if(toggle){
      assert.deepEqual(await page.evaluate(async()=>{
        const theme=document.querySelector('#button-theme');theme.removeAttribute('style');window.buttonTime=2000;
        theme.innerHTML='<md-button id="button" toggle label="Toggle"></md-button>';await window.drainButtonTheme();
        const h=document.querySelector('#button'),b=h.shadowRoot.querySelector('.btn');h.focus();
        const state=h._shapeState;theme.style.setProperty('--md-sys-shape-corner-small','21px');await window.drainButtonTheme();
        const unusedRoleRetained=h._shapeState===state;
        const r=b.getBoundingClientRect();b.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,pointerType:'mouse',button:0,isPrimary:true,bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2}));window.buttonFrame(2016);
        const motion=h._shapeMotion,job=motion.raf;h.remove();
        const retired=motion.disposed&&motion.raf===null&&!window.buttonJobs.has(job);
        theme.append(h);await window.drainButtonTheme();h.focus();h.click();
        return{unusedRoleRetained,retired,pressed:h._pressed,checked:b.getAttribute('aria-checked'),role:b.getAttribute('role'),ariaPressed:b.hasAttribute('aria-pressed'),selected:h.selected,retained:b===h.shadowRoot.querySelector('.btn')};
      }),{unusedRoleRetained:true,retired:true,pressed:false,checked:'true',role:'checkbox',ariaPressed:false,selected:true,retained:true});
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.waitForFunction(()=>document.querySelector('#button')._shapeState.progress.animation===null,null,{polling:20});
      assert.equal(await page.locator('#button').evaluate(h=>parseFloat(h.shadowRoot.querySelector('.btn').style.borderRadius)),12);
      assert.deepEqual(errors,[]);
      console.log(`ToggleButton composition: ${cases.length} original three-shape/FastSpatial/default/remember histories/${frames} renderer frames, Checkbox semantics, unused roles, old RAF retirement/reconnection and reduced motion passed.`);
      return;
    }
    // These mutations must reach the live component through observation alone.
    assert.deepEqual(await page.evaluate(async()=>{
      const h=document.querySelector('#button'),theme=document.querySelector('#button-theme');h.setAttribute('shape','square');window.sizeButton(1100);h._updateShape();
      theme.style.setProperty('--md-sys-shape-corner-medium','calc(1rem + 3px)');await window.drainButtonTheme();
      const b=h.shadowRoot.querySelector('.btn'),length=parseFloat(b.style.borderRadius),state=h._shapeState;
      theme.style.setProperty('--md-sys-shape-corner-medium','19px');await window.drainButtonTheme();
      const equal=h._shapeState===state;
      theme.style.setProperty('--md-sys-shape-corner-medium','25%');await window.drainButtonTheme();
      const percent=parseFloat(b.style.borderRadius),motion=h._shapeMotion;h.remove();
      const retired=motion.disposed&&motion.raf===null&&h._stopThemeObservation===null;
      theme.style.setProperty('--md-sys-shape-corner-medium','23px');await window.drainButtonTheme();theme.append(h);await window.drainButtonTheme();
      const reconnected=parseFloat(b.style.borderRadius);h.setAttribute('toggle','');const toggle=h._shapeState;h.removeAttribute('toggle');
      return{length,equal,percent,retired,reconnected,modeReplaced:h._shapeState!==toggle};
    }),{length:19,equal:true,percent:45,retired:true,reconnected:23,modeReplaced:true});
    await page.evaluate(async()=>{
      const h=document.querySelector('#button'),theme=document.querySelector('#button-theme');theme.style.setProperty('--md-sys-shape-corner-small','8px');await window.drainButtonTheme();
      const b=h.shadowRoot.querySelector('.btn'),r=b.getBoundingClientRect();window.buttonTime=2000;b.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,pointerType:'mouse',button:0,isPrimary:true,bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2}));window.buttonFrame(2016);
    });
    assert.equal(await page.locator('#button').evaluate(h=>h._shapeMotion.raf!==null&&h._shapeState.progress.animation!==null),true);
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>document.querySelector('#button')._shapeState.progress.animation===null,null,{polling:20});
    assert.equal(await page.locator('#button').evaluate(h=>parseFloat(h.shadowRoot.querySelector('.btn').style.borderRadius)),8);
    await page.emulateMedia({reducedMotion:'no-preference'});
    assert.equal(await page.evaluate(async()=>{
      const h=document.querySelector('#button'),theme=document.querySelector('#button-theme'),b=h.shadowRoot.querySelector('.btn');
      const r=b.getBoundingClientRect();window.buttonTime=2100;b.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,pointerType:'mouse',button:0,isPrimary:true,bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2}));window.buttonFrame(2116);
      const motion=h._shapeMotion,job=motion.raf;h.remove();const retired=motion.disposed&&motion.raf===null&&job!==null&&!window.buttonJobs.has(job);
      theme.append(h);await window.drainButtonTheme();return retired&&!h._pressed&&parseFloat(b.style.borderRadius)===23;
    }),true,'disconnect retires an active spring; reconnect starts in the current resting shape');
    await page.locator('#button-theme').evaluate(theme=>theme.style.setProperty('--md-sys-shape-corner-medium','2vw'));
    await page.setViewportSize({width:800,height:800});
    await page.waitForFunction(()=>parseFloat(document.querySelector('#button').shadowRoot.querySelector('.btn').style.borderRadius)===16,null,{polling:20});
    assert.deepEqual(errors,[]);
    console.log(`Button public composition: ${cases.length} original key/default/remember histories/${frames} renderer frames, live CSS length/percent corners, retained focus/control/slot, old RAF retirement and theme observation/reconnection passed.`);
  }finally{await page.close();}
}
