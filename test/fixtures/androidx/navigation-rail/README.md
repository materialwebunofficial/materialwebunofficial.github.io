# Wide navigation rail source reference

AndroidX revision a095da93f8e98dea8748ceed79ea8427aade245f, Apache-2.0.
Original licenses remain in the Kotlin files; sources.json records URLs/hashes.

Public WideNavigationRail uses96dp collapsed width and220–360dp expanded width
determined by its measured content. Both states default to Surface, CornerNone,
and no elevation; SurfaceContainer/CornerLarge/Level2 are modal defaults.
Content starts at44dp. A nonempty header adds its measured height and40dp gap;
an absent header reserves no extra space. Collapsed item gap is4dp, expanded0dp.

Labels use LabelMedium when Top and LabelLarge when Start. Item minimum height
animates64↔48dp; the actual Start indicator is56dp high, not48dp. No-label items
use a56dp circular indicator. The indicator and ripple are independent; label
items expand selection from logical x20 while icons remain at logical x36.
Icon-only indicators stay centered.

AnimatedMeasurePolicy morphs icon/label positions and padding with DefaultSpatial,
fades the label around the midpoint and chooses its type role from the target
position/progress. Normal rail width, full-width range, item gap and minimum height
use separate DefaultSpatial channels. See tools/androidx-navigation for the1080
independently compiled Kotlin measurement cases and tools/androidx-motion for
the297 spring cases. Tests execute without a compiler or network.

Web adaptations include vertical manual Tab navigation, native button activation,
JSON items, slotted header/footer content, accessible names and reduced motion.
narrow remains an80px compatibility width override, not a verified baseline
NavigationRail variant. Label color now follows StyledLabel's four-channel Oklab
DefaultEffects spring;24 Kotlin vector fixtures and computed Chromium label
colors cover dynamics, retargeting, disabled alpha and inherited token changes.
CSS supplies color conversion; Compose's packed color precision/output conversion
still needs a separate audit. Modal rail, exact ripple/focus
phases, text/header/constraint edges and other browsers remain under audit.
