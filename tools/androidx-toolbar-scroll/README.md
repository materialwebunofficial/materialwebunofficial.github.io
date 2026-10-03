# Toolbar scroll source execution

Run `python tools/androidx-toolbar-scroll/generate.py` after the shared Kotlin
runtime/spring jar has been prepared by `tools/androidx-motion/generate.py`.
Normal tests read the JSON fixtures without Java or network access.

The 11 licensed originals in `test/fixtures/androidx/toolbar-scroll` retain URL
and SHA manifests: ten AndroidX files at a095da93f8e98dea8748ceed79ea8427aade245f
and AOSP ViewConfiguration at android-16.0.0_r1. The default friction is .015;
platform density/friction overrides are explicit host inputs.

The complete original AndroidFlingSpline table generation/sampling,
FlingCalculator, SplineBasedFloatDecayAnimationSpec, expansion node, exitAlways
behavior, state implementation, collapsedFraction and settleFloatingToolbar
bodies execute unchanged. The shared original FloatSpringSpec body runs against
the existing pinned SpringSimulation/SpringEstimation jar. Imports, packages,
state delegates, modifier interfaces and measurement/event routing are host
adapters. SHA checks reject changes to originals.

Coverage: 32 density/velocity spline curves, 108 expansion traces with live
threshold/reverse/state changes, 96 physical exit/drag/parent-limit layouts,
336 fling/snap traces (3,915 frames), 336 durationScale=0 traces and 336
hoisted-state mutation traces before the snap's first frame. Native
NaN velocity for the zero-duration scalar spec is encoded as the string `nan`;
DecayAnimation itself supplies the completed zero velocity.

The clock adapter supplies uniform 8/16/33ms frames and implements the original
fresh AnimationState next-frame start and completed target/end-velocity rules.
It executes the whole settling lambda, including its signed
`abs(delta-consumed)>.5` cancellation, rather than correcting that comparison.
The Android UI coroutine/gesture pipeline is not executed. Pinned Animation.kt,
SuspendAnimation.kt and DecayAnimationSpec.kt document those adapter rules.

Runtime consumed scroll deltas, parent CSS coordinates, pointer capture/slop,
open-shadow native focus management and accessibility opt-in are web adapters.
Native browser `scrollend` exposes no remaining nested fling velocity, so the
automatic binding settles with zero; hosts may provide remaining Y velocity
through `MdToolbar.postFling`. AndroidFlingDecay density defaults to one CSS px
per dp, independently of raster devicePixelRatio. Touch exploration is explicit;
the browser cannot reliably detect Android TalkBack. `forceCollapse` represents
the source custom accessibility action; callers can expose it in their UI.

Generic parent measurement/coercion, ancestor nested-scroll consumption,
competing child gestures, closed-shadow/iframe focus routing, arbitrary finite
animation specs, platform fonts/density, native accessibility services and
Android ink/shadow pixels remain separate audits.
