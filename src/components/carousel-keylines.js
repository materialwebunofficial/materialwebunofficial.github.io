/*
 * Copyright 2024 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0; obtain a copy at
 * https://www.apache.org/licenses/LICENSE-2.0 . Distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND. See the License for details.
 *
 * Port of AndroidX a095da93f8e98dea8748ceed79ea8427aade245f
 * compose/material3/carousel: Arrangement.kt, Keylines.kt, KeylineList.kt,
 * Strategy.kt and KeylineSnapPosition.kt, with Carousel.kt's scroll offsets and
 * Modifier.carouselItem placement. Sizes are pixels; the defaults are
 * CarouselDefaults at one CSS pixel per dp. The arithmetic is Kotlin Float
 * arithmetic (every operation rounded with Math.fround, in the source's
 * order), since some branches (cutoffs, step counts) turn on Float rounding;
 * tools/androidx-carousel/snapshot.mjs checks it against the sources.
 */

export const CarouselDefaults = Object.freeze({
  MinSmallItemSize: 40,
  MaxSmallItemSize: 56,
  ItemSpacing: 0,
  AnchorSize: 10,
  MediumLargeItemDiffThreshold: 0.85,
});

const f = Math.fround;
const FLOAT_MAX_VALUE = f(3.4028234663852886e38);
const coerceIn = (value, min, max) => Math.min(Math.max(value, min), max);
/** ui-util lerp in Float arithmetic. */
const lerpValue = (start, stop, fraction) => f(f(f(1 - fraction) * start) + f(fraction * stop));
/** Kotlin roundToInt: half rounds up. */
const roundToInt = value => Math.round(value);
/** Kotlin Float.toInt: truncation, NaN to 0, clamped to Int. */
const toInt = value => Number.isNaN(value) ? 0 : Math.trunc(Math.min(Math.max(value, -2147483648), 2147483647));
const half = value => f(value / 2);

/* ------------------------------------------------------------ Arrangement -- */

// Percentage of a medium item's size by which it can grow or shrink to help
// an arrangement fit.
const MediumItemFlexPercentage = f(0.1);

export class Arrangement {
  constructor(priority, smallSize, smallCount, mediumSize, mediumCount, largeSize, largeCount) {
    this.priority = priority;
    this.smallSize = smallSize;
    this.smallCount = smallCount;
    this.mediumSize = mediumSize;
    this.mediumCount = mediumCount;
    this.largeSize = largeSize;
    this.largeCount = largeCount;
  }

  isValid() {
    if (this.largeCount > 0 && this.smallCount > 0 && this.mediumCount > 0) {
      return this.largeSize > this.mediumSize && this.mediumSize > this.smallSize;
    } else if (this.largeCount > 0 && this.smallCount > 0) {
      return this.largeSize > this.smallSize;
    }
    return true;
  }

  cost(targetLargeSize) {
    if (!this.isValid()) return FLOAT_MAX_VALUE;
    return f(Math.abs(f(targetLargeSize - this.largeSize)) * this.priority);
  }

  itemCount() { return this.largeCount + this.mediumCount + this.smallCount; }

  static findLowestCostArrangement({
    availableSpace, itemSpacing, targetSmallSize, minSmallSize, maxSmallSize,
    smallCounts, targetMediumSize, mediumCounts, targetLargeSize, largeCounts,
  }) {
    let lowestCostArrangement = null;
    let priority = 1;
    for (const largeCount of largeCounts) {
      for (const mediumCount of mediumCounts) {
        for (const smallCount of smallCounts) {
          const arrangement = fit({
            priority, availableSpace, itemSpacing, smallCount, smallSize: targetSmallSize,
            minSmallSize, maxSmallSize, mediumCount, mediumSize: targetMediumSize,
            largeCount, largeSize: targetLargeSize,
          });
          if (lowestCostArrangement === null || arrangement.cost(targetLargeSize) < lowestCostArrangement.cost(targetLargeSize)) {
            lowestCostArrangement = arrangement;
            // Permutations come in priority order: a zero cost cannot be beaten.
            if (lowestCostArrangement.cost(targetLargeSize) === 0) return lowestCostArrangement;
          }
          priority++;
        }
      }
    }
    return lowestCostArrangement;
  }
}

function fit({ priority, availableSpace, itemSpacing, smallCount, smallSize, minSmallSize, maxSmallSize, mediumCount, mediumSize, largeCount, largeSize }) {
  const totalItemCount = largeCount + mediumCount + smallCount;
  const availableSpaceWithoutSpacing = f(availableSpace - f((totalItemCount - 1) * itemSpacing));
  let arrangedSmallSize = coerceIn(smallSize, minSmallSize, maxSmallSize);
  let arrangedMediumSize = mediumSize;
  let arrangedLargeSize = largeSize;

  const totalSpaceTakenByArrangement = f(f(f(arrangedLargeSize * largeCount) + f(arrangedMediumSize * mediumCount)) + f(arrangedSmallSize * smallCount));
  const delta = f(availableSpaceWithoutSpacing - totalSpaceTakenByArrangement);
  // First resize small items within their range to fit the available space.
  if (smallCount > 0 && delta > 0) {
    arrangedSmallSize = f(arrangedSmallSize + Math.min(f(delta / smallCount), f(maxSmallSize - arrangedSmallSize)));
  } else if (smallCount > 0 && delta < 0) {
    arrangedSmallSize = f(arrangedSmallSize + Math.max(f(delta / smallCount), f(minSmallSize - arrangedSmallSize)));
  }

  arrangedSmallSize = smallCount > 0 ? arrangedSmallSize : 0;
  arrangedLargeSize = calculateLargeSize(availableSpaceWithoutSpacing, smallCount, arrangedSmallSize, mediumCount, largeCount);
  arrangedMediumSize = half(f(arrangedLargeSize + arrangedSmallSize));

  // Counter a large size moved off its target with the medium item's flex.
  if (mediumCount > 0 && arrangedLargeSize !== largeSize) {
    const targetAdjustment = f(f(largeSize - arrangedLargeSize) * largeCount);
    const availableMediumFlex = f(f(arrangedMediumSize * MediumItemFlexPercentage) * mediumCount);
    const distribute = Math.min(Math.abs(targetAdjustment), availableMediumFlex);
    if (targetAdjustment > 0) {
      arrangedMediumSize = f(arrangedMediumSize - f(distribute / mediumCount));
      arrangedLargeSize = f(arrangedLargeSize + f(distribute / largeCount));
    } else {
      arrangedMediumSize = f(arrangedMediumSize + f(distribute / mediumCount));
      arrangedLargeSize = f(arrangedLargeSize - f(distribute / largeCount));
    }
  }

  return new Arrangement(priority, arrangedSmallSize, smallCount, arrangedMediumSize, mediumCount, arrangedLargeSize, largeCount);
}

function calculateLargeSize(availableSpace, smallCount, smallSize, mediumCount, largeCount) {
  return f(f(availableSpace - f(f(smallCount + half(mediumCount)) * smallSize)) / f(largeCount + half(mediumCount)));
}

/* ------------------------------------------------------------ KeylineList -- */

/** One keyline: { size, offset, unadjustedOffset, isFocal, isAnchor, isPivot, cutoff }. */
export class KeylineList extends Array {
  static from(keylines) {
    const list = new KeylineList();
    for (const keyline of keylines) list.push(keyline);
    list._index();
    return list;
  }

  _index() {
    let min = FLOAT_MAX_VALUE, max = 0;
    for (const k of this) {
      if (k.size < min) min = k.size;
      if (k.size > max) max = k.size;
    }
    this.minSize = min;
    this.maxSize = max;
    this.pivotIndex = this.findIndex(k => k.isPivot);
    this.firstNonAnchorIndex = this.findIndex(k => !k.isAnchor);
    this.lastNonAnchorIndex = this.findLastIndex(k => !k.isAnchor);
    this.firstFocalIndex = this.findIndex(k => k.isFocal);
    this.lastFocalIndex = this.findLastIndex(k => k.isFocal);
    this.focalCount = this.lastFocalIndex - this.firstFocalIndex + 1;
  }

  get pivot() { return this[this.pivotIndex]; }
  get firstNonAnchor() { return this[this.firstNonAnchorIndex]; }
  get lastNonAnchor() { return this[this.lastNonAnchorIndex]; }
  get firstFocal() {
    const keyline = this[this.firstFocalIndex];
    if (!keyline) throw new RangeError('All KeylineLists must have at least one focal keyline');
    return keyline;
  }
  get lastFocal() {
    const keyline = this[this.lastFocalIndex];
    if (!keyline) throw new RangeError('All KeylineLists must have at least one focal keyline');
    return keyline;
  }

  isFirstFocalItemAtStartOfContainer() {
    const firstFocalLeft = f(this.firstFocal.offset - half(this.firstFocal.size));
    return firstFocalLeft >= 0 && keylineEquals(this.firstFocal, this.firstNonAnchor);
  }

  isLastFocalItemAtEndOfContainer(carouselMainAxisSize) {
    const lastFocalRight = f(this.lastFocal.offset + half(this.lastFocal.size));
    return lastFocalRight <= carouselMainAxisSize && keylineEquals(this.lastFocal, this.lastNonAnchor);
  }

  firstIndexAfterFocalRangeWithSize(size) {
    for (let i = this.lastFocalIndex; i <= this.length - 1; i++) if (this[i].size === size) return i;
    return this.length - 1;
  }

  lastIndexBeforeFocalRangeWithSize(size) {
    for (let i = this.firstFocalIndex - 1; i >= 0; i--) if (this[i].size === size) return i;
    return 0;
  }

  getKeylineBefore(unadjustedOffset) {
    for (let index = this.length - 1; index >= 0; index--) {
      if (this[index].unadjustedOffset < unadjustedOffset) return this[index];
    }
    return this[0];
  }

  getKeylineAfter(unadjustedOffset) {
    return this.find(k => k.unadjustedOffset >= unadjustedOffset) ?? this[this.length - 1];
  }

  equals(other) {
    if (this === other) return true;
    if (!(other instanceof KeylineList) || this.length !== other.length) return false;
    return this.every((k, i) => keylineEquals(k, other[i]));
  }
}

const keylineEquals = (a, b) => a.size === b.size && a.offset === b.offset && a.unadjustedOffset === b.unadjustedOffset &&
  a.isFocal === b.isFocal && a.isAnchor === b.isAnchor && a.isPivot === b.isPivot && a.cutoff === b.cutoff;

export const emptyKeylineList = () => KeylineList.from([]);

export const CarouselAlignment = Object.freeze({ Start: -1, Center: 0, End: 1 });

/** keylineListOf with an alignment, or with an explicit pivot. */
export function keylineListOf(carouselMainAxisSize, itemSpacing, alignmentOrPivot, build) {
  const scope = new KeylineListScope();
  build(scope);
  return typeof alignmentOrPivot === 'object'
    ? scope.createWithPivot(carouselMainAxisSize, itemSpacing, alignmentOrPivot.pivotIndex, alignmentOrPivot.pivotOffset)
    : scope.createWithAlignment(carouselMainAxisSize, itemSpacing, alignmentOrPivot);
}

class KeylineListScope {
  constructor() {
    this.firstFocalIndex = -1;
    this.focalItemSize = 0;
    this.tmpKeylines = [];
  }

  add(size, isAnchor = false) {
    this.tmpKeylines.push({ size, isAnchor });
    // The first focal item is the first index of the largest item added.
    if (!isAnchor && size > this.focalItemSize) {
      this.firstFocalIndex = this.tmpKeylines.length - 1;
      this.focalItemSize = size;
    }
  }

  createWithPivot(carouselMainAxisSize, itemSpacing, pivotIndex, pivotOffset) {
    return KeylineList.from(this._createKeylinesWithPivot(pivotIndex, pivotOffset, this.firstFocalIndex, this._findLastFocalIndex(), this.focalItemSize, carouselMainAxisSize, itemSpacing));
  }

  createWithAlignment(carouselMainAxisSize, itemSpacing, carouselAlignment) {
    const lastFocalIndex = this._findLastFocalIndex();
    const focalItemCount = lastFocalIndex - this.firstFocalIndex;
    const pivotIndex = this.firstFocalIndex;
    let pivotOffset;
    if (carouselAlignment === CarouselAlignment.Center) {
      // With an even number of keylines the item spacing sits at the center.
      const itemSpacingSplit = itemSpacing === 0 || focalItemCount % 2 === 0 ? 0 : half(itemSpacing);
      const itemSpaceCounts = f(Math.trunc(focalItemCount / 2) * itemSpacing);
      pivotOffset = f(f(f(half(carouselMainAxisSize) - f(half(this.focalItemSize) * focalItemCount)) - itemSpacingSplit) - itemSpaceCounts);
    } else if (carouselAlignment === CarouselAlignment.End) {
      pivotOffset = f(carouselMainAxisSize - half(this.focalItemSize));
    } else {
      pivotOffset = half(this.focalItemSize);
    }
    return KeylineList.from(this._createKeylinesWithPivot(pivotIndex, pivotOffset, this.firstFocalIndex, lastFocalIndex, this.focalItemSize, carouselMainAxisSize, itemSpacing));
  }

  _findLastFocalIndex() {
    if (this.firstFocalIndex < 0) return -1;
    let lastFocalIndex = this.firstFocalIndex;
    while (lastFocalIndex < this.tmpKeylines.length - 1 && this.tmpKeylines[lastFocalIndex + 1].size === this.focalItemSize) lastFocalIndex++;
    return lastFocalIndex;
  }

  _createKeylinesWithPivot(pivotIndex, pivotOffset, firstFocalIndex, lastFocalIndex, itemMainAxisSize, carouselMainAxisSize, itemSpacing) {
    const tmpKeylines = this.tmpKeylines;
    if (!tmpKeylines.length || pivotIndex < 0 || pivotIndex >= tmpKeylines.length) return [];
    const isFocal = index => index >= firstFocalIndex && index <= lastFocalIndex;
    const isCutoffLeft = (size, offset) => f(offset - half(size)) < 0 && f(offset + half(size)) > 0;
    const isCutoffRight = (size, offset) => f(offset - half(size)) < carouselMainAxisSize && f(offset + half(size)) > carouselMainAxisSize;
    const pivot = tmpKeylines[pivotIndex];
    const keylines = [];
    const pivotCutoff = isCutoffLeft(pivot.size, pivotOffset) ? f(pivotOffset - half(pivot.size))
      : isCutoffRight(pivot.size, pivotOffset) ? f(f(pivotOffset + half(pivot.size)) - carouselMainAxisSize)
      : 0;
    keylines.push({ size: pivot.size, offset: pivotOffset, unadjustedOffset: pivotOffset, isFocal: isFocal(pivotIndex), isAnchor: pivot.isAnchor, isPivot: true, cutoff: pivotCutoff });

    // Keylines before the pivot, inserted at the start in their original order.
    let offset = f(f(pivotOffset - half(itemMainAxisSize)) - itemSpacing);
    let unadjustedOffset = f(f(pivotOffset - half(itemMainAxisSize)) - itemSpacing);
    for (let originalIndex = pivotIndex - 1; originalIndex >= 0; originalIndex--) {
      const tmp = tmpKeylines[originalIndex];
      const tmpOffset = f(offset - half(tmp.size));
      const tmpUnadjustedOffset = f(unadjustedOffset - half(itemMainAxisSize));
      const cutoff = isCutoffLeft(tmp.size, tmpOffset) ? Math.abs(f(tmpOffset - half(tmp.size))) : 0;
      keylines.unshift({ size: tmp.size, offset: tmpOffset, unadjustedOffset: tmpUnadjustedOffset, isFocal: isFocal(originalIndex), isAnchor: tmp.isAnchor, isPivot: false, cutoff });
      offset = f(offset - f(tmp.size + itemSpacing));
      unadjustedOffset = f(unadjustedOffset - f(itemMainAxisSize + itemSpacing));
    }

    // Keylines after the pivot, appended in their original order.
    offset = f(f(pivotOffset + half(itemMainAxisSize)) + itemSpacing);
    unadjustedOffset = f(f(pivotOffset + half(itemMainAxisSize)) + itemSpacing);
    for (let originalIndex = pivotIndex + 1; originalIndex < tmpKeylines.length; originalIndex++) {
      const tmp = tmpKeylines[originalIndex];
      const tmpOffset = f(offset + half(tmp.size));
      const tmpUnadjustedOffset = f(unadjustedOffset + half(itemMainAxisSize));
      const cutoff = isCutoffRight(tmp.size, tmpOffset) ? f(f(tmpOffset + half(tmp.size)) - carouselMainAxisSize) : 0;
      keylines.push({ size: tmp.size, offset: tmpOffset, unadjustedOffset: tmpUnadjustedOffset, isFocal: isFocal(originalIndex), isAnchor: tmp.isAnchor, isPivot: false, cutoff });
      offset = f(offset + f(tmp.size + itemSpacing));
      unadjustedOffset = f(unadjustedOffset + f(itemMainAxisSize + itemSpacing));
    }
    return keylines;
  }
}

export function lerpKeyline(start, end, fraction) {
  return {
    size: lerpValue(start.size, end.size, fraction),
    offset: lerpValue(start.offset, end.offset, fraction),
    unadjustedOffset: lerpValue(start.unadjustedOffset, end.unadjustedOffset, fraction),
    isFocal: fraction < 0.5 ? start.isFocal : end.isFocal,
    isAnchor: fraction < 0.5 ? start.isAnchor : end.isAnchor,
    isPivot: fraction < 0.5 ? start.isPivot : end.isPivot,
    cutoff: lerpValue(start.cutoff, end.cutoff, fraction),
  };
}

export function lerpKeylineList(from, to, fraction) {
  return KeylineList.from(from.map((k, i) => lerpKeyline(k, to[i], fraction)));
}

/* --------------------------------------------------------------- Keylines -- */

export function multiBrowseKeylineList({
  carouselMainAxisSize, preferredItemSize, itemSpacing, itemCount,
  minSmallItemSize = CarouselDefaults.MinSmallItemSize, maxSmallItemSize = CarouselDefaults.MaxSmallItemSize,
}) {
  [carouselMainAxisSize, preferredItemSize, itemSpacing, minSmallItemSize, maxSmallItemSize] =
    [carouselMainAxisSize, preferredItemSize, itemSpacing, minSmallItemSize, maxSmallItemSize].map(f);
  if (carouselMainAxisSize === 0 || preferredItemSize === 0) return emptyKeylineList();

  let smallCounts = [1];
  const mediumCounts = [1, 0];
  const targetLargeSize = Math.min(preferredItemSize, carouselMainAxisSize);
  // A small item about a third of the large item, within its range; a medium
  // item between the two.
  const targetSmallSize = coerceIn(f(targetLargeSize / 3), minSmallItemSize, maxSmallItemSize);
  const targetMediumSize = half(f(targetLargeSize + targetSmallSize));

  // Too little space for a large and a small item: allow no small items.
  if (carouselMainAxisSize < f(minSmallItemSize * 2)) smallCounts = [0];

  const minAvailableLargeSpace = f(f(carouselMainAxisSize - f(targetMediumSize * Math.max(...mediumCounts))) - f(maxSmallItemSize * Math.max(...smallCounts)));
  const minLargeCount = Math.max(1, toInt(Math.floor(f(minAvailableLargeSpace / targetLargeSize))));
  const maxLargeCount = toInt(Math.ceil(f(carouselMainAxisSize / targetLargeSize)));
  const largeCounts = Array.from({ length: maxLargeCount - minLargeCount + 1 }, (_, i) => maxLargeCount - i);
  const anchorSize = CarouselDefaults.AnchorSize;
  const find = (small, medium) => Arrangement.findLowestCostArrangement({
    availableSpace: carouselMainAxisSize, itemSpacing, targetSmallSize, minSmallSize: minSmallItemSize, maxSmallSize: maxSmallItemSize,
    smallCounts: small, targetMediumSize, mediumCounts: medium, targetLargeSize, largeCounts,
  });
  let arrangement = find(smallCounts, mediumCounts);

  if (arrangement !== null && arrangement.itemCount() > itemCount) {
    let keylineSurplus = arrangement.itemCount() - itemCount;
    let smallCount = arrangement.smallCount, mediumCount = arrangement.mediumCount;
    while (keylineSurplus > 0) {
      if (smallCount > 0) smallCount -= 1;
      // Keep at least one medium item so large items do not fill the carousel.
      else if (mediumCount > 1) mediumCount -= 1;
      // Surplus large items stay: they are already fully unmasked.
      keylineSurplus -= 1;
    }
    arrangement = find([smallCount], [mediumCount]);
  }

  if (arrangement === null) return emptyKeylineList();
  return createLeftAlignedKeylineList(carouselMainAxisSize, itemSpacing, anchorSize, anchorSize, arrangement);
}

export function uncontainedKeylineList({ carouselMainAxisSize, itemSize, itemSpacing }) {
  [carouselMainAxisSize, itemSize, itemSpacing] = [carouselMainAxisSize, itemSize, itemSpacing].map(f);
  if (carouselMainAxisSize === 0 || itemSize === 0) return emptyKeylineList();

  const largeItemSize = Math.min(f(itemSize + itemSpacing), carouselMainAxisSize);
  // The space left after as many large items as fit.
  const largeCount = Math.max(1, toInt(Math.floor(f(carouselMainAxisSize / largeItemSize))));
  const remainingSpace = f(carouselMainAxisSize - f(largeCount * largeItemSize));
  const mediumCount = remainingSpace > 0 ? 1 : 0;
  const defaultAnchorSize = CarouselDefaults.AnchorSize;
  const mediumItemSize = calculateMediumChildSize(defaultAnchorSize, largeItemSize, remainingSpace);
  const arrangement = new Arrangement(0, 0, 0, mediumItemSize, mediumCount, largeItemSize, largeCount);

  const xSmallSize = Math.min(defaultAnchorSize, itemSize);
  // The start anchor is half the cut off item, so motion at the start matches the end.
  const leftAnchorSize = Math.max(xSmallSize, f(mediumItemSize * 0.5));
  return createLeftAlignedKeylineList(carouselMainAxisSize, itemSpacing, leftAnchorSize, defaultAnchorSize, arrangement);
}

export function heroKeylineList({
  carouselMainAxisSize, preferredItemSize, itemSpacing, itemCount, isCentered = false,
  minSmallItemSize = CarouselDefaults.MinSmallItemSize, maxSmallItemSize = CarouselDefaults.MaxSmallItemSize,
}) {
  [carouselMainAxisSize, itemSpacing, minSmallItemSize, maxSmallItemSize] = [carouselMainAxisSize, itemSpacing, minSmallItemSize, maxSmallItemSize].map(f);
  if (preferredItemSize !== null && preferredItemSize !== undefined) preferredItemSize = f(preferredItemSize);
  if (carouselMainAxisSize === 0) return emptyKeylineList();

  // Fewer than three items cannot be centered.
  const shouldCenter = isCentered && itemCount >= 3;
  let smallCounts = itemCount <= 1 ? [0] : shouldCenter ? [2] : [1];
  const targetLargeSize = Math.min(preferredItemSize ?? carouselMainAxisSize, carouselMainAxisSize);
  const targetSmallSize = coerceIn(f(targetLargeSize / 3), minSmallItemSize, maxSmallItemSize);

  // Room for the small items and a large item at least 25% larger than them.
  const fullscreenThreshold = f(f(minSmallItemSize * Math.max(...smallCounts)) + f(minSmallItemSize * 1.25));
  if (carouselMainAxisSize < fullscreenThreshold) smallCounts = [0];

  const minAvailableLargeSpace = f(carouselMainAxisSize - f(minSmallItemSize * Math.max(...smallCounts)));
  const minLargeCount = Math.max(1, toInt(Math.floor(f(minAvailableLargeSpace / targetLargeSize))));
  const maxLargeCount = toInt(Math.ceil(f(carouselMainAxisSize / targetLargeSize)));
  const largeCounts = Array.from({ length: maxLargeCount - minLargeCount + 1 }, (_, i) => maxLargeCount - i);
  const anchorSize = CarouselDefaults.AnchorSize;
  const arrangement = Arrangement.findLowestCostArrangement({
    availableSpace: carouselMainAxisSize, itemSpacing, targetSmallSize, minSmallSize: minSmallItemSize, maxSmallSize: maxSmallItemSize,
    smallCounts, targetMediumSize: 0, mediumCounts: [0], targetLargeSize, largeCounts,
  });
  if (arrangement === null) return emptyKeylineList();

  return shouldCenter && itemCount >= arrangement.itemCount()
    ? createCenterAlignedKeylineList(carouselMainAxisSize, itemSpacing, anchorSize, anchorSize, arrangement)
    : createLeftAlignedKeylineList(carouselMainAxisSize, itemSpacing, anchorSize, anchorSize, arrangement);
}

export function createLeftAlignedKeylineList(carouselMainAxisSize, itemSpacing, leftAnchorSize, rightAnchorSize, arrangement) {
  return keylineListOf(carouselMainAxisSize, itemSpacing, CarouselAlignment.Start, scope => {
    scope.add(leftAnchorSize, true);
    for (let i = 0; i < arrangement.largeCount; i++) scope.add(arrangement.largeSize);
    for (let i = 0; i < arrangement.mediumCount; i++) scope.add(arrangement.mediumSize);
    for (let i = 0; i < arrangement.smallCount; i++) scope.add(arrangement.smallSize);
    scope.add(rightAnchorSize, true);
  });
}

export function createCenterAlignedKeylineList(carouselMainAxisSize, itemSpacing, leftAnchorSize, rightAnchorSize, arrangement) {
  return keylineListOf(carouselMainAxisSize, itemSpacing, CarouselAlignment.Center, scope => {
    scope.add(leftAnchorSize, true);
    for (let i = 0; i < Math.trunc(arrangement.smallCount / 2); i++) scope.add(arrangement.smallSize);
    for (let i = 0; i < Math.trunc(arrangement.mediumCount / 2); i++) scope.add(arrangement.mediumSize);
    for (let i = 0; i < arrangement.largeCount; i++) scope.add(arrangement.largeSize);
    for (let i = 0; i < Math.trunc(arrangement.mediumCount / 2); i++) scope.add(arrangement.mediumSize);
    for (let i = 0; i < Math.trunc(arrangement.smallCount / 2); i++) scope.add(arrangement.smallSize);
    scope.add(rightAnchorSize, true);
  });
}

/** A medium item no bigger than a large one, cut off enough to show motion. */
function calculateMediumChildSize(minimumMediumSize, largeItemSize, remainingSpace) {
  // Ideally a third of it is cut off: 1.5 times the remaining space.
  let mediumItemSize = Math.max(f(remainingSpace * 1.5), minimumMediumSize);
  // Too close to the large size gives too little motion between them.
  const largeItemThreshold = f(largeItemSize * f(CarouselDefaults.MediumLargeItemDiffThreshold));
  if (mediumItemSize > largeItemThreshold) {
    const sizeWithFifthCutOff = f(remainingSpace * f(1.2));
    mediumItemSize = Math.min(Math.max(largeItemThreshold, sizeWithFifthCutOff), largeItemSize);
  }
  return mediumItemSize;
}

/* --------------------------------------------------------------- Strategy -- */

export class Strategy {
  constructor(defaultKeylines, availableSpace, itemSpacing, beforeContentPadding, afterContentPadding, steps = null) {
    [availableSpace, itemSpacing, beforeContentPadding, afterContentPadding] = [availableSpace, itemSpacing, beforeContentPadding, afterContentPadding].map(f);
    this.defaultKeylines = defaultKeylines;
    this.startKeylineSteps = steps ? steps.start : getStartKeylineSteps(defaultKeylines, availableSpace, itemSpacing, beforeContentPadding);
    this.endKeylineSteps = steps ? steps.end : getEndKeylineSteps(defaultKeylines, availableSpace, itemSpacing, afterContentPadding);
    this.availableSpace = availableSpace;
    this.itemSpacing = itemSpacing;
    this.beforeContentPadding = beforeContentPadding;
    this.afterContentPadding = afterContentPadding;

    let min = defaultKeylines.minSize, max = defaultKeylines.maxSize;
    for (const step of [...this.startKeylineSteps, ...this.endKeylineSteps]) {
      if (step.minSize < min) min = step.minSize;
      if (step.maxSize > max) max = step.maxSize;
    }
    this.minItemSize = min;
    this.maxItemSize = max;

    this.startShiftDistance = getStartShiftDistance(this.startKeylineSteps, beforeContentPadding);
    this.endShiftDistance = getEndShiftDistance(this.endKeylineSteps, afterContentPadding);
    this.startShiftPoints = getStepInterpolationPoints(this.startShiftDistance, this.startKeylineSteps, true);
    this.endShiftPoints = getStepInterpolationPoints(this.endShiftDistance, this.endKeylineSteps, false);
    this.isValid = defaultKeylines.length > 0 && availableSpace !== 0 && this.itemMainAxisSize !== 0;
    this._lastStartAndEndKeylineListSteps = null;
    this._cache = null;
  }

  static get Empty() {
    return new Strategy(emptyKeylineList(), 0, 0, 0, 0, { start: [], end: [] });
  }

  get itemMainAxisSize() { return this.defaultKeylines.length ? this.defaultKeylines.firstFocal.size : 0; }

  getKeylineListForScrollOffset(scrollOffset, maxScrollOffset, roundToNearestStep = false) {
    const cache = this._cache;
    if (cache && cache.scrollOffset === scrollOffset && cache.maxScrollOffset === maxScrollOffset && cache.roundToNearestStep === roundToNearestStep) return cache.result;
    const result = this._keylinesForScrollOffset(scrollOffset, maxScrollOffset, roundToNearestStep);
    this._cache = { scrollOffset, maxScrollOffset, roundToNearestStep, result };
    return result;
  }

  _keylinesForScrollOffset(scrollOffset, maxScrollOffset, roundToNearestStep) {
    // Rounding can make the offset slightly negative.
    const positiveScrollOffset = Math.max(0, f(scrollOffset));
    const startShiftOffset = this.startShiftDistance;
    maxScrollOffset = f(maxScrollOffset);
    const endShiftOffset = Math.max(0, f(maxScrollOffset - this.endShiftDistance));
    // Outside both shift ranges the default keylines apply.
    if (positiveScrollOffset >= startShiftOffset && positiveScrollOffset <= endShiftOffset) return this.defaultKeylines;

    let interpolation = lerpRange(1, 0, 0, startShiftOffset, positiveScrollOffset);
    let shiftPoints = this.startShiftPoints;
    let steps = this.startKeylineSteps;

    if (positiveScrollOffset > endShiftOffset) {
      interpolation = lerpRange(0, 1, endShiftOffset, maxScrollOffset, positiveScrollOffset);
      shiftPoints = this.endShiftPoints;
      steps = this.endKeylineSteps;
      // End shifting from the very start: interpolate from the last start step
      // straight to the last end step, skipping the default step.
      if (endShiftOffset < f(0.01) && this.startKeylineSteps.length === 2 && this.endKeylineSteps.length === 2) {
        this._lastStartAndEndKeylineListSteps ??= [this.startKeylineSteps.at(-1), this.endKeylineSteps.at(-1)];
        steps = this._lastStartAndEndKeylineListSteps;
      }
    }

    let fromStepIndex = 0, toStepIndex = 0, steppedInterpolation = 0;
    let lowerBounds = shiftPoints[0];
    for (let i = 1; i < steps.length; i++) {
      const upperBounds = shiftPoints[i];
      if (interpolation <= upperBounds) {
        fromStepIndex = i - 1;
        toStepIndex = i;
        steppedInterpolation = lerpRange(0, 1, lowerBounds, upperBounds, interpolation);
        break;
      }
      lowerBounds = upperBounds;
    }

    if (roundToNearestStep) return steps[roundToInt(steppedInterpolation) === 0 ? fromStepIndex : toStepIndex];
    return lerpKeylineList(steps[fromStepIndex], steps[toStepIndex], steppedInterpolation);
  }
}

function getStartShiftDistance(startKeylineSteps, beforeContentPadding) {
  if (!startKeylineSteps.length) return 0;
  return Math.max(f(startKeylineSteps.at(-1)[0].unadjustedOffset - startKeylineSteps[0][0].unadjustedOffset), beforeContentPadding);
}

function getEndShiftDistance(endKeylineSteps, afterContentPadding) {
  if (!endKeylineSteps.length) return 0;
  return Math.max(f(endKeylineSteps[0].at(-1).unadjustedOffset - endKeylineSteps.at(-1).at(-1).unadjustedOffset), afterContentPadding);
}

function getStartKeylineSteps(defaultKeylines, carouselMainAxisSize, itemSpacing, beforeContentPadding) {
  if (!defaultKeylines.length) return [];
  const steps = [defaultKeylines];

  if (defaultKeylines.isFirstFocalItemAtStartOfContainer()) {
    if (beforeContentPadding !== 0) {
      steps.push(createShiftedKeylineListForContentPadding(defaultKeylines, carouselMainAxisSize, itemSpacing, beforeContentPadding, defaultKeylines.firstFocal, defaultKeylines.firstFocalIndex));
    }
    return steps;
  }

  const startIndex = defaultKeylines.firstNonAnchorIndex;
  const endIndex = defaultKeylines.firstFocalIndex;
  const numberOfSteps = endIndex - startIndex;

  // No steps, but a cutoff to account for.
  if (numberOfSteps <= 0 && defaultKeylines.firstFocal.cutoff > 0) {
    steps.push(moveKeylineAndCreateShiftedKeylineList(defaultKeylines, 0, 0, carouselMainAxisSize, itemSpacing));
    return steps;
  }

  for (let i = 0; i < numberOfSteps; i++) {
    const prevStep = steps.at(-1);
    const originalItemIndex = startIndex + i;
    let dstIndex = defaultKeylines.length - 1;
    if (originalItemIndex > 0) {
      const originalNeighborBeforeSize = defaultKeylines[originalItemIndex - 1].size;
      dstIndex = prevStep.firstIndexAfterFocalRangeWithSize(originalNeighborBeforeSize) - 1;
    }
    steps.push(moveKeylineAndCreateShiftedKeylineList(prevStep, defaultKeylines.firstNonAnchorIndex, dstIndex, carouselMainAxisSize, itemSpacing));
  }

  if (beforeContentPadding !== 0) {
    const last = steps.at(-1);
    steps[steps.length - 1] = createShiftedKeylineListForContentPadding(last, carouselMainAxisSize, itemSpacing, beforeContentPadding, last.firstFocal, last.firstFocalIndex);
  }
  return steps;
}

function getEndKeylineSteps(defaultKeylines, carouselMainAxisSize, itemSpacing, afterContentPadding) {
  if (!defaultKeylines.length) return [];
  const steps = [defaultKeylines];

  if (defaultKeylines.isLastFocalItemAtEndOfContainer(carouselMainAxisSize)) {
    if (afterContentPadding !== 0) {
      steps.push(createShiftedKeylineListForContentPadding(defaultKeylines, carouselMainAxisSize, itemSpacing, -afterContentPadding, defaultKeylines.lastFocal, defaultKeylines.lastFocalIndex));
    }
    return steps;
  }

  const startIndex = defaultKeylines.lastFocalIndex;
  const endIndex = defaultKeylines.lastNonAnchorIndex;
  const numberOfSteps = endIndex - startIndex;

  if (numberOfSteps <= 0 && defaultKeylines.lastFocal.cutoff > 0) {
    steps.push(moveKeylineAndCreateShiftedKeylineList(defaultKeylines, 0, 0, carouselMainAxisSize, itemSpacing));
    return steps;
  }

  for (let i = 0; i < numberOfSteps; i++) {
    const prevStep = steps.at(-1);
    const originalItemIndex = endIndex - i;
    let dstIndex = 0;
    if (originalItemIndex < defaultKeylines.length - 1) {
      const originalNeighborAfterSize = defaultKeylines[originalItemIndex + 1].size;
      dstIndex = prevStep.lastIndexBeforeFocalRangeWithSize(originalNeighborAfterSize) + 1;
    }
    steps.push(moveKeylineAndCreateShiftedKeylineList(prevStep, defaultKeylines.lastNonAnchorIndex, dstIndex, carouselMainAxisSize, itemSpacing));
  }

  if (afterContentPadding !== 0) {
    const last = steps.at(-1);
    steps[steps.length - 1] = createShiftedKeylineListForContentPadding(last, carouselMainAxisSize, itemSpacing, -afterContentPadding, last.lastFocal, last.lastFocalIndex);
  }
  return steps;
}

function createShiftedKeylineListForContentPadding(from, carouselMainAxisSize, itemSpacing, contentPadding, pivot, pivotIndex) {
  const numberOfNonAnchorKeylines = from.filter(k => !k.isAnchor).length;
  const sizeReduction = f(contentPadding / numberOfNonAnchorKeylines);
  // Offsets follow each item's reduced size...
  const newKeylines = keylineListOf(carouselMainAxisSize, itemSpacing, { pivotIndex, pivotOffset: f(f(pivot.offset - half(sizeReduction)) + contentPadding) }, scope => {
    for (const k of from) scope.add(f(k.size - Math.abs(sizeReduction)), k.isAnchor);
  });
  // ...while unadjusted offsets stay those of the pager, which still lays items
  // out end to end at their original size.
  return KeylineList.from(newKeylines.map((k, i) => ({ ...k, unadjustedOffset: from[i].unadjustedOffset })));
}

function moveKeylineAndCreateShiftedKeylineList(from, srcIndex, dstIndex, carouselMainAxisSize, itemSpacing) {
  // -1 when the pivot shifts toward the start, 1 toward the end.
  const pivotDir = srcIndex > dstIndex ? 1 : -1;
  const pivotDelta = f(f(f(from[srcIndex].size - from[srcIndex].cutoff) + itemSpacing) * pivotDir);
  const newPivotIndex = from.pivotIndex + pivotDir;
  const newPivotOffset = f(from.pivot.offset + pivotDelta);
  const moved = [...from];
  const [keyline] = moved.splice(srcIndex, 1);
  moved.splice(dstIndex, 0, keyline);
  return keylineListOf(carouselMainAxisSize, itemSpacing, { pivotIndex: newPivotIndex, pivotOffset: newPivotOffset }, scope => {
    for (const k of moved) scope.add(k.size, k.isAnchor);
  });
}

function getStepInterpolationPoints(totalShiftDistance, steps, isShiftingLeft) {
  const points = [0];
  if (totalShiftDistance === 0 || !steps.length) return points;
  for (let i = 1; i < steps.length; i++) {
    const prevKeylines = steps[i - 1], currKeylines = steps[i];
    const distanceShifted = isShiftingLeft
      ? f(currKeylines[0].unadjustedOffset - prevKeylines[0].unadjustedOffset)
      : f(prevKeylines.at(-1).unadjustedOffset - currKeylines.at(-1).unadjustedOffset);
    const stepPercentage = f(distanceShifted / totalShiftDistance);
    points.push(i === steps.length - 1 ? 1 : f(points[i - 1] + stepPercentage));
  }
  return points;
}

/** Strategy.kt lerp(outputMin, outputMax, inputMin, inputMax, value). */
export function lerpRange(outputMin, outputMax, inputMin, inputMax, value) {
  if (value <= inputMin) return outputMin;
  if (value >= inputMax) return outputMax;
  return lerpValue(outputMin, outputMax, f(f(value - inputMin) / f(inputMax - inputMin)));
}

/* ------------------------------------------------------------------- Snap -- */

/** KeylineSnapPosition: where item itemIndex rests, from the carousel's start. */
export function getSnapPositionOffset(strategy, itemIndex, itemCount) {
  if (!strategy.isValid) return 0;
  // By default the first focal keyline's resting position.
  let offset = roundToInt(f(strategy.defaultKeylines.firstFocal.unadjustedOffset - half(strategy.itemMainAxisSize)));

  const startLast = strategy.startKeylineSteps.length - 1;
  if (itemIndex <= startLast) {
    // Steps run from the default step to the first start step.
    const stepIndex = coerceIn(startLast - itemIndex, 0, startLast);
    const startKeylines = strategy.startKeylineSteps[stepIndex];
    offset = roundToInt(f(startKeylines.firstFocal.unadjustedOffset - half(strategy.itemMainAxisSize)));
  }

  const lastItemIndex = itemCount - 1;
  const endLast = strategy.endKeylineSteps.length - 1;
  if (itemIndex >= lastItemIndex - endLast && itemCount > strategy.defaultKeylines.focalCount) {
    const stepIndex = coerceIn(endLast - (lastItemIndex - itemIndex), 0, endLast);
    const endKeylines = strategy.endKeylineSteps[stepIndex];
    offset = roundToInt(f(endKeylines.lastFocal.unadjustedOffset - half(strategy.itemMainAxisSize)));
  }
  return offset;
}

/* ------------------------------------------------------------- Placement -- */

/**
 * calculateCurrentScrollOffset: the carousel's scroll offset from the pager's
 * current page and its offset fraction.
 */
export function calculateCurrentScrollOffset(strategy, currentPage, currentPageOffsetFraction, pageCount) {
  const itemSizeWithSpacing = f(strategy.itemMainAxisSize + strategy.itemSpacing);
  const currentItemScrollOffset = f(f(currentPage * itemSizeWithSpacing) + f(f(currentPageOffsetFraction) * itemSizeWithSpacing));
  return f(currentItemScrollOffset - getSnapPositionOffset(strategy, currentPage, pageCount));
}

/** calculateMaxScrollOffset: the pager's scroll range. */
export function calculateMaxScrollOffset(strategy, itemCount) {
  const maxScrollPossible = f(f(strategy.itemMainAxisSize * itemCount) + f(strategy.itemSpacing * f(itemCount - 1)));
  return Math.max(0, f(maxScrollPossible - strategy.availableSpace));
}

/**
 * Modifier.carouselItem: the item's mask (in its own box) and translation for
 * a scroll offset, where item i's box starts at i * (size + spacing) - scroll.
 */
export function carouselItemPlacement(strategy, index, scrollOffset, maxScrollOffset) {
  scrollOffset = f(scrollOffset);
  const keylines = strategy.getKeylineListForScrollOffset(scrollOffset, maxScrollOffset);
  const itemSizeWithSpacing = f(strategy.itemMainAxisSize + strategy.itemSpacing);
  const unadjustedCenter = f(f(f(index * itemSizeWithSpacing) + half(strategy.itemMainAxisSize)) - scrollOffset);
  const keylineBefore = keylines.getKeylineBefore(unadjustedCenter);
  const keylineAfter = keylines.getKeylineAfter(unadjustedCenter);
  // Keyline is a data class: these compare by value.
  const isOutOfKeylineBounds = keylineEquals(keylineBefore, keylineAfter);
  const progress = isOutOfKeylineBounds ? 1
    : f(f(unadjustedCenter - keylineBefore.unadjustedOffset) / f(keylineAfter.unadjustedOffset - keylineBefore.unadjustedOffset));
  const interpolated = lerpKeyline(keylineBefore, keylineAfter, progress);
  const center = half(strategy.itemMainAxisSize), halfMask = half(interpolated.size);
  // Pin masked items' edges together.
  let translation = f(interpolated.offset - unadjustedCenter);
  // Beyond the first or last keyline, keep offsetting by the masked size.
  if (isOutOfKeylineBounds) translation = f(translation + f(f(unadjustedCenter - interpolated.unadjustedOffset) / interpolated.size));
  return { size: interpolated.size, maskStart: f(center - halfMask), maskEnd: f(center + halfMask), translation, keyline: interpolated };
}
