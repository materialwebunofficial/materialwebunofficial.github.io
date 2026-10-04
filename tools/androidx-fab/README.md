# Extended FAB source recorder

Run `node tools/androidx-fab/fetch-sources.mjs` to fetch the eleven unchanged
licensed originals at pinned AndroidX revision
`a095da93f8e98dea8748ceed79ea8427aade245f`, then
`node tools/androidx-fab/snapshot.mjs` with the cached private Kotlin runtime.
Normal tests consume JSON and need neither Java nor network.

The recorder hash-verifies these originals and the existing ripple,
toolbar-size-motion and toolbar source manifests. It executes original
AnimationVector, VectorizedSpringSpec, FloatSpringSpec, SpringSimulation,
SpringEstimation, TargetBasedAnimation, SpringSpec, converter and
Transition.updateAnimation/updateTargetValue bodies. It executes the original
baseline Extended FAB enter/exit helper expressions, EnterExitTransition
width/alpha spec branches and Int lerp. Enclosing declarations, package/imports
and converter visibility are adapted; arithmetic and decision bodies are
unchanged. Motion token originals supply both schemes' parameters.

The explicit host supplies source-shaped fade/size configuration, finite
spring resolution, integer intrinsic sizes, event clocks and composition state.
The new sized FAB's FastSpatial/FastEffects spec declarations also execute
unchanged from the private ExtendedFloatingActionButton source. This is a scalar transition and layout
recorder; it does not execute the entire FAB composable, Compose frame delivery,
lookahead, constraints, font shaping or its Row placement. Generic host inputs
do not prove every native intrinsic layout or RTL constraint behavior.

96 histories / 2,112 frames cover both schemes, baseline and all new sizes,
three intrinsic widths, both directions and 64/128ms interruptions. Baseline
IntSize conversion clamps/rounds the current value before retargeting and keeps
Float velocity. Ordinary source specs use the default .01 displacement
threshold; the baseline re-entry fallback uses the explicit IntSize threshold
1. Independent width/alpha channels keep closing content until both finish.

Unit tests compare native trajectory, integer output and completion; Chromium
compares rendered widths/alpha, preserved heights/shapes, stationary defaults,
text-only content, focus, reduced motion, scaled logical measurement,
reconnection and disposal. The live showcase checks four sizes and accessible
pointer/keyboard controls at 1440/390px in light/dark mode. Overall library
parity remains incomplete.

The integrated toolbar regression verifies that live FAB label/theme/geometry
updates retain a parent's temporary keyboard-traversal override while hidden.
Disabled state alone updates the FAB's own tabindex. The existing toolbar icon
check targets the actual icon instead of assuming the first nested span is it.

`fetch-surface-sources.mjs` caches four unchanged ColorScheme/Color/Surface/
minimum-interactive originals with URL/SHA/license manifest. Run
`node tools/androidx-fab/surface-snapshot.mjs` for the independent source sRGB
recorder: 1,216 tonal composites, 325 ordered content-role collisions and 48
channel packings. Constructor sRGB branches, Color.copy/compositeOver and
ColorScheme method bodies execute from original sources. Color-space conversion,
Dp and composition-local delivery are explicit scalar hosts; non-sRGB branches
are deliberately not hosted. Browser tests cover live theme roles, parent tonal
elevation, lowered/toolbar defaults, hover invariance, explicit/inherited content,
role collisions, disabled/reconnect behavior and 26 unconstrained plus 12
fixed-size constrained minimum-layout outputs from the independently compiled
toolbar-row fixture. An immediate style-read loop checks centering when inherited
toolbar sizing changes before ResizeObserver delivery. Configurable CSS
reservation lengths and pointer expansion are browser adapters; arbitrary
standalone incoming Compose constraints remain open.
