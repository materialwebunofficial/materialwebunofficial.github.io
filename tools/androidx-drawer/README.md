# Drawer gesture motion oracle

Run `python tools/androidx-drawer/generate.py` after initializing the private
Kotlin cache with tools/androidx-motion/generate.py. This uses Python3, Java8+
and the existing private Kotlin1.9.24 runtime; it does not install a system tool.
Original sources and SHA hashes live in test/fixtures/androidx/navigation-drawer;
FloatTweenSpec's original source/hash lives in the motion fixtures/manifest.

The generator extracts unchanged FloatTweenSpec, FloatExponentialDecaySpec,
CubicBezierEasing, required Bezier functions and fastCbrt. Runtime annotations
are removed; bridge interfaces/constants, FloatFloatPair and coerceIn are host
adapters. No easing/decay equation is replaced. The source fastCbrt bit arithmetic
and Newton refinement run unchanged.17 cases cover zero velocity, either release
direction, opposing velocity, decay reaching an anchor and insufficient projection.

The pinned DrawerState captures its initial TweenSpec(256) in the legacy
AnchoredDraggableState constructor. Later updates to anchoredDraggableMotionSpec
do not mutate that captured spec. Public open/close select separate motion roles.
Tests check tween/decay sample positions, velocity, projection/duration, anchor
clamping and spring interruption. Browser tests compare actual bounds and verify
that gesture settlement does not create opening-spring stretch.

The generator additionally compiles unchanged VelocityTracker1D,
polyFitLeastSquares and their vector/matrix helpers. Runtime annotations are
removed; the ComposeUiFlags object, exception helpers and coerceAtLeast are
host adapters.30 histories include both minimum-sample flag states. Tests use
the15 cases matching the pinned enabled flag, and guard the Android framework
tracker's disabled flag. Browser checks separate/coalesced acceleration histories
and the40/41ms UP pause boundary. Cancellation now settles with velocity0.

TouchSlopDetector and pointerSlop execute unchanged against Offset/Orientation,
ViewConfiguration and Dp-to-Float host adapters, exporting84 horizontal cases
across four view configurations and mouse/touch/stylus input. Source body/ratio
are unchanged. Browser tests check threshold equality, post-slop displacement,
incremental moves and source startDragImmediately via actual mouse events,
including consumed child presses, stopped RAF and clamped opening overshoot.

Remaining gesture work: platform event/view-configuration differences,
closed-container touch routing and container gesture ownership/predictive back.
