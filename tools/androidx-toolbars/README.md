# Toolbar source oracles

Run `python tools/androidx-toolbars/generate.py` after the shared Kotlin runtime
has been prepared by `python tools/androidx-motion/generate.py`. Normal tests
only consume the JSON fixtures; generation uses Java8+ and the cached compiler.

All originals are SHA-checked before projection. Horizontal/vertical with-FAB
measure/place lambda bodies, MinimumInteractiveBalancedPaddingNode, both public
default color getters, and EnterExitTransitionModifierNode's complete measure
method/targetOffsetByState are projected unchanged. Dp/Float/ClosedRange
interpolation also uses the original unchanged functions. The enclosing
signatures and imports are adapters. Child constraints, intrinsic sizes, alignment lines,
animation values, and Compose graphics layers are explicit host inputs.

Coverage: 7,680 FAB layouts (orientation, logical position, RTL, intrinsic cross
sizes, narrow bounds, fractional progress and overshoot), 3,072 padding cases,
2,520 visibility placements/target offsets and two public color sets. The
visibility adapter supplies animated IntSize/IntOffset values and has no slide
or lookahead; this is not execution of the entire Transition/AnimatedVisibility
composition. Its original measure body decides alignment retention/reset and
placement. Shared SpringSimulation/SpringEstimation produces 20 independent
Float/IntSize trajectory cases in motion-oracle.json.

MDC resources are pinned separately. XML resolution executes the ordered first
matching selector and resolves macros/dimens, producing 512 color/alpha states.
In particular, hovered/focused/pressed selectors precede checked selectors.

Source choice matters: pinned Compose no-FAB toolbar default shadow is 0dp,
with-FAB expanded/collapsed shadows are 1/0dp; pinned MDC floating toolbar uses
Level3. Runtime follows Compose floating defaults and MDC docked colors. Sources
are not blended into an invented floating default. These oracles do not provide
Android fonts, native pointer routing, TalkBack, packed colors or shadow pixels.
