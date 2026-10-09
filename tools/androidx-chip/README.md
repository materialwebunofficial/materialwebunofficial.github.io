# Chip reference and integration

Reference: AndroidX a095da93f8e98dea8748ceed79ea8427aade245f. `sources.json`
records seven licensed originals and their SHA-256 values. Production is
`src/components/md-chip.js`, `chip-state.js`, `chip-layout.js`,
`chip-retained-content.js` and `src/motion/chip-elevation.js`.

`node tools/androidx-chip/fetch-sources.mjs` fetches the pinned original files.
`node tools/androidx-chip/generate.mjs` verifies their hashes and freshly compiles
complete ChipColors/SelectableChipColors classes and getters, seven default
color constructor bodies, three tonal copies, current border/elevation factory
arguments, input padding, complete ChipArrangement, ChipShapes/default shapes
and interaction selection. The JVM host supplies symbolic Color/alpha-copy,
shape and elevation descriptors plus Dp, Density and Arrangement. It produces
260 records: 64 state/factory records, four shape-priority branches and 192
compact arrangement records. Foundation decoded SHA-256:
`8d4d6ed01b1189bb9b2304f0b28ad307a8a8db59adcc9597d30a959eb4a002bb`.

`node tools/androidx-chip/generate-elevation.mjs --check` freshly compiles both
complete original elevation classes, internal animateElevation, FloatTweenSpec,
Easing and the original cubic/math bodies. Explicit sequential remember/effect,
flow, Dp, value, clock and suspended-continuation hosts complete due jobs and
discard interrupted jobs. This exercises the original assignment after
animateElevation: lastInteraction advances only after completion or a snap;
an equal numeric target does not launch or advance it. The 270 histories and
7560 frames include all seven factory configurations, custom/equal fields,
overlapping presses/drags, focus/hover ordering, completion/interruption,
disabled changes and configuration replacement. Elevation decoded SHA-256:
`722f1c3ec4d21e0c0a599b74efaa704235541f3c5f017b5d8294ae0e5839e902`.
Run without `--check` only when intentionally regenerating the fixture.

`node tools/androidx-chip/generate-layout.mjs --check` freshly compiles the
complete original ChipContent and AnimatingChipContent bodies in a recording
composable DSL. Their original Row/Column, Box measure/place, ChipArrangement,
IntrinsicWidth/IntrinsicSizeModifier, UnspecifiedConstraintsNode, SizeNode,
PaddingValuesModifier, Constraints/Alignment and Placeable bodies execute.
`layout-sources.json` adds licensed Box.kt/Intrinsic.kt originals. The base
toolbar-row generator's `--policies-only` assembles SHA-checked policies without
compiling or modifying that family's fixtures. The 28,160 trees cover both
content versions, four families, five arrangements, LTR/RTL, fixed/wrapping
leaves, absent/18/24px icons, 0/50/240/1200px labels, tiny/bounded/tight/unbounded
constraints and atomic visibility-width samples. Another 84,480 query groups
cover all four intrinsics at three available sizes. Decoded SHA-256:
`253ec70d113231ff88560e6093ab50ebf383e705ccda449122d3e22216559690`.

The same compilation executes original leadingContent, trailingContent and
rememberRetainedState with sequential remember slots and a composition-local
stack. The 48 frames include null/nonnull replacements and captured icon colors
versus avatar inheritance. Decoded SHA-256:
`32dc1a7810c8d4eef249645d9c5b0c5871f63fc1438faed935eb6a60b51f87c7`.
Fixed/wrapping leaves, default-intrinsic proxies and atomic visibility samples
are explicit hosts. These are not Android fonts, a full Compose runtime,
Transition scheduling/layers or a raster reference.

All generators use the existing Kotlin/JVM1.9.24 compiler/stdlib under
`research/kotlin-runtime`; they do not require installing an Android SDK or
adding Kotlin to the web application. Original source and host hashes are
checked by the registered units. Numeric Dp-to-shadow interpolation, Color
packing/compositing, uniform AnimatedShapeState, Float spring/duration and
IntSize-vector kernels have separate existing native fixtures.

The actual component uses Expressive Filter/Input defaults, immediate live
color factory roles, an inside-painted border, original three-child compact
placement/padding, 32px minimum body/48px interaction reservation, shape target priority,
FastSpatial shape/visibility size and DefaultEffects visibility alpha. Baseline
selectable mode uses its original alternative visibility specs. No CSS color,
shape, elevation or opacity transition competes with these controllers. The
last built-in content kind and captured icon color remain through exit; avatar
content inherits the current label role. The 32px minimum applies in native
modifier order, and constrained multiline text can grow the body. Static
Assist/Suggestion fill their weighted label Row; selectable Filter/Input use
fill=false. All built-in DOM nodes and caller
slots survive state changes; lifetime-owned input/motion/resize/theme observers
dispose on detach and rebind once on reconnect.

`node scripts/test-chips.mjs --source` validates actual source bindings, then
shared seed choices and nested pointer routing. Without `--source`, it reads
the built distribution. The same Chip units/browser gate are registered in
normal unit/focused/full-parity scripts. The DOM gate compares 1024 actual
factory roles/packed alpha values and 256 original density1 compact placements
at light/dark LTR/RTL, with trusted pointer/touch/keyboard, pressed priority,
border/elevation, custom alpha, cancellation, safe text, retained nodes and
disconnect/reconnect checks. Seed choices additionally cover 1440/390 profiles.
The content gate adds 960 actual bounded/tight native-tree comparisons for all
four families, five arrangements and LTR/RTL; eight real-font multiline labels
plus retained exit color/height, reversal, completed disposal, inert retained
removal and avatar label-color inheritance. `--layout`, `--foundation`,
`--pointer`, `--regressions` and `--showcase` select focused browser scopes without implying
that omitted gates were rerun.

Automatic checkmarks/selection, Input removal, HTML events/slots, explicit
ordinary arrangements, enabled-role overrides and the keyboard outline are
declared web caller-policy/accessibility adapters. Arbitrary caller slot nodes
removed by their owner cannot currently retain their old leaf during native
AnimatedVisibility exit; built-in leaves do. Complete Surface/composition
ownership and arbitrary multi-leaf label/slot trees, native paragraph/fonts, full Transition
and composition scheduling, nonuniform/custom shapes, wide-gamut Color,
native shadow/path/raster and other browser engines remain open. Passing these
scoped references does not establish whole-component or whole-library parity.
