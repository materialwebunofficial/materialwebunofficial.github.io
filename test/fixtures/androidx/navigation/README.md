# Navigation source reference

AndroidX revision a095da93f8e98dea8748ceed79ea8427aade245f, Apache-2.0.
Original licenses remain in every Kotlin file. sources.json records URLs/hashes.

The web navigation bar follows public ShortNavigationBar, with64dp minimum
height and Surface's default zero elevation. VerticalItem tokens mean an icon
above its label:56×32dp indicator,24dp icon,6dp item padding and4dp label gap.
HorizontalItem tokens mean an icon at the logical start of its label:40dp
indicator height,16dp leading/trailing padding and4dp icon/label gap.
They do not describe a vertical bar or navigation rail.

ShortNavigationBarItem labels use LabelMedium in both states and remain visible.
Top selected text uses Secondary; Start selected text uses OnSecondaryContainer.
Disabled icon/text use OnSurfaceVariant alpha.38 independently of the selected
SecondaryContainer indicator. Selection uses DefaultSpatial Float progress for
indicator width and alpha; icon/text bounds stay fixed. The ripple has separate,
full indicator bounds. Compose's roundToInt/placeRelative integer geometry is
adapted at1CSSpx per dp, including RTL and centered arrangement padding/growth.

test/browser/navigation-parity.mjs checks actual Chromium geometry, source
arrangement percentages, text height, both color modes, disabled selected states,
Kotlin intermediate spring samples through320ms (including overshoot), velocity
retargeting, reduced motion and lifecycle cleanup. Keyboard activation/traversal
and mobile showcase/hash synchronization are web adaptations.

Compatibility: tall is an80px height override, not a separately verified
baseline NavigationBar implementation; vertical retains Top item semantics;
always-show-label no longer hides inactive labels. NavigationBar.kt is retained
for the baseline comparison. Baseline variants, precision-pointer focus rings,
exact Android ripple phases, platform text wrapping and wider-browser behavior
remain under audit. These fixtures do not establish full navigation-family parity.
