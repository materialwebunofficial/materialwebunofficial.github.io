# Toolbar native with-FAB content oracle

Run `python tools/androidx-toolbar-fab-content/generate.py` with the cached Kotlin
runtime. Tests consume canonical UTF-8 gzip JSON without Java. The generator
refreshes the padding, default Row/Column, modifier/coordinator and with-FAB
constraint generators first. Do not run tests concurrently with regeneration.

Seven unchanged licensed originals and exact URL/SHA manifest are in
`test/fixtures/androidx/toolbar-fab-content` at revision
`a095da93f8e98dea8748ceed79ea8427aade245f`. FloatingToolbar's with-FAB call tree
selects explicit CenterVertically/CenterHorizontally and padding outside scrolling.
The original public default-policy factories, full Row/Column policies and their
intrinsic algorithms execute with that selection. Explicit child parent data
overrides the default. Shared modifier and coordinator originals are independently
hash-verified and refreshed, rather than rebuilding expected geometry in JS.

The host native leaf executes the original SizeNode/minimum-interactive tree.
Its four intrinsic methods now execute that same tree through the original
LayoutModifierNode default methods and ordinary NodeMeasuringIntrinsics bodies,
instead of a fixed 48px leaf shortcut. Layout.kt supplies the independently
verified original LargeDimension expression for unbounded intrinsic queries.
Empty intrinsic placeable storage, density-1 scope delegation, generic natural
dimensions, explicit generic line values, identity layers, owner invalidation
and deferred placement remain host boundaries. Compose recomposition, generic
text shaping/wrapping, Approach/lookahead and arbitrary custom providers/layers
are not executed.

100 intrinsic query groups compare all four queries at 0/17/64/96/Infinity in both
orientations, including native XS/S/M/L/XL, wide buttons, mixed generic content,
fractional weights/fill-false, relative lines and empty rows. The with-FAB tree
contains the original scroll, padding, UnspecifiedConstraintsNode, policy and
Placeable coercion/placement bodies. Ten profiles, nine logical/absolute padding
values, seven parent bounds, both axes/RTL/FAB positions, four progress values
including overshoot and two scroll values produce 40,320 trees. 38,536 are valid;
1,784 retain source-invalid main-minimum/animated-maximum combinations. A wholly
generic single-child profile checks zero-cross-dimension scroll extent without
native minimum-interactive overflow supplying a browser scroll area.

Actual scroll measurement uses an unbounded main axis. Weighted intrinsic
reservation and actual measured child sizes can therefore differ. Tests compare
the reservation, apparent/real root sizes, toolbar/FAB/viewport, constrained row,
native app/touch/body placements and scroll state. Integer cross centering,
explicit Start/Center/End, relative generic lines, tiny/zero cross bounds and
overflow/coercion are checked independently.

The Chromium gate compares all 32,776 valid finite-parent trees against actual
root/bar/FAB/viewport/group/native app/body bounds and native scroll ranges. It
uses atomic constraints/progress inputs; expected coordinates come only from
original Kotlin. The runtime supplies a physical centered Row/Column and native
body constraints through private CSS rules. Main-axis overflow clipping prevents
expanded native hit bounds from enlarging the browser scroll extent beyond the
source row's measured size. The orthogonal axis retains ordinary visible
overflow. An inert transparent extent element retains the source main-axis scroll
range when all descendants have zero cross size; it does not change group/child
bounds and is hidden outside the native with-FAB path. Horizontal zero-width RTL
scroll uses the source zero-parent-width
exception; the row keeps its logical RTL direction independently of that native
scroll-container adapter.

Ordinary live tests additionally cover padding, explicit alignment/removal,
native size/weight changes, inherited direction, removing/re-adding a FAB,
native/text fallback cleanup, reconnection and retained native controls/focus.
A separate 2,520-case no-FAB oracle executes the original balanced-padding
constructor's natural initial value with no leading/trailing content and the
omitted inner Top/logical Start policies. The host Animatable retains that
original constructor input; it does not run the full animation/coroutine runtime.
This independently verifies geometry after removing a FAB, rather than reusing
an atomic intermediate visibility/padding sample as an ordinary final state.
The browser's 76 live mutations retain controls and focus across both layouts.
These are web input/lifecycle
adapters, not proof of Android focus/gesture or pixel rendering identity.

Focused commands: `node test/unit/toolbar-fab-content.test.mjs` and
`node scripts/test-toolbars.mjs --fab-content-only`. The source tests and browser
gate are also included in the full unit/parity runners. Custom shapes/non-spring
finite animation specs, bare text/MDC docked content measurement, arbitrary
modifiers/layers, Android density/fonts/input/ripple/shadows and wider engines
remain separate audits. Complete MD3E library/showcase parity is in progress.
