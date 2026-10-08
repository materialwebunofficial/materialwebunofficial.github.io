# Button source comparisons

The twenty unchanged licensed references in `test/fixtures/androidx/button`
are pinned to AndroidX `a095da93f8e98dea8748ceed79ea8427aade245f`.
`fetch-sources.mjs` records their original URLs and SHA-256 hashes. Every
generator verifies that manifest before compiling source bodies.

`generate.py` extracts the original public `contentPaddingFor`, `iconSizeFor`,
`iconSpacingFor`, padding/default constants and the identical Row call from
both public Button overloads. Original size token bodies, defaultMinSize node,
Row/Size/Padding/Placeable/alignment coordinator measurement run on the JVM.
Shared original foundation bodies come from the SHA-verified tooltip,
toolbar-row, toolbar-alignment and snackbar fixtures. Modifier's type name is
relocated; composition emission, density1, a false precision-pointer sizing
flag and already measured text/icon leaves are explicit hosts. Intrinsic
queries are not implemented by the harness.

`layout-oracle.json` contains five public defaults and 160 native measurement
trees. `browser-layout-oracle.json` contains 120 additional native Row trees
using explicit Chromium text leaves. These check the actual web button's
dimensions and integer center placements for five sizes, filled/outlined/text,
empty/multiline/custom-font text, leading/trailing icons and both directions.
Surface borders draw inside the shape and do not consume layout padding.
The 48dp web interaction reservation and real pointer/keyboard activation are
checked separately; this harness does not execute the native Surface or its
complete minimumInteractiveComponentSize modifier.

`generate-shape.py` executes the complete original AnimatedShapeState body,
Interpolatable interface/companion, RoundedCornerShape and CornerSize lerp
helpers, and Float MathHelpers lerp. Original spring simulation/estimation and
Expressive/Standard DefaultEffects tokens supply the scalar frames. The
uniform rounded shape, Size/Density and Animatable/frame/coroutine shims are
explicit hosts; the real Animatable/composition scheduler is not run. Ten
histories contain 150 frames covering early reversals, velocity flips, third
targets, completion and lazy radius resolution after changing measured size.
The JS model matches all 150 isolated frames. The actual component retains 120
press/release/reversal frames; public attribute changes follow the separate
composition fixture below, since replacing ButtonShapes recreates its state.
Browser CSS serialization rounds radius text, so its comparison allows 0.0001px;
scalar progress/velocity use the tighter native Float tolerance.

`generate-composition.py` additionally executes the unchanged ButtonShapes
class/equality/copy, public shape/default helpers, shapeByInteraction and both
rememberAnimatedShape bodies. Original ShapeKey/Shape and five size token bodies
are compiled. Explicit slot/group/effect draining, theme-role bindings, uniform
corner outlines and the existing density/frame/Animatable hosts provide the
execution environment; this is not the Compose compiler or runtime scheduler.
Original SpringSpec equality/hash bodies supply remembered spec identity; their
type name is relocated for the scalar host. `composition-oracle.json` contains
30 histories/450 frames across both schemes:
pressed/resting pair and size replacement, equal new values, effect-spec and
nullable threshold identity, signed-zero damping equality, unused/used live theme roles, percentage corners
and lazy resizing. The model and real component renderer match state replacement,
progress, velocity and raw uniform corner radius. Old RAF controllers retire
on replacement; retained controls/slots/focus, actual theme observation, CSS
length resolution, viewport-dependent lengths, disconnect/reconnect and changing
the reduced-motion preference are separately checked in Chromium.
CSS lengths serialize to six significant digits in this browser, so renderer
radius checks allow that magnitude-dependent rounding plus native Float tolerance.
The independent model and renderer scalar channels retain the 0.00002 tolerance.

`generate-colors.py` executes the complete original ButtonColors class, all five
original ColorScheme default getters and full variant/ColorSchemeKey token bodies.
Copy/Unspecified, enabled selection and cache identity are checked. Color role identity,
Float alpha, scheme lookup/cache and unused Dp/elevation/typography/shape values
are explicit hosts. It checks cache identity and preserves the public TextButton
getter's explicit Primary override, which differs from its raw token table.
The actual component checks all normal/disabled bindings with two distinct
live role palettes. Ordinary ButtonColors changes resolve immediately, without
an additional CSS color transition. This does not execute Android Color packing/interpolation,
Surface tonal elevation or rasterization.

`generate-elevation.py` executes the entire original ButtonElevation and
ToggleButtonElevation classes, six public elevation factories and their native
elevation token fields. It compiles the unchanged internal animateElevation,
FloatTweenSpec/Easing and source-checked Bezier/math bodies with explicit
remember/effect, interaction-flow registration/delivery and Animatable/frame
hosts. Distinct press objects retain source arrival/removal identity. Full native
flow conflation, coroutine cancellation and scheduler delivery are outside this
proof. The clock host retires a completed tween and
keeps converted scalar value and source finite-difference velocity on reversal.

There are 170 histories and 4,420 exact Float frames covering both classes,
default Filled/Tonal/Elevated factories, custom and equal-value configurations,
all arrival orders, cancellation, incidental recomposition, cold disabled,
new-target disabled snap and equal-target disabled continuation, including two
or three distinct presses, hover/focus between them, out-of-order release and
cancellation. The source's
previous-interaction inference compares the old numeric target against the
**new** configuration in Press/Hover/Focus branch order. The actual source and
bundled component compare scalar, velocity, target, from, start, duration,
easing, launch/snap counts and retained interaction order against those frames.
The added 50 multi-owner histories inject the distinct references at the actual
elevation controller. Separate trusted browser key/pointer checks verify Button
and ToggleButton owner callbacks, hover precedence and reveal-on-release. The
shared press binding emits each owner's press/release/cancel independently;
pressed geometry stays active while any owner remains. Existing kind-only
InteractionOrder callers retain their original deduplication behavior.
Actual hover, keyboard focus/Space, reduced-motion changes, nullable/default/
custom public targets, retained controls/slots and RAF/probe disposal/reconnect
are browser checks. Both declaration entries expose `elevation` with all five
numeric targets; null removes elevation and undefined restores variant defaults.

The production scalar drives live web shadow tokens at source dp levels
0/1/3/6/8/12, interpolating between their rendered CSS shadows. CSS no longer
adds a second box-shadow transition or masks an ongoing equal-target disabled
transition. CSS shadows are a platform adapter, not Android raster proof.
Negative scalar elevation paints the zero token; values above 12dp retain the
highest available web shadow token. Native shadow raster and values beyond the
token ladder remain open. Surface tonal elevation is distinct: these Button
Surface calls pass shadowElevation while leaving tonalElevation at its default.

The showcase's real pointer check also found a shared input defect: assigned
text can make ShadowRoot.elementFromPoint return the host, causing bindPress to
cancel an otherwise valid release. The production helper now uses the foremost
elementsFromPoint hit and rendered ancestry through assigned slots/shadow hosts.
Browser regression checks exercise actual text/nested-element clicks, captured
release behind a foreign overlay, outside release and subsequent recovery.
The real homepage CTA now navigates by clicking its caller-provided text. These
are Chromium DOM hit tests; other engines' ShadowRoot hit-test APIs remain open.

Generate references between test runs, never while readers are running:

```sh
node tools/androidx-button/fetch-sources.mjs
node scripts/test-buttons.mjs --source --capture-layout
python tools/androidx-button/generate.py --browser
python tools/androidx-button/generate-shape.py
python tools/androidx-button/generate-colors.py
python tools/androidx-button/generate-composition.py
python tools/androidx-button/generate-elevation.py
python tools/androidx-button/generate-surface.py
node scripts/test-buttons.mjs --source
npm run test:buttons
```

The previous six generated files reproduce byte-identically. Stable label/slot/control
identity, focus forwarding, native programmatic activation, form fieldset
disabling, explicit/removable accessible labels, safe invalid/prototype-key
defaults, reduced motion and RAF retirement are browser checks. Both alternative
declaration entries and an actual package consumer pass standalone strict
TypeScript5.9.3 checks. The declarations expose actual read-only getters,
selected/disabled setters and form callbacks, removing unsupported label/name/value
properties. Attribute updates and the explicit elevation property configure the component. The
separate ToggleButton shape/color/default audit is documented in
`tools/androidx-toggle-button/README.md`. Arbitrary Shapes/modifiers/intrinsics, finite CSS constraint
contracts, default font shaping, Surface/color/shadow raster, full native
accessibility/gesture scheduling and other browser engines remain open.

`generate-surface.py` additionally executes the full unchanged clickable and
toggle `Surface` overloads, private `.surface` modifier chain, tonal wrapper,
`ColorScheme.applyTonalElevation` and global `contentColorFor`. The four
already licensed/SHA-verified Surface/ColorScheme/Color/InteractiveComponentSize
references are under `fab-surface`. It uses the original sRGB Color/ColorScheme
JVM runtime from `tools/androidx-fab/surface-snapshot.mjs`. Composition locals,
cold remember, modifier/Box emission, density, shape names, ripple configuration,
interaction source and semantics are explicit recording hosts; these do not
execute native rendering, pointer routing, Compose scheduling or semantics trees.

`surface-composition-oracle.json.gz` reproduces byte-identically and records
20,736 original composition/draw-order cases: clickable/off/on, enabled,
inset-focus configuration, density, opaque/transparent colors, inherited and
local tonal elevation, shadow elevation, optional border and tonal enablement.
All calls supply explicit content color and an interaction source; implicit
defaults and remembered interaction histories are not established by these cases.
The caller role is a recorded host input, not an independent semantics proof.

The actual source and bundled Button Surface browser gate selects 144 original
parent-only tonal records (the public Button leaves local tonal elevation at
zero). It checks real painting colors, explicit content retention, inherited
theme changes, shadow/tonal separation, external style ownership, retirement and
reconnection on the retained control. Twenty unmodified Chromium screenshots
sample real overflow/corner paints at five sizes, ordinary/toggle modes and
axis-aligned scales. The production adapter clips each retained content wrapper
in surface coordinates so its outside shadow/focus/touch reservation survives.
The clip follows the existing shape RAF and layout; there is no new timeline.
This proves rounded web content clipping, not native antialias/shadow/text raster.
Rotated/skewed/custom-shape CSS, wide-gamut Color identity, native pointer
clipping/minimum-target arbitration and platform accessibility remain open.

`node tools/androidx-button/fetch-pointer-sources.mjs` prepares five unchanged
SHA-verified pointer/rounded-outline/hit-result references under
`test/fixtures/androidx/pointer`. `generate-pointer.py` executes the complete
unchanged direct Foundation `ClickableNode`, changed-down/up helpers,
captured-bounds and minimum-padding methods, complete `ShapeContainingUtil`
and `HitTestResult`, and six unchanged `NodeCoordinator` hit/rectangle/padding
methods. The two compressed artifacts reproduce the earlier preparation
byte-identically: 1,188 already-routed single-pointer histories/3,564 frames and
4,914 fitted rounded normal-leaf hit records. Explicit event/base-interaction,
density, type, layer, normal-leaf and collection hosts are documented in the
Kotlin drivers. Generic/non-fitting Path operations throw; they do not supply
fabricated native raster results. Base press/release/cancel calls are recorded,
not asynchronous native emissions. The complete compiled HitTestResult does
not imply coverage of native sibling, ancestor, intercept, expanded-target or
multi-pointer routing.

The production geometry unit checks all 4,914 hit records and 540 native capture
bounds moves. The actual button browser binding compares 486 original histories/
1,458 frames for the primary-button profile, using the adapter convention
1 CSS px per dp. Two native consumed-event pass histories are excluded because
DOM has no Compose Main/Final passes. Down/up in these injected histories are
already routed; injected pointer click events check the activation gate rather
than establishing browser click synthesis. Separate real Chromium Mouse/Touch
checks cover clipped/minimum target misses, touch expansion, rejected-down focus
and hover, immediate outside/return cancellation, semantic recovery and reconnect.
Fractional browser bounds, axis scaling and CSS shapes are adapters; arbitrary
transforms, native ancestor clips, closest-target arbitration, multi-pointer,
indirect/keyboard input and scroll-delayed base interaction emission remain open.

The shared `state-layer.js` uses the existing original CommonRippleNode spec/
ordering fixture. Its motion unit compares 2,520 original Float alpha frames;
the actual Button/Toggle browser binding compares source hover/focus transition
frames and five original recent-interaction orders. Default opacity focus,
opaque indication color from translucent content, animated hover exit on
disable, reduced motion and owned RAF/style disposal/reconnect are covered.
The native collector retains a target until the latest interaction changes;
theme-only updates do not invent a new transition. Full coroutine/Animatable
scheduling, optional inset focus rings and other browser engines remain open.

`generate-keyboard.py` executes original key filters and the full `ClickableNode`
with unchanged `AbstractClickableNode.onKeyEvent`, focus-change, dispose and
updateCommon bodies. SHA-verified dependencies remain under ripple/pointer.
Normalized Key codes, insertion-ordered map, synchronous coroutine emission,
indication initialization and focus/delegation are explicit hosts; the full
native key/focus/input tree, native collection iteration and scheduler are not
executed. `Keyboard.kt` records original press references, consumed return,
pending keys, clicks and lifecycle changes. Its 240 histories/744 frames reproduce
byte-identically (SHA-256 4a5bdbab05c8978e3572c727af00b0a8114ce4f809705125ed93fd5c5fe127a6).

Production `clickable-keys.js` matches those exact records, including source
presence/absence, Enter/numpad/Space/D-pad normalized filters, repeat suppression,
multiple keys, unmatched up, blur, disable/enable and fresh-press recovery.
The actual Button DOM adapter maps web Enter/numpad Enter/Space and opts into
key-up semantic activation, preserving independent pointer and per-key ink
owners. A newer press finishes older ink as in CommonRippleNode, but releasing
an older key cannot finish the latest owner's held ink. Native Boolean key
consumption is proved by the model unit; DOM prevents HTML default activation
also on recognized repeat and unmatched up. That default-hosting decision is
not a native input-pass identity claim. Child interactive/editable input stays
with its owner, with a short-lived trusted-ancestor-key-default gate to preserve
Space insertion without activating the enclosing HTML button. D-pad has no
direct web-key mapping in this adapter. Full scheduling/tree/platform parity
remains separate.
