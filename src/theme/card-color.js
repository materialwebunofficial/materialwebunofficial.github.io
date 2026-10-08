/* AndroidX CardColors/default getters and Surface role bridge, Apache-2.0.
 * Source: test/fixtures/androidx/card/Card.kt. Colors are immediate getters;
 * alpha replacement/composition uses the independently verified color kernel.
 */
import {resolveColorAlpha} from './color-alpha.js';
import {resolveSurfaceColor,resolveSurfaceColors} from './surface-color.js';
import {observeThemeContext} from './theme-context.js';
const fields=['containerColor','contentColor','disabledContainerColor','disabledContentColor'];
export function cardColorDefinition(value){
 if(value===undefined)return undefined;
 if(!value||typeof value!=='object'||fields.some(key=>typeof value[key]!=='string'||!value[key].trim()||globalThis.CSS&&!CSS.supports('color',value[key])))throw new TypeError('Card colors require four valid container/content/disabled container/disabled content CSS colors.');
 return Object.freeze(Object.fromEntries(fields.map(key=>[key,value[key]])));
}
export function bindCardColors(host,card,{variant,disabled,definition,signal}){
 const probe=document.createElement('span');probe.hidden=true;probe.setAttribute('aria-hidden','true');card.append(probe);
 const names=['--_md-card-container-color','--_md-card-content-color','--_md-card-outline-color'];
 const records=names.map(name=>({name,value:card.style.getPropertyValue(name),priority:card.style.getPropertyPriority(name),written:null}));
 let disposed=false;
 function refresh(){
  if(disposed||!host.isConnected)return;
  const mode=variant(),isDisabled=disabled(),custom=definition(),style=getComputedStyle(host);
  const role=name=>`var(--md-sys-color-${name})`,override=name=>style.getPropertyValue(`--md-card-${name}`).trim();
  const defaultContainer=role(mode==='elevated'?'surface-container-low':mode==='outlined'?'surface':'surface-container-highest');
  const container=custom?.containerColor??(override('container-color')||defaultContainer);
  const base=resolveSurfaceColors(host,probe,{container,content:custom?.contentColor??(override('content-color')||undefined),elevation:0});
  let background=base.container,content=base.content;
  if(isDisabled){
   background=custom?.disabledContainerColor??override('disabled-container-color');
   if(!background)background=mode==='outlined'?role('surface'):resolveColorAlpha(probe,{color:role(mode==='filled'?'surface-variant':'surface'),alpha:.38,over:role(mode==='filled'?'surface-container-highest':'surface')});
   content=custom?.disabledContentColor??override('disabled-content-color');
   if(!content){const input=mode==='outlined'?resolveSurfaceColors(host,probe,{container:container||defaultContainer,elevation:0}).content:base.content;content=resolveColorAlpha(probe,{color:input,alpha:.38});}
   const surface=resolveSurfaceColors(host,probe,{container:background,content,elevation:0});background=surface.container;content=surface.content;
  }
  const outline=isDisabled?resolveColorAlpha(probe,{color:role('outline'),alpha:.12,over:role('surface-container-low')}):resolveSurfaceColor(probe,role('outline-variant')).css;
  for(const [index,color]of [background,content,outline].entries()){const record=records[index];card.style.setProperty(record.name,color);record.written=card.style.getPropertyValue(record.name);}
 }
 const stopTheme=observeThemeContext(host,refresh);
 function dispose(){if(disposed)return;disposed=true;stopTheme();probe.remove();for(const record of records)if(card.style.getPropertyValue(record.name)===record.written){if(record.value)card.style.setProperty(record.name,record.value,record.priority);else card.style.removeProperty(record.name);}}
 signal?.addEventListener('abort',dispose,{once:true});return {refresh,dispose,records,get disposed(){return disposed;}};
}
