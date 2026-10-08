import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const directory=new URL('../fixtures/androidx/selection/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('sources.json',directory)));
for(const file of ['Switch.kt','tokens/SwitchTokens.kt']){
  const entry=manifest[file];assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(file.split('/').pop(),directory))).digest('hex'),entry.sha256,file);
}
const source=fs.readFileSync(new URL('SwitchTokens.kt',directory),'utf8');
const roles=Object.fromEntries([...source.matchAll(/inline val (\w+): ColorToken\s+get\(\) = ColorSchemeKeyTokens\.(\w+)/g)].map(m=>[m[1],m[2]]));
const opacity=Object.fromEntries([...source.matchAll(/const val (\w+) = ([\d.]+)f/g)].map(m=>[m[1],Number(m[2])]));
const cssRole=role=>role.replace(/[A-Z]/g,(c,i)=>(i?'-':'')+c.toLowerCase());
const rgb=value=>value.match(/[-+]?\d*\.?\d+/g).slice(0,3).map(x=>Number(x)*(value.startsWith('color(')?255:1));
const luminance=value=>{const [r,g,b]=rgb(value).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return .2126*r+.7152*g+.0722*b;};
const contrast=(a,b)=>{a=luminance(a);b=luminance(b);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);};

export async function testSwitchColors(page){
  let pairs=0,minContrast=Infinity;
  await page.evaluate(async()=>{
    window.switchColorApi=window.toolbarApi||await import('/dist/md3-expressive.esm.js');
    window.switchAlphaApi=await import('/src/theme/color-alpha.js');
    window.switchSurfaceApi=await import('/src/theme/surface-color.js');
    window.savedSwitchColorTheme={theme:window.switchColorApi.MdExpressiveTheme.getTheme(),style:document.documentElement.getAttribute('style'),attributes:Object.fromEntries(['data-theme','data-theme-scheme','data-motion-scheme','data-contrast','data-seed-color'].map(name=>[name,document.documentElement.getAttribute(name)]))};
    const fixture=document.createElement('div');fixture.id='switch-colors';fixture.style.cssText='position:fixed;top:100px;left:100px;z-index:999999;display:flex;gap:32px;padding:24px;background:var(--md-sys-color-surface)';
    fixture.innerHTML='<md-switch id="color-off" icon="close"></md-switch><md-switch id="color-on" checked icon="check"></md-switch>';
    document.body.append(fixture);window.switchColorNodes=[...fixture.querySelectorAll('md-switch')].map(h=>h.shadowRoot.querySelector('.icon'));
  });
  try{
    for(const primarySeed of ['#6750a4','#e87988','#ff0000','#00ff00','#0000ff','#808080'])for(const scheme of ['standard','expressive'])for(const colorMode of ['light','dark'])for(const level of [-1,0,.5,1]){
      await page.evaluate(({primarySeed,scheme,colorMode,level})=>window.switchColorApi.MdExpressiveTheme.applyGlobal({primarySeed,scheme,colorMode,contrast:String(level)}),{primarySeed,scheme,colorMode,level});
      for(const state of ['rest','hover','focus','pressed','disabled']){
        await page.mouse.move(1,1);await page.evaluate(()=>document.activeElement?.blur());
        for(const checked of [false,true]){
          const id=checked?'color-on':'color-off',host=page.locator('#'+id),root=host.locator('.switch-root');
          await host.evaluate((h,disabled)=>{h.disabled=disabled;h.shadowRoot.querySelector('.switch-root').classList.remove('pressed');},state==='disabled');
          if(state==='hover')await root.hover();
          if(state==='focus')await host.evaluate(h=>h.focus());
          if(state==='pressed')await root.evaluate(root=>{const r=root.getBoundingClientRect();root.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1,pointerType:'mouse',button:0,isPrimary:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2}));});
          const interactive=state==='hover'||state==='focus'||state==='pressed';
          let background,foreground,backgroundAlpha=1,foregroundAlpha=1;
          if(state==='disabled'){
            background=roles[checked?'DisabledSelectedHandleColor':'DisabledUnselectedHandleColor'];foreground=roles[checked?'DisabledSelectedIconColor':'DisabledUnselectedIconColor'];
            backgroundAlpha=opacity[checked?'DisabledSelectedHandleOpacity':'DisabledUnselectedHandleOpacity'];foregroundAlpha=opacity[checked?'DisabledSelectedIconOpacity':'DisabledUnselectedIconOpacity'];
          }else{
            const prefix=(checked?'Selected':'Unselected')+(interactive?state==='hover'?'Hover':state==='focus'?'Focus':'Pressed':'');
            background=roles[prefix+'HandleColor'];
            // ColorSpec2025 profile: resting OnPrimary thumb uses paired Primary
            // ink. Source interactive PrimaryContainer/OnPrimaryContainer remains.
            foreground=checked&&!interactive?'Primary':roles[prefix+'IconColor'];
          }
          const result=await host.evaluate((h,{background,foreground,backgroundAlpha,foregroundAlpha,disabled})=>{
            const b=h.shadowRoot.querySelector('.handle'),i=h.shadowRoot.querySelector('.icon'),probe=document.createElement('span');h.shadowRoot.append(probe);
            const resolve=(role,alpha)=>{const color=`var(--md-sys-color-${role})`;return disabled?window.switchAlphaApi.resolveColorAlpha(probe,{color,alpha,over:'var(--md-sys-color-surface)'}):color;};
            const wanted={background:resolve(background,backgroundAlpha),foreground:resolve(foreground,foregroundAlpha)},actual={background:getComputedStyle(b).backgroundColor,foreground:getComputedStyle(i).color};
            const keys=colors=>Object.fromEntries(Object.entries(colors).map(([name,color])=>[name,window.switchSurfaceApi.resolveSurfaceColor(probe,color).key]));
            const actualKeys=keys(actual),wantedKeys=keys(wanted);probe.remove();
            return{wantedKeys,actualKeys,actual,retained:i===window.switchColorNodes[h.checked?1:0],visible:getComputedStyle(i).opacity};
          },{background:cssRole(background),foreground:cssRole(foreground),backgroundAlpha,foregroundAlpha,disabled:state==='disabled'});
          assert.deepEqual(result.actualKeys,result.wantedKeys,`${primarySeed}/${scheme}/${colorMode}/${level}/${state}/${checked}`);assert.equal(result.retained,true);assert.equal(result.visible,'1');
          if(state!=='disabled'){const ratio=contrast(result.actual.foreground,result.actual.background);assert.ok(ratio>=3,`Switch icon contrast ${ratio} < 3: ${primarySeed}/${scheme}/${colorMode}/${level}/${state}/${checked}`);minContrast=Math.min(minContrast,ratio);}
          pairs++;
          if(state==='pressed')await root.dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',button:0,isPrimary:true});
          await page.mouse.move(1,1);await page.evaluate(()=>document.activeElement?.blur());
        }
      }
    }
    console.log(`Switch colors: ${pairs} live thumb/icon role pairs across six seeds/two schemes/light-dark/four contrast levels/rest-hover-focus-press-disabled passed; minimum enabled icon contrast ${minContrast.toFixed(2)}:1.`);
  }finally{await page.evaluate(()=>{document.querySelector('#switch-colors')?.remove();const saved=window.savedSwitchColorTheme;window.switchColorApi.MdExpressiveTheme.applyGlobal(saved.theme);if(saved.style===null)document.documentElement.removeAttribute('style');else document.documentElement.setAttribute('style',saved.style);for(const [name,value]of Object.entries(saved.attributes)){if(value===null)document.documentElement.removeAttribute(name);else document.documentElement.setAttribute(name,value);}});}
}
