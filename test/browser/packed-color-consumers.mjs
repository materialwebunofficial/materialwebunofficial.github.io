import fs from 'node:fs';import assert from 'node:assert/strict';
import {ComposeColor} from '../../src/motion/compose-color.js';import {composeColorCSS} from '../../src/motion/compose-color-css.js';
const native=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/color/packed/consumer-runtime.json',import.meta.url)));
const equalVector=(a,b,label)=>{assert.equal(a.length,b.length);a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<Math.max(1e-7,Math.abs(b[i])*4e-7),label+'/'+i+' '+v+' != '+b[i]));};
const css=value=>composeColorCSS(ComposeColor.fromPacked('0x'+value.packed));
const delivered=rows=>{const result=[];let actions=[];for(const row of rows){if(row.action)actions.push(row.action);if(row.event.endsWith('pump')){if(actions.length){result.push({...row,event:'action',actions});actions=[];}}else if(['initial','frame','between-frames'].includes(row.event))result.push({...row,actions:[]});}return result;};
export async function testPackedColorConsumers(browser,base){
 let snapshots=0,paints=0,lifetimes=0;
 for(const component of ['menu','rail','button','appbar'])for(const scheme of ['expressive','standard'])for(const space of [0,7,19])for(const [width,dark]of [[1000,false],[390,true]]){
  const subject=component==='button'?'border':'color',role=component==='menu'?'fast':'medium';
  const group=scenario=>native.filter(row=>row.subject===subject&&row.space===space&&row.role===role&&row.scheme===scheme&&row.scenario===scenario),baseline=group('forward'),a=baseline[0].value,b=baseline.find(row=>row.event==='start').action.target,c=group('disabled').find(row=>row.event==='disabled').action.target;
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.addInitScript(()=>{window.colorTime=0;performance.now=()=>window.colorTime;window.colorFrames=new Map();let id=0;requestAnimationFrame=callback=>{window.colorFrames.set(++id,callback);return id;};cancelAnimationFrame=id=>window.colorFrames.delete(id);});
   await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(()=>document.fonts.ready);
   for(const scenario of ['forward','reverse','retarget','between-retarget','double-retarget','same-target','cancel','disabled']){
    const rows=delivered(group(scenario));
    await page.evaluate(({component,scheme,a,b,c,initial,dark})=>{
     document.documentElement.dataset.theme=dark?'dark':'light';const fixture=document.querySelector('#fixture');fixture.replaceChildren();window.colorTime=0;window.colorFinished=0;
     const context=document.createElement('div');context.dataset.motionScheme=scheme;fixture.append(context);
     const tags={menu:'md-menu-item',rail:'md-navigation-rail',button:'md-button',appbar:'md-top-app-bar'},host=document.createElement(tags[component]);window.colorHost=host;
     if(component==='menu'){host.selectionMode='single';host.colors={containerColor:a,selectedContainerColor:b,disabledContainerColor:c};host.headline='Color';host.selected=initial===1;}
     if(component==='rail'){host.items=[{icon:'home',label:'First'},{icon:'mail',label:'Second'}];host.style.setProperty('--md-sys-color-on-surface-variant',a);host.style.setProperty('--md-sys-color-secondary',b);host.style.setProperty('--md-sys-color-on-secondary-container',b);host.selected=initial===1?1:0;}
     if(component==='button'){host.setAttribute('variant','outlined');host.setAttribute('toggle','');host.textContent='Toggle';host.style.setProperty('--md-sys-color-outline-variant',a);host.selected=initial===1;}
     if(component==='appbar'){host.containerColor=a;host.scrolledContainerColor=b;host.title='Color';host.overlappedFraction=initial===1?.1:0;}
     context.append(host);
     const motions={menu:()=>host._containerMotion,rail:()=>host._records[1].colorMotion,button:()=>host._borderColorMotion,appbar:()=>host._color};window.colorMotion=motions[component]();if(!window.colorMotion?.owner)throw Error('Missing packed applying owner '+component);
     window.colorMotion.owner.finishedListener=()=>window.colorFinished++;
     window.colorTarget=index=>{
      if(component==='menu'){host.enabled=index!==2;host.selected=index!==0;}
      if(component==='rail'){if(index===2)host.style.setProperty('--md-sys-color-on-surface-variant',b);else host.style.setProperty('--md-sys-color-on-surface-variant',a);host.disabled=index===2;host.selected=index===0?0:1;}
      if(component==='button'){host.disabled=index===2;host.selected=index===1;}
      if(component==='appbar'){host.scrolledContainerColor=index===2?c:b;host.overlappedFraction=index===0?0:.1;}
     };
     window.colorPaint=()=>{if(component==='menu')return[host._button,'backgroundColor'];if(component==='rail')return[host._records[1].label,'color'];if(component==='button')return[host.shadowRoot.querySelector('.btn'),'borderColor'];return[host._bar,'backgroundColor'];};
    },{component,scheme,a:css(a),b:css(b),c:css(c),initial:scenario==='reverse'?1:0,dark});
    for(const row of rows){
     if(row.event==='frame')await page.evaluate(time=>{window.colorTime=time;const frames=[...window.colorFrames.values()];window.colorFrames.clear();for(const callback of frames)callback(time);},row.time);
     else await page.evaluate(time=>{window.colorTime=time;},row.time);
     for(const action of row.actions){if(action.target)await page.evaluate(index=>window.colorTarget(index),action.target.packed===a.packed?0:action.target.packed===b.packed?1:2);if(action.cancel)await page.evaluate(()=>window.colorHost.remove());}
     const actual=await page.evaluate(expectedCSS=>{
      const owner=window.colorMotion.owner,color=value=>({packed:value.packed.toString(16).padStart(16,'0'),space:value.spaceId,vector:value.toVector()}),[node,property]=window.colorPaint(),probe=document.createElement('span');document.body.append(probe);probe.style.color=expectedCSS;
      const result={value:color(owner.value),velocity:owner.velocity,target:color(owner.state.targetValue),convertedVelocity:owner.state.velocityColor.toVector(),running:owner.state.isRunning,frames:owner.raf===null?0:1,finished:window.colorFinished,job:owner.job?{active:owner.job.active,cancelled:owner.job.cancelled,completed:owner.job.completed}:null,connected:window.colorHost.isConnected,painted:window.colorHost.isConnected?getComputedStyle(node)[property]:null,bound:getComputedStyle(probe).color};probe.remove();return result;
     },css(row.value));
     const label=component+'/'+scheme+'/'+space+'/'+width+'/'+scenario+'/'+row.time+'/'+row.event;
     for(const key of ['value','target']){assert.equal(actual[key].packed,row[key].packed,label+'/'+key);assert.equal(actual[key].space,row[key].space);equalVector(actual[key].vector,row[key].vector,label+'/'+key+' vector');}
     equalVector(actual.velocity,row.velocity,label+'/raw velocity');equalVector(actual.convertedVelocity,row.convertedVelocity,label+'/converted velocity');for(const key of ['running','frames','finished','job'])assert.deepEqual(actual[key],row[key],label+'/'+key);snapshots++;
     if(actual.connected){assert.equal(actual.painted,actual.bound,label+'/actual paint');paints++;}
    }
    assert(await page.evaluate(()=>window.colorMotion.disposed&&window.colorMotion.raf===null));lifetimes++;
   }
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 console.log('Packed applying component DOM: '+snapshots+' original value/target/velocity/job/retained-frame records, '+paints+' role paints and '+lifetimes+' removals passed for menu/rail/button/appbar,3 spaces,both schemes and1000/light390/dark');
}
