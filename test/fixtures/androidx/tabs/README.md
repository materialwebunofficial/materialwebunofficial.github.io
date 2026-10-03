# AndroidX tab reference and independent fixtures

Fourteen original Apache-2.0 files are pinned to
`a095da93f8e98dea8748ceed79ea8427aade245f`; sources.json records URLs and SHA-256.
The Tab/TabRow implementation, public samples, motion/type/tab/divider tokens,
Placeable coercion, Alignment/Arrangement centering, ScrollState and
animateScrollBy sources are retained intact.

`python tools/androidx-tabs/generate.py` independently compiles source projections
with Kotlin/Java host adapters. It generates 360 baseline layouts, 120 fixed
rows, 720 scrollable rows (including fractional Dp edge/minimum values), 2,700
indicator placements, 234 scroll targets, 36 scroll-consumption sequences with
324 steps, 1,000 outer-column centers and 16 public default color cases. Shared `tools/androidx-motion/`
generates 770 scalar spring cases and 24 color vectors, including tab width,
offset and velocity-preserving interruption. Normal tests consume saved JSON;
they do not derive expectations from the web runtime.

Run `node test/unit/tab-parity.test.mjs`, `npm test` and `npm run test:parity`.
The browser checks actual bounds, independent spring samples/termination,
color entering/exiting roles, fractional scroll consumption, native activation,
panels, RTL, mutation/focus, local theme/motion, reduced motion and lifecycle.
Four live showcase examples are checked at 1440/390px in light/dark themes.

This is bounded core coverage, not a claim of universal platform parity. The
host supplies child sizes/baselines and does not execute Compose text, painting,
pointer routing or arbitrary modifiers. LeadingIconTab's generic Row is adapted
in the browser, not executed in the Kotlin measurement projection. Android font
metrics, generic custom Tab/indicator/divider slots, platform ripple/focus/hit
routing, color packing/output precision, arbitrary panel ownership/cross-root
accessibility and wider browsers remain separate work in MD3E-PARITY.md.
