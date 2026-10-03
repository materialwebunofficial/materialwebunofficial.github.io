/* PaddingValues logical/absolute sides and density-1 Dp rounding, AndroidX a095da93. */
const side = value => {
  const n = Math.fround(Number(value));
  if (Number.isNaN(n) || n < 0) throw new RangeError('Padding must be non-negative');
  return n;
};

export function normalizeToolbarPadding(value = 8) {
  if (typeof value === 'string') {
    const parts = value.trim().split(/\s+/), absolute = parts[0] === 'absolute';
    if (absolute) parts.shift();
    if (!parts.length || parts.length > 4 || parts.some(p => !/^(?:\+?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?(?:px)?|Infinity)$/i.test(p))) throw new RangeError('Invalid toolbar padding');
    const p = parts.map(p => side(p.replace(/px$/i, ''))), top = p[0], end = p[1] ?? top, bottom = p[2] ?? top, start = p[3] ?? end;
    return absolute ? { left: start, top, right: end, bottom } : { start, top, end, bottom };
  }
  if (typeof value === 'number') { const n = side(value); return { start: n, top: n, end: n, bottom: n }; }
  if (!value || typeof value !== 'object') throw new TypeError('Invalid toolbar padding');
  const absolute = 'left' in value || 'right' in value;
  if (absolute && ('start' in value || 'end' in value)) throw new TypeError('Use logical or absolute padding sides');
  const top = side(value.top ?? 0), bottom = side(value.bottom ?? 0);
  return absolute ? { left: side(value.left ?? 0), top, right: side(value.right ?? 0), bottom } : { start: side(value.start ?? 0), top, end: side(value.end ?? 0), bottom };
}

export function serializeToolbarPadding(value) {
  const p = normalizeToolbarPadding(value);
  return 'left' in p ? `absolute ${p.top} ${p.right} ${p.bottom} ${p.left}` : `${p.top} ${p.end} ${p.bottom} ${p.start}`;
}

export function resolveToolbarPadding(value = 8, rtl = false) {
  const p = normalizeToolbarPadding(value), px = n => Math.min(2147483647, Math.round(n));
  const left = px('left' in p ? p.left : rtl ? p.end : p.start), right = px('right' in p ? p.right : rtl ? p.start : p.end), top = px(p.top), bottom = px(p.bottom);
  return { left, top, right, bottom, horizontal: (left + right) | 0, vertical: (top + bottom) | 0 };
}
