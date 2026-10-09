/* AndroidX Chip.kt a095da93 default factories, border and expressive shape roles.
 * Automatic check/removal and HTML events are web caller-policy adapters.
 */
const f=Math.fround,color=(role,alpha=1,copied=false)=>({role,alpha:alpha===null?null:f(alpha),copied});
export const chipFamily=variant=>['assist','filter','input','suggestion'].includes(variant)?variant:'assist';
export function chipColors({family='assist',elevated=false,expressive=true,enabled=true,selected=false}){
 family=chipFamily(family);elevated=elevated&&family!=='input';
 const selectable=family==='filter'||family==='input',checked=selectable&&selected,disabled=!enabled;
 const content=disabled?color('OnSurface',.38,true):color(checked?'OnSecondaryContainer':family==='assist'?'OnSurface':'OnSurfaceVariant');
 const leading=disabled?content:color(checked?family==='input'?'Primary':'OnSecondaryContainer':family==='filter'&&expressive||family==='input'?'OnSurfaceVariant':'Primary');
 return{container:disabled&&(elevated||checked)?color('OnSurface',.12,true):disabled?color('transparent',0):checked?color('SecondaryContainer'):elevated?color('SurfaceContainerLow'):color('transparent',0),label:content,leading,trailing:family==='suggestion'?color('unspecified',null):disabled?content:color(checked?'OnSecondaryContainer':family==='assist'?'Primary':'OnSurfaceVariant')};
}
export function chipBorder({family='assist',elevated=false,enabled=true,selected=false}){
 family=chipFamily(family);if(elevated&&family!=='input')return null;
 const checked=(family==='filter'||family==='input')&&selected;
 return{width:checked?0:1,color:checked?color('transparent',0):enabled?color('OutlineVariant'):color('OnSurface',.12,true)};
}
/** Source order: rest, press, focus, hover, drag, disabled. */
export function chipElevation({family='assist',elevated=false}){family=chipFamily(family);return elevated&&family!=='input'?[1,1,1,3,8,0]:[0,0,0,family==='filter'?1:0,8,0];}
export function chipShapeRole({family='assist',expressive=true,selected=false,pressed=false}){family=chipFamily(family);return expressive&&(family==='filter'||family==='input')?pressed?'CornerSmall':selected?'CornerFull':'CornerMedium':'CornerSmall';}
export function chipPadding({family='assist',avatar=false,leading=false,trailing=false}){return chipFamily(family)==='input'?{start:avatar||!leading?4:8,end:trailing?8:4}:{start:8,end:8};}
export function chipSpacing({family='assist',expressive=true,avatar=false,leading=false,trailing=false}){
 const selectable=family==='filter'||family==='input',hasLeading=leading||family==='input'&&avatar;
 return expressive&&selectable?{leading:hasLeading?4:8,trailing:trailing?4:8,spacing:hasLeading&&trailing?4:hasLeading||trailing?6:8}:{leading:8,trailing:8,spacing:8};
}
export function chipArrange({total,sizes,rtl=false,density=1,...options}){
 const spacing=chipSpacing(options),first=Math.floor(f(f(spacing.leading)*f(density))+.5),second=Math.floor(f(f(spacing.trailing)*f(density))+.5);
 return sizes.map((size,index)=>{const x=index===0?0:index===1?sizes[0]+(sizes[0]>0?first:second):index===2?total-size:0;return rtl?total-x-size:x;});
}
export const chipCssRole=role=>role==='transparent'?'transparent':role==='unspecified'?'currentColor':'var(--md-sys-color-'+role.replace(/[A-Z]/g,(letter,index)=>(index?'-':'')+letter.toLowerCase())+')';
export function chipCssColor(descriptor){const role=chipCssRole(descriptor.role);return descriptor.copied?'rgb(from '+role+' r g b / '+(Math.floor(f(f(descriptor.alpha)*255)+.5)/255)+')':role;}
