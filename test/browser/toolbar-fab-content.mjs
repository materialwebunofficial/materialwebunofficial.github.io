import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';

const fixtures=new URL('../fixtures/androidx/toolbar-fab-content/',import.meta.url);
const cases=JSON.parse(gunzipSync(fs.readFileSync(new URL('layout-oracle.json.gz',fixtures))));
const rows=JSON.parse(gunzipSync(fs.readFileSync(new URL('no-fab-oracle.json.gz',fixtures))));
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<.1,`${label}: ${a} vs ${b}`);
const compare=(actual,c)=>{
  const context=JSON.stringify(c.input);
  assert.deepEqual(actual.size,c.size,context);near(actual.range,c.scroll.max,'scroll range '+context);
  for(const[id,box]of Object.entries(actual.boxes))for(const key of ['x','y','width','height'])near(box[key],c.placements[id][key],id+'.'+key+' '+context);
};

export async function testToolbarFabContent(browser,base){
  const page=await browser.newPage({viewport:{width:1000,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto(base+'/test/browser/fixtures/toolbars.html');
    await page.evaluate(async()=>{await customElements.whenDefined('md-toolbar');await document.fonts.ready;});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(()=>{
      window.createNativeFab=i=>{
        const parent=document.createElement('div');parent.style.cssText='width:20000px;height:20000px;';
        const n=document.createElement('md-toolbar');n.id='native-fab';n.variant='floating';n.orientation=i.vertical?'vertical':'horizontal';n.dir=i.rtl?'rtl':'ltr';n.expanded=true;n.contentPadding=i.contentPadding;n.fabPosition=i.position;
        for(const p of i.main){
          const child=document.createElement(p.native?'md-icon-button':'div');
          if(p.native){child.setAttribute('icon','edit');child.setAttribute('size',({32:'xs',40:'s',56:'m',96:'l',136:'xl'})[p.height]);if(p.width===52)child.setAttribute('width','wide');}
          else child.style.cssText=`width:${p.width}px;height:${p.height}px;`;
          if(p.weight)child.dataset.toolbarWeight=p.weight;child.dataset.toolbarFill=String(p.fill);
          if(p.align!=='default')child.dataset.toolbarAlign=p.align;
          if(p.line!==null)child.dataset.toolbarAlignmentLine=p.line;
          n.append(child);
        }
        const fab=document.createElement('md-fab');fab.slot='fab';fab.setAttribute('icon','add');n.append(fab);parent.append(n);document.getElementById('fixture').replaceChildren(parent);n._measure();return n;
      };
      window.collectNativeFab=n=>{
        const frame=n._frame.getBoundingClientRect(),rect=el=>{const r=el.getBoundingClientRect();return{x:r.x-frame.x,y:r.y-frame.y,width:r.width,height:r.height};};
        const boxes={toolbar:rect(n._surface),fab:rect(n._fab),viewport:rect(n._viewport),content:rect(n._groups.main)};
        for(let j=0;j<n._rowChildren.main.length;j++){
          const child=n._rowChildren.main[j];boxes['content-'+j]=rect(child);
          if(child.localName==='md-icon-button')boxes['content-'+j+'-body']=rect(child.shadowRoot.querySelector('button'));
        }
        const vertical=n.orientation==='vertical';
        return{size:{width:frame.width,height:frame.height},boxes,range:vertical?n._viewport.scrollHeight-n._viewport.clientHeight:n._viewport.scrollWidth-n._viewport.clientWidth};
      };
    });
    const finite=process.argv.includes('--fab-content-live-only')?[]:cases.filter(c=>!c.error&&c.input.maxAxis!==2147483647);
    let count=0;
    for(let offset=0;offset<finite.length;offset+=32){
      const batch=finite.slice(offset,offset+32),actual=await page.evaluate(batch=>batch.map(c=>{
        const i=c.input,key=JSON.stringify([i.vertical,i.main]);
        let n=document.getElementById('native-fab');if(!n||window.nativeFabKey!==key){n=window.createNativeFab(i);window.nativeFabKey=key;}
        n.dir=i.rtl?'rtl':'ltr';n.fabPosition=i.position;n.toolbarContentPadding=i.contentPadding;n._measure();
        n._constraints={minAxis:i.minAxis,maxAxis:i.maxAxis,minCross:i.minCross,maxCross:i.maxCross};n._draw({...n._values,progress:i.progress});
        const viewport=n._viewport;viewport[i.vertical?'scrollTop':'scrollLeft']=i.vertical?i.scroll:getComputedStyle(viewport).direction==='rtl'?-i.scroll:i.scroll;
        return window.collectNativeFab(n);
      }),batch);
      actual.forEach((a,j)=>compare(a,batch[j]));count+=actual.length;
    }
    let live=0;
    for(const vertical of [false,true])for(const rtl of [false,true]){
      const natural=cases.filter(c=>!c.error&&c.input.vertical===vertical&&c.input.rtl===rtl&&c.input.maxAxis===10000&&c.input.progress===1&&c.input.position===(vertical?'bottom':'end')&&c.input.scroll===0&&c.input.main[0]?.width===32&&c.input.main[1]?.width===52&&c.input.main[0]?.align==='default');
      await page.evaluate(i=>{const n=window.createNativeFab(i);n.saved=n._rowChildren.main.map(el=>el.shadowRoot.querySelector('button'));n.saved[0].focus();},natural[0].input);
      for(const c of natural){
        await page.locator('#native-fab').evaluate((n,padding)=>{n.contentPadding=padding;},c.input.contentPadding);await page.waitForTimeout(32);
        compare(await page.locator('#native-fab').evaluate(n=>window.collectNativeFab(n)),c);
        assert.equal(await page.locator('#native-fab').evaluate(n=>n._rowChildren.main.every((el,j)=>el.shadowRoot.querySelector('button')===n.saved[j])&&n._rowChildren.main[0].shadowRoot.activeElement===n.saved[0]),true);live++;
      }
      const current=natural.at(-1),explicit=cases.find(c=>!c.error&&c.input.vertical===vertical&&c.input.rtl===rtl&&c.input.maxAxis===10000&&c.input.progress===1&&c.input.position===(vertical?'bottom':'end')&&c.input.scroll===0&&c.input.contentPadding.start===0&&c.input.contentPadding.top===6.5&&c.input.main[0]?.align==='end'&&c.input.main[1]?.width===52);
      await page.locator('#native-fab').evaluate(n=>{n._rowChildren.main[0].dataset.toolbarAlign='end';n._rowChildren.main[1].dataset.toolbarAlign='center';});await page.waitForTimeout(32);
      compare(await page.locator('#native-fab').evaluate(n=>window.collectNativeFab(n)),explicit);live++;
      await page.locator('#native-fab').evaluate(n=>{n._rowChildren.main[0].removeAttribute('data-toolbar-align');n._rowChildren.main[1].removeAttribute('data-toolbar-align');});await page.waitForTimeout(32);
      compare(await page.locator('#native-fab').evaluate(n=>window.collectNativeFab(n)),current);live++;
      assert.equal(await page.locator('#native-fab').evaluate(n=>n._rowChildren.main[0].shadowRoot.activeElement===n.saved[0]),true);
      for(const profile of [1,3,0]){
        const changed=cases.find(c=>!c.error&&c.input.vertical===vertical&&c.input.rtl===rtl&&c.input.maxAxis===10000&&c.input.progress===1&&c.input.position===(vertical?'bottom':'end')&&c.input.scroll===0&&c.input.contentPadding.start===0&&c.input.contentPadding.top===6.5&&
          (profile===1?c.input.main[1]?.height===96:profile===3?c.input.main[0]?.weight===1:c.input.main[0]?.width===32&&c.input.main[1]?.width===52));
        await page.locator('#native-fab').evaluate((n,inputs)=>{
          n._rowChildren.main.forEach((el,j)=>{const p=inputs[j];el.setAttribute('size',({32:'xs',40:'s',56:'m',96:'l',136:'xl'})[p.height]);if(p.width===52)el.setAttribute('width','wide');else el.removeAttribute('width');if(p.weight)el.dataset.toolbarWeight=p.weight;else el.removeAttribute('data-toolbar-weight');el.dataset.toolbarFill=String(p.fill);});
        },changed.input.main);await page.waitForTimeout(48);
        compare(await page.locator('#native-fab').evaluate(n=>window.collectNativeFab(n)),changed);live++;
        assert.equal(await page.locator('#native-fab').evaluate(n=>n._rowChildren.main.every((el,j)=>el.shadowRoot.querySelector('button')===n.saved[j])&&n._rowChildren.main[0].shadowRoot.activeElement===n.saved[0]),true);
      }
      await page.locator('#native-fab').evaluate(n=>{const direction=getComputedStyle(n).direction;n.removeAttribute('dir');n.parentElement.dir=direction==='rtl'?'ltr':'rtl';});await page.waitForTimeout(48);
      const inherited=cases.find(c=>!c.error&&c.input.vertical===vertical&&c.input.rtl!==rtl&&c.input.maxAxis===10000&&c.input.progress===1&&c.input.position===(vertical?'bottom':'end')&&c.input.scroll===0&&c.input.contentPadding.start===0&&c.input.contentPadding.top===6.5&&c.input.main[0]?.width===32&&c.input.main[1]?.width===52&&c.input.main[0]?.align==='default');
      compare(await page.locator('#native-fab').evaluate(n=>window.collectNativeFab(n)),inherited);live++;
      await page.locator('#native-fab').evaluate(n=>{n.savedFab=n.querySelector('[slot="fab"]');n.savedFab.remove();});await page.waitForTimeout(48);
      const without=rows.find(c=>c.input.vertical===vertical&&c.input.rtl!==rtl&&c.input.maxMain===10000&&c.input.contentPadding.start===0&&c.input.contentPadding.top===6.5&&c.input.main[0]?.width===32&&c.input.main[1]?.width===52&&c.input.main[0]?.align==='default');
      const noFab=await page.locator('#native-fab').evaluate(n=>{
        const frame=n._frame.getBoundingClientRect(),rect=el=>{const r=el.getBoundingClientRect();return{x:r.x-frame.x,y:r.y-frame.y,width:r.width,height:r.height};};
        const boxes={balanced:rect(n._main),'main-row':rect(n._groups.main)};
        n._rowChildren.main.forEach((el,j)=>{boxes['main-row-'+j]=rect(el);boxes['main-row-'+j+'-body']=rect(el.shadowRoot.querySelector('button'));});
        return{size:{width:frame.width,height:frame.height},boxes,debug:{inputs:n._rowInputs,lines:n._rowLayout.lines,metrics:n._metrics,values:n._values,layout:n._rowLayout.size,css:getComputedStyle(n).cssText}};
      });
      assert.deepEqual(noFab.size,without.size,JSON.stringify(noFab.debug));
      for(const[id,box]of Object.entries(noFab.boxes))for(const key of ['x','y','width','height'])near(box[key],without.placements[id][key],'removed FAB '+id+'.'+key);
      await page.locator('#native-fab').evaluate(n=>n.append(n.savedFab));await page.waitForTimeout(48);
      compare(await page.locator('#native-fab').evaluate(n=>window.collectNativeFab(n)),inherited);live+=2;
      assert.equal(await page.locator('#native-fab').evaluate(n=>n._rowChildren.main[0].shadowRoot.activeElement===n.saved[0]),true);
      await page.locator('#native-fab').evaluate(n=>{n.savedText=document.createTextNode('Extra');n.append(n.savedText);});await page.waitForTimeout(48);
      assert.equal(await page.locator('#native-fab').evaluate(n=>!n._hasFabContent&&getComputedStyle(n._scrollExtent).display==='none'&&['width','height','left','top','direction'].every(key=>n._groups.main.style[key]==='')),true);
      await page.locator('#native-fab').evaluate(n=>n.savedText.remove());await page.waitForTimeout(48);
      compare(await page.locator('#native-fab').evaluate(n=>window.collectNativeFab(n)),inherited);live+=2;
      await page.locator('#native-fab').evaluate(n=>{const parent=n.parentElement;n.remove();parent.append(n);});await page.waitForTimeout(32);
      compare(await page.locator('#native-fab').evaluate(n=>window.collectNativeFab(n)),inherited);
    }
    assert.deepEqual(errors,[]);
    console.log(`Toolbar native with-FAB browser: ${count} original centered/weighted/native/generic/body/RTL/padding/scroll DOM trees and ${live} live padding/alignment/size/weight/inherited-dir/FAB changes with retained focused controls and reconnection passed.`);
  }finally{await page.close();}
}
