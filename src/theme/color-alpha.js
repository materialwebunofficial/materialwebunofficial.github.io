/* AndroidX Color.copy / compositeOver adaptation, Apache-2.0.
 * Native sRGB packing and Float arithmetic share the Surface color kernel.
 * Wide-gamut CSS retains its declared space; native Float16 packing is separate.
 */
import {copySrgbAlpha,compositeSrgb,resolveSurfaceColor,srgbCss} from './surface-color.js';
export {copySrgbAlpha,compositeSrgb};
const space=css=>/^color\(\s*([\w-]+)/.exec(css)?.[1]??/^(oklab|oklch|lab|lch)\(/.exec(css)?.[1]??'srgb';
function cssCopyAlpha(css,alpha){
  const kind=space(css),channels=kind==='oklab'||kind==='lab'?'l a b':kind==='oklch'||kind==='lch'?'l c h':kind.startsWith('xyz')?'x y z':'r g b';
  return ['oklab','oklch','lab','lch'].includes(kind)?`${kind}(from ${css} ${channels} / ${alpha})`:`color(from ${css} ${kind} ${channels} / ${alpha})`;
}
export function resolveColorAlpha(probe,{color,alpha,over}){
  const foreground=resolveSurfaceColor(probe,color),background=over?resolveSurfaceColor(probe,over):null;
  if(foreground.packed!==undefined&&(!background||background.packed!==undefined)){
    const copied=copySrgbAlpha(foreground.packed,alpha);
    return srgbCss(background?compositeSrgb(copied,background.packed):copied);
  }
  const copied=cssCopyAlpha(foreground.css,alpha);
  if(!background)return copied;
  // Color.compositeOver converts the foreground into the background's space.
  // Color-mix supplies the same alpha-weighted components for this CSS fallback.
  const opaque=cssCopyAlpha(foreground.css,1);
  return `color-mix(in ${space(background.css)}, ${opaque} ${alpha*100}%, ${background.css})`;
}
