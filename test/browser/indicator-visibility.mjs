import assert from 'node:assert/strict';

/** Real DOM/canvas lifetime checks, plus explicit batched browser observer delivery. */
export async function testIndicatorVisibility(browser,base){
 let checks=0,batches=0;
 for(const width of [1000,390])for(const mode of ['light','dark'])for(const dir of ['ltr','rtl']){
  const page=await browser.newPage({viewport:{width,height:900},colorScheme:mode}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.addInitScript(()=>{
    window.indicatorObservers=new WeakMap();window.indicatorBatches=[];
    const Native=IntersectionObserver;
    window.IntersectionObserver=class extends Native{
     constructor(callback,options){super((entries,observer)=>{
      const rows=entries.filter(entry=>entry.target.matches('md-progress-indicator,md-loading-indicator'));
      if(rows.length)window.indicatorBatches.push(rows.map(entry=>({tag:entry.target.localName,visible:entry.isIntersecting,time:entry.time})));
      callback(entries,observer);
     },options);this.deliver=entries=>callback(entries,this);}
     observe(target){super.observe(target);window.indicatorObservers.set(target,this);}
    };
   });
   await page.goto(base+'/test/browser/fixtures/toolbars.html');
   await page.waitForFunction(()=>['md-progress-indicator','md-loading-indicator','md-theme'].every(tag=>customElements.get(tag))&&document.fonts.status==='loaded',null,{timeout:10000});
   await page.evaluate(({mode,dir})=>{
    document.documentElement.dir=dir;
    document.querySelector('#fixture').innerHTML=`<md-theme color-mode="${mode}" style="display:block;width:min(280px,100%)"><md-progress-indicator variant="wavy" indeterminate></md-progress-indicator><md-progress-indicator type="circular" indeterminate></md-progress-indicator><md-progress-indicator type="circular" variant="wavy" indeterminate></md-progress-indicator><md-loading-indicator></md-loading-indicator></md-theme>`;
    for(const node of document.querySelectorAll('md-progress-indicator,md-loading-indicator')){
     node._visibilityCanvas=node.shadowRoot.querySelector('canvas');node._visibilityDraws=0;
     const method=node.localName==='md-loading-indicator'?'_drawFrame':'_draw',original=node[method];
     node[method]=function(...args){this._visibilityDraws++;return original.apply(this,args);};
    }
   },{mode,dir});
   await page.waitForFunction(()=>[...document.querySelectorAll('md-progress-indicator,md-loading-indicator')].every(node=>node._isVisible&&node._rafId!==null&&node._visibilityDraws>2),null,{timeout:10000});
   const rows=await page.evaluate(()=>[...document.querySelectorAll('md-progress-indicator,md-loading-indicator')].map(node=>{
    const oldObserver=indicatorObservers.get(node),entry=visible=>({target:node,isIntersecting:visible});
    const active=()=>node._isVisible&&node._rafId!==null;
    oldObserver.deliver([entry(false),entry(true)]);const visibleBatch=active();
    const raf=node._rafId,start=node._startTime;
    oldObserver.deliver([entry(true),entry(true)]);const unchanged=node._rafId===raf&&node._startTime===start;
    oldObserver.deliver([entry(true),entry(false)]);const hiddenBatch=!node._isVisible&&node._rafId===null;
    node._onThemeChange();const hiddenTheme=node._rafId===null;
    oldObserver.deliver([]);oldObserver.deliver([{target:document.body,isIntersecting:true}]);const unrelated=!node._isVisible&&node._rafId===null;
    oldObserver.deliver([entry(false),entry(true)]);const resumed=active();
    const parent=node.parentNode;node.remove();const visible=node._isVisible;
    oldObserver.deliver([entry(!visible)]);const detached=node._rafId===null&&node._isVisible===visible;
    parent.append(node);const current=indicatorObservers.get(node);current.deliver([entry(true)]);
    oldObserver.deliver([entry(false)]);const reattached=current!==oldObserver&&active();
    const canvas=node.shadowRoot.querySelector('canvas')===node._visibilityCanvas;
    node._visibilityDraws=0;
    return{tag:node.localName,visibleBatch,unchanged,hiddenBatch,hiddenTheme,unrelated,resumed,detached,reattached,canvas};
   }));
   for(const row of rows)for(const [key,value]of Object.entries(row).filter(([key])=>key!=='tag')){assert.equal(value,true,row.tag+' '+key);checks++;}
   await page.waitForFunction(()=>[...document.querySelectorAll('md-progress-indicator,md-loading-indicator')].every(node=>node._visibilityDraws>2&&node._rafId!==null),null,{timeout:10000});
   // Exercise real native visibility, with no delivered test records.
   await page.evaluate(()=>{document.querySelector('md-theme').style.display='none';});
   await page.waitForFunction(()=>[...document.querySelectorAll('md-progress-indicator,md-loading-indicator')].every(node=>!node._isVisible&&node._rafId===null),null,{timeout:10000});
   await page.evaluate(()=>{document.querySelector('md-theme').style.display='block';for(const node of document.querySelectorAll('md-progress-indicator,md-loading-indicator'))node._visibilityDraws=0;});
   await page.waitForFunction(()=>[...document.querySelectorAll('md-progress-indicator,md-loading-indicator')].every(node=>node._isVisible&&node._rafId!==null&&node._visibilityDraws>2),null,{timeout:10000});
   checks+=8;
   // The actual hash shows a previously hidden category. Native observers can
   // deliver hidden + visible entries together during the showcase bootstrap.
   await page.goto(base+'/#progress-indicators');
   await page.waitForFunction(()=>customElements.get('md-progress-indicator')&&customElements.get('md-expressive-theme')&&document.fonts.status==='loaded',null,{timeout:10000});
   await page.evaluate(mode=>customElements.get('md-expressive-theme').applyGlobal({scheme:'expressive',colorMode:mode}),mode);
   for(const title of ['Circular','Default and contained']){
    const card=page.locator('.comp-card').filter({has:page.getByText(title,{exact:true})});
    await card.scrollIntoViewIfNeeded();
    await card.evaluate(card=>{for(const node of card.querySelectorAll('md-progress-indicator,md-loading-indicator')){
     node._visibilityCanvas=node.shadowRoot.querySelector('canvas');node._visibilityDraws=0;
     const method=node.localName==='md-loading-indicator'?'_drawFrame':'_draw',original=node[method];
     node[method]=function(...args){this._visibilityDraws++;return original.apply(this,args);};
    }});
    await page.waitForFunction(title=>{
     const card=[...document.querySelectorAll('.comp-card')].find(card=>card.querySelector('.comp-name')?.textContent===title);
     return [...card.querySelectorAll('md-progress-indicator,md-loading-indicator')].every(node=>node._isVisible&&(!node.indeterminate||node._rafId!==null&&node._visibilityDraws>2));
    },title,{timeout:10000});
    const states=await card.evaluate(card=>[...card.querySelectorAll('md-progress-indicator,md-loading-indicator')].map(node=>({visible:node._isVisible,canvas:node.shadowRoot.querySelector('canvas')===node._visibilityCanvas,active:!node.indeterminate||node._rafId!==null})));
    for(const row of states){assert.equal(row.visible,true);assert.equal(row.canvas,true);assert.equal(row.active,true);checks+=3;}
   }
   batches+=await page.evaluate(()=>indicatorBatches.filter(rows=>rows.length>1&&rows[0].visible!==rows.at(-1).visible).length);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'showcase fits viewport');assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 console.log('Indicator visibility: '+checks+' batch/lifecycle/native hide-show/actual showcase checks, '+batches+' native opposite-state batches observed, 8 viewport/theme/direction profiles passed. Browser visibility is a web lifetime adapter, not an Android composition claim.');
}
