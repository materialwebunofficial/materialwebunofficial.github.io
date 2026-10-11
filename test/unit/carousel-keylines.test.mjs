import assert from 'node:assert/strict';
import {
  multiBrowseKeylineList, uncontainedKeylineList, heroKeylineList, Strategy,
  getSnapPositionOffset, calculateMaxScrollOffset, carouselItemPlacement,
} from '../../src/components/carousel-keylines.js';

// Invariants of the AndroidX a095da93 carousel keyline math. Kotlin oracles are
// not generated here; these checks follow from the source's definitions.
let checks = 0;
const close = (actual, expected, message, epsilon = 1e-6) => { assert.ok(Math.abs(actual - expected) <= epsilon, `${message}: ${actual} vs ${expected}`); checks++; };
const nonAnchors = list => list.filter(k => !k.isAnchor);

for (const available of [320, 360, 400, 600, 760, 1024]) {
  for (const preferred of [120, 186, 275]) {
    for (const spacing of [0, 8]) {
      const keylines = multiBrowseKeylineList({ carouselMainAxisSize: available, preferredItemSize: preferred, itemSpacing: spacing, itemCount: 10 });
      const items = nonAnchors(keylines);
      // An arrangement fills the available space exactly.
      close(items.reduce((sum, k) => sum + k.size, 0) + spacing * (items.length - 1), available, `multi-browse fill ${available}/${preferred}/${spacing}`, 1e-4);
      // Left aligned: the first item starts at the container start.
      close(items[0].offset - items[0].size / 2, 0, 'multi-browse start alignment', 1e-4);
      const sizes = [...new Set(items.map(k => +k.size.toFixed(4)))];
      for (let i = 1; i < sizes.length; i++) { assert.ok(sizes[i] < sizes[i - 1], `sizes descend ${sizes}`); checks++; }
      assert.ok(keylines[0].isAnchor && keylines.at(-1).isAnchor && keylines.firstFocal === items[0]); checks++;

      const strategy = new Strategy(keylines, available, spacing, 16, 16);
      const count = 10, max = calculateMaxScrollOffset(strategy, count);
      // Content padding: the first item starts 16 in at the start, the last ends 16 in at the end.
      const first = carouselItemPlacement(strategy, 0, 0, max);
      close(first.translation + first.maskStart, 16, 'start padding', 1e-3);
      const last = carouselItemPlacement(strategy, count - 1, max, max);
      const lastLeft = (count - 1) * (strategy.itemMainAxisSize + spacing) - max;
      close(lastLeft + last.translation + last.maskEnd, available - 16, 'end padding', 1e-3);
      // At an item's snap position it shows at the focal (large) size.
      for (const index of [2, 5]) {
        const snap = index * (strategy.itemMainAxisSize + spacing) - getSnapPositionOffset(strategy, index, count);
        if (snap > 0 && snap < max) {
          close(carouselItemPlacement(strategy, index, snap, max).size, strategy.itemMainAxisSize, 'focal at rest', 1);
        }
      }
    }
  }
}

// Uncontained: as many full items as fit, then a cut-off item.
for (const available of [360, 400, 760]) {
  const keylines = uncontainedKeylineList({ carouselMainAxisSize: available, itemSize: 186, itemSpacing: 8 });
  const focal = keylines.filter(k => k.isFocal);
  close(focal[0].size, 194, 'uncontained large size is item plus spacing');
  // A cut-off item sized like the large ones joins the focal range (calculateMediumChildSize caps it at the large size).
  assert.ok(focal.length >= Math.max(1, Math.floor(available / 194))); checks++;
}

// Centered hero: one large item between two equal small items, centered.
for (const available of [360, 400, 760]) {
  const keylines = heroKeylineList({ carouselMainAxisSize: available, preferredItemSize: null, itemSpacing: 8, itemCount: 6, isCentered: true });
  const items = nonAnchors(keylines);
  assert.equal(items.length, 3); checks++;
  close(items[0].size, items[2].size, 'hero small items match');
  close(items[1].offset, available / 2, 'hero centered', 1e-4);
  close(items.reduce((sum, k) => sum + k.size, 0) + 16, available, 'hero fill', 1e-4);
}
// Fewer than three items start-align.
const twoItemHero = nonAnchors(heroKeylineList({ carouselMainAxisSize: 400, preferredItemSize: null, itemSpacing: 8, itemCount: 2, isCentered: true }));
close(twoItemHero[0].offset - twoItemHero[0].size / 2, 0, 'two-item hero start aligned', 1e-4);

console.log(`Carousel keylines: ${checks} arrangement, alignment, padding, snap and hero invariants passed.`);
