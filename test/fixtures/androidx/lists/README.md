# List reference sources

Original Apache-2.0 AndroidX sources are pinned to revision
`a095da93f8e98dea8748ceed79ea8427aade245f`. URLs and SHA-256 are recorded
in `sources.json`; original headers are retained.

`geometry-oracle.json` contains10368 measurement/placement cases compiled from
the unchanged InteractiveListItemMeasurePolicy and public verticalAlignment().
`color-role-oracle.json` contains16 states from the public colors/segmentedColors
constructors and unchanged ListItemColors methods. `shape-state-oracle.json`
executes the unchanged shapeForInteraction state-selection block for32 states.
Run `python tools/androidx-lists/generate.py` to reproduce them; its host-only
Compose adapters are described in tools/androidx-lists/README.md.

Use the public Expressive overloads of ListItem/SegmentedListItem, not the
legacy deprecated headlineContent overload. ListItemDefaults resolves the
public defaults and interaction priority; ListTokens alone is insufficient.
The pinned height-based-on-text-lines fix is enabled; precision-pointer sizing
is disabled. ListItem uses FastSpatial shape/elevation and DefaultEffects colors,
without whole-item scaling. Segmented shapes depend on index/count and use a
2dp gap. Browser checks cover natural DOM measurement, logical placement, font
roles, live slots/attributes, independent nested controls, selection semantics,
all default state colors, corner/elevation/color timelines and interruptions.
This is bounded source parity, not an Android device raster comparison. DOM font
baselines/constraints, arbitrary Compose shapes, long-click, native link behavior,
drag gesture recognition, elevation rasterization and ripple/focus remain open.
