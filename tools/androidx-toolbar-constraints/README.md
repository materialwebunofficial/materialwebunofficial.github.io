# Toolbar parent constraint oracle

Run `python tools/androidx-toolbar-constraints/generate.py` with the shared cached
Kotlin runtime prepared by `tools/androidx-motion/generate.py`. Normal tests use
the generated JSON without Java. Six licensed AndroidX originals are pinned at
a095da93f8e98dea8748ceed79ea8427aade245f, with URLs/SHA in
`test/fixtures/androidx/toolbar-constraints/sources.json`. Shared Dp/Float lerp
originals are also SHA-checked against the core toolbar manifest.

The generator executes unchanged horizontal/vertical with-FAB policy bodies,
the complete packed Constraints implementation, UnspecifiedConstraintsNode,
PaddingValuesModifier, ScrollNode's measure/four intrinsic methods, and
Placeable's coercion/relative mirroring/apparent-to-real placement bodies.
Package/imports and accessible enclosing declarations are adapted. The host
wires a deferred placement tree and explicit measured content/intrinsic inputs.
Padding's intrinsic dimensions are an explicit adapter boundary. This does not
execute Compose Row/Column, the default intrinsic approximation, graphics layers,
or the whole composition/gesture/accessibility runtime.

15,552 cases distinguish the requested policy reservation from its constrained
apparent size, physical child placement and stationary padded scroll viewport.
Coverage includes both axes/logical FAB positions/RTL, zero and below-padding
bounds, cross minima20/64/99/200, finite/unbounded maxima, intermediate/overshoot Float
progress, integer negative offsets, native-compatible scroll values and the
source's zero-parent-width exception to RTL mirroring. 1,152 cases deliberately
retain the source-invalid main-axis minimum/animated maximum combinations:
Constraints.copy rejects them. The pure projection rejects the same inputs.

The browser maps allocated CSS host space to loose main-axis constraints, keeps
the intrinsic preferred basis stable for flex/grid, resolves cross minimums and
maxima through CSS sizing probes, and measures its inner frame with the source
projection. Internal probes change a private CSSOM rule, so ancestor style/theme
observers do not loop. Fixed/min/max sizes, percentage/calc cross minima, border
box subtraction, definite parent bounds and bounded grid tracks are adapter
semantics; they are not Android CSS behavior. Positive CSS main minima allocate
the outer host without passing a positive native main minimum into the animated
policy. Arbitrary ancestor transforms/subpixel/density and unconstrained grid
track policies require separate audits.

1,440 Chromium cases compare actual root/surface/FAB/viewport placement and native
scroll ranges/axis positions with the independently generated Kotlin outputs.
Flow/flex/grid/absolute layouts, siblings, both axes/RTL and tiny/zero allocations
are included, with authored border-box sizes and calc maximums, and large/clipped
content cross sizes. Resize recovery, authored calc minimums, orientation changes,
reconnection and removing the FAB also run. Slotted controls own their cross-axis
layout; the golden content is a measured Row/Column boundary, so native child
cross placement is not claimed by these assertions.
