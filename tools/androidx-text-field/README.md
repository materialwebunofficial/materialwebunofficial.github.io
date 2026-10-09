# TextField default state and motion descriptors

Pinned AndroidX revision: `a095da93f8e98dea8748ceed79ea8427aade245f`.
The six original Apache-licensed files and exact URL/SHA manifest live in
`test/fixtures/androidx/text-field`. `fetch-sources.mjs` retrieves that revision.

`node tools/androidx-text-field/generate.mjs` checks every original SHA and
freshly assembles the unchanged default filled/outlined constructor arguments,
TextFieldColors constructor and eleven color-selection getter bodies,
InputPhase enum and label/placeholder/affix Transition target/spec bodies.
It runs them with the project's private Kotlin/JVM1.9.24 reference runtime.
Normal web builds and package users need neither Java nor Kotlin.

ReferenceHost.kt supplies symbolic ColorScheme roles, selection-local values,
Color.copy descriptors, plain State and a descriptor-recording Transition.
Actual JVM Float alpha values execute, but this host does not pack native Color,
run Compose transition frames, measure native text or rasterize the component.
Those boundaries must not be inferred from a passing state fixture.

The resulting 34 records cover 176 role/Float-alpha/copy selections and 54
label/placeholder/affix target/spec branches. `text-field-state.test.mjs` checks
the production helper, reference SHA, upstream SHAs and host SHAs independently.
The states.json SHA is
`584894d7e12df43a79689b0d90df07734360d4258f3e75c8e779961f6578d343`.

The actual filled default factory uses SurfaceContainerHighest in disabled
states too; the separate DisabledContainer token is not substituted for that
factory. Leading error icons retain OnSurfaceVariant; trailing error icons use
Error. Disabled alpha replaces a custom role's alpha. The shared independent
Color-alpha reference verifies native sRGB packing/copy/composition separately.
The default shape remains CornerExtraSmallTop/CornerExtraSmall according to the
public filled/outlined defaults; roundedShape is a separate source option.

Production owns label and indicator thickness with FastSpatial, label/indicator/
container colors with FastEffects, and placeholder/affix with the original
FastEffects/SlowEffects branches. An explicitly supplied MotionScheme spring
does not take animateDpAsState's omitted-spec Dp threshold: the verified original
AnimateAsState/VectorizedSpringSpec path uses the custom spec's default .01f.
Retained web controllers and RAF delivery adapt those descriptors; this reference
does not execute the complete original Transition scheduling.

`node scripts/test-text-fields.mjs --source` runs actual source browser controls;
`npm run test:text-fields` builds and runs the distribution. `--foundation`
limits the browser run to the field. The complete focused runner also exercises
Select, Autocomplete, Stepper and dialog/picker shells through the common field.
Eight 1000/390 light/dark LTR/RTL profiles verify 1056 actual computed role/packed-
alpha colors and 568 input, phase, placeholder, affix, cutout, form, ARIA,
custom-role, retained-node and lifetime checks. Real showcase source/bundle
1440-light and 390-dark captures were inspected separately.

SVG masking binds the measured browser label to the original 4px logical-start
cutout gap; it does not paint an assumed background over the outline. Browser
fonts, DOM/SVG measurement, CSS logical placement and keyboard/form semantics
are adapters. Complete native constraints/intrinsics, Inside/Cutout/Above/custom
label positions, multiline policy, text-style interpolation, Transition frame
scheduling, packed wide-gamut colors, native border/path drawing and raster
equivalence remain open. Passing this checkpoint does not establish complete
TextField or library parity.

## Cutout drawing arguments

`node tools/androidx-text-field/generate-cutout.mjs` freshly compiles the complete
unchanged outlineCutout draw body, its 4dp padding getter and the original
BiasAlignment.Horizontal class from the same revision. Both original files and
the generator/host are SHA checked. A density1 Dp/padding/DrawScope host records
clip calls and drawContent counts. Finite JVM roundToInt supplies the alignment
fastRoundToInt binding; unused vertical combination is a host boundary.
The host does not run modifier/cache scheduling or native border/path/raster.

The 2016-record fixture covers fractional container/label widths, logical
direction, three biases, asymmetric padding, zero/tiny/oversize labels and label
heights. It records raw Float bits, retaining signed zero independently of JSON
number serialization. Production text-field-cutout.js matches every bit; its
fixture SHA is
`e341eaaa14614bd70eea931078d5b01c8f4a8afb3e094364982a81f7215473be`.

The actual old DOM renderer differed in 14 of 30 default-start fractional cases
in research/text-field-cutout-before.log. RTL alignment rounded label and inner
space in the original source; the web calculation previously kept fractions
there. Production now passes native Float arguments and alignment rounding into
the retained SVG mask. The focused source/bundle browser gate verifies 1344
native argument records through the actual field renderer at eight viewport,
theme and direction profiles. Native argument records enter its measurement
cache; this verifies drawing bindings, not identical browser/native glyph
measurement. Nonnegative SVG rectangle extents and string coordinates remain
explicit web conversions. Full label placement/alignment APIs and native raster
are not established by this kernel checkpoint.

## Complete measurement policies and actual multiline editor

`fetch-layout-sources.mjs` retrieves the pinned LayoutUtil.kt and
TextFieldLineLimits.kt into a separate SHA/URL manifest. `generate-layout.mjs`
freshly compiles the complete unchanged TextFieldMeasurePolicy and
OutlinedTextFieldMeasurePolicy classes, original Constraints and Alignment,
label-position/line-limit classes, layout utilities and Float/Int lerp/easing
bodies. Only visibility, imports and namespace wiring change to expose the
private classes to the independent host. Density1, leaf/intrinsic sizes,
MeasureScope/Placeable/layer/parent-data and primitive bindings remain hosts.
Private Kotlin/JVM1.9.24 and the verified cached numerical assembly are research
dependencies; package users and normal test/build commands do not need them.

The 2400-record fixture includes 2208 valid full measurement order/constraints,
placements, measured label size and four intrinsic queries. Another 192 records
retain original rejected-bound messages and measurement histories for artificial
zero-height Above constraints; these do not prove the full native public
composable rejects the same bounds after its modifier wrappers. Decoded SHA:
`d81795b49288af7c6d2fe340aa950d91d114902f2a1665dd92e970ea8eb2ca1d`.
`text-field-layout.test.mjs` verifies the production helper, all source and
non-research host hashes and complete results independently.

Production routes Inside/Cutout/Above to the source policy, uses native integer
placements and retains the external Cutout label padding. Invisible browser
font leaves supply text, interpolated label, placeholder and affix dimensions;
actual textarea content determines multiline growth and line-limit scrolling.
Fixed 48px icon targets, 2px affix gaps, conditional support and logical label
alignments feed the same policy. A separate placeholder leaf can grow the field
without multiplying the text editor's line count. The container variant still
owns the live source surface/indicator/shape roles. Geometry caches do not
remeasure on alpha-only frames; current placement alpha and CSS update together.

`generate-browser-layout.mjs` reconstructs the original policies, captures 72
finite Chromium/Roboto leaf inputs from actual source fields, then compiles the
original native policies for those inputs. Captured browser leaf dimensions are
inputs; expected measurement/placement comes only from the original execution.
The browser gate compares complete policy results and real editor/container
positions at1000/390 light/dark, all three label positions, logical directions,
line modes, fractional widths, wrapping, icons, affixes and alignments. It adds
2016 assertions per source/bundle run. The decoded browser-input reference SHA is
`590e53679d7e9c898673cfd66e865d223335be9ad06931e09105c9c278b6738f`.
The finite font contract deliberately fails if those leaf dimensions change.

The editor gate adds184 trusted keyboard/form/resize/selection/line-limit/internal-
scroll/Above/counter/reconnect checks. Both editors remain mounted, with only the
active one exposed and enabled; mode changes preserve raw value, focus and
selection and emit no synthetic editing events. Native HTML typed inputs and
the Select/Autocomplete comboboxes stay single-line. Inactive editor events
cannot overwrite the model. The showcase has real multiline and Above examples.

`--editor` and `--layout` select the new browser gates; `--foundation` includes
all field gates, omitting related compositions. The default focused runner also
checks Select, Autocomplete, Stepper and dialog/picker shells. Full native
composable/modifier/paragraph/font-shaping/IME/runtime/frame scheduling, arbitrary
parent height/packed constraint limits, full typography interpolation, custom
leaf APIs, wide-gamut colors, native path/shadow and raster equivalence remain
open. This extends the prior placement/multiline boundary without establishing
complete TextField or library parity.
