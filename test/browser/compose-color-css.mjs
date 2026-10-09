import fs from 'node:fs';import assert from 'node:assert/strict';
import {floatFromBits} from '../../src/motion/compose-color.js';
const rows=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/color/packed/values.json',import.meta.url)));
const spaces={0:'srgb',1:'srgb-linear',7:'display-p3',10:'a98-rgb',11:'prophoto-rgb',5:'rec2020',14:'xyz-d50',15:'lab',19:'oklab'};
const cases=rows.filter(row=>row.type==='color'&&row.space in spaces).filter(row=>{const input=row.input.map(floatFromBits);return(input[0]===.5&&input[3]===1)||Math.abs(input[0]-.95)<1e-6||input[0]===.125;}).map(row=>{
 const [r,g,b,a]=row.input.map(floatFromBits),name=spaces[row.space];
 const css=row.space===19||row.space===15?name+'('+r+' '+g+' '+b+' / '+a+')':'color('+name+' '+r+' '+g+' '+b+' / '+a+')';
 return{css,packed:row.value.packed,space:row.space};
});
export async function testComposeColorCSS(browser,base){
 const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');
  const result=await page.evaluate(async cases=>{
   const {resolveComposeColor,composeColorCSS}=await import('/src/motion/compose-color-css.js');
   const {AsStateColorMotion}=await import('/src/motion/animate-as-state.js');
   const host=document.createElement('div'),probe=document.createElement('span');host.append(probe);document.body.append(host);
   const snapshots=cases.map(({css})=>{const color=resolveComposeColor(probe,css),paint=composeColorCSS(color),again=resolveComposeColor(probe,paint);return{packed:color.packed.toString(16).padStart(16,'0'),space:color.spaceId,roundTrip:again.packed.toString(16).padStart(16,'0'),supported:CSS.supports('color',paint)};});
   const inputs=['#6750a4','hsl(257.14285714285717deg 34.42622950819673% 47.843137254901954%)','rebeccapurple','transparent','currentColor','color-mix(in srgb, #6750a4 40%, #ffffff)','oklch(.5 .05 270 / .5)','color(xyz-d65 .2 .3 .4 / .7)'];
   host.style.color='#6750a4';host.style.setProperty('--adapter-color','#6750a4');inputs.push('var(--adapter-color)');
   const syntax=inputs.map(css=>{const color=resolveComposeColor(probe,css),paint=composeColorCSS(color);probe.style.color=paint;return{css,packed:color.packed.toString(16).padStart(16,'0'),space:color.spaceId,paint: getComputedStyle(probe).color,supported:CSS.supports('color',paint)};});
   const draws=[],motion=new AsStateColorMotion(host,probe,'rgb(255 180 171 / .38)',value=>draws.push(value));
   const initial=motion.owner.value.packed.toString(16).padStart(16,'0'),first=draws[0];motion.set('oklab(.95 .4 -.4 / .3)',{snap:true});const target=motion.owner.value.packed.toString(16).padStart(16,'0'),last=draws.at(-1);motion.dispose();host.remove();
   return{snapshots,syntax,initial,first,target,last,disposed:motion.disposed&&motion.owner.disposed};
  },cases);
  result.snapshots.forEach((actual,i)=>{assert.equal(actual.packed,cases[i].packed,cases[i].css);assert.equal(actual.space,cases[i].space);assert.equal(actual.roundTrip,cases[i].packed,'CSS paint round trip');assert.equal(actual.supported,true);});
  for(const row of result.syntax){assert.equal(row.supported,true,row.css);assert.ok(row.paint&&row.packed.length===16);}
  for(const input of ['#6750a4','currentColor','var(--adapter-color)'])assert.equal(result.syntax.find(row=>row.css===input).packed,'ff6750a400000000');
  assert.equal(result.syntax.find(row=>row.css==='transparent').packed,'0000000000000000');
  const initial=rows.find(row=>row.type==='color'&&row.space===0&&Math.abs(floatFromBits(row.input[0])-1)<1e-7&&Math.abs(floatFromBits(row.input[3])-.38)<1e-6),target=rows.find(row=>row.type==='color'&&row.space===19&&Math.abs(floatFromBits(row.input[0])-.95)<1e-6);
  assert.equal(result.initial,initial.value.packed);assert.equal(result.target,target.value.packed);assert.equal(result.first,'rgb(255 180 171 / '+floatFromBits(initial.value.bits[3])+')');assert.ok(result.last.startsWith('oklab('));assert.equal(result.disposed,true);assert.deepEqual(errors,[]);
  console.log('Packed Color CSS binding: '+cases.length+' exact original packed inputs/paint round trips, '+result.syntax.length+' browser syntax bindings and native retained colors at rest/Snap passed');
 }finally{await page.close();}
}
