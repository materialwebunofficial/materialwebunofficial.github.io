# Menu reference and independent oracles

Original Apache-2.0 AndroidX sources are pinned to revision
`a095da93f8e98dea8748ceed79ea8427aade245f`; all 16 source URLs and SHA-256
hashes are in sources.json. Surface, InteractiveComponentSize, MotionScheme,
ShapeTokens and flag defaults provide the context that component tokens omit.

`python tools/androidx-menus/generate.py` executes unchanged Kotlin menu
position providers (7,776 cases), MenuArrangement (256 cases), public ordinary/
selectable standard/vibrant color methods (16 states), group/item constructors
and shape state branches (60 cases). Host-only stubs supply Compose types at
density 1. See tools/androidx-menus/README.md for the exact extraction boundary.
The independently executed motion oracle now has 660 scalar cases and 24 color
vectors, including menu scale, group corners and selected-leading geometry.

Read the public overloads, MenuDefaults and MenuSamples before applying tokens:

- Expressive Popup has no own Surface. Groups use SurfaceContainerLow or
  TertiaryContainer, 3dp shadow, no border, 2dp vertical content padding and 2dp
  inter-group spacing. Their index/count corners are 16/8dp; after a group has
  been hovered and left, its inactive shape is 8dp until hovered again.
- Shaped items have 4dp outer horizontal padding, 12dp inner padding and 8dp
  decorated spacing. The visual minimum is 44dp, but Surface reserves 48dp by
  default. Supporting text adds 2dp outer vertical padding: one-line headline
  plus one supporting line gives 64dp visual/68dp layout height.
- Headline and trailing labels are LabelLarge; supporting text is BodyMedium.
  The unused BodyLarge/LabelSmall tokens are not the public implementation.
  Convenience icons are 20dp; arbitrary slots retain their intrinsic size.
- Selected corners are 12dp, with 12/4dp index-based unselected corners. Disabled
  colors take precedence over selected colors; alpha 0.38 applies to content,
  not the whole item. Container color alone animates through FastEffects Oklab;
  text and icon color roles change directly.
- Selected-only leading content expands/shrinks with FastSpatial and fades with
  FastEffects, retaining the leading 8dp gap at zero width. IntSize drawing
  rounds to pixels; reversal uses the rounded current value and Float velocity.
- Source popup motion genuinely scales the whole popup from 0.8 to 1, without
  translation, using independent FastSpatial scale and FastEffects alpha. It
  remains composed until both channels finish, with continuous interruption.
- Public DropdownMenu is a separate SurfaceContainer / ExtraSmall4dp variant
  with 8dp vertical padding, 48dp ordinary rows and Android's 0dp horizontal
  window margin. Expressive Popup uses an 8dp horizontal margin. Both use the
  source 48dp vertical margin and provider transform origin.

`test/browser/menu-parity.mjs` checks rendered dimensions and roles, scalar/
color samples, rounded reversal, shared group widths, native pointer/keyboard
activation, canceled press, nested controls/submenus, RTL including live changes,
JSON safety/focus preservation, disabled root, reduced motion, reconnect/late
callbacks, existing-HTML upgrade order and actual 1440/390 light/dark showcase.
Normal tests read JSON; regeneration alone needs the private Kotlin compiler.

This verifies that bounded scope, not absolute cross-platform identity. Native
popover/focus/keyboard, automatic state/dismissal and overflow scrolling are web
adapters. Arbitrary Compose Shape/custom modifier/content-padding/elevation/
border/position-provider APIs, precision-pointer flags, exact platform text
baselines/constraints, shadow/ripple/focus rasterization, color packing/output
precision and wider engines remain open. Separate split-button menus keep their
existing tests. Both homepage wave phases are preserved.
