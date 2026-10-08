/*
 * Copyright 2020 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * AndroidX BorderModifierNode a095da93: default toggle border paint.
 * Width is a Dp spring channel; dimensions are measured CSS pixels. Browser
 * devicePixelRatio hosts native density. Native paint rounds to physical pixels
 * and caps its stroke to half the drawing area. A non-positive toggle width is
 * absent before entering the source BorderModifierNode, including Hairline. */
const f = Math.fround;
export function buttonBorderStroke(width, measuredWidth, measuredHeight, density = 1) {
  density = Number.isFinite(density) && density > 0 ? f(density) : 1;
  const minimum = f(f(Math.min(measuredWidth, measuredHeight)) * density);
  if (!(width > 0) || !(minimum > 0)) return 0;
  return f(Math.min(Math.ceil(f(f(width) * density)), Math.ceil(f(minimum / 2))) / density);
}
