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

`node tools/androidx-progress/generate-circular-motion.mjs` freshly compiles the
unchanged pinned circular/linear descriptor getters, amplitude specs,
VectorizedKeyframesSpec, VectorizedInfiniteRepeatableSpec, FloatTweenSpec and
Easing/Bezier/Math numerical bodies. All original input files are SHA checked.
The scalar vector and descriptor DSL are hosts; unused ArcSpline fails closed.
The cached collection storage predates IntList's binarySearch member, so the
unchanged pinned member body is bound as an extension over copied storage.
Normal package builds/users need neither Kotlin nor Java.

The compressed references contain7408 circular progress/rotation frames,
2385 linear head/tail frames and3530 amplitude frames. They cover each integer
millisecond in a cycle, fractional-nanosecond boundary probes and repeated cycles.
An additional14112 samples cover14 native easing curves, including degenerate,
multiple-root and overshoot cases. Dedicated units compare actual production
values with strict Float equality; the old Double binary-search easing is not
used by these progress channels. Circular FloatTween keeps fractional
nanoseconds, while keyframes quantize to integer milliseconds. Web milliseconds
map to the nearest integer nanosecond. The native easing helper retains every
Float arithmetic boundary and the original root-solving algorithms.

`npm run test:progress` builds the distribution and runs the focused browser
suite. Its deterministic Playwright clock executes actual scheduled RAF draws
through two circular cycles at1000/390 light/dark LTR/RTL with DPR1/2. Actual
Canvas rotation/sweep/progress arguments and amplitude attributes are checked
against independent original runtime values and narrower numeric samples. Constant-amplitude wave path caches
and Canvas identity remain retained; reduced-motion/disconnect cancel RAF.
Real showcase profiles at1440/390 light/dark also verify visible advancing draws.
The clock and Canvas degree/radian conversion are declared browser adapters.
The descriptor generator alone does not execute native Animatable/coroutines;
the runtime generator below executes those bodies with explicit clock/state hosts.
Neither executes Compose drawing, Android frame dispatch, Skia PathMeasure or
rasterization, and neither proves universal frame pacing.
Wave-offset restart/job histories and the remaining geometry/runtime boundaries
remain open; passing numeric values alone cannot explain subjective stutter.

The same generator also extracts the unchanged infinite linear-tween offset
descriptor from both wavy modifiers, failing if they diverge. Its19304 offset
values cover5 durations,4 retained Float starting offsets and4 cycles with
fractional boundary probes. The actual wave-offset numeric helper matches these
with strict Float equality, retaining the rounded `start + 1f` target, Float
tween fraction/interpolation and Float remainder. The browser gate also checks
the resulting default9000ms offset in every actual scheduled wavy Canvas draw.
This closes that numeric kernel only; native job cancellation, restart ownership
and coroutine/frame-clock ordering are not executed by this descriptor host.

The source circular modifier's complete `global + additional + 90f` drawing
expression is also extracted unchanged and sampled on the JVM at7408 timeline
points. Actual circular wavy Canvas draws consume the rounded Float degrees
before the browser's degree/radian conversion, including all fractional boundary
and repetition probes. This tests the drawing argument; native Matrix/Skia
arithmetic and rasterization remain separate.

`node tools/androidx-progress/generate-runtime.mjs` independently rebuilds the
numeric assemblies and compiles complete unchanged active Animatable,
AnimationState, InternalMutatorMutex, TargetBasedAnimation, SuspendAnimation and
InfiniteTransition class/run/child bodies. Real coroutines1.9.0 Jobs run finite
completion, infinite animation and cancellation. The raw version catalog and
coroutine checksum pin the dependency; private Kotlin/JVM1.9.24 is explicitly
different from the pinned main AndroidX catalog2.4.20 build environment.
Prepare the existing private compiler/collection cache first, plus the SHA-pinned
Maven coroutine jar identified in frame-timeline.meta.json. No normal web build
or user requires this research runtime.

The independent24057-frame reference includes actual Animatable and
InfiniteTransition circular values, linear head/tail values and wave offsets,
with fractional boundaries through24000ms. Original runtime establishes time0
at the first delivered frame and casts Long nanosecond elapsed through Float
division even at duration scale1. Actual web progress now uses separate retained
clocks for its main, amplitude and offset jobs. Theme/attribute/size redraws read
last-frame state and retain already pending RAF. Unit checks compare strict
Float values at two epochs; actual scheduled browser drawing uses the complete
runtime reference rather than a second JavaScript clock/easing formula.

Plain scalar State, immediate remember/LaunchedEffect entry, list storage,
Unconfined dispatch and a manual MonotonicFrameClock are declared platform hosts.
Compose snapshots/composition/cache scheduling and Android dispatcher/frame
delivery are not executed. This timeline executes scale1 only; scale0 snapshot
resume, native modifier owner histories, unused spring/decay and raster remain
outside it. The existing650ms reduced-motion pose is a web adapter. Wave
restart/cancellation/detach and rapid amplitude/cache ownership need separate
original modifier execution and actual DOM gates before a broader parity claim.

`node tools/androidx-progress/generate-phase-owners.mjs` now executes those
original offset start/stop and wavelength/speed setter bodies, linear
attach/detach, circular indeterminate amplitude/attach/detach/three-channel
launch bodies and the original vertex-cache offset-start branch. Original Dp
operators/factories and JVM Float rounding execute with real coroutine jobs.
The416 action/frame states include cancellation/job identity, minimum-duration
restarts, equal-Float setter guards, externally supplied vertex-cache changes,
zero amplitude/speed and detach/reattach. Scalar float state, node-scope disposal,
cache invalidation counters and explicit cache triggers are hosts. This does
not execute Compose cache/snapshot scheduling or determinate amplitude-owner
histories. Production now uses `ProgressWaveMotion` for these phase owners. Strict
units compare416 original states, including30 active replacements. A separate104
state reference supplies physically feasible public DOM property/cache histories;
832 real component comparisons and32 determinate retention checks cover8 browser
profiles. The declared node/frame/cache bindings remain platform adapters.

Progress and Loading share a connection-scoped visibility subscription. The last
queued native observer entry wins when one delivery contains opposite states;
retired subscriptions cannot overwrite a reattached component. Real showcase
hash/bootstrap and native hide/show gates exercise this separately from the
source animation references. This fixes a browser lifetime fault, not native
Compose scheduling.

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
cleanup, reduced motion and disconnect/reconnect. Rapid determinate amplitude/cache
scheduling, default-amplitude Float threshold boundaries, arbitrary constraints,
native durationScale0 and other browsers remain open in the project parity ledger.
