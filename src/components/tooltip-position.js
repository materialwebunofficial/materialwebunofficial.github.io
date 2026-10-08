/*
 * Copyright 2023 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0.
 * TooltipPositionProviderImpl / caretX at AndroidX a095da93.
 * Inputs are integer layout coordinates, after the platform density adapter.
 */
const add = (a, b) => (a + b) | 0;
const sub = (a, b) => (a - b) | 0;
const half = value => Math.trunc(value / 2) || 0;
const clamp = (value, maximum) => Math.max(0, Math.min(Math.max(0, maximum), value));

export function tooltipPosition({anchor, popup, window: windowSize, placement = 'top', spacing = 4, rtl = false}) {
  if (placement === 'start') placement = rtl ? 'right' : 'left';
  if (placement === 'end') placement = rtl ? 'left' : 'right';
  let x, y;
  if (placement === 'left' || placement === 'right') {
    if (placement === 'left') {
      x = sub(anchor.left, add(popup.width, spacing));
      if (x < 0) x = add(anchor.right, spacing);
    } else {
      x = add(anchor.right, spacing);
      if (add(x, popup.width) > windowSize.width) x = sub(anchor.left, add(popup.width, spacing));
    }
    y = half(sub(add(anchor.top, anchor.bottom), popup.height));
  } else {
    x = add(anchor.left, half(sub(sub(anchor.right, anchor.left), popup.width)));
    if (placement === 'bottom' || placement === 'below') {
      y = add(anchor.bottom, spacing);
      if (add(y, popup.height) > windowSize.height) y = sub(sub(anchor.top, popup.height), spacing);
    } else {
      y = sub(sub(anchor.top, popup.height), spacing);
      if (y < 0) y = add(anchor.bottom, spacing);
    }
  }
  return {x: clamp(x, sub(windowSize.width, popup.width)), y: clamp(y, sub(windowSize.height, popup.height))};
}

export function tooltipCaretX(width, screenWidth, anchor) {
  const f = Math.fround, left = f(anchor.left), right = f(anchor.right), mid = f(f(left + right) / 2);
  width = f(width);
  if (width >= screenWidth) return mid;
  if (f(mid - f(width / 2)) < 0) return f(mid + Math.max(f(width - screenWidth), -left));
  if (f(mid + f(width / 2)) > screenWidth) return f(mid + Math.min(f(width - right), 0));
  return f(width / 2);
}
