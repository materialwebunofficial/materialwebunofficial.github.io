import assert from 'node:assert/strict';

export async function testSelectionForms(page) {
  await page.evaluate(() => {
    const host=document.createElement('div');host.id='selection-forms';
    host.style.cssText='position:fixed;inset:0;z-index:99999;background:var(--md-sys-color-surface)';
    host.innerHTML=`<form id="sf-first">
      <md-radio-button id="sf-a" name="a" value="first" required checked></md-radio-button>
      <md-radio-button id="sf-a2" name="a" value="second"></md-radio-button>
      <md-radio-button id="sf-b" name="b" value="third" required checked></md-radio-button>
      <md-checkbox id="sf-check" name="check" required></md-checkbox>
      <md-switch id="sf-switch" name="switch" required></md-switch>
      <button type="submit">Submit</button></form>
      <form id="sf-second"><md-radio-button id="sf-other" name="b" value="other" required checked></md-radio-button></form>
      <input id="sf-native-check" type="checkbox" required>
      <input id="sf-native-radio" type="radio" name="native" required>
      <input id="sf-native-peer" type="radio" name="native">
      <label for="sf-check">Required checkbox</label>`;
    document.body.append(host);
  });
  try {
    const result = await page.evaluate(() => {
      const get=id=>document.getElementById('sf-'+id);
      const a=get('a'),a2=get('a2'),b=get('b'),other=get('other');
      a.name='b';
      const renamed={a:a.checked,b:b.checked,other:other.checked,
        oldTab:a2.shadowRoot.querySelector('.radio-root').tabIndex,
        newTab:a.shadowRoot.querySelector('.radio-root').tabIndex};
      a.setAttribute('form','sf-second');
      const reowned={owner:a.form.id,other:other.checked,b:b.checked,
        oldTab:b.shadowRoot.querySelector('.radio-root').tabIndex,
        missing:b.validity.valueMissing};
      a.removeAttribute('form');
      const returned={owner:a.form.id,missing:b.validity.valueMissing,
        otherMissing:other.validity.valueMissing};
      // Changing the form's id also changes ownership, without changing the
      // control's form attribute. Browser lifecycle callbacks must handle it.
      a.setAttribute('form','sf-second');
      get('second').id='sf-renamed';
      const formIdChange={owner:a.form,otherMissing:other.validity.valueMissing};
      get('renamed').id='sf-second';
      const restoredOwner=a.form.id;
      a.remove();
      const removed={tab:other.shadowRoot.querySelector('.radio-root').tabIndex,missing:other.validity.valueMissing};
      get('second').append(a);
      return {renamed,reowned,returned,formIdChange,restoredOwner,removed,reconnected:a.checked&&!other.checked};
    });
    assert.deepEqual(result,{
      renamed:{a:true,b:false,other:true,oldTab:0,newTab:0},
      reowned:{owner:'sf-second',other:false,b:false,oldTab:0,missing:true},
      returned:{owner:'sf-first',missing:false,otherMissing:true},
      formIdChange:{owner:null,otherMissing:true},restoredOwner:'sf-second',
      removed:{tab:0,missing:true},reconnected:true
    });

    const validity=await page.evaluate(() => {
      const get=id=>document.getElementById('sf-'+id);
      const native=get('native-check'),check=get('check'),sw=get('switch');
      const snapshot = el => ({missing:el.validity.valueMissing,custom:el.validity.customError,
        valid:el.validity.valid,willValidate:el.willValidate,message:el.validationMessage,check:el.checkValidity()});
      const results=[];
      for(const stage of ['unchecked','mixed','checked','custom','disabled','clear','reenabled']) {
        for(const el of [native,check,sw]) {
          if(stage==='mixed')el.indeterminate=true;
          if(stage==='checked')el.checked=true;
          if(stage==='custom')el.setCustomValidity('Custom validation message');
          if(stage==='disabled')el.disabled=true;
          if(stage==='clear') {el.setCustomValidity('');el.checked=false;}
          if(stage==='reenabled')el.disabled=false;
        }
        results.push({stage,native:snapshot(native),check:snapshot(check),sw:snapshot(sw)});
      }
      return {results,label:check.labels[0].textContent};
    });
    assert.equal(validity.label,'Required checkbox');
    for(const {stage,native,check,sw} of validity.results) {
      assert.deepEqual(check,native,`checkbox ${stage}`);
      assert.deepEqual(sw,native,`switch ${stage}`);
    }

    const radioValidity=await page.evaluate(() => {
      const get=id=>document.getElementById('sf-'+id);
      const required=get('b'),peer=get('a2'),native=get('native-radio'),nativePeer=get('native-peer');
      peer.name='b';required.checked=false;peer.checked=false;
      const snapshot=el=>({missing:el.validity.valueMissing,valid:el.validity.valid,
        willValidate:el.willValidate,check:el.checkValidity(),message:el.validationMessage});
      const results=[];
      for(const stage of ['empty','required-disabled','peer-selected','peer-disabled','peer-unselected','required-removed']) {
        for(const [a,b] of [[required,peer],[native,nativePeer]]) {
          if(stage==='required-disabled')a.disabled=true;
          if(stage==='peer-selected')b.checked=true;
          if(stage==='peer-disabled')b.disabled=true;
          if(stage==='peer-unselected')b.checked=false;
          if(stage==='required-removed')a.required=false;
        }
        results.push({stage,actual:[snapshot(required),snapshot(peer)],expected:[snapshot(native),snapshot(nativePeer)]});
      }
      return results;
    });
    for(const {stage,actual,expected} of radioValidity) assert.deepEqual(actual,expected,`radio ${stage}`);

    await page.evaluate(() => {
      const form=document.getElementById('sf-first');window.selectionSubmits=0;
      form.addEventListener('submit',event=>{event.preventDefault();window.selectionSubmits++;});
      // Radio constraints no longer apply; checkbox and switch remain required.
      document.getElementById('sf-check').indeterminate=false;
    });
    await page.locator('#sf-first button').click();
    assert.equal(await page.evaluate(()=>window.selectionSubmits),0,'invalid form blocks submit');
    assert.equal(await page.locator('#sf-check').evaluate(el=>el.shadowRoot.activeElement===el.shadowRoot.querySelector('.chk-root')),true,'validation focuses control');
    await page.locator('#sf-check').evaluate(el=>{el.checked=true;});
    await page.locator('#sf-switch').evaluate(el=>{el.checked=true;});
    await page.locator('#sf-first button').click();
    assert.equal(await page.evaluate(()=>window.selectionSubmits),1);
    const disconnected=await page.evaluate(() => {
      return ['md-checkbox','md-switch','md-radio-button'].map(tag=>{
        const el=document.createElement(tag);el.name='detached';el.required=true;
        const missing=el.validity.valueMissing;
        el.setCustomValidity('Before connection');
        return [missing,el.validity.customError,el.validationMessage];
      });
    });
    assert.deepEqual(disconnected,Array.from({length:3},()=>[true,true,'Before connection']));
  } finally { await page.locator('#selection-forms').evaluate(el=>el.remove()); }
}
