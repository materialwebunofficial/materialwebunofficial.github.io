/**
 * AndroidX a095da93 carousel/CarouselParallaxScrollEffect.kt: the values
 * Modifier.carouselParallaxScrollEffect applies to an item of a scrollable
 * list as it enters or leaves the viewport (its mask start and end, the
 * parallax translation of its content and the mask progress), in Kotlin Float
 * arithmetic. Lerps are ui-util's lerp and Strategy.kt's ranged lerp.
 */

const f = Math.fround;
const lerp = (start, stop, fraction) => f(f(f(1 - fraction) * start) + f(fraction * stop));
const SIXTEEN_NINTHS = f(16 / 9), NINE_SIXTEENTHS = f(9 / 16), ONE_THIRD = f(1 / 3);

/** Strategy.kt lerp(outputMin, outputMax, inputMin, inputMax, value). */
function lerpRange(outputMin, outputMax, inputMin, inputMax, value) {
  if (value <= inputMin) return outputMin;
  if (value >= inputMax) return outputMax;
  return lerp(outputMin, outputMax, f(f(value - inputMin) / f(inputMax - inputMin)));
}

/** getMaskIntensity: how much of the item is masked and translated, from its aspect ratio. */
export function getMaskIntensity(itemMainAxisSize, itemCrossAxisSize) {
  const ar = f(f(itemMainAxisSize) / f(itemCrossAxisSize));
  if (ar > SIXTEEN_NINTHS) return 0.5;
  if (ar < SIXTEEN_NINTHS && ar > 1) return lerpRange(ONE_THIRD, 0.5, 1, SIXTEEN_NINTHS, ar);
  if (ar < 1 && ar > NINE_SIXTEENTHS) return lerpRange(0.25, ONE_THIRD, NINE_SIXTEENTHS, 1, ar);
  return 0.25;
}

/** CarouselParallaxScrollEffectItemInfo; size is the mask's size in the main axis. */
const itemInfo = (maskStart, maskEnd, parallax, maskProgress) =>
  ({ maskStart, maskEnd, parallax, maskProgress, size: Math.max(0, f(maskEnd - maskStart)) });

export const EmptyParallaxItemInfo = Object.freeze(itemInfo(0, 0, 0, 0));

/**
 * calculateItemInfo, with the item's and the viewport's offsets in the list's
 * main axis (LazyListLayoutInfo: viewportStartOffset is minus the content
 * padding before the items, viewportEndOffset the size less that padding).
 */
export function calculateParallaxItemInfo({
  isItemVisible, itemMainAxisSize, itemCrossAxisSize, itemOffset, viewportStartOffset, viewportEndOffset,
}) {
  const size = f(itemMainAxisSize), offset = f(itemOffset);
  const start = f(viewportStartOffset), end = f(viewportEndOffset);
  if (!isItemVisible || size === 0) return EmptyParallaxItemInfo;

  const maskIntensity = getMaskIntensity(size, itemCrossAxisSize);
  const parallaxDistance = f(size * maskIntensity);

  // Entering or leaving the start of the viewport.
  if (offset < start) {
    const offscreenDistance = f(start - offset);
    const maskProgress = Math.min(Math.max(f(offscreenDistance / size), 0), 1);
    return itemInfo(lerp(0, f(size * f(1 - maskIntensity)), maskProgress), size, lerp(0, parallaxDistance, maskProgress), maskProgress);
  }

  // Entering or leaving the end of the viewport.
  if (offset > f(end - size)) {
    const offscreenDistance = -f(f(end - offset) - size);
    const maskProgress = Math.min(Math.max(f(offscreenDistance / size), 0), 1);
    return itemInfo(0, lerp(size, f(size * maskIntensity), maskProgress), -lerp(0, parallaxDistance, maskProgress), maskProgress);
  }

  return itemInfo(0, size, 0, 0);
}
