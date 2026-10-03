# Toolbar IntSize motion and composition oracle

Run `python tools/androidx-toolbar-size-motion/generate.py`, then
`python tools/androidx-toolbar-size-motion/generate-layout.py` with the existing
cached Kotlin runtime. Normal tests consume deterministic gzip JSON without Java.

Twelve unchanged licensed originals and exact URL/SHA manifest are under
`test/fixtures/androidx/toolbar-size-motion` at AndroidX revision
`a095da93f8e98dea8748ceed79ea8427aade245f`. The motion generator executes complete
original AnimationVector classes, vectorized spring/Float policies, FloatSpringSpec,
SpringSimulation/SpringEstimation, TargetBasedAnimation, SpringSpec and their
interfaces. It uses the original IntSize converter and Transition.updateAnimation /
updateTargetValue bodies, plus original AnimatedEnterExitImpl parent gate and
exitFinished expression. Package/imports/enclosing accessibility are adapted;
IntSizeToVector's file-private visibility is widened for the host harness.

The explicit host supplies IntSize storage, Float packing, finite/round/coercion
helpers, relative elapsed clocks, state sampling and no-op child invalidation.
All trajectories use finite springs, no seek/reset/forced initial-value handoff,
and no deferred global-clock delay. Those Transition branches are present but
not exercised. The host's unused generic interruption fallback is not a proof
of converter-specific default thresholds or non-spring interruption behavior.
Composition evaluates the original gate/exit predicate with a host derived-state
and the identical public shouldDisposeBlock; it does not execute Compose runtime
composition, remember or coroutine scheduling.

108 trajectories / 1,188 sampled frames cover unequal component durations,
stationary components, cross-only changes, Expressive/Standard/default-size
springs, explicit two-axis incoming velocities, overshoot, 64/128ms retargeting,
converted integer current values and Float velocities through shared completion.
864 source parent/child gate combinations retain pending/seeking/initial/forced
inputs; six reachable ordinary toolbar host states are compared directly.

The layout generator first hash-verifies and executes the thirteen shared
Row/Column/modifier and seven coordinator originals through the alignment
generator. It adds an explicit cross-size Deferred sample input to that host
adapter; the original EnterExitTransition measure body remains unchanged.
1,920 native trees cover both axes/RTL, S/M/L leading bodies, M trailing bodies,
zero/tiny/bounded parents and initial/Visible/exiting/disposed/re-entering groups.
Composition decides which source Measurables exist. These are atomic measured
states, not a claim that every sampled size is a reachable animation trajectory.
The shared harness selects centered inner Row/Column policies explicitly. The
actual toolbar composable's omitted inner arguments default to Top/Start;
unspecified children and explicit center overrides are independently verified by
`tools/androidx-toolbar-inner-alignment`. This vector/composition slice alone
does not establish those defaults. Single-child native groups in these new
layout cases do not depend on that default difference.

The browser compares all 1,920 measured trees and real native app/body rectangles,
then checks actual mutation/RAF vector frames and retained controls, completed
exit/fresh entry, hidden updates, constrained initial/reconnected cross sizes and
reduced motion. Existing row/alignment atomic browser tests explicitly retain a
PreEnter composed node and inject their original cross48 sample; those tests
remain measurement gates and do not assert completed-exit composition behavior.

Arbitrary Compose content/scheduling/input/rendering, custom alignment providers,
graphics layers, lookahead, seeking, generic intrinsic approximation and platform
pixels remain explicit boundaries. Overall MD3E parity is still in progress.
