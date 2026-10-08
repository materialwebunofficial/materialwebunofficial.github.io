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
four hover-to-press interruptions. Nine source histories verify recent interaction
order separately for FAB elevation and ripple state layers. The host records
animation specifications; it does not run full Animatable coroutine scheduling.
Four histories contain distinct concurrent press references, hover/focus between
them, out-of-order release and cancellation. Both the original collection and
the production InteractionOrder remove only the matching owner. Source output
reproduces byte-identically (SHA-256
5590656d97040b5801b0fe804e6d39dd9fa8b0617a19261496797d0e52ae9655).

FAB production now applies those independent elevation and hover/focus channels.
Normal elevation is 6dp/8dp on hover, lowered is 1dp/3dp, and the toolbar helper
uses 3dp/6dp. New elevation configuration snaps the active target; equal targets
retain an existing transition. Press participates only in elevation order.
Hover/focus indication color replaces content alpha. Native default focus uses
opacity without an additional outside ring. CSS shadow tokens are resolved live
and interpolated from the native scalar; Android raster identity is not claimed.
Focused browser checks include actual shadow arguments, source timing/order,
midflight changes, focus, inherited tokens, opaque color, reconnect and disposal.
The FAB now opts into shared ClickableKeys key-up activation. The independent
original Foundation key/focus/dispose/update oracle also checks six FAB profiles:
600 normalized web-key histories/1,860 actual pressed/click frames. Four original
multi-owner FAB histories inject references at the production controller;
separate trusted keys and mouse verify elevation precedence, held ink, independent
release, focus/disable/reconnect cancellation and stationary FAB geometry. Default
opacity focus follows real pointer focus as well as keyboard focus. These DOM
adapters do not supply native D-pad mapping or the complete native input tree.
Run `node scripts/test-fabs.mjs --source` or `npm run test:fab`; the broader
parity gate also includes the new FAB keyboard check.

`snapshot.mjs --selection` executes the same unchanged Material3 draw body and
native Float tween specs with an explicit20dp radius, using a separate generator
cache and `selection-drawing-oracle.json`. It adds5,712 exact Float records across
16/24/28/40/48dp square,52x48dp, odd and zero draw hosts, bounded/unbounded modes,
three origins and seven release times. Reproduction SHA-256:
`d71a8d70b2ae8819809b04975a709f80cf2b918276c1533b73b46d02000a4909`.
Supplied draw sizes and clip recording hosts do not execute native layout
coordinators, coroutine scheduling or Skia rasterization.

Production `createRipple` now accepts bounded/explicit-radius configuration.
Switch uses its moving thumb; Radio uses its default24dp canvas/padding adapter,
and the updated MD3 Checkbox uses its18dp canvas without legacy padding.
`snapshot.mjs --checkbox` separately executes2,856 native explicit-radius frames
for18dp and rectangular draw hosts. Byte-identical reproduction SHA-256:
`c4e70b30c6e6deb14cea45e5e80d0f430230994f03db843bf6693a1d380892dc`.
The shared state-layer binder accepts an owned CSS
property and these three components bind15/45ms opacity/recent-interaction rules.
They remove the extra default outside focus ring and flat press layer. Indication
inherits content color (Switch icon colors stay inside the thumb), replaces its
alpha and honors the scoped ripple-color override. Content, ripple and state
layer paint in the native order. Source/bundle checks compare784 native alpha
frames and136 authored-circle frames (CSS serialization tolerance1e-4px), nine
orders per profile, color replacement, unbounded overflow, separate press,
disable/reduced-motion and retained-control lifecycle. Native coordinator size
assignment and constrained selection layout remain separate; the24dp default
is inferred from the pinned modifier/padding chain, not a full layout execution.
Checkbox's indication colors now follow the current visible Material specification
state-role table rather than inherited content or the public native unchecked
Transparent input. The same native geometry/opacity renderer is retained; see
the selection README for this explicit normative/source boundary.

Remaining: Android RippleDrawable/API-dependent shader/timing behavior;
complete coroutine/frame-clock equivalence; per-component bounded/unbounded
and explicit radius configuration; state-layer recent-interaction order and
15/45/150ms transitions outside the audited FAB; optional precision/inset focus
rings and input modality; custom FAB elevation arguments and extended visibility
springs; native color packing/rasterization; arbitrary
transforms/constraints and other browser engines. These checks establish the
common ripple slice, not complete ripple or FAB parity.
