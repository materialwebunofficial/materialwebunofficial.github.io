import assert from 'node:assert/strict';
import fs from 'node:fs';
const native=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/selection/md3-checkbox-drawing-oracle.json',import.meta.url)),(_,v)=>typeof v==='number'?Math.fround(v):v);
const vectors=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/motion/color-vector-oracle.json',import.meta.url)));
const motionTokens=fs.readFileSync(new URL('../fixtures/androidx/ExpressiveMotionTokens.kt',import.meta.url),'utf8');
const nativeEffects=key=>Number(motionTokens.match(new RegExp(`SpringDefaultEffects${key} = ([\\d.]+)f`))[1]);
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<2e-6*Math.max(1,Math.abs(b)),`${label}: ${a} != ${b}`);
export async function testCheckboxMd3(browser,base){
  const page=await browser.newPage({viewport:{width:960,height:800},reducedMotion:'reduce'}),errors=[];let pairs=0,frames=0;
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.addInitScript(()=>{
      window.checkboxTime=0;window.checkboxJobs=new Map();let id=0;
      performance.now=()=>window.checkboxTime;requestAnimationFrame=fn=>{const key=++id;window.checkboxJobs.set(key,fn);return key;};cancelAnimationFrame=key=>window.checkboxJobs.delete(key);
      window.checkboxFrame=time=>{window.checkboxTime=time;const jobs=[...window.checkboxJobs.values()];window.checkboxJobs.clear();for(const fn of jobs)fn(time);};
    });
    await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.waitForFunction(()=>customElements.get('md-checkbox'));await page.mouse.move(1,1);
    const roles=await page.evaluate(async colors=>{
      const {applyDynamicTheme}=await import('/src/theme/hct-color-engine.js');
      const out=[],fixture=document.querySelector('#fixture');
      for(const seed of ['#6750a4','#ff7777','#008577'])for(const scheme of ['expressive','tonal-spot'])for(const mode of ['light','dark']){
        fixture.innerHTML='<div id="checkbox-scope"></div>';const scope=fixture.firstElementChild;scope.dataset.theme=mode;applyDynamicTheme(seed,null,scheme,scope);
        for(const c of colors){
          scope.innerHTML=`<md-checkbox ${c.state==='On'?'checked':c.state==='Indeterminate'?'indeterminate':''} ${c.enabled?'':'disabled'}></md-checkbox>`;
          const h=scope.firstElementChild,root=h.shadowRoot.querySelector('.chk-root'),box=h.shadowRoot.querySelector('.box'),svg=box.querySelector('svg');
          const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');
          const pixel=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];};
          const roleName=name=>name.replace(/([a-z])([A-Z])/g,'$1-$2').toLowerCase();
          const expected=c=>{const p=document.createElement('span');scope.append(p);p.style.color=c.role==='Transparent'?'transparent':c.alpha===1?`var(--md-sys-color-${roleName(c.role)})`:`color-mix(in srgb,var(--md-sys-color-${roleName(c.role)}) ${c.alpha*100}%,transparent)`;const result=pixel(getComputedStyle(p).color);p.remove();return result;};
          const actual=['.box-fill','.box-outline','.mark-check'].map((selector,i)=>pixel(getComputedStyle(svg.querySelector(selector))[i===0?'fill':'stroke']));
          out.push({seed,scheme,mode,c,actual,expected:[expected(c.box),expected(c.border),expected(c.mark)],size:[box.getBoundingClientRect().width,svg.getBoundingClientRect().width],viewBox:svg.getAttribute('viewBox'),opacity:getComputedStyle(svg.querySelector('.mark-check')).opacity,target:h.getBoundingClientRect().width,inputTarget:root.getBoundingClientRect().width});
        }
      }
      return out;
    },native.colors.filter(c=>c.md3));
    for(const r of roles){assert.deepEqual(r.actual,r.expected,`native default role decisions ${r.seed}/${r.scheme}/${r.mode}/${r.c.state}/${r.c.enabled}`);assert.deepEqual(r.size,[18,18]);assert.equal(r.viewBox,'0 0 18 18');assert.equal(r.target,48);assert.equal(r.inputTarget,18);assert.equal(r.opacity,'1','native check color alpha is applied once');pairs+=3;}
    // Original drawBox executes one full rounded fill when colors are equal;
    // otherwise it draws the inset fill then the stroke-center outline.
    for(const c of native.boxes.filter(c=>c.width===18)){
      const actual=await page.evaluate(c=>{
        document.querySelector('#fixture').innerHTML=`<md-checkbox ${c.filled?'checked':''} outline-stroke="${c.stroke||2}"></md-checkbox>`;
        const h=document.querySelector('#fixture').firstElementChild,fill=h.shadowRoot.querySelector('.box-fill'),outline=h.shadowRoot.querySelector('.box-outline');
        // The public attribute excludes zero; stroke0 is a source-model record.
        const rect=node=>['x','y','width','height','rx'].map(key=>Number(node.getAttribute(key)));
        return {fill:rect(fill),outline:outline.style.display==='none'?null:[...rect(outline),Number(outline.getAttribute('stroke-width'))],width:h.shadowRoot.querySelector('.box').getBoundingClientRect().width};
      },c);
      if(c.stroke===0)continue;
      const expected=c.rects.map(r=>[...r.offset,...r.size,Math.max(0,r.radius)]);
      assert.deepEqual(actual.fill,expected[0]);assert.deepEqual(actual.outline,c.filled?null:[...expected[1],c.stroke]);assert.equal(actual.width,18,'stroke does not change the native layout size');
    }
    await page.emulateMedia({reducedMotion:'no-preference'});
    const cases=vectors.filter(c=>c.stiffness===nativeEffects('Stiffness')&&c.dampingRatio===nativeEffects('Damping')&&c.velocity.every(v=>v===0)&&c.from.some((v,i)=>v!==c.to[i]));
    assert.ok(cases.length>0);
    for(const c of cases.slice(0,6)){
      await page.evaluate(c=>{
        window.checkboxTime=0;const css=v=>`oklab(${v[1]} ${v[2]} ${v[3]} / ${v[0]})`;
        document.querySelector('#fixture').innerHTML=`<div style="--md-sys-color-on-primary:${css(c.from)};--md-sys-color-surface:${css(c.to)}"><md-checkbox checked></md-checkbox></div>`;
        window.checkboxHost=document.querySelector('#fixture md-checkbox');window.checkboxHost.disabled=true;
      },c);
      for(const e of c.samples){
        await page.evaluate(time=>window.checkboxFrame(time),e.time);
        const actual=await page.evaluate(()=>{
          const records=window.checkboxHost._colorBinding.records,mark=records.find(r=>r.key==='mark');
          return {state:mark.motion.vector.sample(window.checkboxTime),boxAnimating:records.find(r=>r.key==='box').motion.vector.animation!==null,borderAnimating:records.find(r=>r.key==='border').motion.vector.animation!==null,opacity:getComputedStyle(mark.node).opacity};
        });
        for(const key of ['value','velocity'])actual.state[key].forEach((v,i)=>near(v,e[key][i],'native ColorVectorConverter spring'));
        assert.equal(actual.boxAnimating,false,'disabled box snaps');assert.equal(actual.borderAnimating,false,'disabled border snaps');assert.equal(actual.opacity,'1','glyph does not multiply a second opacity spring');frames++;
      }
      await page.evaluate(()=>{window.checkboxHost.disabled=false;});
      assert.equal(await page.evaluate(()=>window.checkboxHost._colorBinding.records.filter(r=>r.snapDisabled).every(r=>!r.motion.vector.animation)),true,'enabled branch recreates its color value at the target');
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(()=>{document.querySelector('#fixture').innerHTML='<div style="--md-sys-color-primary:rgb(10 20 30);--md-sys-color-on-primary:rgb(200 210 220)"><md-checkbox checked></md-checkbox></div>';});
    assert.equal(await page.evaluate(()=>{
      const scope=document.querySelector('#fixture').firstElementChild,h=scope.firstElementChild;window.savedCheckbox=h;window.savedBox=h.shadowRoot.querySelector('.box');scope.style.setProperty('--md-sys-color-primary','rgb(90 80 70)');return true;
    }),true);
    await page.waitForFunction(()=>getComputedStyle(window.savedCheckbox.shadowRoot.querySelector('.box-fill')).fill==='rgb(90, 80, 70)');
    assert.equal(await page.evaluate(()=>{
      const h=window.savedCheckbox,old=h._colorBinding,parent=h.parentElement;h.remove();const retired=old.disposed&&old.records.every(r=>r.motion.disposed&&r.motion.raf===null&&!r.probe.isConnected&&!r.node.style.getPropertyValue(r.property));parent.append(h);
      return retired&&h._colorBinding!==old&&h.shadowRoot.querySelector('.box')===window.savedBox&&h._colorBinding.records.length===3;
    }),true,'scoped color ownership and retained reconnect');
    assert.deepEqual(errors,[]);console.log(`Checkbox MD3 browser: ${pairs} native default role/channel pairs across seeded/scoped light-dark schemes, modern18dp layout, drawBox/default/custom strokes, ${frames} original color-vector frames, disabled/enable branch semantics, single glyph alpha, live roles and lifecycle passed. Native packing/coordinator/Skia segmentation remain separate.`);
  }finally{await page.close();}
}
