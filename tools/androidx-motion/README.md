# AndroidX spring oracle

Run `python tools/androidx-motion/generate.py` with Python3 and Java8+. The script
uses a private Kotlin1.9.24 compiler cache under ignored `research/kotlin-runtime`;
it does not modify PATH or install a system compiler. Source downloads are pinned
to AndroidX `a095da93f8e98dea8748ceed79ea8427aade245f` and checked against `sources.json`.

The oracle compiles upstream `SpringSimulation.kt` and `SpringEstimation.kt`.
The sole estimator substitution is `fastIsFinite()` → Kotlin `isFinite()`.
`Bridge.kt` supplies two constants and the exception helper; `FloatPacking.kt`
supplies lossless Float bit packing. Equations execute in Kotlin unchanged.
`Export.kt` normalizes inputs by FloatSpringSpec's default0.01 threshold and
samples539 cases: Material motion roles, the Transition interruption spring,
switch size/offset, rail width/spacing/height and drawer offset intervals, reverse motion, nonzero incoming velocity and
critical/overdamped inflections. Frame-aligned samples through320ms also cover
the navigation indicator's DefaultSpatial expansion, fade and overshoot. Drawer
cases include 240/320/360px anchors, release velocity in either direction and
same-anchor impulses; the web timeline accepts an explicit release velocity.
List cases add4/12/16px corner transitions,0/8dp dragged elevation and two
64ms interruption trajectories per role with independently computed Float
position/velocity. Browser checks draw the corner and elevation spring samples.

Committed fixtures are under `test/fixtures/androidx/motion`; normal tests do not
need Java or network. `node test/unit/selection-motion.test.mjs` compares exact
integer durations and Float trajectories (relative tolerance2e-6). The Chromium
suite checks actual rendered path lengths, dot diameters and switch thumb size/
placement against these samples. Switch press uses SnapSpec; release uses the
FastSpatial Float spring, and ThumbNode truncates size/placement to integer pixels.

Checkbox uses Transition.animateFloat and radio supplies an explicit FastSpatial
spring to animateDpAsState. These MotionScheme springs have no custom threshold,
so VectorizedSpringSpec uses0.01; radio does **not** use the0.4 threshold from
animateDpAsState's default spec. See the committed Motion/animation source chain.
Transition replaces an interrupted snap spec with spring(stiffness1500,damping1).

The generator additionally exports24 four-channel color trajectories at effects
stiffness800/1600/3800 and damping1. The [alpha,L,a,b] order comes from the pinned
ColorVectorConverter, and every component uses the maximum duration (including
components already below threshold), as in VectorizedFloatAnimationSpec. The
fixtures cover selection, layout role changes, disabled alpha and nonzero incoming
velocity. `node test/unit/color-motion.test.mjs` checks exact common duration and
Float trajectories; Chromium checks actual computed rail label color and inherited
theme changes. Color reference originals/hashes are in test/fixtures/androidx/color.

Scope: internal selection/navigation spatial and rail color timelines. Existing general CSS/WAAPI springs
still use their earlier completion heuristic. The browser's CSS Oklab conversion
does not reproduce Compose packed Float16/10-bit colors and sRGB quantization;
conversion precision, rasterization, ripple phases and focus-ring geometry remain
separate pending audits.
