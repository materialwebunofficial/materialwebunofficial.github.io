# Progress indicator source adaptation

Pinned AndroidX revision: `a095da93f8e98dea8748ceed79ea8427aade245f`.
Nine unchanged licensed progress/token/modifier/ShapeUtil originals and exact
URL/SHA references are in `test/fixtures/androidx/progress-indicators`.

`node tools/androidx-progress/snapshot.mjs` executes the original determinate
standard linear/circular Canvas bodies and their line/arc/stop drawing helpers.
The density-1 host records draw calls and supplies Dp, color labels, stroke,
size/offset and LTR direction. Its 216 cases cover zero/tiny/normal widths,
progress endpoints, gaps and Butt/Round/Square caps. This verifies source drawing
arguments, not Skia rasterization, semantics or Compose scheduling.

`node tools/androidx-progress/generate.mjs` runs the same pinned graphics-shapes
RoundedPolygon circle/star constructors, normalization and Morph matching as
CircularShapes. Prepare its cached runtime with the existing
`python tools/androidx-shapes/generate.py` if necessary. The resulting
`src/tokens/progress-morphs.js` is consumed by the actual web component; neither
Java nor Kotlin is required by normal builds or package users. Counts 5–256 use
native coefficients. The default nine-vertex shape retains every source cubic;
other counts reconstruct rotational wedges with browser Float/trigonometry.
Counts above 256 extrapolate the final wedge and remain a parity limitation.

`progress-indicator-layout.js` adapts standard indicator geometry, source 1750ms
linear head/tail schedules, source 6000ms circular sweep/rotation schedules,
adaptive gaps, quadratic linear waves and stop shrinking. Native keyframe easing
belongs to the lower key; unspecified keys use LinearEasing. Unit checks verify
critical timing boundaries; they do not execute the complete animation runtime.

`progress-indicator-path.js` adapts ShapeUtil's start-angle rotation, source
control-point bounds/centering, cubic morph interpolation and distance-based
extraction. Linear paths use analytic quadratic lengths. Circular paths use
adaptive cubic subdivision. Both are explicit browser PathMeasure adapters:
native Skia subdivision, matrix arithmetic and raster/text/input rendering are
separate boundaries. Canvas antialiasing can differ when reflecting a quadratic;
browser checks bound the few edge differences and compare overall RTL coverage.

Focused browser tests also cover scoped primary/secondary-container roles,
transparent standard circular indeterminate tracks, CSS color syntax, immediate
ARIA changes, stable Canvas identity, amplitude endpoint gates, static RAF
cleanup, reduced motion and disconnect/reconnect. Full precise curve timing,
all rapid amplitude-job/phase changes, arbitrary constraints and other browsers
remain open in the project parity ledger.
