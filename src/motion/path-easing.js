/*
 * Material 3 emphasized easing as Android's PathInterpolator evaluates it
 * (m3_sys_motion_easing_emphasized):
 *   M 0,0 C 0.05,0 0.133333,0.06 0.166666,0.4 C 0.208333,0.82 0.25,1 1,1
 * The CSS token is a linear() approximation; animations driven from script
 * sample the path itself.
 */
const SEGMENTS = [
  [0, 0, 0.05, 0, 0.133333, 0.06, 0.166666, 0.4],
  [0.166666, 0.4, 0.208333, 0.82, 0.25, 1, 1, 1],
];

const cubic = (a, b, c, d, t) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

export function emphasizedEasing(fraction) {
  if (fraction <= 0) return 0;
  if (fraction >= 1) return 1;
  const [x0, y0, x1, y1, x2, y2, x3, y3] = fraction < SEGMENTS[1][0] ? SEGMENTS[0] : SEGMENTS[1];
  // Each segment's x is monotonic: bisect for the parameter at this x.
  let low = 0, high = 1;
  for (let i = 0; i < 32; i++) {
    const mid = (low + high) / 2;
    if (cubic(x0, x1, x2, x3, mid) < fraction) low = mid; else high = mid;
  }
  return cubic(y0, y1, y2, y3, (low + high) / 2);
}
