# Carousel source oracle

Pinned revision: `a095da93f8e98dea8748ceed79ea8427aade245f`. The unchanged
Apache-2.0 Arrangement.kt, Carousel.kt, CarouselParallaxScrollEffect.kt,
KeylineList.kt, KeylineSnapPosition.kt, Keylines.kt and Strategy.kt, with URLs
and SHA-256 hashes, are under `test/fixtures/androidx/carousel`.

`node tools/androidx-carousel/snapshot.mjs` verifies the hashes, then compiles
the following through a density-1 Kotlin host with the cached runtime in
`research/kotlin-runtime`:

- Arrangement.kt, KeylineList.kt, Keylines.kt and Strategy.kt, whole files
  without their package and import lines;
- from Carousel.kt: getSnapPositionOffset, CarouselAlignment,
  calculateCurrentScrollOffset, calculateMaxScrollOffset and getProgress;
- the z-index and placement statements of Modifier.carouselItem's layout block
  (Carousel.kt), copied unchanged into a host function;
- from CarouselParallaxScrollEffect.kt: CarouselParallaxScrollEffectItemInfo,
  calculateItemInfo, EmptyCarouselParallaxScrollEffectItemInfo and
  getMaskIntensity.

The host supplies:

- Dp and Density at density 1;
- CarouselDefaults, built from the source's own declarations of
  MinSmallItemSize, MaxSmallItemSize, AnchorSize and
  MediumLargeItemDiffThreshold;
- the fastForEach/fastMapIndexed/fastFirstOrNull/fastFilter helpers and a List
  FloatList;
- ui-util's Float lerp in its own `androidx.compose.ui.util` package;
- minimal PagerState/CarouselState/CarouselItemDrawInfoImpl holders.

It writes `test/fixtures/androidx/carousel/carousel-oracle.json`:

- 756 multi-browse, uncontained and centered-hero cases. Each has its keylines,
  strategy validity and item size, min/max item sizes, start and end keyline
  steps, and snap offsets.
- 14,688 carouselItem placements at pager states, each with z index, scroll
  offset, max scroll offset, mask, translation and clip.
- 10,880 parallax item infos.

`test/unit/carousel-oracle.test.mjs` requires exact equality. Expected Floats
are rounded with Math.fround, since Kotlin prints the shortest Float.

This covers the keyline, strategy, snap, placement and parallax arithmetic. It
does not run the Pager, the LazyList measure, the fling behaviors or the
graphics layers. Those are adapted in md-carousel.js and covered by browser
tests.
