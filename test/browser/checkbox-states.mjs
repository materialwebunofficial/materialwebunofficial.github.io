import assert from 'node:assert/strict';
import fs from 'node:fs';
const spec=JSON.parse(fs.readFileSync(new URL('../fixtures/material-web/checkbox/current-spec-decisions.json',import.meta.url)));
export async function testCheckboxStates(browser,base){
  const page=await browser.newPage({viewport:{width:960,height:800},reducedMotion:'reduce'}),errors=[];let pairs=0;
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.waitForFunction(()=>customElements.get('md-checkbox'));await page.mouse.move(1,1);
    const records=await page.evaluate(async spec=>{
      const {applyDynamicTheme}=await import('/src/theme/hct-color-engine.js');const out=[];
      const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');
      const pixel=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];};
      const role=(scope,name)=>{const probe=document.createElement('span');scope.append(probe);probe.style.color=`var(--md-sys-color-${name.replace(/([a-z])([A-Z])/g,'$1-$2').toLowerCase()})`;const value=pixel(getComputedStyle(probe).color);probe.remove();return value;};
      for(const seed of ['#6750a4','#ff7777','#008577'])for(const mode of ['light','dark'])for(const state of ['unselected','selected','mixed','error','selected-error']){
        document.querySelector('#fixture').innerHTML='<div></div>';const scope=document.querySelector('#fixture').firstElementChild;scope.dataset.theme=mode;scope.style.color='rgb(3 5 7 / .2)';applyDynamicTheme(seed,null,'expressive',scope);
        const selected=state==='selected'||state==='mixed'||state==='selected-error',error=state.includes('error'),profile=spec.states[error?'error':selected?'selected':'unselected'];
        scope.innerHTML=`<md-checkbox ${state==='mixed'?'indeterminate':selected?'checked':''} ${error?'error':''}></md-checkbox>`;
        const h=scope.firstElementChild,root=h.shadowRoot.querySelector('.chk-root'),layer=h.shadowRoot.querySelector('.state-layer'),outline=h.shadowRoot.querySelector('.box-outline');
        const pointer=type=>{const r=root.getBoundingClientRect();root.dispatchEvent(new PointerEvent(type,{pointerId:73,pointerType:'mouse',isPrimary:true,button:0,bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2}));};
        const check=(kind,expected)=>out.push({seed,mode,state,kind,actual:pixel(getComputedStyle(outline).stroke),expected:role(scope,expected)});
        check('rest',profile.outline);pointer('pointerenter');check('hover outline',profile.interactionOutline);
        out.push({seed,mode,state,kind:'hover layer',actual:pixel(getComputedStyle(layer).backgroundColor),expected:role(scope,profile.stateLayer)});
        root.dispatchEvent(new FocusEvent('focus'));pointer('pointerleave');check('focus outline',profile.interactionOutline);
        out.push({seed,mode,state,kind:'focus layer',actual:pixel(getComputedStyle(layer).backgroundColor),expected:role(scope,profile.stateLayer)});
        root.dispatchEvent(new FocusEvent('blur'));check('idle outline',profile.outline);pointer('pointerdown');check('press outline',profile.interactionOutline);
        out.push({seed,mode,state,kind:'press ink',actual:pixel(getComputedStyle(h.shadowRoot.querySelector('.md-ripple-effect')).backgroundColor),expected:role(scope,profile.press)});
        scope.style.setProperty('--md-ripple-color','rgb(90 80 70 / .3)');
        for(const node of [layer,h.shadowRoot.querySelector('.md-ripple-effect')])out.push({seed,mode,state,kind:'scoped indication override',actual:pixel(getComputedStyle(node).backgroundColor),expected:[90,80,70,255]});
        pointer('pointercancel');h.remove();
      }
      return out;
    },spec);
    for(const r of records){assert.deepEqual(r.actual,r.expected,`${r.seed}/${r.mode}/${r.state}/${r.kind}`);pairs++;}
    assert.deepEqual(errors,[]);console.log(`Checkbox Material specification states: ${pairs} scoped seeded light/dark outline, hover/focus layer, press ink, error and opaque live override pairs passed; parent text color does not choose component state roles.`);
  }finally{await page.close();}
}
