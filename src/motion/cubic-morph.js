/** Draw AndroidX Morph's matched cubic pairs, centered as LoadingIndicator.processPath does. */
export function interpolateCubics([from, to], progress) {
  return from.map((segment, i) => segment.map((value, j) => value + (to[i][j] - value) * progress));
}

export function drawMorph(ctx, pair, progress, scale) {
  const cubics = interpolateCubics(pair, progress);
  // Compose Path.getBounds uses the bounds of anchors and control points.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of cubics) for (let i = 0; i < 8; i += 2) {
    minX = Math.min(minX, c[i]); maxX = Math.max(maxX, c[i]);
    minY = Math.min(minY, c[i + 1]); maxY = Math.max(maxY, c[i + 1]);
  }
  const x = (minX + maxX) / 2, y = (minY + maxY) / 2;
  ctx.beginPath();
  ctx.moveTo((cubics[0][0] - x) * scale, (cubics[0][1] - y) * scale);
  for (const c of cubics) ctx.bezierCurveTo(
    (c[2] - x) * scale, (c[3] - y) * scale,
    (c[4] - x) * scale, (c[5] - y) * scale,
    (c[6] - x) * scale, (c[7] - y) * scale,
  );
  ctx.closePath();
  ctx.fill();
}
