import {ComposeColor} from './compose-color.js';
const cssSpaces={srgb:0,'srgb-linear':1,'display-p3':7,'a98-rgb':10,'prophoto-rgb':11,rec2020:5,'xyz-d50':14};
const spaceNames=Object.fromEntries(Object.entries(cssSpaces).map(([name,id])=>[id,name]));
const number=(value,scale=1)=>value.endsWith('%')?parseFloat(value)*scale/100:parseFloat(value);

// The browser resolves variables, named colors, hex, HSL, color-mix and relative
// syntax. Its canonical components then enter the original Color encoding and
// native space converter, preserving the input space wherever Compose has it.
export function resolveComposeColor(probe,color){
 probe.style.color=color;let resolved=getComputedStyle(probe).color;
 const parse=value=>{
  const match=/^([a-z][a-z0-9-]*)\((.*)\)$/.exec(value);if(!match)return null;
  const [components,opacity]=match[2].replaceAll(',',' ').split('/'),parts=components.trim().split(/\s+/);let space=0,channels,alpha;
  if(['rgb','rgba'].includes(match[1])){channels=parts.slice(0,3).map(value=>number(value,255)/255);alpha=number(opacity?.trim()??parts[3]??'1');}
  else if(['lab','oklab'].includes(match[1])){space=match[1]==='lab'?15:19;channels=parts.slice(0,3).map((value,index)=>number(value,index===0?(space===15?100:1):(space===15?125:.4)));alpha=number(opacity?.trim()??'1');}
  else if(match[1]==='color'&&parts[0] in cssSpaces){space=cssSpaces[parts.shift()];channels=parts.map(value=>number(value));alpha=number(opacity?.trim()??'1');}
  else return null;
  if(channels.length!==3||[...channels,alpha].some(value=>!Number.isFinite(value)))return null;
  return new ComposeColor(...channels,alpha,space);
 };
 let result=parse(resolved);if(result)return result;
 // CSS-only spaces/polar models are a web input binding. Resolve them into the
 // native Oklab model before its Float16 encoding; no palette values are chosen.
 probe.style.color=`oklab(from ${color} l a b / alpha)`;resolved=getComputedStyle(probe).color;result=parse(resolved);
 if(!result)throw new TypeError('Cannot resolve a Compose color: '+resolved);return result;
}
export function composeColorCSS(color){
 const [r,g,b,a]=color.components,id=color.spaceId;
 if(id===0)return`rgb(${Math.round(r*255)} ${Math.round(g*255)} ${Math.round(b*255)} / ${a})`;
 if(id===19)return`oklab(${r} ${g} ${b} / ${a})`;
 if(id===15)return`lab(${r} ${g} ${b} / ${a})`;
 if(spaceNames[id])return`color(${spaceNames[id]} ${r} ${g} ${b} / ${a})`;
 return composeColorCSS(color.convert(0));
}

// Native Color.copy replaces alpha while retaining the encoded color space.
export function composeColorWithAlpha(probe,color,alpha){return composeColorCSS(resolveComposeColor(probe,color).copy({alpha}));}
