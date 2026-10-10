# AndroidX ToggleButton reference scope

The five unchanged Apache-2.0 references in `test/fixtures/androidx/toggle-button`
are pinned to AndroidX `a095da93f8e98dea8748ceed79ea8427aade245f`, with raw URLs
and SHA-256 in `sources.json`. Shared Button, shape and finite spring references
retain their existing manifests. This harness is independent of the runtime JS.

`generate-shape.py` executes the original full ToggleButtonShapes class, public
shape defaults and `shapesFor(Dp)`, `shapeByInteraction`, both remembered shape
helpers, AnimatedShapeState, interpolation helpers, SpringSpec equality/hash
and shared native spring simulation/duration bodies. It reuses the explicit
Button group/slot/effect, scalar Animatable/frame, theme cache, density-1 and
uniform corner hosts. The complete original CornerBasedShape outline scaling
and precondition body executes with a uniform final outline value/raster host.
The fixture records both raw radius and accepted normalized outline radius;
`null` records the original rejection of a negative extrapolated corner.

The 24 histories contain 360 frames across both motion schemes. They cover
selection, early press/release reversals, checked changes during press, all five
sizes, scheme and three-shape replacement, equal values, unused/used live theme
roles, percentage corners and resized bounds. The small public pressed default
is an explicit 6dp RoundedCornerShape, differing from its raw Small token's
CornerSmall. XS therefore replaces the shape triple when changing to Small.
Square mode is a web configuration of the original custom three-shape API.

The independent JS model matches native Float progress, velocity, raw radius
and composition generation. The actual component matches all 360 raw channel
frames and serialized CSS radii. Six-significant-digit CSS serialization is
allowed for radii; scalar/model tolerance stays 0.00002. For synthetic oversized
bounds where native FastSpatial produces a negative corner and the original
outline rejects it, the web renderer preserves the source spring and uses a
zero CSS radius. That exception handling is an explicit web difference, not
full native outline parity. CSS performs uniform positive-radius normalization;
Android Surface/raster behavior is not executed.

`generate-colors.py` executes the full original ToggleButtonColors class, four
default factories, OutlinedToggleButtonDefaults.border and the shared original
ButtonDefaults.outlinedButtonBorder factory. Color role identity/Float alpha,
scheme caches and unused Dp/elevation/typography/shape values are explicit hosts.
Copy/Unspecified, equality/hash, disabled checked independence and cache identity
are checked. Chromium checks 32 live enabled/checked/disabled role pairs with
two distinct palettes. Container/content roles resolve directly; there is no
additional color animation in these native getters. The original border factory
also checks disabled alpha, 1dp default width and checked border absence.

`generate-border.py` executes unchanged animateBorderStrokeAsState,
animateDpAsState, animateColorAsState, generic animateValueAsState and the full
AnimateAsState class with original TargetBasedAnimation/vectorized spring
simulation and duration bodies. Positional remember/SideEffect cells, a frame
clock, immediate coroutine/Job and Animatable value/velocity are explicit hosts;
full native scheduling, cancellation races and finished listeners are not run.
Inputs are already converted Oklab values; the original ColorVectorConverter
clamps them. Native packed Color precision/conversion is outside this proof.
Retargeting starts from that converted color and preserves raw vector velocity,
including custom underdamped effects springs whose components exceed bounds.
The shared web ColorSpringVector now follows that handoff rule.

Twenty-eight histories contain 478 frames across both schemes, including cold
checked/disabled targets, rapid selection/alpha/theme changes, same-target spec
retention and custom effects. Width uses explicit FastSpatial with its original
0.01 threshold; color uses DefaultEffects with a common vector duration.
Non-positive width omits the border without clipping the raw motion channel.
The original BorderModifierNode scalar paint prefix also executes: it rounds
width up to physical pixels and caps at half the minimum drawing dimension.
There are 4,302 scalar paint cases at three densities and natural/tiny/zero bounds.
The actual component matches 1,434 width, pseudo-border color, velocity, duration
and pixel-ceiled width frames at DPR 1, 1.25 and 2. A live density query rearms
when the display ratio changes; disconnect/reconnect, theme observation, mode
changes and reduced-motion listeners retire both controllers and the color probe.
The live-DPR check uses CDP for ratio/query values and explicitly dispatches the
display change event, which CDP does not deliver. Native monitor-event delivery
is outside this hosted check.
CSS border drawing is still a web adapter. These checks do not execute complete
native border outlines/path subtraction, fill-area branching, Android shadow/
border raster, browser page zoom or density-dependent native layout measurement.

Checkbox semantics, actual Space/Enter/pointer activation, cancellation, retained
controls/focus/slots, live theme changes, controller retirement, reconnect and
reduced motion are browser checks. Empty-content geometry checks the height-only
minimum with native shared size/padding defaults in LTR/RTL and 48dp interaction
reservation. The new layout fixture below executes the complete original default
Row/icon Box/Spacer tree. Full intrinsics/custom modifier composition and
precision-pointer sizing remain separate work. Text toggle is a web extension, retaining the MDC docked
toolbar overlay. ButtonElevation/ToggleButtonElevation ordering, defaults,
target-key retention and scalar tween motion now have a shared independent
source/model/browser check in `tools/androidx-button/generate-elevation.py`.
Complete Surface tonal elevation, native input/accessibility/font/
Color packing/raster and full Compose runtime scheduling remain open.

The shape/color/border artifacts retain their earlier reproduction checks.
Both new layout artifacts reproduce byte-identically. Generate only with readers closed:

```sh
node tools/androidx-toggle-button/fetch-sources.mjs
python tools/androidx-toggle-button/generate-shape.py
python tools/androidx-toggle-button/generate-colors.py
python tools/androidx-toggle-button/generate-border.py
node scripts/test-buttons.mjs --source --capture-toggle-layout
python tools/androidx-toggle-button/generate-layout.py --browser
node test/unit/button-shape.test.mjs
node test/unit/toggle-border.test.mjs
node test/unit/toggle-layout.test.mjs
node scripts/test-buttons.mjs --source
npm run test:buttons
```

These checks run through the existing Button unit, focused browser and broad
browser entries. They establish the documented source scope, not full-library
MD3E parity.

`generate-layout.py` extracts the complete unchanged original Toggle Row lambda,
including optional `Box(Modifier.size(iconSize), Alignment.Center,
propagateMinConstraints=true)` and `Spacer(Modifier.width(iconSpacing))`, plus
the original content-padding functions. It runs the original SpacerMeasurePolicy,
SizeNode, UnspecifiedConstraintsNode, PaddingValuesModifier, RowMeasurePolicy,
BoxMeasurePolicy and placement/constraint bodies through the existing generated
Button/Tooltip/toolbar-alignment JVM runtimes. Those cached runtimes must be
prepared through their own generators first; every source manifest is SHA-checked.
Composition emission, density 1, the false precision-pointer platform flag and
already measured font/element leaves are explicit hosts. Intrinsic methods in
the emission wrappers return zero; this fixture does not establish full native
intrinsics, weighted/custom modifier composition, Surface, scheduling or raster.

The independent 3,780 body trees cover five sizes, both directions, nine parent
constraint profiles, absent/empty/single/multiple icon lambdas, small/large/required
icon leaves and empty/multiline/multiple/required Row content. The runtime kernel
matches their requested/coerced sizes and every placement. The 630 actual source
and bundled browser cases use explicit real font/slot leaves and narrow/zero/fixed
CSS bounds. The additional trailing-icon API is a web content-lambda extension.
The shared previously verified minimum-interactive kernel supplies host coercion
and placement. Actual controls/label/icon slots survive updates; owned icon styles,
font/mutation/resize listeners and queued layout RAFs retire on mode removal and
disconnection. Font shaping, arbitrary CSS layout allocation, huge dimensions,
non-unit native density, native text clipping and Surface shadow/clip raster remain
separate work. `button-layout.js` and `toggle-button-dom-layout.js` contain the
production measurement and DOM adapters; the Kotlin/Python files produce the
independent references rather than application code.

Browser scope of the border oracle: width channels, pixel-ceiled strokes,
durations and retention are compared exactly. The color channel of this oracle
is the host model above; the component applies color through the packed,
frame-based Animatable (checked by `test/browser/packed-color-consumers.mjs`),
so `toggle-border.mjs` checks that the paint equals that owner's packed value
and that resting colors equal the oracle's target.
