// CSS shadows adapt the native scalar elevation; platform rasterization is separate.
function splitLayers(text) {
  let depth = 0, start = 0; const layers = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') depth--;
    else if (text[i] === ',' && !depth) { layers.push(text.slice(start, i)); start = i + 1; }
  }
  layers.push(text.slice(start));
  return layers;
}

function parseLayer(text) {
  const lengths = [...text.matchAll(/(-?[\d.]+)px/g)].map(match => Number(match[1]));
  if (lengths.length < 2) return null;
  while (lengths.length < 4) lengths.push(0);
  const color = text.replace(/-?[\d.]+px/g, '').replace(/\binset\b/g, '').trim();
  return {lengths, color: color || 'currentColor', inset: /\binset\b/.test(text)};
}

export function interpolateShadow(from, to, fraction) {
  if (fraction <= 0) return from;
  if (fraction >= 1) return to;
  const a = from === 'none' ? [] : splitLayers(from).map(parseLayer);
  const b = to === 'none' ? [] : splitLayers(to).map(parseLayer);
  if ([...a, ...b].some(layer => !layer)) return fraction < .5 ? from : to;
  return Array.from({length: Math.max(a.length, b.length)}, (_, index) => {
    const left = a[index] || {lengths: [0, 0, 0, 0], color: 'transparent', inset: b[index].inset};
    const right = b[index] || {lengths: [0, 0, 0, 0], color: 'transparent', inset: a[index].inset};
    const lengths = left.lengths.map((value, i) => `${value + (right.lengths[i] - value) * fraction}px`).join(' ');
    const color = left.color === right.color ? left.color
      : `color-mix(in srgb, ${left.color} ${(1 - fraction) * 100}%, ${right.color} ${fraction * 100}%)`;
    return `${left.inset ? 'inset ' : ''}${lengths} ${color}`;
  }).join(', ') || 'none';
}
