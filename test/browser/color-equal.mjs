import assert from 'node:assert/strict';

// Computed colors may serialize the same sRGB value as rgb()/rgba() or as
// color(srgb ...) depending on how it was produced. Compare the channels.
export function parseSrgb(value) {
  const text = String(value).trim();
  let match = /^rgba?\(([^)]*)\)$/.exec(text);
  if (match) {
    const parts = match[1].replace('/', ' ').replaceAll(',', ' ').trim().split(/\s+/).map(Number);
    return [parts[0] / 255, parts[1] / 255, parts[2] / 255, parts[3] ?? 1];
  }
  match = /^color\(srgb ([^)]*)\)$/.exec(text);
  if (match) {
    const [channels, alpha] = match[1].split('/');
    const parts = channels.trim().split(/\s+/).map(Number);
    return [parts[0], parts[1], parts[2], alpha === undefined ? 1 : Number(alpha)];
  }
  return null;
}

export function assertSameColor(actual, expected, message, tolerance = 0.6 / 255) {
  const a = parseSrgb(actual), b = parseSrgb(expected);
  if (!a || !b) { assert.equal(actual, expected, message); return; }
  const close = a.every((value, index) => Math.abs(value - b[index]) <= (index === 3 ? 1e-3 : tolerance));
  assert.ok(close, `${message}: ${actual} != ${expected}`);
}
