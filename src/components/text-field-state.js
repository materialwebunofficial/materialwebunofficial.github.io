/* AndroidX TextFieldDefaults/TextFieldImpl state adaptation, Apache-2.0.
 * a095da93: symbolic live roles and source transition targets/spec choices.
 * Browser editing, font measurement and frame ownership are platform bindings.
 */
const color=(role,alpha=1,copied=false)=>({role,alpha:Math.fround(alpha),copied});
export function textFieldColors({variant='outlined',enabled=true,error=false,focused=false}){
  const disabled=!enabled,onSurface=color('OnSurface'),onVariant=color('OnSurfaceVariant');
  const content=disabled?color('OnSurface',.38,true):onSurface;
  const secondary=disabled?color('OnSurface',.38,true):onVariant;
  const affix=disabled?color('OnSurfaceVariant',.38,true):onVariant;
  return {
    text:content,container:variant==='filled'?color('SurfaceContainerHighest'):color('transparent',0),
    indicator:disabled?color('OnSurface',variant==='filled'?.38:.12,true):color(error?'Error':focused?'Primary':variant==='filled'?'OnSurfaceVariant':'Outline'),
    leading:secondary,trailing:disabled?secondary:error?color('Error'):onVariant,
    label:disabled?secondary:color(error?'Error':focused?'Primary':'OnSurfaceVariant'),
    placeholder:disabled?content:onVariant,supporting:disabled?secondary:error?color('Error'):onVariant,
    prefix:affix,suffix:affix,cursor:color(error?'Error':'Primary'),
  };
}
export function textFieldPhase(focused,empty){return focused?'Focused':empty?'UnfocusedEmpty':'UnfocusedNotEmpty';}
export function textFieldTransition(initial,target,expanded){
  const minimized=target!=='UnfocusedEmpty'||!expanded;
  const slow=initial==='UnfocusedEmpty'&&target==='Focused'||initial==='UnfocusedNotEmpty'&&target==='UnfocusedEmpty';
  return {
    label:{value:minimized?1:0,spec:'FastSpatial'},
    placeholder:{value:target==='UnfocusedNotEmpty'?0:minimized?1:0,spec:slow?'SlowEffects':'FastEffects'},
    affix:{value:minimized?1:0,spec:'FastEffects'},
  };
}
export const textFieldCssRole=role=>role==='transparent'?'transparent':'var(--md-sys-color-'+role.replace(/[A-Z]/g,(letter,index)=>(index?'-':'')+letter.toLowerCase())+')';
