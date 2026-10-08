import assert from 'node:assert/strict';
import fs from 'node:fs';
const cases=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/toggle-button/border-oracle.json',import.meta.url)),(_,v)=>typeof v==='number'?Math.fround(v):v);

export async function testToggleBorder(browser,base){
  let frames=0;
  for(const density of [1,1.25,2]){
  const page=await browser.newPage({viewport:{width:960,height:800},deviceScaleFactor:density}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.addInitScript(()=>{
      window.borderTime=0;window.borderJobs=new Map();let id=0;
      performance.now=()=>window.borderTime;requestAnimationFrame=fn=>{const key=++id;window.borderJobs.set(key,fn);return key;};cancelAnimationFrame=key=>window.borderJobs.delete(key);
      window.borderFrame=time=>{window.borderTime=time;const jobs=[...window.borderJobs.values()];window.borderJobs.clear();for(const fn of jobs)fn(time);};
      window.drainBorderTheme=()=>new Promise(resolve=>queueMicrotask(()=>queueMicrotask(resolve)));
      window.borderPalette=([alpha,l,a,b])=>document.querySelector('#border-theme').style.setProperty('--md-sys-color-outline-variant',`oklab(${l} ${a} ${b} / ${alpha})`);
    });
    await page.goto(base+'/test/browser/fixtures/toolbars.html');
    await page.evaluate(async()=>{await customElements.whenDefined('md-button');await document.fonts.ready;window.savedBorderEffects={expressive:window.toolbarApi.SpringPhysics.PRESETS.expressiveEffectMedium,standard:window.toolbarApi.SpringPhysics.PRESETS.standardEffectMedium};});
    for(const c of cases){
      await page.evaluate(async c=>{
        const presets=window.toolbarApi.SpringPhysics.PRESETS;presets.expressiveEffectMedium=window.savedBorderEffects.expressive;presets.standardEffectMedium=window.savedBorderEffects.standard;
        window.borderTime=0;document.querySelector('#fixture').innerHTML=`<div id="border-theme" data-motion-scheme="${c.scheme}"></div>`;
        window.borderPalette(c.palettes[0]);const h=document.createElement('md-button');h.id='button';h.setAttribute('variant','outlined');h.setAttribute('toggle','');h.setAttribute('label','Border');h.selected=c.initialChecked;h.disabled=!c.initialEnabled;document.querySelector('#border-theme').append(h);await window.drainBorderTheme();
        window.borderControl=h.shadowRoot.querySelector('.btn');window.borderSlot=h.shadowRoot.querySelector('slot');if(c.initialEnabled)h.focus();
        const probe=document.createElement('span');probe.hidden=true;h.shadowRoot.append(probe);window.borderPaintProbe=probe;
      },c);
      let at=0;
      for(const expected of c.frames){
        const events=[];while(at<c.events.length&&c.events[at].time<=expected.time)events.push(c.events[at++]);
        const actual=await page.evaluate(async({time,events,palettes})=>{
          window.borderTime=time;const h=document.querySelector('#button'),theme=document.querySelector('#border-theme');
          for(const e of events){
            if(e.checked!==undefined)h.selected=e.checked;
            if(e.enabled!==undefined)h.disabled=!e.enabled;
            if(e.palette!==undefined)window.borderPalette(palettes[e.palette]);
            if(e.scheme)theme.setAttribute('data-motion-scheme',e.scheme);
            if(e.size)h.setAttribute('size',e.size);
            if(e.incidental){h.setAttribute('label','Border changed');h.setAttribute('icon','check');}
            if(e.effectsSpec){const presets=window.toolbarApi.SpringPhysics.PRESETS;presets.expressiveEffectMedium={...e.effectsSpec};presets.standardEffectMedium={...e.effectsSpec};window.dispatchEvent(new CustomEvent('theme-change',{detail:{target:theme}}));}
            await window.drainBorderTheme();
          }
          window.borderFrame(time);const b=h.shadowRoot.querySelector('.btn'),w=h._borderWidthMotion.channels.width.sample(time),v=h._borderColorMotion.vector.sample(time);
          const css=getComputedStyle(b,'::after'),probe=window.borderPaintProbe;probe.style.color=`oklab(from ${css.borderTopColor} l a b / alpha)`;const match=/^oklab\(\s*([\d.e+-]+)\s+([\d.e+-]+)\s+([\d.e+-]+)(?:\s*\/\s*([\d.e+-]+))?\s*\)$/.exec(getComputedStyle(probe).color);
          if(!match)throw new Error('Border paint did not resolve to Oklab');
          const p=match.slice(1,4).map(Number);
          return{width:w.position,widthVelocity:w.velocity,colorVelocity:v.velocity,paint:[match[4]===undefined?1:Number(match[4]),...p],drawWidth:parseFloat(b.style.getPropertyValue('--_button-outline-width')),density:devicePixelRatio,
            widthDuration:h._borderWidthMotion.channels.width.animation?.duration??null,colorDuration:h._borderColorMotion.vector.animation?.duration??null,
            retained:b===window.borderControl&&h.shadowRoot.querySelector('slot')===window.borderSlot};
        },{time:expected.time,events,palettes:c.palettes});
        for(const key of ['width','widthVelocity'])assert.ok(Math.abs(actual[key]-expected[key])<2e-5,`${c.name}/${c.scheme} renderer ${key}@${expected.time}: ${actual[key]} != ${expected[key]}`);
        actual.colorVelocity.forEach((value,i)=>assert.ok(Math.abs(value-expected.colorVelocity[i])<3e-5,`${c.name}/${c.scheme} color velocity[${i}]@${expected.time}: ${value} != ${expected.colorVelocity[i]}`));
        actual.paint.forEach((value,i)=>assert.ok(Math.abs(value-expected.color[i])<3e-5,`${c.name}/${c.scheme} painted color[${i}]@${expected.time}: ${value} != ${expected.color[i]}`));
        const stroke=expected.strokes.find(p=>p.density===density&&p.size[0]===192).stroke;
        assert.equal(actual.density,density);
        assert.ok(Math.abs(actual.drawWidth-stroke)<1e-5,`${c.name}/${c.scheme}@${expected.time} native pixel-ceiled paint @${density}: ${actual.drawWidth} != ${stroke}`);
        assert.equal(actual.widthDuration,expected.widthDuration);assert.equal(actual.colorDuration,expected.colorDuration);assert.equal(actual.retained,true);frames++;
      }
    }
    // Live preferences, mode/reconnect changes and stale callbacks retire both
    // controllers without rebuilding the native control or its caller slot.
    await page.evaluate(async()=>{
      const theme=document.querySelector('#border-theme');window.borderTime=2000;theme.innerHTML='<md-button id="button" toggle variant="outlined" label="Border"></md-button>';
      await window.drainBorderTheme();document.querySelector('#button').selected=true;window.borderFrame(2016);
    });
    assert.equal(await page.locator('#button').evaluate(h=>h._borderWidthMotion.raf!==null&&h._borderColorMotion.raf!==null),true);
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>{const h=document.querySelector('#button');return !h._borderWidthMotion.channels.width.animation&&!h._borderColorMotion.vector.animation;},null,{polling:20});
    assert.equal(await page.locator('#button').evaluate(h=>parseFloat(h.shadowRoot.querySelector('.btn').style.getPropertyValue('--_button-outline-width'))),0);
    await page.emulateMedia({reducedMotion:'no-preference'});
    assert.equal(await page.evaluate(async()=>{
      const h=document.querySelector('#button'),theme=document.querySelector('#border-theme'),b=h.shadowRoot.querySelector('.btn');window.borderTime=2100;h.selected=false;window.borderFrame(2116);
      const width=h._borderWidthMotion,color=h._borderColorMotion,probe=h._borderProbe,jobs=[width.raf,color.raf];h.remove();
      const retired=width.disposed&&color.disposed&&width.raf===null&&color.raf===null&&!probe.isConnected&&jobs.every(id=>!window.borderJobs.has(id));
      theme.append(h);await window.drainBorderTheme();const rebound=b===h.shadowRoot.querySelector('.btn')&&Math.abs(parseFloat(b.style.getPropertyValue('--_button-outline-width'))-Math.ceil(devicePixelRatio)/devicePixelRatio)<1e-6;
      const activeWidth=h._borderWidthMotion,activeColor=h._borderColorMotion;h.removeAttribute('toggle');
      return retired&&rebound&&activeWidth.disposed&&activeColor.disposed&&h._borderProbe===null&&b.style.borderColor===''&&parseFloat(b.style.getPropertyValue('--_button-outline-width'))===1;
    }),true);
    if(density===1){
      await page.locator('#button').evaluate(h=>{h.setAttribute('toggle','');h.disabled=false;window.borderDensityQuery=h._borderDensityMedia;});
      const session=await page.context().newCDPSession(page);
      await session.send('Emulation.setDeviceMetricsOverride',{width:960,height:800,deviceScaleFactor:1.25,mobile:false});
      // CDP changes DPR/query.matches without emitting the display's native
      // change event. Explicitly host only event delivery, then exercise the
      // real listener, rearming and current-value repaint (no private call).
      await page.evaluate(()=>window.borderDensityQuery.dispatchEvent(new MediaQueryListEvent('change',{matches:false,media:window.borderDensityQuery.media})));
      await page.waitForFunction(()=>devicePixelRatio===1.25&&Math.abs(parseFloat(document.querySelector('#button').shadowRoot.querySelector('.btn').style.getPropertyValue('--_button-outline-width'))-1.6)<1e-6,null,{polling:20});
      assert.equal(await page.locator('#button').evaluate(h=>h._borderDensityMedia!==window.borderDensityQuery&&h._borderDensityMedia.matches),true,'resolution query rearms on a live display-density change');
      await session.send('Emulation.clearDeviceMetricsOverride');await session.detach();
    }
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
  }
  console.log(`Toggle border browser: ${cases.length} original border/animate*AsState histories at three densities/${frames} actual width/pseudo-border color/velocity/common-duration and native pixel-ceiled width frames; live themes/schemes/custom effects, cold targets, retained control/slot and both RAF/preference/probe lifecycles passed.`);
}
