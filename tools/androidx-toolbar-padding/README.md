# Toolbar configurable content padding oracle

Run `python tools/androidx-toolbar-padding/generate.py` with the cached Kotlin
runtime prepared by `tools/androidx-motion/generate.py`. Normal tests consume
canonical UTF-8 gzip JSON without Java. The generator refreshes the shared
inner-alignment/row/coordinator and with-FAB constraint fixtures before producing
this fixture set. Do not run tests concurrently with fixture regeneration.

Four unchanged licensed originals and exact URL/SHA manifest are under
`test/fixtures/androidx/toolbar-padding` at AndroidX revision
`a095da93f8e98dea8748ceed79ea8427aade245f`:

- `FloatingToolbar.kt`: public padding arguments and both floating toolbar trees.
- `Padding.kt`: complete logical `PaddingValuesImpl` and physical `Absolute`
  constructor, validation, calculation and equality bodies; shared original
  `PaddingValuesModifier` measurement and placement.
- `Density.kt`: original `Dp.roundToPx` body, with density explicitly hosted at 1.
- `LayoutModifierNode.kt`: complete default intrinsic methods and the ordinary
  non-Approach `NodeMeasuringIntrinsics` implementation, including its original
  `DefaultIntrinsicMeasurable` and mode enums.

Logical Start/End values mirror in RTL; absolute Left/Right values do not. Float
storage precedes independent per-edge pixel rounding. Omitted object sides are
zero; the toolbar's default complete padding value is 8dp on every side. Source
constructor checks reject negative and NaN sides and accept positive infinity.
The value oracle checks these cases, including infinite `roundToPx` results.
Extreme Int-overflow layout and rendering enormous CSS sizes are not verified.

The no-FAB harness replays the shared original Row/Column default factories,
modifier policies, native icon-button size/minimum-interactive tree, visibility
measurement, coordinator line inheritance and balanced padding. Four explicit
mixed native/generic/weighted/relative-line/empty profiles, nine logical/absolute
padding values, seven parent bounds, both axes/RTL and four visibility samples
produce 8,064 trees. Initial/completed hidden and intermediate visibility states
are atomic measurement inputs; this harness does not execute recomposition or
prove every intermediate sample is an ordinary animation frame.

The with-FAB harness executes the original measure/place bodies, packed
Constraints, UnspecifiedConstraintsNode, PaddingValuesModifier, ScrollNode,
Placeable coercion and default modifier intrinsic calculation. Explicit leaf
intrinsic/natural sizes, density-1 scope delegation, empty intrinsic placeable
storage and deferred placement are host wiring. Original intrinsic queries use
the toolbar's finite 64px cross input. The unused unbounded-query LargeDimension
branch, Approach/lookahead and general intrinsic approximation are outside this
gate. The content leaf is an opaque measured boundary; child Row/Column
Scope.align/weight and native child cross placement are separate audits.

Three main sizes, three cross sizes, nine padding profiles, six parent bounds,
four progress values including overshoot, both positions/axes/RTL and two scroll
values produce 31,104 cases. Of these, 2,160 intentionally retain source-invalid
main minimum/animated maximum combinations and must throw; 28,944 valid cases
compare intrinsic size, reservation/coercion, bar/FAB/viewport/content placement
and stationary padded scroll geometry. A separate 66-case value oracle compares
logical/absolute validation and Float rounding.

Chromium compares all 6,912 finite-parent no-FAB trees through actual root/group/
native app/body rectangles and inherited lines. It also compares 8,208 valid
finite with-FAB cases through actual root/bar/viewport/native FAB rectangles and
scroll ranges/main-axis content placement. These latter assertions do not claim
native child cross placement, or the hidden content origin at a zero viewport.
Both sets use an explicit atomic measurement gate for source input constraints
and sampled animation values.

72 ordinary live padding changes cover both axes/RTL, every padding profile and
both layouts while preserving focused native buttons. Inherited parent direction,
reconnection and removing the with-FAB override to restore the primary padding
are checked separately. The properties and declarative string syntax are web
adapters; the independent expected geometry comes only from original Kotlin.

Focused commands: `node test/unit/toolbar-padding.test.mjs` and
`node scripts/test-toolbars.mjs --padding-only`. Both are also included in the
full unit/parity suites. Full Compose scheduling, arbitrary custom layout/layers,
Android density/fonts/renderer/input and broader engines remain outside these
assertions. Complete MD3E library/showcase parity is still in progress.
