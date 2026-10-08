import assert from 'node:assert/strict';
import fs from 'node:fs';

const configs=[
  {text:'Help'},
  {text:''},
  {text:'A long label wraps at the source plain tooltip maximum width. '.repeat(3)},
  {text:'First line\nSecond line\n'},
  {rich:true,text:'A supporting message'},
  {rich:true,title:'Context',text:'A supporting message',actions:['Read more']},
  {rich:true,title:'',text:'',actions:['']},
  {rich:true,title:'A longer heading that wraps into several lines',text:'Supporting information. '.repeat(9),actions:['Read more','Another action']},
  {rich:true,text:'A supporting message',actions:['Read more']},
  {rich:true,title:'Context',text:'Supporting message',maxWidth:93},
  {rich:true,title:'Context',text:'Supporting message',actions:['Read more'],maxWidth:21},
  {rich:true,text:'Help',maxWidth:0},
  {rich:true,title:'Context',leaves:[{width:91,height:51},{width:49,height:27}]},
  {leaves:[{width:91,height:51},{width:49,height:27}]},
  {rich:true,title:'Different typography',text:'First line\nSecond line.',actions:['Read more'],font:true},
  {rich:true,title:'Context',text:'Percentage maximum',maxWidth:'40%'},
];

async function cases(browser,base,visit){
  const page=await browser.newPage({viewport:{width:960,height:800},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto(base+'/test/browser/fixtures/toolbars.html');
    await page.evaluate(async()=>{await customElements.whenDefined('md-tooltip');await document.fonts.ready;});
    let index=0;
    for(const viewport of [{width:960,height:800},{width:390,height:800},{width:93,height:41}])for(const rtl of [false,true])for(const config of configs){
      await page.setViewportSize(viewport);
      await page.evaluate(({config,rtl})=>{
        const parent=document.querySelector('#fixture');parent.replaceChildren();
        let fonts=document.querySelector('#tooltip-fixture-fonts');if(!fonts){fonts=document.createElement('style');fonts.id='tooltip-fixture-fonts';document.head.append(fonts);}
        const bodyFont=config.font?'400 18px/28px monospace':config.rich?'400 14px/20px monospace':'400 12px/16px monospace',titleFont=config.font?'500 16px/24px monospace':'500 14px/20px monospace',actionFont=config.font?'500 12px/16px monospace':'500 14px/20px monospace';
        fonts.textContent=`md-tooltip#tip::part(text){font:${bodyFont};letter-spacing:0} md-tooltip#tip::part(headline){font:${titleFont};letter-spacing:0} md-tooltip#tip md-button::part(button){font:${actionFont} !important;letter-spacing:0 !important}`;
        const anchor=document.createElement('button');anchor.id='anchor';anchor.textContent='Info';parent.append(anchor);
        const host=document.createElement('md-tooltip');host.id='tip';host.setAttribute('for','anchor');host.variant=config.rich?'rich':'plain';host.enableUserInput=false;host.isPersistent=true;host.dir=rtl?'rtl':'ltr';
        for(const [name,value]of Object.entries({'body-small':config.font?'400 18px/28px monospace':'400 12px/16px monospace','body-medium':config.font?'400 18px/28px monospace':'400 14px/20px monospace','title-small':config.font?'500 16px/24px monospace':'500 14px/20px monospace','label-large':config.font?'500 12px/16px monospace':'500 14px/20px monospace'})){
          host.style.setProperty('--md-sys-typescale-'+name,value);host.style.setProperty('--md-sys-typescale-'+name+'-tracking','0px');
        }
        if(config.text!==undefined)host.text=config.text;
        if(config.title!==undefined)host.headline=config.title;
        if(config.maxWidth!==undefined)host.maxWidth=config.maxWidth;
        for(const label of config.actions??[]){const action=document.createElement('md-button');action.slot='action';action.setAttribute('variant','text');action.setAttribute('label',label);host.append(action);}
        for(const {width,height}of config.leaves??[]){const leaf=document.createElement('div');leaf.style.width=width+'px';leaf.style.height=height+'px';host.append(leaf);}
        parent.append(host);host.show().catch(()=>{});
      },{config,rtl});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const result=await page.evaluate(()=>{
        const h=document.querySelector('#tip');h._layout();
        // Slotted nodes can have a null offsetParent across a fixed shadow host.
        const root=h._tip.getBoundingClientRect(),rect=element=>{const r=element.getBoundingClientRect();return{x:Math.round(r.left-root.left),y:Math.round(r.top-root.top),width:element.offsetWidth,height:element.offsetHeight};};
        const leaves={};
        if(!h._textLeaf.hidden)leaves['body-0']=rect(h._textLeaf);
        const body=h.shadowRoot.querySelector('slot:not([name])').assignedElements();
        body.forEach((element,i)=>leaves['body-'+(i+(h._textLeaf.hidden?0:1))]=rect(element));
        if(!h._head.hidden)leaves['title-0']=rect(h._titleLeaf);
        h.shadowRoot.querySelector('slot[name="action"]').assignedElements().forEach((element,i)=>{if(!h._actions.hidden)leaves['action-'+i]=rect(element);});
        return{input:h._layoutInput,measurements:h._layoutMeasurements,rendered:{size:{width:h._tip.offsetWidth,height:h._tip.offsetHeight},surface:rect(h._surface),body:rect(h._bodyBox),title:h._head.hidden?null:rect(h._head),action:h._actions.hidden?null:rect(h._actions),leaves}};
      });
      if(viewport.width>=390&&config.actions?.includes('Read more')&&config.maxWidth===undefined)assert.equal(await page.locator('#tip md-button').first().evaluate(n=>n.shadowRoot.querySelector('.lbl').offsetHeight),config.font?16:20,`ordinary short action text remains on one line: ${JSON.stringify({viewport,rtl,config,result})}`);
      await visit({index:index++,viewport,rtl,config,...result},page);
    }
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}

export async function captureTooltipLayout(browser,base){
  const inputs=[];await cases(browser,base,data=>inputs.push(data));
  fs.writeFileSync(new URL('../../research/tooltip-browser-layout-inputs.json',import.meta.url),JSON.stringify(inputs,null,2)+'\n');
  console.log(`Captured ${inputs.length} explicit Chromium tooltip font/control leaves and child constraints for original native measurement.`);
}

export async function testTooltipLayout(browser,base){
  const references=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/tooltip/browser-layout-oracle.json',import.meta.url)));let checked=0;
  await cases(browser,base,actual=>{
    const reference=references[actual.index],p=reference.expected.placements;
    assert.deepEqual(actual.config,reference.config);assert.deepEqual(actual.input,reference.input,'explicit Chromium leaves remain stable');assert.deepEqual(actual.measurements,reference.measurements,'same constraints checked independently by native Box/Column');
    assert.deepEqual(actual.rendered.size,reference.expected.size);
    for(const [name,id]of [['surface','surface'],['body','body-box'],['title','title-box'],['action','action-box']])assert.deepEqual(actual.rendered[name],p[id]??null,`${actual.index}/${name} original source geometry`);
    for(const [id,rect]of Object.entries(actual.rendered.leaves))assert.deepEqual(rect,p[id],`${actual.index}/${id} original leaf placement`);
    checked++;
  });
  const page=await browser.newPage({viewport:{width:390,height:800},reducedMotion:'reduce'});
  try{
    await page.goto(base+'/test/browser/fixtures/toolbars.html');
    await page.evaluate(async()=>{
      await customElements.whenDefined('md-tooltip');document.querySelector('#fixture').innerHTML='<button id="anchor">Info</button><md-tooltip id="tip" variant="rich" headline="Context" text="Supporting message" for="anchor" focusable enable-user-input="false" is-persistent><md-button id="action" slot="action" variant="text" label="Read more" style="margin:3px !important;width:111px;color:rgb(40,50,60)"></md-button></md-tooltip>';
      const h=document.querySelector('#tip');h.show().catch(()=>{});window.retainedAction=document.querySelector('#action');window.retainedButton=window.retainedAction.shadowRoot.querySelector('button');
    });
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
    await page.evaluate(()=>{const h=document.querySelector('#tip');h.dir='rtl';h.text='Updated message with a second line\nSupporting information';h.style.setProperty('--md-sys-typescale-body-medium','400 18px/28px monospace');});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.deepEqual(await page.evaluate(()=>({same:document.querySelector('#action')===window.retainedAction,button:window.retainedAction.shadowRoot.querySelector('button')===window.retainedButton,focused:window.retainedAction.shadowRoot.activeElement===window.retainedButton,rtl:document.querySelector('#tip')._layoutInput.rtl})),{same:true,button:true,focused:true,rtl:true});
    await page.evaluate(()=>{window.retainedAction.style.width='123px';document.querySelector('#tip').text='New content';});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.evaluate(()=>document.querySelector('#tip').dismiss());
    assert.deepEqual(await page.evaluate(()=>({width:window.retainedAction.style.width,position:window.retainedAction.style.position,priority:window.retainedAction.style.getPropertyPriority('margin')})),{width:'123px',position:'',priority:'important'},'normal retirement restores current author styles');
    await page.evaluate(()=>{document.querySelector('#tip').show().catch(()=>{});});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(await page.evaluate(()=>window.retainedAction.shadowRoot.activeElement===window.retainedButton),true,'reopening reuses and focuses the same control');
    await page.evaluate(()=>window.retainedAction.remove());
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.deepEqual(await page.evaluate(()=>({width:window.retainedAction.style.width,margin:window.retainedAction.style.margin,priority:window.retainedAction.style.getPropertyPriority('margin'),position:window.retainedAction.style.position,color:window.retainedAction.style.color})),{width:'123px',margin:'3px',priority:'important',position:'',color:'rgb(40, 50, 60)'});
    await page.evaluate(()=>{const h=document.querySelector('#tip');h.append(window.retainedAction);h.show().catch(()=>{});});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.evaluate(()=>document.querySelector('#tip').remove());
    assert.equal(await page.evaluate(()=>window.retainedAction.style.position),'','host disconnect restores author geometry');
  }finally{await page.close();}
  console.log(`Tooltip layout browser: ${checked} independent native plain/rich Box/Column trees, real fonts/text/action leaves, finite/narrow/zero/percentage sizes, multiline/empty content, RTL and stable focused controls/author style restoration passed.`);
}
