// Adapted from AndroidX CornerBasedShape, CornerSize and RoundRect, Apache-2.0.
// Original source references and license notices are in NOTICE and test fixtures.
const f = Math.fround;

const uniform = value => [value, value, value, value];
export const circleCornerShape = Object.freeze({
  type: 'rounded', absolute: false,
  corners: Object.freeze(uniform(Object.freeze({ unit: 'percent', value: 50 }))),
});
export const rectangleCornerShape = Object.freeze({ type: 'rectangle' });

/** Public web representation of Compose's four logical or absolute corners. */
export function normalizeCornerShape(value = circleCornerShape) {
  if (value === 'full') return circleCornerShape;
  if (value === 'rectangle') return rectangleCornerShape;
  if (typeof value === 'string') value = JSON.parse(value);
  if (value?.type === 'rectangle') return rectangleCornerShape;
  if (!value || !['rounded', 'cut'].includes(value.type)) throw new TypeError('Expected a rounded, cut or rectangle shape');
  const corners = Array.isArray(value.corners) ? value.corners : uniform(value.corners ?? 0);
  if (corners.length !== 4) throw new TypeError('Expected four corners in top-start, top-end, bottom-end, bottom-start order');
  const normalized = corners.map(corner => {
    const unit = typeof corner === 'number' ? 'px' : corner?.unit;
    const size = f(typeof corner === 'number' ? corner : corner?.value);
    if (!['px', 'dp', 'percent'].includes(unit) || !Number.isFinite(size) || size < 0 || (unit === 'percent' && size > 100)) {
      throw new RangeError('Corners need finite nonnegative px/dp sizes or percentages in [0, 100]');
    }
    return Object.freeze({ unit, value: size });
  });
  return Object.freeze({ type: value.type, absolute: value.absolute === true, corners: Object.freeze(normalized) });
}

function cornerPx(corner, minimum, density) {
  const value = f(typeof corner === 'number' ? corner : corner.value);
  switch (typeof corner === 'number' ? 'px' : corner.unit) {
    case 'px': return value;
    case 'dp': return f(value * density);
    case 'percent':
      if (value < 0 || value > 100) throw new RangeError('Corner percent must be in [0, 100]');
      return f(minimum * f(value / 100));
    default: throw new TypeError('Unknown corner unit');
  }
}

/** Resolve the original raw outline. Corner order is TS/TE/BE/BS, or TL/TR/BR/BL. */
export function cornerShapeOutline(shape = circleCornerShape, width, height, rtl = false, density = 1) {
  width = f(width); height = f(height); density = f(density);
  const bounds = { left: 0, top: 0, right: width, bottom: height };
  if (shape.type === 'rectangle') return { type: 'rectangle', bounds };
  if (!['rounded', 'cut'].includes(shape.type) || shape.corners?.length !== 4) throw new TypeError('Invalid corner shape');
  const minimum = Math.min(Math.abs(width), Math.abs(height));
  let [ts, te, be, bs] = shape.corners.map(value => cornerPx(value, minimum, density));
  if (f(ts + bs) > minimum) {
    const scale = f(minimum / f(ts + bs)); ts = f(ts * scale); bs = f(bs * scale);
  }
  if (f(te + be) > minimum) {
    const scale = f(minimum / f(te + be)); te = f(te * scale); be = f(be * scale);
  }
  if (![ts, te, be, bs].every(value => value >= 0)) throw new RangeError('Corner size cannot be negative or NaN');
  if (f(f(f(ts + te) + be) + bs) === 0) return { type: 'rectangle', bounds };
  const [tl, tr, br, bl] = rtl && !shape.absolute ? [te, ts, bs, be] : [ts, te, be, bs];
  if (shape.type === 'rounded') return { type: 'rounded', bounds, radii: [tl, tr, br, bl].map(value => [value, value]) };
  return { type: 'generic', bounds, points: [[0, tl], [tl, 0], [f(width - tr), 0], [width, tr],
    [width, f(height - br)], [f(width - br), height], [bl, height], [0, f(height - bl)]] };
}

/** The normalized radii used by original RoundRect.contains; bounds remain raw. */
export function roundedOutlineRadii({ bounds: b, radii }) {
  const width = f(b.right - b.left), height = f(b.bottom - b.top);
  let scale = 1;
  for (const [a, z, limit] of [[radii[3][1], radii[0][1], height], [radii[0][0], radii[1][0], width],
    [radii[1][1], radii[2][1], height], [radii[2][0], radii[3][0], width]]) {
    const sum = f(a + z);
    if (sum > limit && sum !== 0) scale = Math.min(scale, f(limit / sum));
  }
  return radii.map(corner => corner.map(value => f(value * scale)));
}

/** Original Float RoundRect point containment, including exclusive far bounds. */
export function roundedOutlineContains(outline, point) {
  const p = point.map(f), b = outline.bounds;
  if (p[0] < b.left || p[0] >= b.right || p[1] < b.top || p[1] >= b.bottom) return false;
  const [tl, tr, br, bl] = roundedOutlineRadii(outline);
  let x, y, radius;
  if (p[0] < f(b.left + tl[0]) && p[1] < f(b.top + tl[1])) {
    x = f(f(p[0] - b.left) - tl[0]); y = f(f(p[1] - b.top) - tl[1]); radius = tl;
  } else if (p[0] > f(b.right - tr[0]) && p[1] < f(b.top + tr[1])) {
    x = f(f(p[0] - b.right) + tr[0]); y = f(f(p[1] - b.top) - tr[1]); radius = tr;
  } else if (p[0] > f(b.right - br[0]) && p[1] > f(b.bottom - br[1])) {
    x = f(f(p[0] - b.right) + br[0]); y = f(f(p[1] - b.bottom) + br[1]); radius = br;
  } else if (p[0] < f(b.left + bl[0]) && p[1] > f(b.bottom - bl[1])) {
    x = f(f(p[0] - b.left) - bl[0]); y = f(f(p[1] - b.bottom) + bl[1]); radius = bl;
  } else return true;
  const nx = f(x / radius[0]), ny = f(y / radius[1]);
  return f(f(nx * nx) + f(ny * ny)) <= 1;
}
