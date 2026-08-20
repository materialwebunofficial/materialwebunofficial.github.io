/**
 * Test script to generate exact RoundedPolygon shapes matching AndroidX MaterialShapes.kt
 */

function angleDegrees(x, y) {
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function toRadians(deg) {
  return (deg / 360) * 2 * Math.PI;
}

function rotateDegrees(p, angle, center = { x: 0.5, y: 0.5 }) {
  const a = toRadians(angle);
  const ox = p.x - center.x;
  const oy = p.y - center.y;
  return {
    x: ox * Math.cos(a) - oy * Math.sin(a) + center.x,
    y: ox * Math.sin(a) + oy * Math.cos(a) + center.y
  };
}

function doRepeat(points, reps, center = { x: 0.5, y: 0.5 }, mirroring = false) {
  if (mirroring) {
    const list = [];
    const angles = points.map(p => angleDegrees(p.x - center.x, p.y - center.y));
    const distances = points.map(p => Math.hypot(p.x - center.x, p.y - center.y));
    const actualReps = reps * 2;
    const sectionAngle = 360 / actualReps;

    for (let rep = 0; rep < actualReps; rep++) {
      for (let index = 0; index < points.length; index++) {
        const i = rep % 2 === 0 ? index : points.length - 1 - index;
        if (i > 0 || rep % 2 === 0) {
          const aDeg = sectionAngle * rep + (rep % 2 === 0 ? angles[i] : sectionAngle - angles[i] + 2 * angles[0]);
          const a = toRadians(aDeg);
          const finalPoint = {
            x: Math.cos(a) * distances[i] + center.x,
            y: Math.sin(a) * distances[i] + center.y,
            r: points[i].r || 0
          };
          list.push(finalPoint);
        }
      }
    }
    return list;
  } else {
    const list = [];
    const np = points.length;
    for (let i = 0; i < np * reps; i++) {
      const src = points[i % np];
      const pt = rotateDegrees(src, (Math.floor(i / np) * 360) / reps, center);
      list.push({ x: pt.x, y: pt.y, r: src.r || 0 });
    }
    return list;
  }
}

// Corner rounding on a closed 2D polygon with vertices {x, y, r}
function computeRoundedPolygonPath(vertices, numSamplePoints = 128) {
  const n = vertices.length;
  // Calculate corner tangents and arc fillets for each vertex
  const curves = [];

  for (let i = 0; i < n; i++) {
    const prev = vertices[(i - 1 + n) % n];
    const curr = vertices[i];
    const next = vertices[(i + 1) % n];

    // Vectors
    const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };
    const len1 = Math.hypot(v1.x, v1.y);
    const len2 = Math.hypot(v2.x, v2.y);
    const u1 = { x: v1.x / len1, y: v1.y / len2 };
    const u2 = { x: v2.x / len2, y: v2.y / len2 };

    const radius = curr.r ? Math.min(curr.r, Math.min(len1, len2) * 0.45) : 0;

    if (radius <= 0.001) {
      curves.push({ start: curr, end: curr, isCorner: false });
    } else {
      const pStart = { x: curr.x + u1.x * radius, y: curr.y + u1.y * radius };
      const pEnd = { x: curr.x + u2.x * radius, y: curr.y + u2.y * radius };
      curves.push({ start: pStart, end: pEnd, control: curr, isCorner: true });
    }
  }

  // Sample perimeter into numSamplePoints
  const sampled = [];
  for (let i = 0; i < n; i++) {
    const c = curves[i];
    const nextC = curves[(i + 1) % n];

    if (c.isCorner) {
      // Quadratic bezier corner from c.start through c.control to c.end
      for (let step = 0; step <= 4; step++) {
        const t = step / 4;
        const mt = 1 - t;
        const x = mt * mt * c.start.x + 2 * mt * t * c.control.x + t * t * c.end.x;
        const y = mt * mt * c.start.y + 2 * mt * t * c.control.y + t * t * c.end.y;
        sampled.push({ x, y });
      }
    } else {
      sampled.push({ x: c.start.x, y: c.start.y });
    }

    // Straight segment from c.end to nextC.start
    sampled.push({ x: nextC.start.x, y: nextC.start.y });
  }

  // Resample evenly to exact numSamplePoints
  // 1. Calculate cumulative perimeter lengths
  const cumLengths = [0];
  for (let i = 0; i < sampled.length; i++) {
    const p1 = sampled[i];
    const p2 = sampled[(i + 1) % sampled.length];
    cumLengths.push(cumLengths[cumLengths.length - 1] + Math.hypot(p2.x - p1.x, p2.y - p1.y));
  }
  const totalLength = cumLengths[cumLengths.length - 1];

  const evenlySampled = [];
  for (let k = 0; k < numSamplePoints; k++) {
    const targetDist = (k / numSamplePoints) * totalLength;
    // Find segment
    let idx = 0;
    while (idx < cumLengths.length - 1 && cumLengths[idx + 1] < targetDist) {
      idx++;
    }
    const segDist = cumLengths[idx + 1] - cumLengths[idx];
    const frac = segDist > 0 ? (targetDist - cumLengths[idx]) / segDist : 0;
    const p1 = sampled[idx % sampled.length];
    const p2 = sampled[(idx + 1) % sampled.length];
    evenlySampled.push({
      x: p1.x + (p2.x - p1.x) * frac,
      y: p1.y + (p2.y - p1.y) * frac
    });
  }

  // Center and normalize into [-1, 1]
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  evenlySampled.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const maxExtent = Math.max((maxX - minX) / 2, (maxY - minY) / 2);

  return evenlySampled.map(p => ({
    x: (p.x - cx) / maxExtent,
    y: (p.y - cy) / maxExtent
  }));
}

console.log('Math engine ready.');
