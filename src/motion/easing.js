/** Evaluate a CSS/Compose cubic Bezier by inverting its x coordinate. */
export function cubicBezier(x1, y1, x2, y2, progress) {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  const sample = (t, a, b) => 3 * (1-t) ** 2 * t * a + 3 * (1-t) * t*t*b + t*t*t;
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) {
    const t = (lo+hi)/2;
    if (sample(t,x1,x2) < progress) lo = t; else hi = t;
  }
  return sample((lo+hi)/2,y1,y2);
}
