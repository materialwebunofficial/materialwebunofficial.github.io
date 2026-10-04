# Material3 common ripple adaptation

Pinned revision: `a095da93f8e98dea8748ceed79ea8427aade245f`.
The current Material3 Ripple.kt delegates to `material3-ripple`; its CommonRippleNode
uses RippleAnimation. The older `material-ripple` copies are context and do not
form the proof target.

`node tools/androidx-ripple/snapshot.mjs` executes unchanged current radius/draw
bodies with unchanged native FloatTweenSpec and CubicBezierEasing/Bezier/math
helpers. Input source hashes are verified. Cached drawer math bridges are
checked against each original arithmetic body and recompiled with this host.
The 5,712 cases cover square/wide/zero layouts, bounded/unbounded geometry,
three origins, held/early/late release and phase boundaries. Every recorded
radius, center and color alpha requires exact Float equality in the unit test.
The phase host supplies Animatable values and completion flags from source
durations; coroutine/frame scheduling and Skia drawing are not executed.

Production uses separate radius, center and alpha channels. Radius and center
expand for 225ms (FastOutSlowIn and linear respectively); alpha enters in 75ms.
Held ink settles without a continuous RAF and waits for release. Early release
switches to full alpha and waits for expansion; exit fades for 150ms. Repress
finishes prior ripples and retains their exits. CSS relative color replaces
content alpha with the pressed opacity, while retaining live color roles.
`bindPress` owns ripple lifetime, including keyboard, canceled/lost capture,
disabled-state cancellation exits and AbortSignal cleanup. The pinned Foundation
Clickable source retains its indication node on disable and emits Cancel;
disabling a held web press likewise retains its normal 150ms exit.
Standalone createRipple calls remain
a finite one-shot indication. Reduced motion shows static held feedback and
clears it on release.

The focused browser check compares rendered DOM circles with the independent
native recorder and verifies held/early/repeated/keyboard phases, pointer
ownership, live opaque colors, cleanup, reduced motion and stable FAB DOM.
CSS coordinate serialization/layout rounding is a browser boundary.

`node tools/androidx-ripple/interaction-snapshot.mjs` executes unchanged internal
Elevation.animateElevation/spec selection, state-layer spec selectors, FAB target
calculation and native interaction collection branches through scalar/event hosts.
Unchanged FloatTweenSpec, Easing and checked Bezier/math bodies produce 5,096 exact
Float frames across incoming/outgoing/unknown states, all alpha endpoints and
four hover-to-press interruptions. Five source histories verify recent interaction
order separately for FAB elevation and ripple state layers. The host records
animation specifications; it does not run full Animatable coroutine scheduling.

FAB production now applies those independent elevation and hover/focus channels.
Normal elevation is 6dp/8dp on hover, lowered is 1dp/3dp, and the toolbar helper
uses 3dp/6dp. New elevation configuration snaps the active target; equal targets
retain an existing transition. Press participates only in elevation order.
Hover/focus indication color replaces content alpha. Native default focus uses
opacity without an additional outside ring. CSS shadow tokens are resolved live
and interpolated from the native scalar; Android raster identity is not claimed.
Focused browser checks include actual shadow arguments, source timing/order,
midflight changes, focus, inherited tokens, opaque color, reconnect and disposal.

Remaining: Android RippleDrawable/API-dependent shader/timing behavior;
complete coroutine/frame-clock equivalence; per-component bounded/unbounded
and explicit radius configuration; state-layer recent-interaction order and
15/45/150ms transitions outside the audited FAB; optional precision/inset focus
rings and input modality; custom FAB elevation arguments and extended visibility
springs; native color packing/rasterization; arbitrary
transforms/constraints and other browser engines. These checks establish the
common ripple slice, not complete ripple or FAB parity.
