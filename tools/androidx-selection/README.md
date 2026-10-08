# Checkbox MD3 drawing and color profile

Pinned AndroidX revision: `a095da93f8e98dea8748ceed79ea8427aade245f`.
`Checkbox.kt`, its tokens and feature flags are SHA-verified from the existing
licensed selection manifest before any execution.

`node tools/androidx-selection/checkbox-snapshot.mjs` compiles the complete
unchanged `CheckboxColors` class, native default-color getter, generated token
getters and original `drawCheck`/`drawBox` bodies. Its separate cache is
`research/checkbox-md3-generator`; output is `md3-checkbox-drawing-oracle.json`.
It records140 check control-point/normalized segment requests,12 color-role
decisions and20 box drawing records across both legacy and MD3 flag values.
The source comments explicitly call the default flag-off profile M2 styling.
The goal's MD3 profile therefore needs the flag-on18dp container and updated
control points and disabled/icon/indication role decisions.

Roles and alpha are descriptor hosts, not native color packing. Dp/shape/style
types are supplied. The Path host records the native control points; PathMeasure
has supplied normalized length1 and records the segment request. It does not
execute Skia length/segmentation or prove raster identity. The Float `lerp` host
uses the native arithmetic formula. Full composables, modifier layout,
composition-local delivery and animation scheduling are not executed here.

Production `md-checkbox.js` now uses the flag-on18dp canvas and modern native
Float control points. `checkboxBox` preserves original drawBox fill/inset/stroke
geometry; separate retained SVG fill/outline/mark layers replace the CSS border.
Equal fill/border colors draw the full container without a second outline.
`bindSelectionColors` resolves scoped semantic roles through the existing shared
Oklab ColorMotion vector spring. Box/border snap on disabling or re-enabling,
matching the conditional remember branch; the checkmark keeps DefaultEffects
(FastEffects when Off), with alpha applied once through its color. Glyph spatial
motion and delayed snap retain their separately verified transition behavior.

Unit checks compare70 modern Float point inputs and20 drawBox records. Real
source browser checks compare216 native default role/channel pairs across three
seeds/two schemes/light-dark, custom strokes,90 original color-vector frames,
live inherited roles, reduced motion and retained reconnect ownership. Native
packed Color equality/conversion, negative-radius raster normalization, full
modifier measurement and Skia PathMeasure segmentation are separate boundaries.
SVG normalizes negative corner radii to zero; polyline segmentation uses browser
coordinates. These checks do not establish native raster identity.

Selection indication verification is documented separately in
`tools/androidx-ripple/README.md`. The modern Checkbox draw host is18dp; its
40dp unbounded circle keeps the existing shared renderer and opacity controller.

Supplemental Google Material Web Checkbox SCSS references are pinned separately
at47adb655bd7a88c4d62e8faac2873084eed555dc under
`test/fixtures/material-web/checkbox`; `fetch-web-checkbox.mjs` reproduces them.
They corroborate18px container/icon and disabled Surface mark. Their v0.192
Web state-color table differs from the newer AndroidX indication implementation
(including opposite selected/unselected press roles); do not silently combine
these profiles or treat the older Web table as an Expressive native oracle.
The current official Material Checkbox Specs page was read with its token table
expanded on2026-10-08. `current-spec-decisions.json` records the normative role
decision, corroborated by the pinned Web role mapping: selected hover/focus
Primary, selected press OnSurface, unselected hover/focus OnSurface, unselected
press Primary, error indications Error. Unselected interaction outline uses
OnSurface. Its current press opacity is.10, matching the shared native timeline.
Production now follows that visible specification for state colors, deliberately
superseding inherited content color and the public flag-on Transparent Off ripple
input. The native public implementation remains the drawing/animation reference;
the unpublished CheckboxStyle.Default still has incomplete enabled selections
and is not substituted for the public profile.

These component roles are CSS variables resolved from the current scoped theme;
`--md-ripple-color` still overrides both indication colors and replaces alpha.
The shared opacity binder exposes its current interaction to color consumers;
Checkbox reuses the shared color spring for interactive outline changes.300
source-browser seeded light/dark role/override pairs verify the current table.
The complete default/body color and animation checks above remain separate from
this intentional normative state-color reconciliation.

The shared color binding also drives RadioButton's enabled DefaultEffects color
spring. Its disabled and re-enabled remember branches snap to their target.
Switch body colors remain immediate, as in SwitchImpl's direct color getters.
Selection disabled roles now use the shared native sRGB alpha kernel: Color.copy
replaces the original alpha, then Switch applies compositeOver(surface). This
also makes a selected disabled Switch's Surface thumb opaque before composition.
The same copy/composite arithmetic now serves tonal Surface elevation.

color-alpha.test.mjs SHA-verifies the existing native Surface references and
compares48 original constructor inputs plus1152 Float composite records. The
selection-color browser gate compares180 original Radio color-vector frames and
36 inspected default-getter branches with transparent/translucent/opaque roles.
Those branch expectations reuse the independently checked arithmetic kernel;
they do not execute the complete native selection getters or rasterizer.
Wide-gamut CSS preserves its declared space with relative-color/alpha-weighted
composition fallback. Native Float16 packing and complete native/browser color
conversion identity remain open; these sRGB checks do not prove that boundary.

## Selection modifier layout and input bounds

`node tools/androidx-selection/layout-snapshot.mjs` executes the original
Checkbox/RadioButton/Switch modifier expressions and complete original
`MinimumInteractiveModifierNode`, `WrapContentNode`, `PaddingNode` and `SizeNode`
classes. Only class/visibility names are relocated for the test host. Existing
selection and toolbar-row source manifests are SHA-verified first. Prepare
`research/toolbar-row-generator/oracle.jar` using the toolbar-row generator;
the existing Kotlin runtime supplies native Constraints/Placeable arithmetic.
The generator records its base runtime, emitted policies, supplied `Layout.kt`
host and canonical output hashes in `layout-provenance.json`.

The artifact contains 2,160 original measurement/placement records across three
controls, nullable callback/enabled/RTL states, ten minimum sizes including
unspecified/negative/zero/fractional values, and nine finite/zero/fixed/required
constraint sets. Modern Checkbox uses18dp; Radio's original2dp padding makes
its inner input24dp; Switch's inner input is52×32dp. The default minimum reserves
48dp outside that input. Required drawing content retains its native size and
apparent-to-real offsets even when the reported parent/input size becomes zero.

Production `selection-layout.js` matches those records. `SelectionDOMLayout`
wires the measured inner input and canvas into the retained real web controls,
negotiates scoped CSS minimums and parent bounds, and binds the independently
native-verified pointer helpers. Source browser checks compare1,080 clickable
DOM trees, real mouse outside/return cancellation and recovery, direct-only
mouse hover, expanded Touch acceptance, live scoped minimum/parent updates and
disposal/reconnect ownership. Actual Touch taps establish web expanded targeting
separately from explicitly already-routed pointer injection.

Composition/empty-Canvas emission, pointer-input node attachment, density1,
drawing-only modifier values and attachment state are supplied hosts. The exact
modifier expressions execute those original measure policies; complete Compose
composables/compiler, NodeCoordinator/input trees, sibling closest-target
arbitration, arbitrary transforms, focus trees and raster do not execute here.
Fractional CSS constraints are negotiated to integer native constraints; the
fixture's fractional minimum reservation uses native Float rounding. These
tests do not establish all possible CSS percentages/aspect ratios/transforms.
Use `--write-fixture` only after inspecting the separately prepared output.
