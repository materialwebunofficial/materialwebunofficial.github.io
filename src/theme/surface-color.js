// AndroidX ColorScheme.contentColorFor and surfaceColorAtElevation (pinned in
// test/fixtures/androidx/fab-surface). Compose sRGB Color packs 8-bit channels
// before composition; a continuous CSS color-mix gives different results.
const f=Math.fround;
const schemeCache=new WeakMap();
export const CONTENT_COLOR_ROLES=Object.freeze([
 ['primary','on-primary'],['secondary','on-secondary'],['tertiary','on-tertiary'],
 ['background','on-background'],['error','on-error'],
 ['primary-container','on-primary-container'],['secondary-container','on-secondary-container'],
 ['tertiary-container','on-tertiary-container'],['error-container','on-error-container'],
 ['inverse-surface','inverse-on-surface'],['surface','on-surface'],['surface-variant','on-surface-variant'],
 ...['surface-bright','surface-container','surface-container-high','surface-container-highest',
 'surface-container-low','surface-container-lowest','surface-dim'].map(role=>[role,'on-surface']),
 ...['primary','secondary','tertiary'].flatMap(role=>[[role+'-fixed','on-'+role+'-fixed'],[role+'-fixed-dim','on-'+role+'-fixed']])
]);
export function packSrgb([red,green,blue,alpha=1]) {
 const byte=value=>Math.trunc(f(f(Math.min(1,Math.max(0,f(value)))*255)+.5));
 return ((byte(alpha)<<24)|(byte(red)<<16)|(byte(green)<<8)|byte(blue))>>>0;
}
export function unpackSrgb(color) {
 return[(color>>>16)&255,(color>>>8)&255,color&255,color>>>24].map(value=>f(value/255));
}
export function tonalSurfaceColor(surface,tint,elevation) {
 elevation=f(elevation);if(elevation===0)return surface;
 const alpha=f(f(f(4.5*f(Math.log(f(elevation+1))))+2)/100);
 const fg=unpackSrgb(packSrgb([...unpackSrgb(tint).slice(0,3),alpha])),bg=unpackSrgb(surface);
 const remainder=f(1-fg[3]),a=f(fg[3]+f(bg[3]*remainder));
 const components=fg.slice(0,3).map((channel,i)=>a===0?0:f(f(f(channel*fg[3])+f(f(bg[i]*bg[3])*remainder))/a));
 return packSrgb([...components,a]);
}
export function matchingContentColor(background,scheme) {
 for(const[container,content]of CONTENT_COLOR_ROLES)if(scheme[container]!==undefined&&background===scheme[container])return scheme[content];
 return undefined;
}
export function srgbCss(color) {
 const [r,g,b,a]=[(color>>>16)&255,(color>>>8)&255,color&255,color>>>24];
 return `rgba(${r}, ${g}, ${b}, ${a/255})`;
}
// Preserve color-space identity. P3/Oklab colors are not equated with an sRGB
// theme role by clipping them through Canvas; their native wide-gamut tonal
// packing is outside this sRGB adapter.
export function resolveSurfaceColor(probe,color) {
 probe.style.color='';probe.style.color=color;
 const css=getComputedStyle(probe).color;
 const rgb=/^rgba?\(([^)]+)\)$/.exec(css),srgb=/^color\(srgb\s+([^)]+)\)$/.exec(css);
 let packed;
 if(rgb){const channels=rgb[1].split(/[,\s/]+/).filter(Boolean).map(Number);packed=packSrgb([...channels.slice(0,3).map(v=>v/255),channels[3]??1]);}
 else if(srgb){const channels=srgb[1].split(/[\s/]+/).filter(Boolean).map(Number);packed=packSrgb(channels);}
 return{css,key:packed??css,packed};
}
export function resolveSurfaceColors(host,probe,{container,content,elevation=0}) {
 const style=getComputedStyle(host),resolved=new Map();
 const resolve=color=>{if(!resolved.has(color))resolved.set(color,resolveSurfaceColor(probe,color));return resolved.get(color);};
 const roles=[...new Set(CONTENT_COLOR_ROLES.flat())];
 const values=roles.map(role=>style.getPropertyValue('--md-sys-color-'+role).trim());
 const signature=JSON.stringify([style.color,values]);
 let cached=schemeCache.get(host);
 if(cached?.signature!==signature){
  const scheme={};
  for(let i=0;i<roles.length;i++){
   if(values[i])scheme[roles[i]]=resolve(values[i]).key;
  }
  cached={signature,scheme};schemeCache.set(host,cached);
 }
 const scheme=cached.scheme;
 const background=resolve(container);
 const foreground=content?resolve(content).css:matchingContentColor(background.key,scheme);
 const parent=parseFloat(style.getPropertyValue('--md-absolute-tonal-elevation'))||0;
 const total=f(f(parent)+f(elevation));
 const enabled=!['false','0'].includes(style.getPropertyValue('--md-tonal-elevation-enabled').trim());
 const tint=style.getPropertyValue('--md-sys-color-surface-tint').trim();
 const tintColor=tint?resolve(tint):null;
 const tonal=enabled&&background.key===scheme.surface&&background.packed!==undefined&&tintColor?.packed!==undefined;
 return{container:tonal?srgbCss(tonalSurfaceColor(background.packed,tintColor.packed,total)):background.css,
  content:typeof foreground==='number'?srgbCss(foreground):foreground??style.color,total};
}
