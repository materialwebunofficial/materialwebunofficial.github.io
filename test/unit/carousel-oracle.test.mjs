import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  multiBrowseKeylineList, uncontainedKeylineList, heroKeylineList, Strategy,
  getSnapPositionOffset, calculateCurrentScrollOffset, calculateMaxScrollOffset, carouselItemPlacement,
} from '../../src/components/carousel-keylines.js';
import { calculateParallaxItemInfo } from '../../src/components/carousel-parallax.js';

// Compares the carousel ports with test/fixtures/androidx/carousel/carousel-oracle.json,
// produced by executing the unchanged AndroidX a095da93 sources
// (tools/androidx-carousel/snapshot.mjs). Both run in Kotlin Float arithmetic:
// every Float compares exactly (Kotlin prints the shortest Float, so expected
// values are rounded with Math.fround), as do Ints and Booleans.
const oracle = JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/carousel/carousel-oracle.json', import.meta.url), 'utf8'));
let checks = 0;
const close = (actual, expected, message) => { assert.equal(actual, Math.fround(expected), message); checks++; };
const same = (actual, expected, message) => { assert.equal(actual, expected, message); checks++; };
const compareKeylines = (actual, expected, label) => {
  same(actual.length, expected.length, `${label} keyline count`);
  expected.forEach(([size, offset, unadjustedOffset, isFocal, isAnchor, isPivot, cutoff], i) => {
    const k = actual[i];
    close(k.size, size, `${label}[${i}].size`);
    close(k.offset, offset, `${label}[${i}].offset`);
    close(k.unadjustedOffset, unadjustedOffset, `${label}[${i}].unadjustedOffset`);
    close(k.cutoff, cutoff, `${label}[${i}].cutoff`);
    same(k.isFocal, isFocal, `${label}[${i}].isFocal`);
    same(k.isAnchor, isAnchor, `${label}[${i}].isAnchor`);
    same(k.isPivot, isPivot, `${label}[${i}].isPivot`);
  });
};

let placements = 0;
for (const c of oracle.cases) {
  const label = `${c.layout} ${c.available}/${c.preferred}/${c.spacing}/${c.padding}/${c.count}`;
  const keylines = c.layout === 'uncontained'
    ? uncontainedKeylineList({ carouselMainAxisSize: c.available, itemSize: c.preferred, itemSpacing: c.spacing })
    : c.layout === 'hero'
      ? heroKeylineList({ carouselMainAxisSize: c.available, preferredItemSize: c.preferred === 0 ? null : c.preferred, itemSpacing: c.spacing, itemCount: c.count, isCentered: true })
      : multiBrowseKeylineList({ carouselMainAxisSize: c.available, preferredItemSize: c.preferred, itemSpacing: c.spacing, itemCount: c.count });
  compareKeylines(keylines, c.keylines, label);
  const strategy = new Strategy(keylines, c.available, c.spacing, c.padding, c.padding);
  same(strategy.isValid, c.valid, `${label} isValid`);
  close(strategy.isValid ? strategy.itemMainAxisSize : 0, c.itemSize, `${label} itemMainAxisSize`);
  close(strategy.minItemSize, c.minItemSize, `${label} minItemSize`);
  close(strategy.maxItemSize, c.maxItemSize, `${label} maxItemSize`);
  same(strategy.startKeylineSteps.length, c.start.length, `${label} start steps`);
  same(strategy.endKeylineSteps.length, c.end.length, `${label} end steps`);
  c.start.forEach((step, i) => compareKeylines(strategy.startKeylineSteps[i], step, `${label} start ${i}`));
  c.end.forEach((step, i) => compareKeylines(strategy.endKeylineSteps[i], step, `${label} end ${i}`));
  c.snap.forEach((offset, index) => same(getSnapPositionOffset(strategy, index, c.count), offset, `${label} snap ${index}`));
  for (const [page, fraction, index, [, scrollOffset, maxScrollOffset, size, maskLeft, maskRight, translation]] of c.placements) {
    // calculateCurrentScrollOffset, as md-carousel computes it from its pager state.
    const scroll = calculateCurrentScrollOffset(strategy, page, fraction, c.count);
    const max = calculateMaxScrollOffset(strategy, c.count);
    const at = `${label} page ${page}${fraction >= 0 ? '+' : ''}${fraction} item ${index}`;
    close(scroll, scrollOffset, `${at} scroll`);
    close(max, maxScrollOffset, `${at} max scroll`);
    const placement = carouselItemPlacement(strategy, index, scroll, max);
    close(placement.size, size, `${at} size`);
    close(placement.maskStart, maskLeft, `${at} mask left`);
    close(placement.maskEnd, maskRight, `${at} mask right`);
    close(placement.translation, translation, `${at} translation`);
    placements++;
  }
}

for (const [cross, size, start, end, visible, offset, maskStart, maskEnd, parallax, maskProgress, maskSize] of oracle.parallax) {
  const info = calculateParallaxItemInfo({
    isItemVisible: visible, itemMainAxisSize: size, itemCrossAxisSize: cross, itemOffset: offset,
    viewportStartOffset: start, viewportEndOffset: end,
  });
  const at = `parallax ${size}x${cross} at ${offset} in [${start}, ${end}]${visible ? '' : ' (not visible)'}`;
  close(info.maskStart, maskStart, `${at} maskStart`);
  close(info.maskEnd, maskEnd, `${at} maskEnd`);
  close(info.parallax, parallax, `${at} parallax`);
  close(info.maskProgress, maskProgress, `${at} maskProgress`);
  close(info.size, maskSize, `${at} size`);
}

console.log(`Carousel oracle: ${oracle.cases.length} keyline/strategy cases and ${placements} carouselItem placements, ${oracle.parallax.length} parallax item infos, exact (${checks} checks).`);
