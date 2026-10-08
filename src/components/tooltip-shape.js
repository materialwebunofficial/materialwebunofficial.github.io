/** SVG browser adapter for the native union of container outline and 16 x 8 caret. */
export function tooltipOutlinePath(outline, width, height) {
  if (outline.type === 'generic') return `M${outline.points.map(p => p.join(' ')).join('L')}Z`;
  if (outline.type !== 'rounded') return `M0 0H${width}V${height}H0Z`;
  const [tl, tr, br, bl] = outline.radii;
  const arc = (r, x, y) => r[0] && r[1] ? `A${r[0]} ${r[1]} 0 0 1 ${x} ${y}` : `L${x} ${y}`;
  return `M${tl[0]} 0H${width-tr[0]}${arc(tr,width,tr[1])}V${height-br[1]}${arc(br,width-br[0],height)}H${bl[0]}${arc(bl,0,height-bl[1])}V${tl[1]}${arc(tl,tl[0],0)}Z`;
}
export function tooltipCaretPath(x, y, side) {
  if (side === 'left') return `M${x} ${y+8}L${x-8} ${y}L${x} ${y-8}Z`;
  if (side === 'right') return `M${x} ${y-8}L${x+8} ${y}L${x} ${y+8}Z`;
  if (side === 'top') return `M${x-8} ${y}L${x} ${y-8}L${x+8} ${y}Z`;
  return `M${x+8} ${y}L${x} ${y+8}L${x-8} ${y}Z`;
}
