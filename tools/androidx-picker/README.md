# Picker factory reference

Pinned AndroidX revision: a095da93f8e98dea8748ceed79ea8427aade245f.
Five unmodified Apache 2.0 originals and SHA-256 provenance are recorded in
`test/fixtures/androidx/picker/sources.json`.

`node tools/androidx-picker/generate-colors.mjs --check` freshly compiles the
complete DatePicker default colors factory, TimePicker default and vibrant
colors factories, TimePicker shapes factory, DatePicker day color branches and
original token getters. Named constructor records, symbolic Color/alpha-copy,
factory caches and State/animation targets are explicit JVM host boundaries.
The actual updated time toggle flag is read from the pinned source.

Production `picker-colors.js` supplies semantic CSS theme references to both
picker components. `rich-colors` maps to `vibrantColors()`. The tests verify
factory outputs and 32 day branches, then actual browser paints under light,
dark and changed theme roles, six-week calendar allocation and RTL range ink.
`node scripts/test-dialogs.mjs --source` also runs these checks against source;
without `--source` it exercises the distribution.

`node tools/androidx-picker/generate-period.mjs --check` executes complete
original HorizontalPeriodToggle, VerticalPeriodToggle and ToggleItem bodies,
with the actual updated flag and original Constraints. Four ToggleItem records
and 168 layout cases verify semantic colors, independent shapes, zero padding,
selected semantics, gaps, bounded child constraints and absolute placement.
Recording constructors/modifiers, symbolic Color/Shape, MeasureScope/place and
fill-size leaves are explicit hosts. `picker-period.js` binds each period button
to the shared ButtonShapeComposition, ButtonSurface, state layer and press/ripple
owners. Source/bundle browser gates cover actual geometry, pointer/keyboard
activation, cancellation, external state updates, mode/attribute changes and
disposal. `rich-colors` is a palette choice; it does not imply the separate native
TimePickerShapes overload or its larger vibrant layout.

`node tools/androidx-picker/generate-clock.mjs --check` freshly compiles complete
unchanged TimePickerState/default input setters/extensions, StateImpl/Saver,
AnalogTimePickerState, tap/drag angle and selector helpers, CircularLayout and
TouchSlopDetector.7,214 records cover both modes, all initial hours, scaled
200/238/256px dials, exact ring threshold boundaries, tap/drag ordering,
five-minute tap rounding, raw input validity, circular integer placement and
pointer slop.30 further records execute complete original FloatSpringSpec,
SpringSimulation and SpringEstimation bodies, including interrupted radians
and opacity springs. Hashes identify every native input and generator host.

The state oracle uses explicit scalar/Dp/Saver, target-recording
Animatable/priority/delay, immediate suspend continuation, constrained48px leaf
and placement hosts. The separate spring oracle executes native numerics;
it does not execute Animatable's coroutine/frame ownership. Production
`picker-clock-state.js` ports native Float operation boundaries and ordering;
`picker-clock.js` binds them to the actual dial, two24h rings, one retained
DefaultSpatial hand spring, DefaultEffects label fades, trusted tap/drag and
keyboard, circle-clipped selected ink and abort-owned lifecycle. Browser gates
cover actual geometry, all24 pointer selections, five-minute tap versus
continuous drag, keyboard without auto-advance, scalar/fade frames and cleanup.
`--clock-only` runs this focused browser gate.

`node tools/androidx-picker/generate-clock-runtime.mjs --check` additionally
executes the complete unchanged clock state and tap bodies with the actual
Animatable, TargetBasedAnimation, AnimationState, SuspendAnimation, Foundation
MutatorMutex, animation-core InternalMutatorMutex and finite spring/snap paths.
Real Kotlin coroutine Jobs, Mutex and cancellable Delay use explicit deterministic
JVM dispatcher/delay/frame hosts. Plain scalar state, Float Dp, Saver and focus
hosts remain; annotations/platform expect bindings are adapted. It does not
execute Compose snapshots, recomposition, node updates, Android dispatcher,
gesture dispatch, font/raster or unused decay paths.

The1,025 snapshots cover first-frame start, values retained between frames,
priority rejection before state mutation, cancellation through both mutexes,
interrupted taps restarting with zero velocity,100ms delay outside the mutation,
Animatable field replacement while an old job continues, and scope cancellation.
The fixture SHA is
8f2f3f890aaebb0c907772dc97a0dc5d0e4726ed2981aa03c7d1391bed2a2200.
Every source and generator/host is independently SHA verified.

Production `animatable-float.js` and `picker-clock-animation.js` own retained
frame values and cancellable clock jobs. `picker-clock.js` now uses them for
the actual hand, selected-text mask and gesture continuations; label fades
retain their separate effects owner. Pressing does not cancel a running native
writer or an already unlocked auto-switch delay. Drag ring changes occur only
after admitted rotateTo returns. Public DOM value overrides and modal/owner
disposal explicitly cancel the web owner's jobs; the lower-level native setter
replacement path is separately tested. Browser checks compare4,032 actual
frame/mask and trusted pointer/interruption/priority/delay/lifecycle assertions
against the JVM records, stopping before unprobed Compose selection node updates.
`--clock-runtime-only` runs that gate; `--clock-only` runs both clock gates.

This reference does not establish complete native picker equivalence. Complete
nested ToggleButton modifier/layout/composition, vibrant dimensions, calendar modifier trees,
native date color interpolation, clock composition/node update/gesture dispatch,
retained24h crossfade composition, nested clock text/time-card indication and
focus, locale/UTC and full keyboard/text-input ownership remain open. The browser
pointer platform uses Android's default18px touch slop and.125px mouse slop;
OS-configured ViewConfiguration, multi-pointer takeover and native event passes
are not established by the scalar slop fixture. Modal shell checks are separate.

## Time input reference

`node tools/androidx-picker/generate-input.mjs --check` compiles the complete
unchanged TimeInputTransformation and TimePickerState input setters/validity.
The actual plain-text TextFieldBuffer constructor, replace/delete/revert,
selection and edit-range methods execute with complete GapBuffer/PartialGapBuffer,
ChangeTracker, TextFieldCharSequence and TextRange bodies. The original styled
text flag stays true; unused styled annotation/output mapping leaves throw if
entered. Plain scalar state/Saver, JVM Char digit conversion, collection/packing,
character-copy and precondition helpers are explicit hosts. This is not a native
TextFieldState transaction/recomposition, IME dispatch or styled-input test.

The28,000 records cover blank edits, invalid raw input with last valid canonical
time retained, two-digit replacement at each cursor position, selection ranges,
oversized/non-digit reversion,12h/24h and PM conversion, Unicode digit text,
accessibility-service gating and automatic minute advancement. The original
TimeInputTokens metric getters and7dp supporting-label top padding execute too.
SHA3236b84f4c4aa6289b2fafabad48088cccb637d62cd5d8ef8eb2922e12a2fb98.
All sources and generator/host files are SHA verified; the unit gate additionally
checks all65,536 UTF-16 code units against the JVM BMP digit boundary.

Production picker-input-state.js ports that transformation and range policy.
picker-input.js binds beforeinput/input, retains the same raw/canonical native
state as the dial, switches between the selected editor and unselected radio
selector, and owns focus, Surface/state/ripple callbacks and theme/lifetime
observers. HTML sanitization is handled before input so rejected newline text
cannot accidentally become a blank edit. Error text and paints use semantic
error/error-container/on-error-container roles. Source/bundle browser gates
exercise trusted edits, theme overrides, actual cursor/raw/canonical values,
72px/DisplayMedium fields, mode changes, external state and detach/reconnect.
`--input-only` selects that browser gate.

The browser's accessibility-service state is an explicit host setting through
`accessibilityServicesEnabled`/`accessibility-services-enabled`; it is not inferred
from motion preference. `hourInput`, `minuteInput` and `isInputValid` are read-only
native-state views. Imperative value/hour/minute setters also apply when their
attribute string already equals the requested value.

Open: complete native TimeInputImpl/TimePickerTextField/TimeSelector composition,
shared OutlinedTextField container color/thickness frame ownership, exact native
field focus/keyboard/IME transactions, platform error feedback, locale/formatting,
vibrant shape/layout overloads and raster. Public DOM field/event delivery and
same-value imperative writes are web bindings, not full native snapshot claims.

## Time input colors and outlined container

`node tools/androidx-picker/generate-input-colors.mjs --check` freshly compiles
the complete original TimeInput ordinary/vibrant default factories, default
OutlinedTextField factory/public override call, complete TextFieldColors and
TimeInputColors classes, OutlinedTextFieldDefaults.Container and
animateBorderStrokeAsState. The18 records include cache and copy paths,
changed selection locals, field getters, disabled precedence and complete
container/border/thickness animation target/spec selection. Original sources
and generator/host files are SHA verified. Descriptor SHA is
f2b978cf75bbd82de378a7e73c69703c0c2709d6ba098109f76526df084eeac6.

Input-mode palettes use TimeInput getters. Generic text fields and time input
share TextFieldContainerMotion's FastEffects color and FastSpatial thickness
owners. The input border is SVG so fractional/overshooting widths draw without
CSS border rounding or editor width changes. Explicit TimePickerTextField text
and cursor styles keep their original overrides (Error glyph/Primary cursor).
`node scripts/test-dialogs.mjs --input-container-only` selects the actual DOM
container gate; `--source` uses source modules. The normal input/full picker
and full expressive gates include it.64 resolved theme branches,747 independent
native spring samples and58 geometry/focus/retarget/reduced-motion/lifetime
checks cover both motion schemes and ordinary/vibrant palettes.

Symbolic Color/alpha-copy, focus State, theme/selection locals and descriptor
animation calls are hosts. Full native animate-as-state conflation/coroutine/
retained-frame/cancellation ownership, packed Color conversion and border/font
raster remain open. The numeric browser trajectory check does not execute
Compose scheduling or the full TimeInput composable/IME tree.
