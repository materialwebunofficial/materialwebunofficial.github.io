# Slider source adaptation

Pinned revision: `a095da93f8e98dea8748ceed79ea8427aade245f`. The unchanged
Apache-2.0 Slider.kt, SliderTokens.kt, Draggable.kt and DragGestureDetector.kt,
URLs and hashes are under `test/fixtures/androidx/sliders`.

`node tools/androidx-sliders/snapshot.mjs` extracts and executes the unchanged
drawTrack, drawTrackPath, drawStopIndicator, snapValueToTick and
stepsToTickFractions functions through a density-1 Kotlin recorder. Its 1,536
cases cover short/ordinary lengths, endpoints, continuous/discrete tracks,
standard/centered/vertical/range modes, gaps and LTR/RTL. The host supplies Dp,
size/offset/round-rect data, color labels and Compose's Float lerp. This verifies
drawing arguments and snapping, not the full Compose layout or Skia rasterizer.
All 1,536 cases now require exact Float equality, including mirrored path bounds.
The recorder also executes unchanged SliderState.dispatchRawDeltaInternal,
scale and calcFraction bodies for 1,320 pixel-to-user cases. Its state host uses
a 4px thumb and zero initial raw offset, with the coordinate supplied through
pressOffset. Another 360 state histories (9,288 frames) execute unchanged
SliderState.onPress/dispatchRawDeltaInternal and RangeSliderState.onDrag/
updateMinMaxPx bodies, plus the source scalar/range scale helpers. The field
hosts supply controlled, auto-snapped values and Float pixel dimensions. Cases
cover small successive deltas, repeated presses, overscroll/reversal, ranges
with coincident/end handles, active-handle changes and dimension changes during
and after dragging. All recorded raw offsets, values and callback comparisons
require exact Float equality. The Foundation coroutine runtime is not executed.
The cached Kotlin runtime is only required to regenerate reference fixtures.

Production `slider-layout.js` ports that scalar geometry and exposes an explicit
SVG RoundRect adapter with source radius normalization. `md-slider.js` consumes
it directly. The outer handle stays 4×44 while the inner handle immediately
halves its width during focus/press/drag. Track gaps continue to use the outer
handle. Browser tests compare DOM SVG circles and production path arguments to
the independent fixtures, and exercise input, state, colors and forms. Single taps use
the original press coordinate, single drags consume initial slop, and range drags
use the source's 2D threshold without consuming that offset. Started canceled
drags finish once; pre-drag cancellation does not finish. Detached single sliders
skip the finish callback, while detached range sliders retain the source's
finally completion. Reversed initial ranges are sorted. Range release before
slop also evaluates the accumulated direction, as in the source detector.
Production retains raw pixel offsets and Float press/delta order instead of
recomputing from absolute positions. HTML labels, live
aria-labelledby references and start-before-end focus are web adapters.

Source default tracks are 16dp; the previous advertised five size tokens were
unsupported. Legacy `size` remains accepted without changing the default track.
`step` adapts evenly spaced HTML intervals to native interior `steps`;
non-dividing increments are redistributed evenly over the range. `labeled`
is an opt-in web value-label adapter. Vertical range sliders are a web extension
of the source's horizontal RangeSlider. Vertical single sliders default to
top-to-bottom, matching VerticalSlider; use `topToBottom=false` or the
`top-to-bottom="false"` attribute to reverse.

Positive axis scaling maps viewport pointer events to local layout dimensions.
Remaining boundaries: native gesture ownership/consumption and pointer transfer,
coalesced/platform event delivery and range detector cancellation edge cases, input modality
focus-ring behavior, arbitrary Compose thumb/track modifiers and measurement
constraints, label/tooltip positioning and animation, complete accessible-name
computation for complex label markup, rotated/reflected/fractional/DPR geometry and
other browser engines.
Successful tests establish the documented slices, not complete slider parity.
