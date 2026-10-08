import assert from 'node:assert/strict';
import fs from 'node:fs';
const vectors=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/motion/color-vector-oracle.json',import.meta.url)));
const tokens=fs.readFileSync(new URL('../fixtures/androidx/ExpressiveMotionTokens.kt',import.meta.url),'utf8');
const effect=key=>Number(tokens.match(new RegExp(`SpringDefaultEffects${key} = ([\\d.]+)f`))[1]);
const near=(a,b)=>assert.ok(Math.abs(a-b)<2e-6*Math.max(1,Math.abs(b)),`${a} != native ${b}`);
export async function testSelectionColors(browser,base){
  const page=await browser.newPage({viewport:{width:960,height:800}}),errors=[];let frames=0;
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.addInitScript(()=>{
      window.roleTime=0;window.roleJobs=new Map();let id=0;
      performance.now=()=>window.roleTime;requestAnimationFrame=fn=>{const key=++id;window.roleJobs.set(key,fn);return key;};cancelAnimationFrame=key=>window.roleJobs.delete(key);
      window.roleFrame=time=>{window.roleTime=time;const jobs=[...window.roleJobs.values()];window.roleJobs.clear();for(const fn of jobs)fn(time);};
    });
    await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.waitForFunction(()=>customElements.get('md-radio-button'));await page.mouse.move(1,1);
    const cases=vectors.filter(c=>c.stiffness===effect('Stiffness')&&c.dampingRatio===effect('Damping')&&c.velocity.every(v=>v===0)&&c.from.some((v,i)=>v!==c.to[i]));assert.ok(cases.length>0);
    for(const selected of [false,true])for(const c of cases){
      await page.evaluate(({selected,c})=>{
        window.roleTime=0;const css=v=>`oklab(${v[1]} ${v[2]} ${v[3]} / ${v[0]})`;
        document.querySelector('#fixture').innerHTML=`<div style="--md-sys-color-${selected?'primary':'on-surface-variant'}:${css(c.from)};--md-sys-color-${selected?'on-surface-variant':'primary'}:${css(c.to)}"><md-radio-button ${selected?'checked':''}></md-radio-button></div>`;
        window.roleRadio=document.querySelector('#fixture md-radio-button');window.roleRadio.checked=!selected;
      },{selected,c});
      for(const e of c.samples){
        await page.evaluate(time=>window.roleFrame(time),e.time);
        const actual=await page.evaluate(()=>window.roleRadio._colorBinding.records[0].motion.vector.sample(window.roleTime));
        for(const key of ['value','velocity'])actual[key].forEach((v,i)=>near(v,e[key][i]));frames++;
      }
    }
    const branches=await page.evaluate(()=>{
      const fixture=document.querySelector('#fixture');window.roleTime=0;
      fixture.innerHTML='<div style="--md-sys-color-primary:rgb(160 20 30);--md-sys-color-on-surface-variant:rgb(10 60 200);--md-sys-color-on-surface:rgb(90 100 110 / 0)"><md-radio-button></md-radio-button><md-switch icon="check"></md-switch></div>';
      const radio=fixture.querySelector('md-radio-button'),record=radio._colorBinding.records[0],results=[];
      radio.checked=true;window.roleFrame(32);results.push(!!record.motion.vector.animation);
      radio.disabled=true;results.push(!record.motion.vector.animation&&record.motion.raf===null);
      radio.disabled=false;results.push(!record.motion.vector.animation&&record.motion.raf===null&&record.color==='rgb(160, 20, 30)');
      radio.disabled=true;radio.checked=false;radio.disabled=false;
      results.push(!record.motion.vector.animation&&record.color==='rgb(10, 60, 200)');
      const sw=fixture.querySelector('md-switch');sw.checked=true;
      results.push(sw._colorBinding.records.every(r=>!r.motion.vector.animation&&r.motion.raf===null));
      return results;
    });
    assert.deepEqual(branches,[true,true,true,true,true],'Radio enabled remember branch retirement and Switch direct getter colors');
    await page.emulateMedia({reducedMotion:'reduce'});
    const copies=await page.evaluate(async()=>{
      const {packSrgb,resolveSurfaceColor}=await import('/src/theme/surface-color.js');
      const {copySrgbAlpha,compositeSrgb}=await import('/src/theme/color-alpha.js');
      const out=[],fixture=document.querySelector('#fixture');
      // Kernel expectations are independently compared to original native
      // constructor/composite records by color-alpha.test.mjs. Here the native
      // component's inspected default getter chooses roles/branches.
      for(const alpha of [0,.2,1])for(const selected of [false,true]){
        fixture.innerHTML=`<div style="--md-sys-color-on-surface:rgb(10 20 30 / ${alpha});--md-sys-color-surface:rgb(200 210 220 / .4);--md-sys-color-surface-container-highest:rgb(80 90 100 / .3)"><md-checkbox ${selected?'checked':''} disabled></md-checkbox><md-radio-button ${selected?'checked':''} disabled></md-radio-button><md-switch ${selected?'checked':''} icon="check" disabled></md-switch></div>`;
        const scope=fixture.firstElementChild,probe=document.createElement('span');scope.append(probe);
        const source=packSrgb([10/255,20/255,30/255,alpha]),surface=packSrgb([200/255,210/255,220/255,.4]),highest=packSrgb([80/255,90/255,100/255,.3]);
        const copied=copySrgbAlpha(source,.38),over=(fg,a)=>compositeSrgb(copySrgbAlpha(fg,a),surface);
        const check=(tag,selector,property,expected)=>{
          const host=scope.querySelector(tag),node=host.shadowRoot.querySelector(selector),actual=resolveSurfaceColor(probe,getComputedStyle(node)[property]).packed;
          out.push({alpha,selected,tag,selector,actual,expected,computed:getComputedStyle(node)[property],inline:node.getAttribute('style')});
        };
        check('md-checkbox','.box-outline','stroke',copied);check('md-radio-button','.ring','color',copied);
        if(selected)check('md-checkbox','.box-fill','fill',copied);
        check('md-switch','.track','backgroundColor',over(selected?source:highest,.12));
        check('md-switch','.handle','backgroundColor',over(selected?surface:source,selected?1:.38));
        check('md-switch','.handle','color',over(selected?source:highest,.38));
        if(!selected)check('md-switch','.track','borderTopColor',over(source,.12));
      }
      return out;
    });
    for(const c of copies)assert.equal(c.actual,c.expected,`native copy/composite branch ${JSON.stringify(c)}`);
    for(const tag of ['md-radio-button','md-switch'])assert.equal(await page.evaluate(tag=>{
      const h=document.querySelector('#fixture '+tag),old=h._colorBinding,parent=h.parentElement,control=h.shadowRoot.firstElementChild;h.remove();const retired=old.disposed&&old.records.every(r=>r.motion.disposed&&r.motion.raf===null&&!r.probe.isConnected&&!r.node.style.getPropertyValue(r.property));parent.append(h);return retired&&h._colorBinding!==old&&h.shadowRoot.firstElementChild===control;
    },tag),true,tag+' scoped color ownership and retained reconnect');
    assert.deepEqual(errors,[]);console.log(`Selection colors: ${frames} original native Radio DefaultEffects vector frames, ${copies.length} inspected default-role copy/composite branches with transparent/translucent/opaque roles, shared ownership and retained reconnect passed.`);
  }finally{await page.close();}
}
