# AndroidX navigation measurement oracle

Run `python tools/androidx-navigation/generate.py` with Python3 and Java8+.
The compiler cache is shared with tools/androidx-motion; run that generator once
to populate ignored research/kotlin-runtime. No system compiler is installed.

NavigationItem.kt is pinned to AndroidX a095da93f8e98dea8748ceed79ea8427aade245f.
The generator extracts AnimatedMeasurePolicy and placeAnimatedLabelAndIcon,
compiling their source unchanged except for the policy's visibility. Harness.kt
supplies density1, constraints, fixed measured children, padding and placement
adapters. These adapters do not execute Android text shaping or rendering.
sources.json checks the original source hash before regeneration.

1080 fixtures cover five measured label widths, three heights, nine icon-position
progress values (including overshoot), four selected-indicator progress values,
and both target positions. Tests compare integer dimensions/positions and label
alpha with the JS port. The browser suite verifies actual DOM bounds, fonts,
rail width/spacing/height springs, selection, headers, logical RTL placement,
disabled/color roles and lifecycle. The separate Kotlin spring oracle includes
rail96/80↔220/360, gap4↔0 and minimum height64↔48 intervals.

Scope: public non-modal WideNavigationRail core layout and spatial motion.
Modal rail, exact color interpolation/ripple/focus phases, text constraint edges,
header combinations and wider browser comparisons remain under audit.
