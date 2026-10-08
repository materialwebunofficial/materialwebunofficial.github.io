// Browser shadow adapter. SVG keeps a cut outline's shadow outside its content clip.
const ns = 'http://www.w3.org/2000/svg';
let nextId = 0;
const element = name => document.createElementNS(ns, name);
const attributes = (node, values) => {
  for (const [key, value] of Object.entries(values)) {
    const text = String(value);
    if (node.getAttribute(key) !== text) node.setAttribute(key, text);
  }
};

/** CSSOM sRGB shadow layers used by the browser outline adapter. */
export const parseBoxShadow = text => [...text.matchAll(/(rgba?\([^)]*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px\s+(-?[\d.]+)px/g)].map(match => {
  const color = match[1].match(/[\d.]+/g).map(Number);
  return [...match.slice(2).map(Number), ...color.slice(0, 3), color[3] ?? 1];
});

export class OutlineShadow {
  constructor(parent) {
    this.layer = element('svg');
    attributes(this.layer, { class: 'shape-shadow', 'aria-hidden': true, focusable: false });
    const defs = element('defs');
    this.filter = element('filter');
    const id = `md-outline-shadow-${++nextId}`;
    attributes(this.filter, { id, filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' });
    defs.append(this.filter);
    this.path = element('path');
    // Native layer shadow follows the outline, independently of background alpha.
    // Only the filtered shadows are emitted; this opaque mask is never painted.
    attributes(this.path, { fill: 'black', filter: `url(#${id})` });
    this.layer.append(defs, this.path);
    this.hide();
    parent.prepend(this.layer);
  }

  hide() { this.layer.style.display = 'none'; }

  draw(outline, box, shadows) {
    if (!shadows.length || box.width <= 0 || box.height <= 0) { this.hide(); return; }
    this.layer.style.display = 'block';
    this.layer.style.left = box.x + 'px';
    this.layer.style.top = box.y + 'px';
    attributes(this.layer, { width: box.width, height: box.height, viewBox: `0 0 ${box.width} ${box.height}` });
    attributes(this.path, { d: outline.path ?? `M${outline.points.map(p => p.join(' ')).join('L')}Z` });
    const margin = Math.ceil(Math.max(...shadows.map(s => s[2] + Math.abs(s[3]) + Math.max(Math.abs(s[0]), Math.abs(s[1])))) + 2 + (outline.extension ?? 0));
    attributes(this.filter, { x: -margin, y: -margin, width: box.width + 2 * margin, height: box.height + 2 * margin });
    if (this.parts?.length !== shadows.length) {
      this.filter.replaceChildren();
      this.parts = shadows.map((_, i) => {
        const spread = element('feMorphology'), blur = element('feGaussianBlur'), offset = element('feOffset');
        const color = element('feFlood'), composite = element('feComposite');
        attributes(spread, { in: 'SourceAlpha', result: `spread${i}` });
        attributes(blur, { in: `spread${i}`, result: `blur${i}` });
        attributes(offset, { in: `blur${i}`, result: `offset${i}` });
        attributes(color, { result: `color${i}` });
        attributes(composite, { in: `color${i}`, in2: `offset${i}`, operator: 'in', result: `shadow${i}` });
        this.filter.append(spread, blur, offset, color, composite);
        return { spread, blur, offset, color };
      });
      const merge = element('feMerge');
      // CSS puts the first shadow above the subsequent shadows.
      for (let i = shadows.length - 1; i >= 0; i--) {
        const layer = element('feMergeNode'); attributes(layer, { in: `shadow${i}` }); merge.append(layer);
      }
      this.filter.append(merge);
    }
    shadows.forEach(([x, y, blur, spread, r, g, b, alpha], i) => {
      const part = this.parts[i];
      attributes(part.spread, { radius: Math.abs(spread), operator: spread < 0 ? 'erode' : 'dilate' });
      attributes(part.blur, { stdDeviation: Math.max(0, blur) / 2 });
      attributes(part.offset, { dx: x, dy: y });
      attributes(part.color, { 'flood-color': `rgb(${r},${g},${b})`, 'flood-opacity': alpha });
    });
  }
}
